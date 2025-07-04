from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
import os


def setup_cors(app: FastAPI):
    """Setup CORS middleware for the FastAPI app"""
    # Get allowed origins from environment or use safe defaults
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:4173").split(",")
    
    # In production, we should be more restrictive
    is_production = os.getenv("ENV", "development") == "production"
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        # Restrict methods to only what's needed
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        # Restrict headers to necessary ones
        allow_headers=[
            "Accept",
            "Accept-Language", 
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
        ],
        # Add security headers in production
        expose_headers=["X-Total-Count"] if not is_production else [],
    ) 