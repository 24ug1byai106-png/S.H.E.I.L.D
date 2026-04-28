"""
Detection service wrapping the YOLOv8 model.
Extended to simulate pothole and infrastructure detection.
"""

import random
import time
import logging
from pathlib import Path
from typing import List, Tuple

import numpy as np
from PIL import Image

from app.models.schemas import DetectionItem, DamageType, SeverityLevel
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Label configuration
# ---------------------------------------------------------------------------

BUILDING_LABELS = {
    0: "cracks",
    1: "collapse_risk",
    2: "debris",
}

INFRASTRUCTURE_LABELS = {
    0: "pothole",
    1: "waterlogging",
    2: "infrastructure_issue",
}

SEVERITY_WEIGHTS = {
    "cracks": {"LOW": 0.3, "MEDIUM": 0.4, "HIGH": 0.3},
    "collapse_risk": {"LOW": 0.1, "MEDIUM": 0.2, "HIGH": 0.4, "CRITICAL": 0.3},
    "debris": {"LOW": 0.4, "MEDIUM": 0.4, "HIGH": 0.2},
    "pothole": {"LOW": 0.4, "MEDIUM": 0.4, "HIGH": 0.2},
    "waterlogging": {"LOW": 0.3, "MEDIUM": 0.4, "HIGH": 0.3},
    "infrastructure_issue": {"LOW": 0.5, "MEDIUM": 0.4, "HIGH": 0.1},
}

LOCATION_DESCRIPTORS = [
    "Upper-left structural column",
    "Lower-right foundation section",
    "Central load-bearing wall",
    "Main street intersection",
    "Sidewalk near crossing",
    "Alleyway entrance",
]

class DetectionService:
    def __init__(self):
        logger.info("DetectionService initialized (placeholder model mode)")

    def analyze(self, image_path: str, category: str = "building") -> dict:
        image = self._load_image(image_path)
        raw_detections = self._run_model_inference(image, image_path, category)

        if not raw_detections:
            return self._no_damage_result(category)

        damage_type = self._resolve_damage_type(raw_detections)
        severity = self._compute_severity(raw_detections, damage_type)
        confidence = self._aggregate_confidence(raw_detections)
        location = self._estimate_location(raw_detections, image.size)

        return {
            "category": category,
            "damage_type": damage_type,
            "severity": severity,
            "confidence": round(confidence, 4),
            "location": location,
            # recommendation will be replaced by RAG explanation
            "recommendation": "", 
            "detections": [d.model_dump() for d in raw_detections],
        }

    def _load_image(self, image_path: str) -> Image.Image:
        try:
            img = Image.open(image_path).convert("RGB")
            return img
        except Exception as exc:
            logger.error("Failed to load image %s: %s", image_path, exc)
            raise ValueError(f"Cannot open image: {exc}") from exc

    def _run_model_inference(self, image: Image.Image, image_path: str, category: str) -> List[DetectionItem]:
        time.sleep(0.15)

        if random.random() < 0.10:
            return []

        labels_map = INFRASTRUCTURE_LABELS if category in ["road", "infrastructure"] else BUILDING_LABELS
        num_detections = random.randint(1, 3)
        detections: List[DetectionItem] = []

        for _ in range(num_detections):
            label_id = random.choices(list(labels_map.keys()), weights=[0.45, 0.25, 0.30])[0]
            label = labels_map[label_id]
            conf = random.uniform(settings.MODEL_CONFIDENCE_THRESHOLD, 0.97)

            w, h = image.size
            x1 = random.uniform(0, w * 0.6)
            y1 = random.uniform(0, h * 0.6)
            x2 = x1 + random.uniform(w * 0.1, w * 0.4)
            y2 = y1 + random.uniform(h * 0.1, h * 0.4)

            # simulate pothole size estimation based on bbox
            bbox_area = (x2 - x1) * (y2 - y1)
            img_area = w * h
            if label == "pothole":
                if bbox_area / img_area > 0.1:
                    conf = min(0.99, conf + 0.1) # Boost conf for large potholes

            detections.append(
                DetectionItem(
                    label=label,
                    confidence=round(conf, 4),
                    bbox=[round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                )
            )
        return detections

    def _resolve_damage_type(self, detections: List[DetectionItem]) -> str:
        labels = [d.label for d in detections]
        unique = set(labels)
        if len(unique) > 1:
            primary = max(detections, key=lambda d: d.confidence).label
            return DamageType.MULTIPLE.value if len(unique) > 2 else primary
        return labels[0]

    def _compute_severity(self, detections: List[DetectionItem], damage_type: str) -> str:
        max_conf = max(d.confidence for d in detections)
        has_critical = any(d.label in ["collapse_risk", "pothole"] and d.confidence >= 0.85 for d in detections)
        
        if has_critical:
            return SeverityLevel.CRITICAL.value
        if max_conf >= 0.75:
            return SeverityLevel.HIGH.value
        if max_conf < 0.55:
            return SeverityLevel.LOW.value
        return SeverityLevel.MEDIUM.value

    def _aggregate_confidence(self, detections: List[DetectionItem]) -> float:
        return max(d.confidence for d in detections)

    def _estimate_location(self, detections: List[DetectionItem], image_size: Tuple[int, int]) -> str:
        if not detections:
            return "Unknown"
        return random.choice(LOCATION_DESCRIPTORS)

    def _no_damage_result(self, category: str) -> dict:
        return {
            "category": category,
            "damage_type": DamageType.NONE.value,
            "severity": SeverityLevel.LOW.value,
            "confidence": 0.0,
            "location": "N/A",
            "recommendation": "✅ No issues detected. Routine inspection schedule can continue.",
            "detections": [],
        }

detection_service = DetectionService()
