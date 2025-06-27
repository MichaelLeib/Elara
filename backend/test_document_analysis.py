#!/usr/bin/env python3
"""
Test script for document analysis functionality
"""

import asyncio
import json
from app.services.document_service import document_service


async def test_document_analysis():
    """Test the document analysis functionality"""

    # Create a simple test document content
    test_content = """
    AI Tools for Code Development
    
    Artificial Intelligence tools have revolutionized the way developers write and maintain code. 
    These tools can help with various aspects of software development including:
    
    1. Code Generation: AI can generate boilerplate code, functions, and even entire classes based on comments or requirements.
    2. Code Review: AI tools can analyze code for potential bugs, security vulnerabilities, and style issues.
    3. Documentation: AI can automatically generate documentation from code comments and structure.
    4. Testing: AI can help generate test cases and identify edge cases that might be missed.
    5. Refactoring: AI can suggest improvements to code structure and performance.
    
    Popular AI tools for code development include:
    - GitHub Copilot
    - Amazon CodeWhisperer
    - Tabnine
    - Kite
    - IntelliCode
    
    These tools integrate with popular IDEs and can significantly improve developer productivity.
    """

    # Create test files
    test_files = [
        {"filename": "ai_tools_guide.txt", "content": test_content.encode("utf-8")}
    ]

    # Test prompt
    test_prompt = "What are the main benefits of using AI tools for code development?"

    print("Testing document analysis...")
    print(f"Prompt: {test_prompt}")
    print(f"Files: {[f['filename'] for f in test_files]}")
    print("-" * 50)

    try:
        # Perform analysis
        result = await document_service.analyze_documents(
            files=test_files,
            prompt=test_prompt,
            model="phi3:mini",  # or your default model
        )

        print("Analysis Result:")
        print(f"Status: {result['status']}")
        print(f"Method: {result['method']}")
        print(f"Documents processed: {result['documents_processed']}")
        print(f"Total text length: {result.get('total_text_length', 'N/A')}")
        print(f"Chunks analyzed: {result.get('chunks_analyzed', 'N/A')}")
        print("\nAnalysis:")
        print(result["analysis"])

    except Exception as e:
        print(f"Error: {str(e)}")


async def test_file_type_support():
    """Test file type support"""
    print("\nTesting file type support...")

    test_files = [
        "document.docx",
        "report.pdf",
        "data.txt",
        "readme.md",
        "config.json",
        "unsupported.exe",
    ]

    for filename in test_files:
        is_supported = document_service.is_supported_file(filename)
        print(f"{filename}: {'✓' if is_supported else '✗'}")


if __name__ == "__main__":
    print("Document Analysis Test Suite")
    print("=" * 50)

    # Test file type support
    asyncio.run(test_file_type_support())

    # Test document analysis
    asyncio.run(test_document_analysis())
