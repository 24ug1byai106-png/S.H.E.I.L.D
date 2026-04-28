"""
Alert Agent Service.
Responsible for automated government notification, clustering, and persistence of emergency alerts.
"""

import logging
import json
import httpx
from datetime import datetime, timezone
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class AlertAgent:
    def __init__(self):
        logger.info("AlertAgent initialized for Government Notification.")

    async def evaluate(self, db: AsyncIOMotorDatabase, analysis_result: dict, report_id: str) -> bool:
        """
        Main entry point to check if analysis results warrant an emergency alert.
        """
        severity = analysis_result.get("severity")
        damage_type = analysis_result.get("damage_type")
        location_name = analysis_result.get("location_name", "Unknown Location")
        
        # Trigger rules: CRITICAL or HIGH severity
        if severity in ["CRITICAL", "HIGH"]:
            logger.info("⚠️ High-risk issue detected. Triggering alert pipeline...")
            
            # 1. Create the structured alert payload
            alert_payload = {
                "issue_type": analysis_result.get("category", "General"),
                "damage_type": damage_type,
                "risk_level": severity,
                "location_name": location_name,
                "location_coordinates": analysis_result.get("location", "N/A"),
                "impact_radius": analysis_result.get("nearby_hazards", []),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "report_id": report_id,
                "ai_explanation": analysis_result.get("recommendation", "Immediate inspection required."),
                "recommended_action": "EMERGENCY_INSPECTION_MANDATORY"
            }
            
            # 2. Persist alert to database
            alert_id = await self._persist_alert(db, report_id, alert_payload)
            
            # 3. Execute notifications
            await self._send_email_notification(alert_payload)
            await self._trigger_webhook(alert_payload)
            
            # 4. Mark report as notified
            await db.damage_reports.update_one(
                {"_id": report_id if isinstance(report_id, str) else report_id},
                {"$set": {"alert_notified": True, "alert_id": alert_id}}
            )
            
            return True
        
        return False

    async def _persist_alert(self, db: AsyncIOMotorDatabase, report_id: str, payload: dict) -> str:
        """Store the alert in the government_alerts collection."""
        alert_doc = {
            "report_id": report_id,
            "payload": payload,
            "status": "SENT",
            "timestamp": datetime.now(timezone.utc),
            "authority_contacted": ["Municipal Commissioner", "Disaster Management Cell"],
        }
        result = await db.government_alerts.insert_one(alert_doc)
        logger.info(f"✅ Alert persisted to DB: {result.inserted_id}")
        return str(result.inserted_id)

    async def _send_email_notification(self, payload: dict):
        """Simulate SMTP/SendGrid email notification."""
        subject = f"URGENT: High-Risk Infrastructure Alert at {payload['location_name']}"
        body = f"""
        URGENT NOTIFICATION
        -------------------
        Risk Level: {payload['risk_level']}
        Type: {payload['damage_type']}
        Location: {payload['location_name']}
        
        AI Explanation: {payload['ai_explanation']}
        
        This is an automated alert from the Urban Monitoring System.
        Immediate inspection and evacuation is recommended.
        """
        logger.warning(f"📧 [SMTP SIMULATION] Sending Email To: municipal.authority@gov.in\nSubject: {subject}\nBody: {body}")

    async def _trigger_webhook(self, payload: dict):
        """Send POST request to government endpoint."""
        webhook_url = "http://gov-portal-mock/api/alerts"
        logger.info(f"🔗 [WEBHOOK SIMULATION] Posting to {webhook_url} with payload size: {len(json.dumps(payload))} bytes")
        # In a real system:
        # async with httpx.AsyncClient() as client:
        #     await client.post(webhook_url, json=payload)

alert_agent = AlertAgent()
