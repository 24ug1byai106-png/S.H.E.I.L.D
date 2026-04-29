import os
import numpy as np
import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Mock Knowledge Base (in a real system, this could be loaded from PDFs or a DB)
KNOWLEDGE_BASE = [
    # Building Safety
    "Structural cracks wider than 3mm on load-bearing walls indicate severe structural risk and require immediate evacuation.",
    "Spalling concrete exposing rebar can lead to rapid corrosion; it requires urgent repair to prevent structural failure.",
    "Water damage on ceilings below a flat roof indicates membrane failure and high risk of mold and electrical hazards.",
    "Minor hairline cracks in plaster are cosmetic and pose low risk, requiring only regular monitoring.",
    # Road and Infrastructure Safety
    "Large potholes (depth > 5cm) on major roads pose a severe risk to vehicles and two-wheelers, increasing accident probability significantly.",
    "Small potholes on residential streets cause minor discomfort but should be patched within 30 days to prevent expansion.",
    "Waterlogging on arterial roads reduces braking efficiency and can cause aquaplaning; drainage clearing is mandatory.",
    "Broken streetlights at intersections reduce visibility by 80%, leading to high nighttime accident risks; immediate replacement needed.",
    "Garbage accumulation near storm drains leads to severe blockages and localized flooding during heavy rains.",
    "Damaged sidewalks with a lip greater than 2cm pose a severe tripping hazard for pedestrians and require leveling."
]

class RAGSystem:
    def __init__(self):
        logger.info("Initializing RAG System...")
        # Load a lightweight embedding model
        self.encoder = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Build FAISS index
        self.dimension = self.encoder.get_sentence_embedding_dimension()
        self.index = faiss.IndexFlatL2(self.dimension)
        
        # Encode knowledge base
        embeddings = self.encoder.encode(KNOWLEDGE_BASE)
        self.index.add(np.array(embeddings, dtype=np.float32))
        self.documents = KNOWLEDGE_BASE
        logger.info("RAG System initialized with %d documents.", len(self.documents))

    def retrieve(self, query: str, top_k: int = 2) -> list[str]:
        query_vector = self.encoder.encode([query])
        distances, indices = self.index.search(np.array(query_vector, dtype=np.float32), top_k)
        
        results = []
        for idx in indices[0]:
            if idx < len(self.documents):
                results.append(self.documents[idx])
        return results

    def generate_report(self, category: str, damage_type: str) -> dict:
        """
        Retrieves relevant context and generates a human-readable explanation.
        """
        query = f"{category}: {damage_type}"
        context_docs = self.retrieve(query)
        context_str = " ".join(context_docs)
        
        # Simulate LLM Generation
        # In a production environment with OpenAI:
        # prompt = f"Given the safety guidelines: {context_str}\nExplain the risk and action for: {query}"
        # response = openai.ChatCompletion.create(...)
        
        # Mock LLM Output based on context
        explanation = f"Based on municipal and safety guidelines: {context_str} "
        
        if "severe risk" in context_str.lower() or "immediate" in context_str.lower() or "high risk" in context_str.lower():
            severity_reasoning = f"The detection of {damage_type.lower()} indicates a critical safety hazard."
            recommended_action = "Dispatch inspection team immediately. Secure the area to prevent public access."
            severity_score = 0.9
            risk_level = "High"
        elif "moderate" in context_str.lower() or "within 30 days" in context_str.lower():
            severity_reasoning = f"The {damage_type.lower()} poses a moderate risk that will worsen if untreated."
            recommended_action = "Schedule maintenance within the next 2-4 weeks."
            severity_score = 0.6
            risk_level = "Medium"
        else:
            severity_reasoning = f"The {damage_type.lower()} is currently considered a low-level issue."
            recommended_action = "Log for routine maintenance and continue regular monitoring."
            severity_score = 0.2
            risk_level = "Low"

        full_explanation = f"{severity_reasoning} {explanation}"

        return {
            "explanation": full_explanation,
            "recommendation": recommended_action,
            "severity_score": severity_score,
            "risk_level": risk_level,
            "context_used": context_docs
        }

# Singleton instance
rag_system = RAGSystem()
