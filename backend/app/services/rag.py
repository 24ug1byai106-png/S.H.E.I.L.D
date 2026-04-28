import logging

logger = logging.getLogger(__name__)

# NOTE: The full RAG system (sentence_transformers + FAISS) has been temporarily
# disabled because those heavy ML dependencies caused build timeouts on Railway.
# The stub below preserves the same public interface so the rest of the app
# continues to work. Re-enable by restoring the original implementation and
# adding sentence-transformers and faiss-cpu back to requirements.txt.

# from sentence_transformers import SentenceTransformer
# import faiss
# import numpy as np
#
# KNOWLEDGE_BASE = [...]
#
# class RAGSystem:
#     def __init__(self): ...
#     def retrieve(self, query, top_k=2): ...
#     def generate_report(self, category, damage_type): ...
#
# rag_system = RAGSystem()


class _StubRAGSystem:
    """Lightweight stand-in for RAGSystem that requires no ML dependencies."""

    def retrieve(self, query: str, top_k: int = 2) -> list:
        return []

    def generate_report(self, category: str, damage_type: str) -> dict:
        damage_lower = damage_type.lower()
        explanation = (
            f"Detected {damage_lower} in the {category} category. "
            "A full risk assessment will be available once the RAG system is re-enabled."
        )
        recommendation = "Schedule an inspection and log for routine maintenance."
        return {
            "explanation": explanation,
            "recommendation": recommendation,
            "severity_score": 0.5,
            "risk_level": "Unknown",
            "context_used": [],
        }


# Singleton instance (stub)
rag_system = _StubRAGSystem()
