#!/usr/bin/env python3
"""
Simple test script for the summarization service
"""

import asyncio
import json
from app.services.summarization_service import summarization_service


async def test_summarization():
    """Test the summarization service with sample conversation"""

    print("Testing Summarization Service...")
    print("=" * 50)

    # Sample conversation
    user_message = "I'm having trouble with my Python code. I keep getting a 'ModuleNotFoundError' when trying to import pandas. I've installed it with pip but it's still not working."

    assistant_message = """The 'ModuleNotFoundError' for pandas is a common issue. Here are a few solutions to try:

1. **Check your Python environment**: Make sure you're using the same Python environment where you installed pandas. You can check this by running:
   ```bash
   python -c "import sys; print(sys.executable)"
   ```

2. **Verify pandas installation**: Run this to confirm pandas is installed:
   ```bash
   pip list | grep pandas
   ```

3. **Reinstall pandas**: Sometimes a clean reinstall helps:
   ```bash
   pip uninstall pandas
   pip install pandas
   ```

4. **Check for virtual environments**: If you're using a virtual environment, make sure it's activated before running your code.

5. **IDE configuration**: If you're using an IDE like VS Code or PyCharm, make sure it's using the correct Python interpreter.

Which of these would you like to try first?"""

    try:
        # Test conversation summary
        print("Generating conversation summary...")
        summary = await summarization_service.summarize_conversation_exchange(
            user_message=user_message, assistant_message=assistant_message
        )

        print("\nConversation Summary:")
        print(json.dumps(summary, indent=2))

        # Test session summary
        print("\n" + "=" * 50)
        print("Testing session summary...")

        messages = [
            {"user_id": "user", "message": "Hello, I need help with Python."},
            {
                "user_id": "assistant",
                "message": "Hello! I'd be happy to help you with Python. What specific issue are you facing?",
            },
            {"user_id": "user", "message": user_message},
            {"user_id": "assistant", "message": assistant_message},
        ]

        session_summary = await summarization_service.summarize_session_messages(
            messages=messages
        )

        print("\nSession Summary:")
        print(json.dumps(session_summary, indent=2))

        print("\n" + "=" * 50)
        print("✅ Summarization service test completed successfully!")

    except Exception as e:
        print(f"❌ Error testing summarization service: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_summarization())
