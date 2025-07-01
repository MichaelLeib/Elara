#!/usr/bin/env python3
"""
Test script for WebSocket connection handling during image analysis
"""

import asyncio
import websockets
import json
import base64
import os
from pathlib import Path


async def test_websocket_image_analysis():
    """Test WebSocket image analysis with connection handling"""

    print("=== WebSocket Image Analysis Test ===")

    # Create a simple test image (1x1 pixel PNG)
    test_png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    )

    uri = "ws://localhost:8000/api/chat"

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")

            # Prepare test message with image
            test_message = {
                "message": "What do you see in this image?",
                "model": "llava:7b",
                "files": [
                    {
                        "filename": "test_image.png",
                        "content": base64.b64encode(test_png).decode(),
                    }
                ],
            }

            print("📤 Sending image analysis request...")
            await websocket.send(json.dumps(test_message))

            # Listen for responses
            response_count = 0
            max_responses = 20  # Limit to prevent infinite loop

            while response_count < max_responses:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                    data = json.loads(response)
                    response_count += 1

                    print(
                        f"📥 Response {response_count}: {data.get('type', 'unknown')}"
                    )

                    if data.get("type") == "image_analysis" and data.get("done"):
                        print("✅ Image analysis completed successfully!")
                        print(f"📝 Analysis: {data.get('content', '')[:100]}...")
                        break
                    elif data.get("type") == "error":
                        print(f"❌ Error: {data.get('content', '')}")
                        break
                    elif data.get("type") == "status":
                        print(
                            f"📊 Status: {data.get('content', '')} ({data.get('progress', 0)}%)"
                        )

                except asyncio.TimeoutError:
                    print("⏰ Timeout waiting for response")
                    break
                except websockets.exceptions.ConnectionClosed:
                    print("🔌 WebSocket connection closed")
                    break

            if response_count >= max_responses:
                print("⚠️ Reached maximum response count")

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("💡 Make sure the backend server is running on localhost:8000")


if __name__ == "__main__":
    print("🧪 Testing WebSocket Image Analysis")
    print("=" * 50)
    asyncio.run(test_websocket_image_analysis())
    print("=" * 50)
    print("🎉 Test completed!")
