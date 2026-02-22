"""
Google Gemini integration for language model responses.
Provides natural language generation for the chatbot and recommendation system.
"""

import os
import logging
from typing import Optional, Dict, List

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
logger = logging.getLogger(__name__)


class GeminiLLM:
    """Google Gemini language model for generating natural responses."""

    def __init__(self, model: str = "gemini-2.0-flash"):
        """
        Initialize Gemini LLM client.

        Args:
            model: Gemini model to use (default: gemini-2.0-flash)
        """
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")

        genai.configure(api_key=self.api_key)
        self.model_name = model
        self.is_initialized = True
        logger.info(f"Gemini LLM initialized with model: {model}")

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 500,
    ) -> str:
        """
        Generate a response from the LLM.

        Args:
            prompt: User prompt
            system_prompt: System instructions for the model
            temperature: Sampling temperature (0.0 to 2.0)
            max_tokens: Maximum tokens in response

        Returns:
            Generated text response
        """
        try:
            model = genai.GenerativeModel(
                self.model_name,
                system_instruction=system_prompt if system_prompt else None,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )

            response = model.generate_content(prompt)
            return response.text if response.text else ""
        except Exception as e:
            logger.error(f"Error generating response from Gemini: {e}")
            raise

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> str:
        """
        Generate a chat completion from conversation messages.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            system_prompt: System instructions for the model
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response

        Returns:
            Generated text response
        """
        try:
            model = genai.GenerativeModel(
                self.model_name,
                system_instruction=system_prompt if system_prompt else None,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                ),
            )

            # Convert OpenAI-style messages to Gemini format
            contents = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "system":
                    # System messages are handled via system_instruction
                    continue
                gemini_role = "model" if role == "assistant" else "user"
                contents.append({"role": gemini_role, "parts": [content]})

            # Gemini requires alternating user/model turns.
            # Merge consecutive same-role messages.
            merged: List[Dict] = []
            for c in contents:
                if merged and merged[-1]["role"] == c["role"]:
                    merged[-1]["parts"].extend(c["parts"])
                else:
                    merged.append(c)

            # Gemini requires the first message to be from 'user'
            if merged and merged[0]["role"] != "user":
                merged.insert(0, {"role": "user", "parts": ["Hello"]})

            response = model.generate_content(merged)
            return response.text if response.text else ""
        except Exception as e:
            logger.error(f"Error generating chat completion from Gemini: {e}")
            raise

    def generate_health_recommendation(
        self,
        user_profile: Dict,
        analysis_results: Dict,
        pillar: str = "general",
    ) -> str:
        """
        Generate health recommendations for a specific pillar.

        Args:
            user_profile: User profile data
            analysis_results: Analysis results from recommendation engine
            pillar: Health pillar (vascular_health, lifestyle, sleep, supplements)

        Returns:
            Generated recommendation text
        """
        pillar_descriptions = {
            "vascular_health": "vascular health and cardiovascular optimization",
            "lifestyle": "lifestyle modifications and daily habits",
            "sleep": "sleep quality and sleep optimization",
            "supplements": "supplements and nutritional support",
        }

        pillar_desc = pillar_descriptions.get(pillar, "health")

        system_prompt = (
            f"You are a health advisor specializing in {pillar_desc}. "
            "Based on the user's profile and cognitive assessment results, provide "
            "evidence-based, personalized recommendations. "
            "Keep recommendations actionable, specific, and grounded in research. "
            "Be encouraging and practical, not alarmist."
        )

        profile_str = (
            f"User Profile:\n"
            f"- Age: {user_profile.get('age', 'Unknown')}\n"
            f"- Gender: {user_profile.get('gender', 'Unknown')}\n"
            f"- Cognitive Concerns: {', '.join(user_profile.get('cognitive_concerns', []))}\n"
            f"- Vascular Risk Factors: {', '.join(user_profile.get('vascular_risk_factors', []))}\n"
            f"- Current Medications: {', '.join(user_profile.get('medications', []))}"
        )

        analysis_str = (
            f"Assessment Results:\n"
            f"- Key Impairments: {', '.join([i.get('domain', '') for i in analysis_results.get('key_impairments', [])])}\n"
            f"- Risk Level: {analysis_results.get('risk_level', 'Unknown')}"
        )

        prompt = (
            f"{profile_str}\n\n{analysis_str}\n\n"
            f"Based on this information, provide 3-5 specific, evidence-based "
            f"recommendations for {pillar_desc}. "
            f"For each recommendation, briefly explain why it matters for cognitive health."
        )

        return self.generate_response(
            prompt, system_prompt=system_prompt, temperature=0.7, max_tokens=800
        )

    def generate_supplement_explanation(
        self, supplement_name: str, benefit: str, user_condition: str
    ) -> str:
        """
        Generate an explanation for why a supplement is recommended.
        """
        system_prompt = (
            "You are a knowledgeable health science communicator. "
            "Explain supplements and their mechanisms in clear, accessible language. "
            "Reference scientific evidence when relevant but keep explanations "
            "digestible for general audiences."
        )

        prompt = (
            f"Why is {supplement_name} recommended for someone with {user_condition}?\n\n"
            f"Specifically, how does it support {benefit}?\n\n"
            "Provide a 2-3 sentence explanation that:\n"
            "1. Connects the supplement to the user's specific condition\n"
            "2. Explains the mechanism of action\n"
            "3. References any relevant clinical evidence if available"
        )

        return self.generate_response(
            prompt, system_prompt=system_prompt, temperature=0.6, max_tokens=400
        )

    def generate_cognitive_explanation(
        self, domain: str, score: float, threshold: float
    ) -> str:
        """
        Generate an explanation of cognitive test results.
        """
        severity = (
            "mild"
            if (threshold - score) < 10
            else "moderate" if (threshold - score) < 20 else "significant"
        )

        system_prompt = (
            "You are a neuropsychology communicator. "
            "Explain cognitive test results in a supportive, non-alarming way. "
            "Help users understand what scores mean and what they can do about it."
        )

        prompt = (
            f"Explain this cognitive test result in simple, supportive terms:\n\n"
            f"Domain: {domain.replace('_', ' ').title()}\n"
            f"User's Score: {score}/100\n"
            f"Normal Threshold: {threshold}/100\n"
            f"Severity: {severity}\n\n"
            "Create a brief (2-3 sentences), supportive explanation that:\n"
            "1. Acknowledges the finding without being alarming\n"
            "2. Explains what this domain measures\n"
            "3. Suggests this is often addressable through targeted interventions"
        )

        return self.generate_response(
            prompt, system_prompt=system_prompt, temperature=0.5, max_tokens=300
        )

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using Gemini.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors (768 dimensions)
        """
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=texts,
                task_type="retrieval_document",
            )
            return result["embedding"]
        except Exception as e:
            logger.error(f"Error generating embeddings from Gemini: {e}")
            raise

    def embed_query(self, text: str) -> List[float]:
        """
        Generate embedding for a single query text.

        Args:
            text: Query text to embed

        Returns:
            Embedding vector (768 dimensions)
        """
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_query",
            )
            return result["embedding"]
        except Exception as e:
            logger.error(f"Error generating query embedding from Gemini: {e}")
            raise

    def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Use Gemini vision to extract text from an image.

        Args:
            image_bytes: PNG image bytes

        Returns:
            Extracted text content
        """
        try:
            import base64

            model = genai.GenerativeModel(self.model_name)

            image_part = {
                "mime_type": "image/png",
                "data": image_bytes,
            }

            prompt = (
                "You are an OCR tool for ReCOGnAIze cognitive assessment reports. "
                "Extract ALL visible text from this report page as plain text. "
                "Preserve section titles, domain names, numeric scores, and labels "
                "like WEAK, AVERAGE, STRONG. "
                "Do not summarize or interpret. Just return the raw text in reading order."
            )

            response = model.generate_content([prompt, image_part])
            return (response.text or "").strip()
        except Exception as e:
            logger.error(f"Error extracting text with Gemini vision: {e}")
            raise


def get_gemini_instance(model: str = "gemini-2.0-flash") -> Optional[GeminiLLM]:
    """
    Get or create Gemini LLM instance.

    Args:
        model: Gemini model to use

    Returns:
        GeminiLLM instance or None if initialization fails
    """
    try:
        return GeminiLLM(model=model)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini LLM: {e}")
        return None
