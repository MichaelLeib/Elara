#!/usr/bin/env python3
"""
Test script for the Adaptive User Info Extraction feature
"""

import asyncio
import json
from app.services.user_info_extractor import user_info_extractor
from app.services.database_service import database_service
from app.config.settings import settings


async def test_adaptive_extraction():
    """Test the adaptive user info extraction functionality"""
    print("🧪 Testing Adaptive User Info Extraction Feature")
    print("=" * 60)

    # Test messages with different complexity levels
    test_messages = [
        # Simple messages (should use fast model)
        {
            "message": "My name is John Smith.",
            "expected_model": "phi3:mini",
            "description": "Simple name statement",
        },
        {
            "message": "I work as a developer.",
            "expected_model": "phi3:mini",
            "description": "Simple occupation statement",
        },
        {
            "message": "I like pizza and coffee.",
            "expected_model": "phi3:mini",
            "description": "Simple preferences",
        },
        # Complex messages (should use quality model)
        {
            "message": "I'm studying computer science because I want to work in AI, but I'm also interested in music production on the side, and I might be moving to San Francisco next year, although it depends on whether I get the job offer.",
            "expected_model": "phi3:mini",  # Will be overridden by chat model
            "description": "Complex multi-topic message with conditions",
        },
        {
            "message": "I work as a software engineer specializing in machine learning algorithms and distributed systems architecture, but I'm considering switching to a research role because I want to focus more on theoretical aspects.",
            "expected_model": "phi3:mini",  # Will be overridden by chat model
            "description": "Technical content with conditional statements",
        },
        {
            "message": "I might be moving to Portland next year, although it depends on whether my wife gets the teaching job she's applying for, and I'm also thinking about starting a side business in web development.",
            "expected_model": "phi3:mini",  # Will be overridden by chat model
            "description": "Uncertainty with multiple conditions",
        },
        # Edge cases
        {
            "message": "Hello, how are you today?",
            "expected_model": "phi3:mini",
            "description": "No relevant information",
        },
        {
            "message": "I'm a data scientist with 5 years of experience in Python and R, and I'm currently learning deep learning frameworks like TensorFlow and PyTorch.",
            "expected_model": "phi3:mini",  # Will be overridden by chat model
            "description": "Technical terms and experience",
        },
    ]

    print("📝 Testing adaptive model selection:")
    print("-" * 40)

    for i, test_case in enumerate(test_messages, 1):
        message = test_case["message"]
        expected_model = test_case["expected_model"]
        description = test_case["description"]

        print(f"\n{i}. {description}")
        print(f"   Message: {message[:80]}{'...' if len(message) > 80 else ''}")

        try:
            # Test extraction with adaptive mode
            result = await user_info_extractor.extract_user_info(
                user_message=message,
                chat_model="llama3.1:8b",  # Simulate a larger chat model
            )

            if result["status"] == "success" or "extraction_metadata" in result:
                metadata = result.get("extraction_metadata", {})
                actual_model = metadata.get("model_used", "unknown")
                reason = metadata.get("reason", "unknown")

                print(f"   ✅ Extraction successful")
                print(f"   🤖 Model used: {actual_model}")
                print(f"   📊 Reason: {reason}")
                print(f"   📈 Extracted: {len(result.get('extracted_info', []))} items")

                # Check if model choice was appropriate
                if "phi3:mini" in actual_model and "complex" in reason.lower():
                    print(f"   ⚠️  Warning: Simple message but complex model chosen")
                elif "llama3.1:8b" in actual_model and "simple" in reason.lower():
                    print(f"   ⚠️  Warning: Complex message but simple model chosen")
                else:
                    print(f"   ✅ Model choice appears appropriate")

                if result.get("extracted_info"):
                    print(f"    Extracted info:")
                    for info in result["extracted_info"][:3]:  # Show first 3
                        print(
                            f"      - {info['key']}: {info['value']} ({info['category']})"
                        )
                    if len(result["extracted_info"]) > 3:
                        print(f"      ... and {len(result['extracted_info']) - 3} more")
            else:
                print(
                    f"   ❌ Extraction failed: {result.get('error', 'Unknown error')}"
                )

        except Exception as e:
            print(f"   ❌ Error: {e}")

    print("\n" + "=" * 60)
    print("🔧 Testing different extraction modes:")
    print("-" * 40)

    # Test different modes
    test_message = "I'm Sarah, a UX designer who loves yoga and lives in Portland."

    for mode in ["adaptive", "fast", "quality"]:
        print(f"\nTesting {mode.upper()} mode:")

        # Temporarily change the setting
        original_setting = settings.user_info_extraction_model
        settings._user_info_extraction_model = mode

        try:
            result = await user_info_extractor.extract_user_info(
                user_message=test_message, chat_model="llama3.1:8b"
            )

            metadata = result.get("extraction_metadata", {})
            model_used = metadata.get("model_used", "unknown")
            reason = metadata.get("reason", "unknown")

            print(f"   Model used: {model_used}")
            print(f"   Reason: {reason}")
            print(f"   Items extracted: {len(result.get('extracted_info', []))}")

        except Exception as e:
            print(f"   Error: {e}")
        finally:
            # Restore original setting
            settings._user_info_extraction_model = original_setting

    print("\n" + "=" * 60)
    print("🔧 Testing complexity analysis:")
    print("-" * 40)

    # Test the complexity analysis function directly
    test_messages_for_analysis = [
        "Simple message.",
        "I work as a developer and I like coding.",
        "I'm studying computer science because I want to work in AI, but I'm also interested in music production on the side.",
        "I might be moving to San Francisco next year, although it depends on whether I get the job offer.",
        "I work as a software engineer specializing in machine learning algorithms and distributed systems architecture.",
    ]

    for message in test_messages_for_analysis:
        complexity = user_info_extractor.analyze_message_complexity(message)
        print(f"\nMessage: {message[:60]}{'...' if len(message) > 60 else ''}")
        print(f"  Length: {complexity['length']}")
        print(f"  Complex connectors: {complexity['has_complex_connectors']}")
        print(f"  Conditional statements: {complexity['has_conditional_statements']}")
        print(f"  Uncertainty: {complexity['has_uncertainty']}")
        print(f"  Technical terms: {complexity['has_technical_terms']}")
        print(f"  Multiple topics: {complexity['has_multiple_topics']}")
        print(f"  Info density: {complexity['info_density']:.2f}")

    print("\n" + "=" * 60)
    print("✅ Adaptive User Info Extraction test completed!")


if __name__ == "__main__":
    asyncio.run(test_adaptive_extraction())
