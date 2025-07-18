import json
from typing import Dict, List, Optional, Tuple
from app.services.ollama_service import ollama_service
from app.config.settings import settings


class SummarizationService:
    """Service for summarizing chat conversations and extracting key insights"""

    def __init__(self):
        self.summary_prompt_template = """You are an expert conversation analyst. Your task is to analyze the last two messages in a conversation and create a concise, insightful summary.

CONVERSATION CONTEXT:
User Message: {user_message}
Assistant Response: {assistant_message}

IMPORTANT: You must respond with ONLY valid JSON. No other text, no explanations, no markdown formatting.

Return this exact JSON structure:
{{
    "key_insights": [
        "List 2-3 most important insights or discoveries from this exchange"
    ],
    "action_items": [
        "List any specific actions, tasks, or next steps mentioned or implied"
    ],
    "context_notes": [
        "Important context, preferences, or information that should be remembered"
    ],
    "conversation_summary": "A 1-2 sentence summary of what was discussed",
    "confidence_level": "high|medium|low",
    "topics": [
        "List the main topics or themes discussed"
    ]
}}

Guidelines:
- Focus on extracting actionable insights and important context
- Be concise but comprehensive
- Identify patterns, preferences, or recurring themes
- Note any decisions made or conclusions reached
- Highlight information that would be valuable for future conversations
- If the exchange is trivial or doesn't contain significant insights, mark confidence as "low"
- Use "high" confidence only for exchanges with clear, actionable insights
- Use "medium" confidence for exchanges with some useful information
- Use "low" confidence for casual greetings, simple questions, or trivial exchanges

CRITICAL: Respond with ONLY the JSON object. No other text."""

    async def summarize_conversation_exchange(
        self,
        user_message: str,
        assistant_message: str,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> Dict:
        """
        Summarize a conversation exchange between user and assistant

        Args:
            user_message: The user's message
            assistant_message: The assistant's response
            model: Optional model to use for summarization
            timeout: Optional timeout in seconds (default: 30.0, longer for document analysis)

        Returns:
            Dict containing structured summary with key insights, action items, etc.
        """
        try:
            # Use custom prompt from settings if available, otherwise use default
            custom_prompt = settings.summarization_prompt.strip()
            if custom_prompt:
                # Use custom prompt with placeholders for user and assistant messages
                prompt = custom_prompt.replace("{user_message}", user_message).replace(
                    "{assistant_message}", assistant_message
                )
            else:
                # Use default prompt template
                prompt = self.summary_prompt_template.format(
                    user_message=user_message, assistant_message=assistant_message
                )

            # Use provided timeout or default, with longer timeout for document analysis
            if timeout is None:
                # Check if this is a document analysis summary (contains longer assistant message)
                if (
                    len(assistant_message) > 1000
                    or "Document Analysis Request:" in user_message
                ):
                    timeout = 180.0  # Much longer timeout for document analysis
                    print(
                        f"[SummarizationService] Using longer timeout (180s) for document analysis summary (message_len={len(assistant_message)})"
                    )
                else:
                    timeout = 30.0  # Default timeout for regular conversations
                    print(
                        f"[SummarizationService] Using default timeout (30s) for regular conversation summary (message_len={len(assistant_message)})"
                    )
            else:
                print(
                    f"[SummarizationService] Using provided timeout ({timeout}s) for summary generation"
                )

            # Get summary from Ollama
            print(
                f"[SummarizationService] Calling ollama_service.query_ollama with timeout={timeout}, prompt_len={len(prompt)}"
            )
            response = await ollama_service.query_ollama(
                prompt=prompt, timeout=timeout, model=model or settings.SUMMARY_MODEL
            )
            print(f"[SummarizationService] Summary generation completed successfully")

            # Parse the JSON response
            try:
                summary_data = json.loads(response.strip())
                return self._validate_and_clean_summary(summary_data)
            except json.JSONDecodeError:
                # Fallback: create a basic summary if JSON parsing fails
                return self._create_fallback_summary(
                    user_message, assistant_message, response
                )

        except Exception as e:
            # Return error summary
            return {
                "key_insights": [],
                "action_items": [],
                "context_notes": [f"Error generating summary: {str(e)}"],
                "conversation_summary": "Summary generation failed",
                "confidence_level": "low",
                "topics": [],
                "error": str(e),
            }

    def _validate_and_clean_summary(self, summary_data: Dict) -> Dict:
        """Validate and clean the summary data structure"""
        required_fields = [
            "key_insights",
            "action_items",
            "context_notes",
            "conversation_summary",
            "confidence_level",
            "topics",
        ]

        # Ensure all required fields exist
        cleaned_summary = {}
        for field in required_fields:
            if field in summary_data:
                cleaned_summary[field] = summary_data[field]
            else:
                # Provide defaults for missing fields
                if field in ["key_insights", "action_items", "context_notes", "topics"]:
                    cleaned_summary[field] = []
                elif field == "conversation_summary":
                    cleaned_summary[field] = "No summary available"
                elif field == "confidence_level":
                    cleaned_summary[field] = "low"

        # Ensure lists are actually lists
        for field in ["key_insights", "action_items", "context_notes", "topics"]:
            if not isinstance(cleaned_summary[field], list):
                cleaned_summary[field] = []

        # Validate confidence level
        if cleaned_summary["confidence_level"] not in ["high", "medium", "low"]:
            cleaned_summary["confidence_level"] = "low"

        return cleaned_summary

    def _create_fallback_summary(
        self, user_message: str, assistant_message: str, raw_response: str
    ) -> Dict:
        """Create a fallback summary when JSON parsing fails"""
        return {
            "key_insights": [
                "Conversation occurred but summary parsing failed",
                f"User message length: {len(user_message)} characters",
                f"Assistant response length: {len(assistant_message)} characters",
            ],
            "action_items": [],
            "context_notes": [
                "Raw summary response available but not properly formatted",
                f"Raw response: {raw_response[:200]}...",
            ],
            "conversation_summary": "Summary generation completed but parsing failed",
            "confidence_level": "low",
            "topics": ["conversation", "summary_error"],
        }

    async def summarize_session_messages(
        self, messages: List[Dict], model: Optional[str] = None
    ) -> Dict:
        """
        Summarize an entire chat session

        Args:
            messages: List of message dictionaries from the session
            model: Optional model to use for summarization

        Returns:
            Dict containing session-level summary
        """
        if not messages or len(messages) < 2:
            return {
                "key_insights": [],
                "action_items": [],
                "context_notes": ["Insufficient messages for session summary"],
                "conversation_summary": "Session too short to summarize",
                "confidence_level": "low",
                "topics": [],
                "message_count": len(messages) if messages else 0,
            }

        # Create a session-level prompt
        session_prompt = f"""You are an expert conversation analyst. Analyze this entire chat session and provide a comprehensive summary.

CHAT SESSION ({len(messages)} messages):
"""

        for i, msg in enumerate(messages, 1):
            role = "User" if msg["user_id"] == "user" else "Assistant"
            session_prompt += f"\n{i}. {role}: {msg['message']}\n"

        session_prompt += """

IMPORTANT: You must respond with ONLY valid JSON. No other text, no explanations, no markdown formatting.

Return this exact JSON structure:
{
    "key_insights": [
        "List 3-5 most important insights from the entire session"
    ],
    "action_items": [
        "List any specific actions, tasks, or next steps mentioned"
    ],
    "context_notes": [
        "Important context, preferences, or information to remember"
    ],
    "conversation_summary": "A 2-3 sentence summary of the entire session",
    "confidence_level": "high|medium|low",
    "topics": [
        "List the main topics or themes discussed"
    ],
    "session_quality": "excellent|good|fair|poor",
    "recommended_follow_up": [
        "Suggest 1-2 follow-up questions or actions"
    ]
}

Guidelines:
- Focus on the most important insights across the entire conversation
- Identify patterns, decisions, and key learnings
- Note any unresolved questions or incomplete tasks
- Highlight information valuable for future conversations
- Assess the overall quality and completeness of the session
- Use "excellent" quality for sessions with clear outcomes and valuable insights
- Use "good" quality for sessions with useful information but room for improvement
- Use "fair" quality for sessions with some value but limited depth
- Use "poor" quality for sessions with minimal value or unclear outcomes

CRITICAL: Respond with ONLY the JSON object. No other text."""

        try:
            response = await ollama_service.query_ollama(
                prompt=session_prompt,
                timeout=60.0,
                model=model or settings.SUMMARY_MODEL,
            )

            try:
                summary_data = json.loads(response.strip())
                validated_summary = self._validate_and_clean_summary(summary_data)
                validated_summary["message_count"] = len(messages)
                return validated_summary
            except json.JSONDecodeError:
                return self._create_fallback_summary("", "", response)

        except Exception as e:
            return {
                "key_insights": [],
                "action_items": [],
                "context_notes": [f"Session summary error: {str(e)}"],
                "conversation_summary": "Session summary generation failed",
                "confidence_level": "low",
                "topics": [],
                "message_count": len(messages),
                "error": str(e),
            }


# Global service instance
summarization_service = SummarizationService()
