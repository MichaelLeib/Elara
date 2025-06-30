#!/usr/bin/env python3
"""
Test script to verify small model optimizations
"""

from app.services.document_service import document_service, ModelRegistry


def test_small_model_optimizations():
    """Test small model optimizations"""

    print("Testing small model optimizations...")

    # Test small model detection
    small_models = ["tinyllama:1.1b", "llama3.2:1b"]
    regular_models = ["phi3:mini", "llama3:latest", "dolphin-mistral:7b", "gemma:2b"]

    print("\n1. Testing small model detection:")
    for model in small_models:
        is_small = ModelRegistry.is_small_model(model)
        print(
            f"   {model}: {'✅ Small model' if is_small else '❌ Not detected as small'}"
        )
        assert is_small, f"{model} should be detected as small model"

    for model in regular_models:
        is_small = ModelRegistry.is_small_model(model)
        print(
            f"   {model}: {'❌ Incorrectly detected as small' if is_small else '✅ Regular model'}"
        )
        assert not is_small, f"{model} should not be detected as small model"

    # Test chunk size optimization
    print("\n2. Testing chunk size optimization:")
    test_text = "This is a test document. " * 100  # 2400 characters

    for model in small_models:
        chunk_size = ModelRegistry.get_optimal_chunk_size(model)
        print(f"   {model}: {chunk_size} characters per chunk")
        # Small models should have smaller chunk sizes
        assert chunk_size < 2000, f"{model} should have small chunk size (< 2000 chars)"

    for model in regular_models:
        chunk_size = ModelRegistry.get_optimal_chunk_size(model)
        print(f"   {model}: {chunk_size} characters per chunk")
        # Regular models should have larger chunk sizes
        assert (
            chunk_size > 2000
        ), f"{model} should have larger chunk size (> 2000 chars)"

    # Test prompt optimization
    print("\n3. Testing prompt optimization:")
    test_prompt = "What is this document about?"

    # Test small model prompt
    small_prompt = document_service._get_optimized_prompt(
        test_prompt, "tinyllama:1.1b", is_chunk=False
    )
    print(f"   Small model prompt (first 100 chars): {small_prompt[:100]}...")
    assert (
        "Analyze this document and answer:" in small_prompt
    ), "Small model should get simplified prompt"

    # Test regular model prompt
    regular_prompt = document_service._get_optimized_prompt(
        test_prompt, "phi3:mini", is_chunk=False
    )
    print(f"   Regular model prompt (first 100 chars): {regular_prompt[:100]}...")
    assert (
        "Provide a clear, concise analysis" in regular_prompt
    ), "Regular model should get detailed prompt"

    # Test chunk prompt optimization
    small_chunk_prompt = document_service._get_optimized_prompt(
        test_prompt, "tinyllama:1.1b", is_chunk=True
    )
    print(
        f"   Small model chunk prompt (first 100 chars): {small_chunk_prompt[:100]}..."
    )
    assert (
        "Extract key points about:" in small_chunk_prompt
    ), "Small model should get simplified chunk prompt"

    regular_chunk_prompt = document_service._get_optimized_prompt(
        test_prompt, "phi3:mini", is_chunk=True
    )
    print(
        f"   Regular model chunk prompt (first 100 chars): {regular_chunk_prompt[:100]}..."
    )
    assert (
        "Brief analysis focusing on the question:" in regular_chunk_prompt
    ), "Regular model should get detailed chunk prompt"

    print("\n🎉 All small model optimization tests passed!")


if __name__ == "__main__":
    test_small_model_optimizations()
