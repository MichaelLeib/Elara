#!/usr/bin/env python3
"""
Elara Chat API - Main Entry Point

This is the main entry point for the refactored Elara chat API.
The application has been restructured following Python/FastAPI best practices
with proper separation of concerns.
"""

from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 