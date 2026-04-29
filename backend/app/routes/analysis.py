"""
Analysis routes — core API endpoints for damage detection.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
import httpx

from fastapi import APIRouter, Depends, Form, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.database import get_db
from app.models.schemas import AnalysisResponse, ReportDetail, ReportListItem, DetectionItem
from app.services.detection import detection_service
from app.services.alert_agent import alert_agent
from app.services.image_storage import image_storage
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

def map_mongo_id(doc: dict) -> dict:
    """Helper to convert MongoDB _id to string id."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
    return doc

@router.post(
    "/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze an image for infrastructure damage",
)
async def analyze_image(
    file: UploadFile = File(...),
    category: str = Form("building"),
    location_name: Optional[str] = Form(None),
    user_description: Optional[str] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AnalysisResponse:
    # 1. Save image
    image_path = await image_storage.save(file)

    try:
        # 2. Run detection based on category
        result = detection_service.analyze(image_path, category=category)
        
        # 3. RAG: Generate human-readable explanation and recommendation via external service
        rag_output = {"explanation": "Analysis complete.", "recommendation": "Monitor condition."}
        try:
            async with httpx.AsyncClient() as client:
                rag_resp = await client.post(
                    f"{settings.RAG_SERVICE_URL}/analyze",
                    json={"damage_type": result["damage_type"], "severity": result["severity"]},
                    timeout=5.0
                )
                if rag_resp.status_code == 200:
                    rag_output = rag_resp.json()
                else:
                    logger.warning(f"RAG service returned status {rag_resp.status_code}")
        except Exception as e:
            logger.error(f"Failed to call RAG service: {e}")
            
        result["recommendation"] = rag_output.get("recommendation", "Monitor condition.")
        # Simulate "nearest places it can harm"
        nearby_hazards = []
        if result["severity"] in ["HIGH", "CRITICAL"]:
            nearby_hazards = [
                "Primary Power Distribution Line (30m)",
                "Underground Water Main (15m)",
                "Adjacent Residential Structure (10m)",
                "Main Access Road (High Traffic Area)"
            ]
        elif result["severity"] == "MEDIUM":
            nearby_hazards = ["Sidewalk / Pedestrian Walkway", "Minor Utility Poles"]

        # 4. Build report data for persistence
        # NEW: Geocoding logic to find real coordinates
        lat, lng = 13.0827, 80.2707 # Default Chennai
        if location_name:
            try:
                # Append India to make search more specific
                query = f"{location_name}, India"
                async with httpx.AsyncClient() as client:
                    geo_resp = await client.get(
                        "https://nominatim.openstreetmap.org/search",
                        params={"q": query, "format": "json", "limit": 1},
                        headers={"User-Agent": "UrbanPulse-AI-Monitor"}
                    )
                    geo_data = geo_resp.json()
                    if geo_data:
                        lat = float(geo_data[0]["lat"])
                        lng = float(geo_data[0]["lon"])
                        logger.info(f"📍 Geocoded '{query}' to {lat}, {lng}")
                    else:
                        logger.warning(f"❓ No geocode results for '{query}'")
            except Exception as e:
                logger.error(f"Geocoding failed for {location_name}: {e}")

        report_data = {
            "category": category,
            "image_path": image_path,
            "original_filename": file.filename or "unknown",
            "damage_type": result["damage_type"],
            "severity": result["severity"],
            "confidence": result["confidence"],
            "location": f"{lat}, {lng}",
            "location_name": location_name,
            "latitude": lat,
            "longitude": lng,
            "nearby_hazards": nearby_hazards,
            "user_description": user_description,
            "recommendation": rag_output.get("explanation", "Analysis complete."),
            "detections": result.get("detections", []),
            "created_at": datetime.now(timezone.utc),
        }
        
        insert_result = await db.damage_reports.insert_one(report_data)
        report_id = str(insert_result.inserted_id)

        # 5. Agent: trigger alert/clustering (Async Government Notification)
        # We pass the full result so the agent has all context
        result["location_name"] = location_name
        result["nearby_hazards"] = nearby_hazards
        result["category"] = category
        result["recommendation"] = rag_output.get("explanation", "Analysis complete.")
        
        alert_fired = await alert_agent.evaluate(db, result, report_id)
        clustered = result.get("clustered", False)

        # Update report with alert status
        await db.damage_reports.update_one(
            {"_id": insert_result.inserted_id},
            {"$set": {"alert_triggered": alert_fired, "clustered": clustered}}
        )

        # 6. Build response
        return AnalysisResponse(
            category=category,
            damage_type=result["damage_type"],
            severity=result["severity"],
            confidence=f"{result['confidence'] * 100:.1f}%",
            location=result["location"],
            location_name=location_name,
            nearby_hazards=nearby_hazards,
            recommendation=rag_output.get("explanation", "Analysis complete."),
            user_description=user_description,
            report_id=report_id,
            alert_triggered=alert_fired,
            clustered=clustered,
            detections=[DetectionItem(**d) for d in result.get("detections", [])],
            analyzed_at=report_data["created_at"].isoformat(),
        )

    except Exception as exc:
        image_storage.delete(image_path)
        logger.exception("Error during analysis: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/reports", response_model=List[ReportListItem])
async def list_reports(skip: int = 0, limit: int = 50, db: AsyncIOMotorDatabase = Depends(get_db)):
    cursor = db.damage_reports.find().sort("created_at", -1).skip(skip).limit(limit)
    reports = await cursor.to_list(length=limit)

    return [
        ReportListItem(
            id=str(r["_id"]),
            category=r["category"],
            original_filename=r["original_filename"],
            damage_type=r["damage_type"],
            severity=r["severity"],
            confidence=r["confidence"],
            alert_triggered=(r.get("alert_triggered") == "true"),
            clustered=r.get("clustered", False),
            created_at=r["created_at"].isoformat() if r.get("created_at") else None,
            latitude=r.get("latitude"),
            longitude=r.get("longitude"),
            location_name=r.get("location_name"),
            nearby_hazards=r.get("nearby_hazards", []),
        )
        for r in reports
    ]


@router.get("/reports/{report_id}", response_model=ReportDetail)
async def get_report(report_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        obj_id = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID format.")

    report = await db.damage_reports.find_one({"_id": obj_id})

    if report is None:
        raise HTTPException(status_code=404, detail="Not found.")

    return ReportDetail(
        id=str(report["_id"]),
        category=report["category"],
        original_filename=report["original_filename"],
        damage_type=report["damage_type"],
        severity=report["severity"],
        confidence=report["confidence"],
        location=report.get("location", ""),
        location_name=report.get("location_name"),
        recommendation=report.get("recommendation", ""),
        nearby_hazards=report.get("nearby_hazards", []),
        user_description=report.get("user_description"),
        image_path=report["image_path"],
        alert_triggered=(report.get("alert_triggered") == "true"),
        clustered=report.get("clustered", False),
        created_at=report["created_at"].isoformat() if report.get("created_at") else None,
        latitude=report.get("latitude"),
        longitude=report.get("longitude"),
    )
