"""
LLM Provider abstraction layer.
Returns the configured LLM (Gemini by default, OpenAI as fallback).
"""

import os
import logging

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Environment variable to override the default provider.
# Accepted values: "google" (default) | "openai"
_PROVIDER = os.getenv("LLM_PROVIDER", "google").lower()


def get_llm():
    """
    Return an LLM instance based on the configured provider.

    Default: Google Gemini (requires GOOGLE_API_KEY).
    Fallback: OpenAI (requires OPENAI_API_KEY).
    Override: set LLM_PROVIDER=openai in .env to force OpenAI.
    """
    if _PROVIDER == "openai":
        from openai_llm import OpenAILLM

        logger.info("Using OpenAI LLM provider")
        return OpenAILLM()

    # Default: Gemini
    try:
        from gemini_llm import GeminiLLM

        logger.info("Using Google Gemini LLM provider")
        return GeminiLLM()
    except Exception as e:
        logger.warning(f"Gemini init failed ({e}), falling back to OpenAI")
        from openai_llm import OpenAILLM

        return OpenAILLM()


def get_provider_name() -> str:
    """Return the name of the active LLM provider for display purposes."""
    if _PROVIDER == "openai":
        return "openai"
    if os.getenv("GOOGLE_API_KEY"):
        return "google"
    # Fallback scenario
    return "openai"


def get_embedding_dimension() -> int:
    """Return the embedding vector dimension for the active provider."""
    if get_provider_name() == "google":
        return 768  # Gemini text-embedding-004
    return 1536  # OpenAI text-embedding-3-small
