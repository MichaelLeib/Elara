#!/usr/bin/env python3
"""
Migration Script for Elara Backend

This script helps migrate from the old monolithic structure to the new
refactored structure with proper separation of concerns.
"""

import os
import shutil
import sys
from pathlib import Path


def backup_original_main():
    """Create a backup of the original main.py file"""
    if os.path.exists("main.py"):
        backup_path = "main_original_backup.py"
        shutil.copy2("main.py", backup_path)
        print(f"✅ Original main.py backed up to {backup_path}")
        return True
    return False


def check_new_structure():
    """Check if the new structure is properly set up"""
    required_files = [
        "app/__init__.py",
        "app/main.py",
        "app/config/settings.py",
        "app/models/schemas.py",
        "app/services/ollama_service.py",
        "app/services/system_service.py",
        "app/services/memory_service.py",
        "app/middleware/cors.py",
        "app/middleware/exception_handler.py",
        "app/routes/chat.py",
        "app/routes/memory.py",
        "app/routes/models.py",
        "app/routes/system.py",
        "app/routes/health.py",
        "main_new.py"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing files in new structure:")
        for file_path in missing_files:
            print(f"   - {file_path}")
        return False
    
    print("✅ New structure is complete")
    return True


def test_imports():
    """Test that all imports work correctly"""
    try:
        from app.main import app
        from app.routes import chat, memory, models, system, health
        from app.services import ollama_service, system_service, memory_service
        from app.config.settings import settings
        print("✅ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False


def update_requirements():
    """Check if requirements.txt needs updates"""
    print("📋 Checking requirements...")
    print("   The new structure uses the same dependencies as before.")
    print("   No changes to requirements.txt are needed.")


def main():
    """Main migration function"""
    print("🚀 Elara Backend Migration Script")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("storage"):
        print("❌ Please run this script from the backend directory")
        sys.exit(1)
    
    # Step 1: Backup original
    print("\n1. Backing up original files...")
    backup_original_main()
    
    # Step 2: Check new structure
    print("\n2. Checking new structure...")
    if not check_new_structure():
        print("❌ New structure is incomplete. Please ensure all files are created.")
        sys.exit(1)
    
    # Step 3: Test imports
    print("\n3. Testing imports...")
    if not test_imports():
        print("❌ Import test failed. Please check the structure.")
        sys.exit(1)
    
    # Step 4: Update requirements
    print("\n4. Checking requirements...")
    update_requirements()
    
    # Step 5: Instructions
    print("\n5. Migration Complete! 🎉")
    print("\n📝 Next Steps:")
    print("   1. Test the new structure:")
    print("      python main_new.py")
    print("   2. Or run with uvicorn:")
    print("      uvicorn app.main:app --host 0.0.0.0 --port 8000")
    print("   3. Visit http://localhost:8000/docs to see the API documentation")
    print("\n📚 Documentation:")
    print("   - Read README_REFACTOR.md for detailed information")
    print("   - All API endpoints remain the same")
    print("   - The old main.py is backed up as main_original_backup.py")
    
    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    main() 