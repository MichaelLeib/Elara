#!/usr/bin/env python3
"""
Memory Migration Script

This script migrates memory data from the JSON file to the SQLite database.
"""

import json
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.services.database_service import database_service


def migrate_memory_from_json():
    """Migrate memory entries from JSON file to database"""
    memory_file = Path("storage/memory.json")

    if not memory_file.exists():
        print("❌ Memory file not found at storage/memory.json")
        return False

    try:
        # Load existing memory from JSON
        with open(memory_file, "r") as f:
            memory_data = json.load(f)

        entries = memory_data.get("entries", [])
        if not entries:
            print("ℹ️  No memory entries found in JSON file")
            return True

        print(f"📦 Found {len(entries)} memory entries to migrate")

        # Migrate each entry to database
        migrated_count = 0
        for entry in entries:
            key = entry.get("key", "")
            value = entry.get("value", "")

            if key and value:
                database_service.add_memory_entry(
                    key=key,
                    value=value,
                    importance=5,  # Default importance
                    category="migrated_from_json",
                )
                migrated_count += 1
                print(f"  ✅ Migrated: {key}")

        print(f"\n🎉 Successfully migrated {migrated_count} memory entries to database")

        # Create backup of original JSON file
        backup_file = memory_file.with_suffix(".json.backup")
        memory_file.rename(backup_file)
        print(f"📁 Original JSON file backed up to {backup_file}")

        return True

    except Exception as e:
        print(f"❌ Error migrating memory: {e}")
        return False


def verify_migration():
    """Verify that memory entries were migrated correctly"""
    try:
        entries = database_service.get_memory_entries(category="migrated_from_json")
        print(f"\n🔍 Verification: Found {len(entries)} migrated entries in database")

        for entry in entries:
            print(f"  - {entry['key']}: {entry['value'][:50]}...")

        return len(entries) > 0

    except Exception as e:
        print(f"❌ Error verifying migration: {e}")
        return False


def main():
    """Main migration function"""
    print("🚀 Memory Migration Script")
    print("=" * 40)

    # Check if we're in the right directory
    if not Path("storage").exists():
        print("❌ Please run this script from the backend directory")
        sys.exit(1)

    # Step 1: Migrate memory
    print("\n1. Migrating memory from JSON to database...")
    if not migrate_memory_from_json():
        print("❌ Migration failed")
        sys.exit(1)

    # Step 2: Verify migration
    print("\n2. Verifying migration...")
    if not verify_migration():
        print("❌ Verification failed")
        sys.exit(1)

    print("\n✅ Memory migration completed successfully!")
    print("\n📝 Next Steps:")
    print("   - The memory service now uses the database")
    print("   - The original JSON file has been backed up")
    print("   - You can safely delete the backup file once you're satisfied")


if __name__ == "__main__":
    main()
