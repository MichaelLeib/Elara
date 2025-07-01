import json
import asyncio
from typing import Union, List, Dict, Any, Optional
from fastapi import WebSocket
from app.services.document_service import document_service, ModelRegistry
from app.services.database_service import database_service
from app.services.summarization_service import summarization_service


class WebSocketDocumentHandler:
    """Handles WebSocket-specific document analysis operations"""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket

    async def send_status(
        self, content: str, progress: int, done: bool = False
    ) -> None:
        """Send a status message to the WebSocket client"""
        await self.websocket.send_text(
            json.dumps(
                {
                    "type": "status",
                    "content": content,
                    "progress": progress,
                    "done": done,
                }
            )
        )

    async def send_error(self, error_message: str) -> None:
        """Send an error message to the WebSocket client"""
        await self.websocket.send_text(
            json.dumps(
                {
                    "type": "error",
                    "content": error_message,
                    "done": True,
                }
            )
        )

    async def send_analysis_chunk(self, chunk: str, progress: int) -> None:
        """Send a chunk of analysis content to the WebSocket client"""
        await self.websocket.send_text(
            json.dumps(
                {
                    "type": "document_analysis_chunk",
                    "content": chunk,
                    "progress": progress,
                    "done": False,
                }
            )
        )

    async def send_analysis_complete(self, analysis_result: Dict[str, Any]) -> None:
        """Send the final analysis completion message"""
        await self.websocket.send_text(
            json.dumps(
                {
                    "type": "document_analysis",
                    "content": analysis_result["analysis"],
                    "metadata": {
                        "documents_processed": analysis_result["documents_processed"],
                        "method": analysis_result["method"],
                        "total_text_length": analysis_result.get("total_text_length"),
                        "chunks_analyzed": analysis_result.get("chunks_analyzed"),
                    },
                    "progress": 100,
                    "done": True,
                }
            )
        )

    async def send_clear_progress(self) -> None:
        """Send a signal to clear progress and start fresh analysis content"""
        await self.websocket.send_text(
            json.dumps(
                {
                    "type": "clear_progress",
                    "content": "",
                    "progress": 75,
                    "done": False,
                }
            )
        )

    def validate_files(self, files: List[Dict[str, Any]]) -> None:
        """Validate uploaded files"""
        for file_data in files:
            if (
                not isinstance(file_data, dict)
                or "filename" not in file_data
                or "content" not in file_data
            ):
                raise Exception(
                    "Invalid file format. Each file must have 'filename' and 'content' fields."
                )

            # Check if file type is supported
            if not document_service.is_supported_file(str(file_data["filename"])):
                raise Exception(f"Unsupported file type: {file_data['filename']}")

    def create_progress_callback(self):
        """Create a progress callback function for document analysis"""

        async def progress_callback(message: str, progress: Union[int, float]):
            # Ensure progress never exceeds 100%
            safe_progress = min(int(progress), 100)
            await self.send_status(message, safe_progress)

        # Create a wrapper that handles the async callback properly
        def sync_progress_callback(message: str, progress: Union[int, float]):
            # Schedule the async callback to run
            asyncio.create_task(progress_callback(message, progress))

        return sync_progress_callback

    async def stream_analysis_result(self, analysis_text: str) -> None:
        """Stream the analysis result in chunks to the WebSocket client"""
        chunk_size = 100

        for i in range(0, len(analysis_text), chunk_size):
            chunk = analysis_text[i : i + chunk_size]
            progress = min(
                75 + (i / len(analysis_text)) * 20, 95
            )  # Progress from 75% to 95%

            # Ensure progress never exceeds 100%
            safe_progress = min(int(progress), 100)

            await self.send_analysis_chunk(chunk, safe_progress)
            await asyncio.sleep(0.05)  # Small delay for smooth streaming

    async def create_session_and_save_messages(
        self,
        session_id: Optional[str],
        message: str,
        model: str,
        is_private: bool,
        files: List[Dict[str, Any]],
        analysis_result: Dict[str, Any],
    ) -> tuple[str, str, str]:
        """Create a session if needed and save messages to database"""
        # Create a session to store the analysis if no session_id provided
        if not session_id:
            safe_title = (
                f"Document Analysis: {message[:50]}{'...' if len(message) > 50 else ''}"
            )
            session_id = database_service.create_chat_session(
                title=safe_title, model=model, is_private=is_private
            )

        # Save user message (the prompt) to session FIRST
        user_message_id = database_service.add_message(
            chat_id=session_id,
            user_id="user",
            message=f"Document Analysis Request: {message}",
            model=model,
            files=files,  # Include files if provided
        )

        # Save assistant response to session SECOND (after user message)
        assistant_message_id = database_service.add_message(
            chat_id=session_id,
            user_id="assistant",
            message=analysis_result["analysis"],
            model=model,
        )

        return session_id, user_message_id, assistant_message_id

    async def generate_summary_background(
        self,
        session_id: str,
        user_message_id: str,
        assistant_message_id: str,
        message: str,
        analysis_result: Dict[str, Any],
        model: str,
    ) -> None:
        """Generate and store conversation summary asynchronously in the background"""
        try:
            print(f"[Background] Starting summary generation for session {session_id}")
            summary_data = await summarization_service.summarize_conversation_exchange(
                user_message=f"Document Analysis Request: {message}",
                assistant_message=analysis_result["analysis"],
                model=model,
                timeout=180.0,  # Increased timeout for document analysis summaries
            )

            if session_id:  # Ensure session_id is not None
                summary_id = database_service.add_conversation_summary(
                    chat_id=session_id,
                    user_message_id=user_message_id,
                    assistant_message_id=assistant_message_id,
                    summary_data=summary_data,
                    confidence_level=summary_data.get("confidence_level", "low"),
                )

                print(
                    f"[Background] Document analysis summary generated and stored (ID: {summary_id})"
                )
            else:
                print("[Background] No session_id available, skipping summary storage")

        except Exception as summary_error:
            print(f"[Background] Summary generation failed: {summary_error}")

    async def handle_document_analysis(
        self,
        files: List[Dict[str, Any]],
        message: str,
        model: str,
        session_id: Optional[str],
        is_private: bool,
    ) -> None:
        """Handle the complete document analysis workflow via WebSocket"""
        try:
            # Check if using a small model and warn the user
            if ModelRegistry.is_small_model(model):
                await self.send_status(
                    f"⚠️ Using {model} for document analysis. This model has limited capabilities and may provide basic results. Consider using a larger model like phi3:mini for better analysis.",
                    3,
                )
                await asyncio.sleep(2)  # Give user time to read the warning

            # Initial status
            await self.send_status(
                "Starting document analysis (this may take a while)... \n", 5
            )

            # Validate files
            await self.send_status("Validating uploaded files...", 10)
            self.validate_files(files)
            await self.send_status("Files validated successfully!\n", 15)

            # Perform document analysis with streaming
            await self.send_status("Extracting text from documents...", 20)

            # Create progress callback
            progress_callback = self.create_progress_callback()

            # Perform analysis
            analysis_result = await document_service.analyze_documents(
                files=files,
                prompt=message,
                model=model,
                progress_callback=progress_callback,
            )

            await self.send_status("Analysis complete, preparing results...", 70)

            # Stream the analysis result in chunks
            await self.send_clear_progress()
            await self.stream_analysis_result(analysis_result["analysis"])

            # Send final completion message
            await self.send_analysis_complete(analysis_result)

            # Create session and save messages
            session_id, user_message_id, assistant_message_id = (
                await self.create_session_and_save_messages(
                    session_id, message, model, is_private, files, analysis_result
                )
            )

            # Generate and store conversation summary asynchronously in the background
            asyncio.create_task(
                self.generate_summary_background(
                    session_id,
                    user_message_id,
                    assistant_message_id,
                    message,
                    analysis_result,
                    model,
                )
            )

        except Exception as analysis_error:
            error_message = f"Document analysis failed: {str(analysis_error)}"
            await self.send_error(error_message)
            print(f"Document analysis error: {analysis_error}")
            raise

    def get_model_recommendations(self, current_model: str) -> str:
        """Get model recommendations for document analysis"""
        if ModelRegistry.is_small_model(current_model):
            return "For better document analysis, consider using: phi3:mini, llama3:latest, or dolphin-mistral:7b"
        return ""
