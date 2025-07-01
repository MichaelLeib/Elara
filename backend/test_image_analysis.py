#!/usr/bin/env python3
"""
Test script for image analysis functionality
"""

import asyncio
import base64
import os
from pathlib import Path
from app.services.image_service import (
    image_service,
    ImageModelRegistry,
    ImageAnalysisStrategy,
)


async def test_image_analysis():
    """Test the image analysis functionality"""

    print("=== Image Analysis Test ===")

    # Test 1: Check if vision models are available
    print("\n1. Checking available vision models...")
    best_model = await ImageModelRegistry.find_best_vision_model()
    print(f"Best available vision model: {best_model}")

    # Test 2: Test prompt intent analysis
    print("\n2. Testing prompt intent analysis...")
    test_prompts = [
        "Describe what you see in this image",
        "Find all the text in this image",
        "What is the overall scene?",
        "Locate specific objects in this image",
    ]

    for prompt in test_prompts:
        intent = ImageAnalysisStrategy.analyze_prompt_intent(prompt)
        print(f"Prompt: '{prompt}'")
        print(f"Intent: {intent}")
        print()

    # Test 3: Test image scaling and splitting logic
    print("\n3. Testing image processing logic...")
    test_sizes = [(800, 600), (2048, 1536), (4096, 3072)]

    for size in test_sizes:
        should_scale = ImageAnalysisStrategy.should_scale_image(size, best_model)
        should_split = ImageAnalysisStrategy.should_split_image(size, best_model)
        print(f"Image size {size}: scale={should_scale}, split={should_split}")

    # Test 4: Test supported image formats
    print("\n4. Testing supported image formats...")
    test_files = [
        "test.jpg",
        "test.png",
        "test.gif",
        "test.bmp",
        "test.webp",
        "test.tiff",
        "test.txt",
        "test.pdf",
    ]

    for filename in test_files:
        is_supported = image_service.is_supported_image(filename)
        print(f"{filename}: {'✓' if is_supported else '✗'}")

    print("\n=== Test completed ===")


if __name__ == "__main__":
    asyncio.run(test_image_analysis())
