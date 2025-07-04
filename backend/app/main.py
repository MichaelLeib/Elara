from fastapi import FastAPI, Request
from app.middleware.cors import setup_cors
from app.middleware.exception_handler import global_exception_handler
from app.routes import chat, memory, models, system, health

# Create FastAPI app
app = FastAPI(
    title="Elara Chat API",
    description="A FastAPI backend for the Elara chat application",
    version="1.0.0",
)

# Setup middleware
setup_cors(app)

# Register global exception handler
app.add_exception_handler(Exception, global_exception_handler)

# Include routers
app.include_router(chat.router)
app.include_router(memory.router)
app.include_router(models.router)
app.include_router(system.router)
app.include_router(health.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
