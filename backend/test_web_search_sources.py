#!/usr/bin/env python3
"""
Test script for web search sources functionality
"""

import asyncio
import json
from app.services.web_search_service import WebSearchService
from app.config.settings import settings


async def test_web_search_sources():
    """Test web search sources extraction"""
    print("🔍 Testing web search sources functionality...")

    # Initialize web search service
    web_search_service = WebSearchService()

    # Test query
    test_query = "latest AI developments 2024"

    print(f"Searching for: {test_query}")

    try:
        # Perform web search
        search_results = await web_search_service.perform_web_search(
            query=test_query, engine=settings.web_search_engine
        )

        print(f"Search status: {search_results.get('status')}")

        if search_results.get("status") == "success":
            # Extract sources
            sources = web_search_service.extract_sources_from_results(search_results)

            print(f"\n📊 Found {len(sources)} sources:")
            for i, source in enumerate(sources, 1):
                print(f"\n{i}. {source['title']}")
                print(f"   URL: {source['url']}")
                print(f"   Domain: {source['domain']}")
                print(f"   Favicon: {source['favicon_url']}")
                print(f"   Snippet: {source['snippet'][:100]}...")

            # Test formatting
            formatted = web_search_service.format_search_results(search_results)
            print(f"\n📝 Formatted results length: {len(formatted)} characters")
            print(f"First 200 chars: {formatted[:200]}...")

        else:
            print(f"Search failed: {search_results.get('error', 'Unknown error')}")

    except Exception as e:
        print(f"❌ Error during test: {e}")


if __name__ == "__main__":
    asyncio.run(test_web_search_sources())
