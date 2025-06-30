#!/usr/bin/env python3
"""
Test script for the User Info Extraction feature
"""

import asyncio
import json
from app.services.user_info_extractor import user_info_extractor
from app.services.database_service import database_service


async def test_user_info_extraction():
    """Test the user info extraction functionality"""
    print("🧪 Testing User Info Extraction Feature")
    print("=" * 50)

    # Test messages with different types of information
    test_messages = [
        "My name is John Smith and I work as a software engineer at Google.",
        "I love playing guitar and hiking in the mountains on weekends.",
        "I prefer concise responses and I'm based in San Francisco.",
        "I have two kids and my wife is a teacher.",
        "My goal is to learn machine learning and I'm currently studying Python.",
        "I can't work late because I have family commitments.",
        "Hello, how are you today?",  # Should extract nothing
        "I'm a data scientist with 5 years of experience in Python and R.",
        "My hobbies include reading science fiction and cooking Italian food.",
        "I'm allergic to peanuts and I prefer vegetarian options.",
    ]

    print("📝 Testing extraction from various messages:")
    print("-" * 30)

    for i, message in enumerate(test_messages, 1):
        print(f"\n{i}. Message: {message}")

        try:
            # Test extraction
            result = await user_info_extractor.process_and_save_user_info(
                user_message=message, model="phi3:mini"
            )

            if result["status"] == "success":
                print(f"   ✅ Extraction successful")
                print(f"   📊 Extracted: {result['total_extracted']} items")
                print(f"   💾 Saved: {result['total_saved']} items")
                print(f"   ⏭️  Skipped: {result['total_skipped']} items")

                if result["saved_entries"]:
                    print("   📋 Saved entries:")
                    for entry in result["saved_entries"]:
                        print(
                            f"      - {entry['key']}: {entry['value']} ({entry['action']})"
                        )

                if result["skipped_entries"]:
                    print("   ⏭️  Skipped entries:")
                    for entry in result["skipped_entries"]:
                        print(
                            f"      - {entry['key']}: {entry['value']} ({entry['reason']})"
                        )
            else:
                print(
                    f"   ❌ Extraction failed: {result.get('error', 'Unknown error')}"
                )

        except Exception as e:
            print(f"   ❌ Error: {e}")

    print("\n" + "=" * 50)
    print("📊 Testing user info summary:")
    print("-" * 30)

    try:
        summary = user_info_extractor.get_user_info_summary()

        if summary["status"] == "success":
            print(f"✅ Summary generated successfully")
            print(f"📈 Total entries: {summary['total_entries']}")
            print(f"📂 Categories: {summary['category_count']}")

            print("\n📋 Categorized information:")
            for category, entries in summary["categories"].items():
                print(f"\n   {category.upper()}:")
                for entry in entries[:3]:  # Show first 3 entries per category
                    print(
                        f"      - {entry['key']}: {entry['value']} (importance: {entry['importance']})"
                    )
                if len(entries) > 3:
                    print(f"      ... and {len(entries) - 3} more entries")
        else:
            print(f"❌ Summary failed: {summary.get('error', 'Unknown error')}")

    except Exception as e:
        print(f"❌ Error getting summary: {e}")

    print("\n" + "=" * 50)
    print("🧹 Testing individual extraction:")
    print("-" * 30)

    # Test individual extraction
    test_message = "I'm Sarah, a UX designer who loves yoga and lives in Portland."
    print(f"Testing extraction: {test_message}")

    try:
        extraction_result = await user_info_extractor.extract_user_info(
            user_message=test_message, model="phi3:mini"
        )

        print(f"✅ Extraction result:")
        print(
            f"   Confidence level: {extraction_result.get('confidence_level', 'unknown')}"
        )

        if extraction_result.get("extracted_info"):
            print("   Extracted information:")
            for info in extraction_result["extracted_info"]:
                print(f"      - {info['key']}: {info['value']}")
                print(
                    f"        Category: {info['category']}, Confidence: {info['confidence']}, Importance: {info['importance']}"
                )
        else:
            print("   No information extracted")

    except Exception as e:
        print(f"❌ Error: {e}")

    print("\n" + "=" * 50)
    print("🎯 Testing memory integration:")
    print("-" * 30)

    # Test that extracted info is actually saved to memory
    try:
        all_memory = database_service.get_memory_entries(limit=100)
        print(f"📚 Total memory entries: {len(all_memory)}")

        if all_memory:
            print("📋 Recent memory entries:")
            for entry in all_memory[:5]:  # Show first 5 entries
                print(f"   - {entry['key']}: {entry['value']}")
                print(
                    f"     Category: {entry.get('category', 'unknown')}, Importance: {entry.get('importance', 1)}"
                )
        else:
            print("   No memory entries found")

    except Exception as e:
        print(f"❌ Error accessing memory: {e}")

    print("\n" + "=" * 50)
    print("✅ User Info Extraction test completed!")


if __name__ == "__main__":
    asyncio.run(test_user_info_extraction())
