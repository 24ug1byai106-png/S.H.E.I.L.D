from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class RagRequest(BaseModel):
    damage_type: str
    severity: str

@app.get("/")
def root():
    return {"message": "RAG service running"}

@app.post("/analyze")
def analyze(data: RagRequest):
    # Simulated RAG logic (lightweight)
    if data.severity == "HIGH":
        return {
            "risk_level": "CRITICAL",
            "impact_radius": 100,
            "explanation": "Severe structural damage detected. High collapse risk.",
            "recommendation": "Immediate evacuation and inspection required"
        }
    elif data.severity == "MEDIUM":
        return {
            "risk_level": "HIGH",
            "impact_radius": 60,
            "explanation": "Moderate damage. Potential structural weakening.",
            "recommendation": "Inspection recommended"
        }
    else:
        return {
            "risk_level": "LOW",
            "impact_radius": 20,
            "explanation": "Minor damage. Low risk.",
            "recommendation": "Monitor condition"
        }
