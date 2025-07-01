#!/usr/bin/env python3
"""
Simple test script for the web search service
"""

import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.services.web_search_service import web_search_service
from app.config.settings import settings


async def test_web_search():
    """Test the web search functionality"""

    print("Testing Web Search Service")
    print("=" * 50)

    # Test cases
    test_messages = [
        "What is the latest news about AI?",
        "How much does a Tesla Model 3 cost?",
        "What's the weather like in New York?",
        "Tell me about Python programming",
        "What are the best restaurants near me?",
        "Hello, how are you today?",
    ]

    for message in test_messages:
        print(f"\nTesting message: '{message}'")
        print("-" * 30)

        try:
            # Check if web search is needed
            decision = await web_search_service.should_perform_web_search(message)

            print(f"Should search: {decision.get('should_search', False)}")
            print(f"Confidence: {decision.get('confidence', 'low')}")
            print(f"Reason: {decision.get('reason', 'Unknown')}")
            print(f"Search terms: {decision.get('search_terms', 'None')}")

            # If search is needed, perform it
            if decision.get("should_search", False) and settings.web_search_enabled:
                print("Performing web search...")
                search_terms = decision.get("search_terms", message)
                results = await web_search_service.search_and_format(
                    query=search_terms, engine=settings.web_search_engine
                )
                print(f"Search results length: {len(results)} characters")
                print(f"First 200 chars: {results[:200]}...")
            else:
                print("No web search performed")

        except Exception as e:
            print(f"Error: {e}")

    print("\n" + "=" * 50)
    print("Test completed!")


if __name__ == "__main__":
    asyncio.run(test_web_search())
