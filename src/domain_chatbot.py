"""
Domain-focused chatbot for ReCOGnAIze Cognitive Health Companion
Provides answers within the cognitive health and vascular risk management domain.
LLM provider: Google Gemini (default) or OpenAI (fallback).
"""

import os
from typing import List, Dict, Optional
import sys

# Ensure src/ is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.vector_store import initialize_vector_store
from src.llm_provider import get_llm, get_provider_name


class DomainChatbot:
    """
    Chatbot that answers questions within the cognitive health domain
    using the knowledge base from vascular_health, lifestyle, and sleep rules.
    """

    def __init__(self):
        """Initialize the chatbot with the configured LLM provider and vector store."""
        self._llm = get_llm()
        self._provider = get_provider_name()
        self.vector_store = initialize_vector_store()

        self.system_prompt = (
            "You are an expert AI health advisor specialized in cognitive health, "
            "vascular cognitive impairment (VCI), and brain-protective lifestyle interventions. "
            "You have access to evidence-based information from the ReCOGnAIze research study "
            "(Mohammed et al., 2025), SPRINT MIND trial, and validated lifestyle intervention frameworks.\n\n"
            "Your role is to:\n"
            "1. Answer questions about cognitive health, VCI, processing speed, executive function, and related topics\n"
            "2. Provide evidence-based information about blood pressure management, cholesterol, diabetes control, "
            "   and their relationship to cognitive health\n"
            "3. Recommend lifestyle interventions including physical activity, diet (DASH/Mediterranean/MIND), sleep "
            "   optimization, and cognitive engagement\n"
            "4. Contextualize information within the framework of vascular risk factors and brain health\n"
            "5. Be conversational, warm, and supportive while maintaining scientific accuracy\n"
            "6. Direct users to healthcare providers for medical decisions or diagnoses\n\n"
            "FORMATTING & USER EXPERIENCE:\n"
            "- Whenever you explain a concept like mild cognitive impairment (MCI) or other conditions, "
            "structure your answer into clear sections with short headings on their own line "
            "(for example: 'Mild Cognitive Impairment (MCI)', 'Key points', 'Common symptoms', 'Types of MCI', "
            "'Important note').\n"
            "- Put bullet-style items on separate lines starting with '\u2022 ', not '-'.\n"
            "- Use short paragraphs (2\u20133 sentences) and concise bullet points so older adults can read them easily.\n"
            "- When appropriate, open with one short empathetic sentence (for example: 'I understand this can be concerning...').\n"
            "- Whenever you give practical advice, end with a short section that begins with 'Here is what you can do today:' and list 2\u20134 simple bullet points.\n"
            "- Do not use markdown headings (no #, ##, ###) or HTML; plain text only.\n\n"
            "IMPORTANT CONSTRAINTS:\n"
            "- You are NOT a substitute for medical advice - always encourage consultation with healthcare providers\n"
            "- Stay within the cognitive health and vascular risk domain - decline off-topic questions politely\n"
            "- Support your answers with relevant research or evidence when appropriate\n"
            "- Be honest about uncertainty - if you don't know, say so\n"
            "- Avoid making diagnostic claims - frame guidance as educational and risk-reduction focused"
        )

    def get_context(self, query: str, k: int = 5) -> str:
        """
        Search the knowledge base for relevant context.

        Args:
            query: User question
            k: Number of documents to retrieve

        Returns:
            Formatted context string from knowledge base
        """
        try:
            results = self.vector_store.search(query, k=k, threshold=0.3)

            if not results:
                results = self.vector_store.search(query, k=k, threshold=0.1)

            if not results:
                return ""

            context_parts = []
            for i, result in enumerate(results, 1):
                metadata = result.get('metadata', {})
                source = metadata.get('domain', 'unknown')
                context_parts.append(f"[{source}]: {result['content']}")

            context = "\n\n".join(context_parts)

            if len(context) > 2000:
                context = context[:2000] + "\n\n[... knowledge base context truncated for length ...]"

            return context

        except Exception as e:
            print(f"Error retrieving context: {e}")
            return ""

    def generate_response(self, query: str, conversation_history: Optional[List[Dict]] = None) -> str:
        """
        Generate a response to the user query using the knowledge base.

        Args:
            query: User question or prompt
            conversation_history: List of previous messages for context

        Returns:
            AI-generated response
        """
        try:
            context = self.get_context(query, k=5)

            messages: List[Dict[str, str]] = []

            if conversation_history:
                recent_history = conversation_history[-6:]
                for msg in recent_history:
                    messages.append({
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", ""),
                    })

            if context:
                user_message = (
                    "Based on the following knowledge base information, please answer this question:\n\n"
                    f"KNOWLEDGE BASE:\n{context}\n\n"
                    f"QUESTION: {query}\n\n"
                    "Please provide a helpful, evidence-based answer that addresses the question directly."
                )
            else:
                user_message = query

            messages.append({"role": "user", "content": user_message})

            result = self._llm.chat_completion(
                messages=messages,
                system_prompt=self.system_prompt,
                temperature=0.7,
                max_tokens=800,
            )

            return result if result else "I couldn't generate a response. Please try again."

        except Exception as e:
            return f"I encountered an error while processing your question: {str(e)}. Please try again."

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> str:
        """
        Run a chat completion against the configured LLM provider.

        This is a convenience method used by backend_app.py for report-based
        prompts that build their own message list.

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: System instructions
            temperature: Sampling temperature
            max_tokens: Maximum output tokens

        Returns:
            Generated text response
        """
        return self._llm.chat_completion(
            messages=messages,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def check_domain_relevance(self, query: str) -> bool:
        """
        Check if the query is relevant to the cognitive health domain.

        Args:
            query: User question

        Returns:
            True if relevant to domain, False otherwise
        """
        try:
            results = self.vector_store.search(query, k=1, threshold=0.1)

            domain_keywords = [
                'cognitive', 'brain', 'health', 'memory', 'blood pressure', 'exercise',
                'diet', 'sleep', 'vascular', 'dementia', 'assessment', 'recognaize',
                'processing', 'attention', 'executive', 'cholesterol', 'diabetes',
                'dash', 'mediterranean', 'intervention', 'lifestyle',
            ]

            query_lower = query.lower()
            has_keywords = any(keyword in query_lower for keyword in domain_keywords)

            return len(results) > 0 or has_keywords

        except Exception as e:
            print(f"Error checking domain relevance: {e}")
            return True


def initialize_chatbot() -> DomainChatbot:
    """Initialize and return the domain chatbot."""
    return DomainChatbot()
