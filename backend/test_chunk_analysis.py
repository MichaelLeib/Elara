#!/usr/bin/env python3
import asyncio
import base64
from typing import Dict, Union, List
from app.services.document_service import document_service
from app.services.ollama_service import ollama_service


async def test_chunk_analysis():
    """Test chunk analysis to debug the timeout issue"""

    # Create a simple test document
    test_content = "This is a test document. " * 1000  # Create a large document
    test_files: List[Dict[str, Union[str, bytes]]] = [
        {
            "filename": "test_document.txt",
            "content": base64.b64encode(test_content.encode()).decode(),
        }
    ]

    test_prompt = "What is this document about?"

    print("Testing chunk analysis...")
    print(f"Document size: {len(test_content)} characters")
    print(f"Model: phi3:mini")

    try:
        # Test the chunking logic first
        chunks = document_service.chunk_text(test_content, "phi3:mini")
        print(f"Number of chunks: {len(chunks)}")
        print(f"First chunk size: {len(chunks[0])} characters")

        # Test timeout calculation
        timeout = document_service.calculate_timeout(
            len(test_content), is_chunked=True, model_name="phi3:mini"
        )
        print(f"Calculated timeout: {timeout} seconds")

        # Test a single chunk analysis
        if chunks:
            chunk_prompt = f"Analyze this text: {chunks[0][:500]}..."
            print(
                f"Testing single chunk analysis with prompt length: {len(chunk_prompt)}"
            )

            try:
                response = await ollama_service.query_ollama(
                    chunk_prompt, timeout, "phi3:mini"
                )
                print(
                    f"Single chunk analysis successful! Response length: {len(response)}"
                )
                print(f"Response preview: {response[:100]}...")
            except Exception as e:
                print(f"Single chunk analysis failed: {e}")

        # Test full document analysis
        print("\nTesting full document analysis...")
        result = await document_service.analyze_documents(
            files=test_files, prompt=test_prompt, model="phi3:mini"
        )

        print("Full analysis result:")
        print(f"Status: {result['status']}")
        print(f"Method: {result['method']}")
        print(f"Analysis length: {len(result['analysis'])}")
        print(f"Analysis preview: {result['analysis'][:200]}...")

    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_chunk_analysis())
