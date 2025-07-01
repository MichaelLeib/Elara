#!/usr/bin/env python3
"""
Script to switch to a faster model for better performance
"""

import json
import os


def switch_to_faster_model():
    """Switch to a faster model in settings"""
    settings_file = "storage/settings.json"

    if not os.path.exists(settings_file):
        print("❌ Settings file not found!")
        return

    try:
        with open(settings_file, "r") as f:
            settings = json.load(f)

        current_model = settings["model"]["OLLAMA_MODEL"]
        print(f"📋 Current model: {current_model}")

        # Recommend faster models
        fast_models = [
            "phi3:mini",  # 2.2 GB - Good balance
            "tinyllama:1.1b",  # 637 MB - Very fast
            "gemma:2b",  # 1.7 GB - Fast
            "qwen2.5-coder:1.5b",  # 986 MB - Very fast
        ]

        print("\n🚀 Recommended faster models:")
        for i, model in enumerate(fast_models, 1):
            print(f"  {i}. {model}")

        if current_model in fast_models:
            print(f"\n✅ You're already using a fast model: {current_model}")
        else:
            print(f"\n⚠️  You're using a slower model: {current_model}")
            print(
                "💡 Consider switching to a faster model for better performance with web search."
            )

            # Auto-switch to phi3:mini if using llama3
            if "llama3" in current_model.lower():
                print("\n🔄 Auto-switching to phi3:mini for better performance...")
                settings["model"]["OLLAMA_MODEL"] = "phi3:mini"

                with open(settings_file, "w") as f:
                    json.dump(settings, f, indent=2)

                print("✅ Switched to phi3:mini")
                print("🔄 Please restart your backend for changes to take effect.")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    switch_to_faster_model()
