import traceback
from fastapi import Request
from fastapi.responses import JSONResponse


async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions and return them as JSON responses"""
    # Get full traceback
    full_traceback = traceback.format_exc()
    
    error_detail = {
        "error": str(exc),
        "type": type(exc).__name__,
        "path": request.url.path,
        "method": request.method,
        "traceback": full_traceback,
        "args": exc.args if hasattr(exc, 'args') else None
    }
    
    # Log the full error details for debugging
    print(f"=== UNHANDLED EXCEPTION ===")
    print(f"Error: {exc}")
    print(f"Type: {type(exc).__name__}")
    print(f"Path: {request.url.path}")
    print(f"Method: {request.method}")
    print(f"Full Traceback:")
    print(full_traceback)
    print(f"=== END EXCEPTION ===")
    
    return JSONResponse(
        status_code=500,
        content=error_detail
    ) 