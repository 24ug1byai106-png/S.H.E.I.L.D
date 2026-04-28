"""
Pydantic schemas for API request/response validation and serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class DamageType(str, Enum):
    CRACKS = "cracks"
    COLLAPSE_RISK = "collapse_risk"
    DEBRIS = "debris"
    POTHOLE = "pothole"
    WATERLOGGING = "waterlogging"
    INFRASTRUCTURE_ISSUE = "infrastructure_issue"
    MULTIPLE = "multiple"
    NONE = "none"


class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DetectionItem(BaseModel):
    """Individual detection from the YOLO model."""
    label: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: Optional[List[float]] = None  # [x1, y1, x2, y2]


class AnalysisResponse(BaseModel):
    """Response schema for the /analyze endpoint."""
    category: str = Field(..., description="Category of report: building / pothole / infrastructure")
    damage_type: str = Field(..., description="Primary type of damage detected")
    severity: str = Field(..., description="Severity level: LOW | MEDIUM | HIGH | CRITICAL")
    confidence: str = Field(..., description="Model confidence as percentage string, e.g. '87.3%'")
    location: str = Field(..., description="Estimated spatial location of the primary damage")
    location_name: Optional[str] = Field(None, description="User provided area/location name")
    recommendation: str = Field(..., description="Actionable recommendation based on findings")
    nearby_hazards: Optional[List[str]] = Field(None, description="Nearby infrastructure that could be harmed")
    user_description: Optional[str] = Field(None, description="Optional text description from user")
    
    # Extended fields
    report_id: Optional[str] = Field(None, description="Database record ID")
    alert_triggered: bool = Field(False, description="Whether a HIGH severity alert was fired")
    clustered: bool = Field(False, description="Whether this report was clustered with previous reports")
    detections: Optional[List[DetectionItem]] = Field(None, description="Raw detection list")
    analyzed_at: Optional[str] = Field(None, description="ISO timestamp of analysis")


class ReportListItem(BaseModel):
    """Summary item for listing past reports."""
    id: str
    category: str
    original_filename: str
    damage_type: str
    severity: str
    confidence: float
    alert_triggered: bool
    clustered: bool
    created_at: Optional[str]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    nearby_hazards: Optional[List[str]] = None

    class Config:
        from_attributes = True


class ReportDetail(ReportListItem):
    """Full report detail including recommendation and location."""
    location: Optional[str] = None
    location_name: Optional[str] = None
    recommendation: str = ""
    nearby_hazards: Optional[List[str]] = None
    user_description: Optional[str] = None
    image_path: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
