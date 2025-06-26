from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ChatRequest(BaseModel):
    message: str
    model: str
    timeout: float = 30.0


class ChatResponse(BaseModel):
    response: str
    model: str


class WebSocketMessage(BaseModel):
    message: str
    model: str


class MemoryEntry(BaseModel):
    key: str
    value: str


class MemoryRequest(BaseModel):
    entries: List[MemoryEntry]


class ModelDownloadRequest(BaseModel):
    model_name: str


class ChatSessionRequest(BaseModel):
    title: Optional[str] = None


class ChatSessionUpdateRequest(BaseModel):
    title: str


class ChatMessageRequest(BaseModel):
    chat_index: int
    message: str
    user_id: str
    model: str


class ChatSnippet(BaseModel):
    id: str
    user_id: str
    message: str
    model: str
    created_at: datetime
    updated_at: datetime


class ChatSession(BaseModel):
    id: str
    title: str
    messages: List[ChatSnippet]
    created_at: datetime
    updated_at: datetime


class SystemInfo(BaseModel):
    cpu_count: int
    memory_gb: float
    platform: str
    architecture: str


class ModelInfo(BaseModel):
    name: str
    description: str
    strengths: List[str]
    weaknesses: List[str]
    best_for: List[str]
    recommended_for: str
    recommended: bool
    installed: bool
    details: Optional[dict] = None


class ModelsResponse(BaseModel):
    installed_models: List[ModelInfo]
    available_models: List[ModelInfo]
    system_info: SystemInfo


class DiagnosticInfo(BaseModel):
    ollama_url: str
    default_model: str
    ollama_status: str
    available_models: List[str]
    running_models: List[str]
    errors: List[str]


# Summary-related models
class ConversationSummary(BaseModel):
    key_insights: List[str]
    action_items: List[str]
    context_notes: List[str]
    conversation_summary: str
    confidence_level: str
    topics: List[str]


class SessionSummary(BaseModel):
    key_insights: List[str]
    action_items: List[str]
    context_notes: List[str]
    conversation_summary: str
    confidence_level: str
    topics: List[str]
    session_quality: Optional[str] = None
    recommended_follow_up: Optional[List[str]] = None
    message_count: int


class SummaryRequest(BaseModel):
    user_message: str
    assistant_message: str
    model: Optional[str] = None


class SessionSummaryRequest(BaseModel):
    session_id: str
    model: Optional[str] = None


class SummaryResponse(BaseModel):
    status: str
    summary: ConversationSummary
    summary_id: Optional[str] = None


class SessionSummaryResponse(BaseModel):
    status: str
    summary: SessionSummary
    summary_id: Optional[str] = None


class SummaryInsightsResponse(BaseModel):
    status: str
    insights: List[str]
    total_count: int
