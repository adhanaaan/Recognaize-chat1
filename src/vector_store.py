"""
Qdrant-based vector store for cognitive health knowledge base
Supports both in-memory and server modes.
Embedding provider: Google Gemini (default) or OpenAI (fallback).
"""

import os
import json
from typing import List, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Handle both relative and absolute imports
try:
    from .llm_provider import get_llm, get_provider_name, get_embedding_dimension
except ImportError:
    from llm_provider import get_llm, get_provider_name, get_embedding_dimension


class VectorStore:
    def __init__(self):
        self._provider_name = get_provider_name()
        self._embedding_dim = get_embedding_dimension()

        # Initialise the LLM (used for embeddings)
        self._llm = get_llm()

        # Keep OpenAI client as fallback for embeddings when provider is openai
        if self._provider_name == "openai":
            from openai import OpenAI

            self._openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            self._openai_embedding_model = os.getenv(
                "EMBEDDING_MODEL", "text-embedding-3-small"
            )
        else:
            self._openai_client = None
            self._openai_embedding_model = None

        # Qdrant configuration
        qdrant_url = os.getenv("QDRANT_URL", "").strip()
        qdrant_api_key = os.getenv("QDRANT_API_KEY", "").strip()
        self.collection_name = os.getenv("QDRANT_COLLECTION", "cognitive_health")

        # Initialize Qdrant client (in-memory if no URL provided)
        if qdrant_url:
            self.qdrant_client = QdrantClient(
                url=qdrant_url,
                api_key=qdrant_api_key if qdrant_api_key else None,
            )
            print(f"Connected to Qdrant at {qdrant_url}")
        else:
            self.qdrant_client = QdrantClient(":memory:")
            print("Using in-memory Qdrant")

        # Initialize collection
        self._initialize_collection()

        # Load knowledge base
        self._load_knowledge_base()

    # ── embeddings ──────────────────────────────────────────────

    def _embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts using the active provider."""
        if self._provider_name == "google":
            return self._llm.embed_texts(texts)
        # OpenAI path
        data = self._openai_client.embeddings.create(
            model=self._openai_embedding_model,
            input=texts,
        ).data
        return [item.embedding for item in data]

    def _embed_query(self, text: str) -> List[float]:
        """Generate an embedding for a single query string."""
        if self._provider_name == "google":
            return self._llm.embed_query(text)
        # OpenAI path
        data = self._openai_client.embeddings.create(
            model=self._openai_embedding_model,
            input=[text],
        ).data
        return data[0].embedding

    # ── collection setup ────────────────────────────────────────

    def _initialize_collection(self) -> None:
        """Create or get Qdrant collection"""
        try:
            self.qdrant_client.get_collection(self.collection_name)
            print(f"Using existing Qdrant collection: {self.collection_name}")
        except Exception:
            self.qdrant_client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self._embedding_dim, distance=Distance.COSINE
                ),
            )
            print(
                f"Created new Qdrant collection: {self.collection_name} "
                f"(dim={self._embedding_dim})"
            )

    def _load_knowledge_base(self) -> None:
        """Load knowledge from JSON files and index them"""
        data_dir = "data"

        knowledge_files = [
            "vascular_health_rules.json",
            "lifestyle_rules.json",
            "sleep_rules.json",
            "pointer_lifestyle_evidence.json",
            "sprint_mind_evidence.json",
            "finger_multidomain_evidence.json",
        ]

        documents: List[Dict[str, Any]] = []

        for filename in knowledge_files:
            filepath = os.path.join(data_dir, filename)
            if not os.path.exists(filepath):
                continue

            try:
                with open(filepath, "r") as f:
                    data = json.load(f)

                domain = filename.replace("_rules.json", "")

                if isinstance(data, dict):
                    for key, content in data.items():
                        if isinstance(content, dict):
                            text = self._format_content(content, str(key))
                        else:
                            text = str(content)

                        documents.append(
                            {
                                "text": text,
                                "domain": domain,
                                "source": filename,
                                "key": str(key),
                            }
                        )

                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            text = self._format_content(item, "")
                        else:
                            text = str(item)

                        documents.append(
                            {
                                "text": text,
                                "domain": domain,
                                "source": filename,
                                "key": "",
                            }
                        )

            except Exception as e:
                print(f"Error loading {filename}: {e}")

        if documents:
            print(f"Indexing {len(documents)} documents...")
            self._embed_and_index_documents(documents)

    def _format_content(self, content: dict, key: str) -> str:
        """Format dictionary content into readable text"""
        lines: List[str] = []
        if key:
            lines.append(f"{key}:")

        for k, v in content.items():
            if isinstance(v, dict):
                lines.append(f"  {k}:")
                for sub_k, sub_v in v.items():
                    lines.append(f"    {sub_k}: {sub_v}")
            elif isinstance(v, list):
                lines.append(f"  {k}: {', '.join(map(str, v))}")
            else:
                lines.append(f"  {k}: {v}")

        return "\n".join(lines)

    def _embed_and_index_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Embed documents and index them in Qdrant"""
        try:
            texts = [doc["text"] for doc in documents]
            embeddings = self._embed_texts(texts)

            points: List[PointStruct] = []
            for i, (doc, emb) in enumerate(zip(documents, embeddings), start=1):
                points.append(
                    PointStruct(
                        id=i,
                        vector=emb,
                        payload={
                            "text": doc["text"],
                            "domain": doc["domain"],
                            "source": doc["source"],
                            "key": doc.get("key", ""),
                        },
                    )
                )

            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=points,
            )

            print(f"Indexed {len(points)} documents in Qdrant")

        except Exception as e:
            print(f"Error embedding and indexing documents: {e}")

    # ── search ──────────────────────────────────────────────────

    def search(
        self, query: str, k: int = 5, threshold: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using Qdrant

        Args:
            query: Search query
            k: Number of results to return
            threshold: Minimum similarity threshold

        Returns:
            List of similar documents with metadata
        """
        try:
            query_embedding = self._embed_query(query)

            def _run_search(score_threshold: float):
                return self.qdrant_client.query_points(
                    collection_name=self.collection_name,
                    query=query_embedding,
                    limit=k,
                    score_threshold=score_threshold,
                ).points

            hits = _run_search(threshold)

            if not hits:
                hits = _run_search(0.1)

            results: List[Dict[str, Any]] = []
            for hit in hits:
                payload: Dict[str, Any] = hit.payload or {}

                results.append(
                    {
                        "content": payload.get("text", ""),
                        "similarity": hit.score,
                        "metadata": {
                            "domain": payload.get("domain", ""),
                            "source": payload.get("source", ""),
                            "key": payload.get("key", ""),
                        },
                    }
                )

            return results[:k]

        except Exception as e:
            print(f"Error searching: {e}")
            return []

    def search_by_domain(self, domain: str, k: int = 5) -> List[Dict[str, Any]]:
        """Search documents by domain"""
        try:
            points, _ = self.qdrant_client.scroll(
                collection_name=self.collection_name,
                query_filter={
                    "must": [
                        {
                            "key": "domain",
                            "match": {"value": domain},
                        }
                    ]
                },
                limit=k,
            )

            results: List[Dict[str, Any]] = []
            for point in points:
                payload: Dict[str, Any] = point.payload or {}

                results.append(
                    {
                        "content": payload.get("text", ""),
                        "metadata": {
                            "domain": payload.get("domain", ""),
                            "source": payload.get("source", ""),
                            "key": payload.get("key", ""),
                        },
                    }
                )

            return results

        except Exception as e:
            print(f"Error searching by domain: {e}")
            return []

    def get_recommendations(self, user_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get personalized recommendations based on user profile

        Args:
            user_profile: Dictionary with user health information

        Returns:
            List of relevant recommendations
        """
        recommendations: List[Dict[str, Any]] = []
        queries: List[str] = []

        if user_profile.get("processing_speed_low"):
            queries.append("processing speed cognitive decline brain health")

        if user_profile.get("hypertension"):
            queries.append("hypertension blood pressure SPRINT MIND cognitive")

        if user_profile.get("high_cholesterol"):
            queries.append("cholesterol lipid management cardiovascular cognitive")

        if user_profile.get("diabetes"):
            queries.append("diabetes glucose control cognitive health")

        if user_profile.get("sedentary"):
            queries.append("physical activity exercise aerobic cognitive benefit")

        if user_profile.get("poor_sleep"):
            queries.append("sleep quality sleep optimization cognitive function")

        seen_content: set[int] = set()
        for q in queries:
            results = self.search(q, k=3)
            for r in results:
                content = r.get("content", "")
                content_hash = hash(content)
                if content_hash not in seen_content:
                    seen_content.add(content_hash)
                    recommendations.append(r)

        return recommendations


def initialize_vector_store() -> VectorStore:
    """Initialize and return vector store"""
    return VectorStore()
