#!/usr/bin/env python3
"""
Test script for memory notification feature using REST API
"""

import requests
import json


def test_memory_notification_rest():
    """Test the memory notification feature via REST API"""

    print("🧠 Testing Memory Notification Feature (REST API)")
    print("=" * 50)

    # First, create a public chat session
    print("1. Creating public chat session...")
    create_session_response = requests.post(
        "http://localhost:8000/api/chat-sessions",
        json={"title": "Memory Test Chat", "isPrivate": False},
    )

    if create_session_response.status_code != 200:
        print(
            f"❌ Failed to create chat session: {create_session_response.status_code}"
        )
        return

    session_data = create_session_response.json()
    session_id = session_data["session"]["id"]
    print(f"✅ Created public chat session: {session_id}")

    # Send a message that should trigger user info extraction
    print("\n2. Sending message with personal information...")
    test_message = (
        "Hi I am 37 years old. I like coffee and I work as a software engineer."
    )

    send_message_response = requests.post(
        f"http://localhost:8000/api/chat-sessions/{session_id}/send-message",
        json={"message": test_message, "model": "tinyllama:1.1b", "user_id": "user"},
    )

    if send_message_response.status_code != 200:
        print(f"❌ Failed to send message: {send_message_response.status_code}")
        print(f"Response: {send_message_response.text}")
        return

    response_data = send_message_response.json()
    print("✅ Message sent successfully")

    # Check if user info extraction occurred
    user_info_extraction = response_data.get("user_info_extraction")
    if user_info_extraction:
        print(f"\n3. User info extraction results:")
        print(f"   Status: {user_info_extraction.get('status')}")
        print(f"   Total extracted: {user_info_extraction.get('total_extracted', 0)}")
        print(f"   Total saved: {user_info_extraction.get('total_saved', 0)}")
        print(f"   Total skipped: {user_info_extraction.get('total_skipped', 0)}")

        saved_entries = user_info_extraction.get("saved_entries", [])
        if saved_entries:
            print(f"\n   📋 Saved entries:")
            for entry in saved_entries:
                print(
                    f"      - {entry.get('key')}: {entry.get('value')} ({entry.get('action')})"
                )

            print("\n✅ Memory notification test PASSED!")
            print("   The backend successfully extracted and saved user information.")
            print("   In the frontend, this would trigger a memory notification.")
        else:
            print("\n⚠️  No items were saved to memory")
            print("   This could be due to low confidence or importance scores")
    else:
        print("\n❌ No user info extraction data in response")

    # Check the memory to see what was actually saved
    print("\n4. Checking memory contents...")
    memory_response = requests.get("http://localhost:8000/api/memory")
    if memory_response.status_code == 200:
        memory_data = memory_response.json()
        entries = memory_data.get("entries", [])
        print(f"   Total memory entries: {len(entries)}")
        if entries:
            print("   Recent entries:")
            for entry in entries[-5:]:  # Show last 5 entries
                print(
                    f"      - {entry.get('key')}: {entry.get('value')} (importance: {entry.get('importance', 1)})"
                )
    else:
        print("   ❌ Failed to retrieve memory")


if __name__ == "__main__":
    test_memory_notification_rest()
