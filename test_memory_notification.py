#!/usr/bin/env python3
"""
Test script for memory notification feature
"""

import asyncio
import websockets
import json
import time


async def test_memory_notification():
    """Test the memory notification feature via WebSocket"""

    print("🧠 Testing Memory Notification Feature")
    print("=" * 50)

    # Connect to WebSocket
    uri = "ws://localhost:8000/api/chat"

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket")

            # Send a message that should trigger user info extraction
            test_message = {
                "message": "Hi I am 37 years old. I like coffee and I work as a software engineer.",
                "model": "tinyllama:1.1b",
                "isPrivate": False,  # Public chat to trigger extraction
            }

            print(f"📤 Sending message: {test_message['message']}")
            await websocket.send(json.dumps(test_message))

            # Listen for responses
            memory_updated_received = False
            start_time = time.time()

            while time.time() - start_time < 30:  # Wait up to 30 seconds
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)

                    print(f"📥 Received: {data.get('type', 'unknown')}")

                    if data.get("type") == "memory_updated":
                        print("🎉 Memory notification received!")
                        print(f"   Content: {data.get('content')}")
                        print(f"   Total saved: {data.get('total_saved')}")
                        print(f"   Saved items: {data.get('saved_items')}")
                        memory_updated_received = True
                        break
                    elif data.get("type") == "done":
                        print("✅ Chat response completed")
                        break
                    elif data.get("type") == "error":
                        print(f"❌ Error: {data.get('content')}")
                        break

                except asyncio.TimeoutError:
                    print("⏰ Timeout waiting for response")
                    break
                except json.JSONDecodeError:
                    print(f"📝 Raw response: {response}")
                    continue

            if memory_updated_received:
                print("✅ Memory notification test PASSED!")
            else:
                print("❌ Memory notification test FAILED - no notification received")

    except Exception as e:
        print(f"❌ Test failed with error: {e}")


if __name__ == "__main__":
    asyncio.run(test_memory_notification())
