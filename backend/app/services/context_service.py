from typing import Dict, List, Optional
from app.services.database_service import database_service


class ContextService:
    """Service for building context for AI conversations"""

    def __init__(self):
        pass

    def build_public_chat_context(
        self, session_id: str, user_message: str, limit: int = 10
    ) -> str:
        """
        Build context for public chats by combining summaries and memories

        Args:
            session_id: The chat session ID
            user_message: The current user message
            limit: Maximum number of context items to include

        Returns:
            Formatted context string for the AI model
        """
        context_data = database_service.get_public_chat_context(session_id, limit)

        context_parts = []

        # Add session summary if available
        if context_data["session_summaries"]:
            session_summary = context_data["session_summaries"][0]
            context_parts.append("SESSION SUMMARY:")
            context_parts.append(
                f"- Key Insights: {', '.join(session_summary.get('key_insights', []))}"
            )
            context_parts.append(
                f"- Action Items: {', '.join(session_summary.get('action_items', []))}"
            )
            context_parts.append(
                f"- Context Notes: {', '.join(session_summary.get('context_notes', []))}"
            )
            context_parts.append(
                f"- Overall Summary: {session_summary.get('conversation_summary', '')}"
            )
            context_parts.append("")

        # Add recent conversation summaries
        if context_data["conversation_summaries"]:
            context_parts.append("RECENT CONVERSATION INSIGHTS:")
            for i, summary in enumerate(context_data["conversation_summaries"][:3], 1):
                context_parts.append(f"{i}. {summary.get('conversation_summary', '')}")
                if summary.get("key_insights"):
                    context_parts.append(
                        f"   Key Points: {', '.join(summary['key_insights'][:2])}"
                    )
            context_parts.append("")

        # Add important memories
        if context_data["memories"]:
            context_parts.append("IMPORTANT MEMORIES:")
            for memory in context_data["memories"][:5]:
                context_parts.append(
                    f"- {memory.get('key', '')}: {memory.get('value', '')}"
                )
            context_parts.append("")

        # Add recent messages for immediate context
        if context_data["recent_messages"]:
            context_parts.append("RECENT MESSAGES:")
            recent_messages = context_data["recent_messages"][:5]  # Last 5 messages
            for msg in reversed(recent_messages):  # Show in chronological order
                role = "User" if msg["user_id"] == "user" else "Assistant"
                context_parts.append(f"{role}: {msg['message'][:200]}...")
            context_parts.append("")

        # Add instructions for the model
        context_parts.append("INSTRUCTIONS:")
        context_parts.append(
            "- Use the above context to provide informed, contextual responses"
        )
        context_parts.append(
            "- Reference relevant insights and memories when appropriate"
        )
        context_parts.append("- Maintain consistency with previous conversations")
        context_parts.append("- Build upon established context and preferences")
        context_parts.append("")

        # Add the current user message
        context_parts.append(f"CURRENT USER MESSAGE: {user_message}")
        context_parts.append("")
        context_parts.append(
            "Please respond to the current user message, taking into account the context above."
        )

        return "\n".join(context_parts)

    def build_private_chat_context(
        self, session_id: str, user_message: str, limit: int = 10
    ) -> str:
        """
        Build context for private chats using only this session's data
        (isolated from other sessions but still includes summaries and memories)

        Args:
            session_id: The chat session ID
            user_message: The current user message
            limit: Maximum number of context items to include

        Returns:
            Formatted context string for the AI model
        """
        # Get context data from this session only (no cross-session data)
        context_data = database_service.get_private_chat_context(session_id, limit)

        context_parts = []

        # Add session summary if available (from this session only)
        if context_data["session_summaries"]:
            session_summary = context_data["session_summaries"][0]
            context_parts.append("SESSION SUMMARY:")
            context_parts.append(
                f"- Key Insights: {', '.join(session_summary.get('key_insights', []))}"
            )
            context_parts.append(
                f"- Action Items: {', '.join(session_summary.get('action_items', []))}"
            )
            context_parts.append(
                f"- Context Notes: {', '.join(session_summary.get('context_notes', []))}"
            )
            context_parts.append(
                f"- Overall Summary: {session_summary.get('conversation_summary', '')}"
            )
            context_parts.append("")

        # Add recent conversation summaries (from this session only)
        if context_data["conversation_summaries"]:
            context_parts.append("RECENT CONVERSATION INSIGHTS:")
            for i, summary in enumerate(context_data["conversation_summaries"][:3], 1):
                context_parts.append(f"{i}. {summary.get('conversation_summary', '')}")
                if summary.get("key_insights"):
                    context_parts.append(
                        f"   Key Points: {', '.join(summary['key_insights'][:2])}"
                    )
            context_parts.append("")

        # Add important memories (from this session only)
        if context_data["memories"]:
            context_parts.append("IMPORTANT MEMORIES:")
            for memory in context_data["memories"][:5]:
                context_parts.append(
                    f"- {memory.get('key', '')}: {memory.get('value', '')}"
                )
            context_parts.append("")

        # Add recent messages for immediate context (from this session only)
        if context_data["recent_messages"]:
            context_parts.append("RECENT MESSAGES:")
            recent_messages = context_data["recent_messages"][:5]  # Last 5 messages
            for msg in reversed(recent_messages):  # Show in chronological order
                role = "User" if msg["user_id"] == "user" else "Assistant"
                context_parts.append(f"{role}: {msg['message'][:200]}...")
            context_parts.append("")

        # Add instructions for the model
        context_parts.append("INSTRUCTIONS:")
        context_parts.append(
            "- Use the above context to provide informed, contextual responses"
        )
        context_parts.append(
            "- Reference relevant insights and memories when appropriate"
        )
        context_parts.append("- Maintain consistency with this conversation")
        context_parts.append("- Build upon established context and preferences")
        context_parts.append(
            "- This is a private conversation - focus only on this session"
        )
        context_parts.append("")

        # Add the current user message
        context_parts.append(f"CURRENT USER MESSAGE: {user_message}")
        context_parts.append("")
        context_parts.append(
            "Please respond to the current user message, taking into account the context above."
        )

        return "\n".join(context_parts)


# Global service instance
context_service = ContextService()
