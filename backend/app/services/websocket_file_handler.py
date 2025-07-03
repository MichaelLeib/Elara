import json
import asyncio
from typing import Union, List, Dict, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from app.services.document_service import document_service, ModelRegistry
from app.services.image_service import image_service, ImageModelRegistry
from app.services.database_service import database_service
from app.services.summarization_service import summarization_service


class WebSocketFileHandler:
    """Handles WebSocket-specific file analysis operations (documents and images)"""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self._connection_closed = False

    def _check_connection(self) -> bool:
        """Check if WebSocket connection is still open"""
        try:
            # Try to access the client state to check if connection is closed
            return not self._connection_closed and self.websocket.client_state.value < 3
        except Exception:
            return False

    async def _safe_send(self, message: str) -> bool:
        """Safely send a message to WebSocket, return False if connection is closed"""
        if not self._check_connection():
            return False

        try:
            await self.websocket.send_text(message)
            return True
        except (WebSocketDisconnect, ConnectionError, RuntimeError) as e:
            print(f"[WebSocketFileHandler] Connection closed during send: {e}")
            self._connection_closed = True
            return False
        except Exception as e:
            print(f"[WebSocketFileHandler] Error sending message: {e}")
            return False

    async def send_status(
        self, content: str, progress: int, done: bool = False
    ) -> None:
        """Send a status message to the WebSocket client"""
        message = json.dumps(
            {
                "type": "status",
                "content": content,
                "progress": progress,
                "done": done,
            }
        )
        await self._safe_send(message)

    async def send_error(self, error_message: str) -> None:
        """Send an error message to the WebSocket client"""
        message = json.dumps(
            {
                "type": "error",
                "content": error_message,
                "done": True,
            }
        )
        await self._safe_send(message)

    async def send_analysis_chunk(self, chunk: str, progress: int) -> bool:
        """Send a chunk of analysis content to the WebSocket client"""
        message = json.dumps(
            {
                "type": "file_analysis_chunk",
                "content": chunk,
                "progress": progress,
                "done": False,
            }
        )
        return await self._safe_send(message)

    async def send_analysis_complete(
        self, analysis_result: Dict[str, Any], analysis_type: str
    ) -> None:
        """Send the final analysis completion message"""
        try:
            message = json.dumps(
                {
                    "type": f"{analysis_type}_analysis",
                    "content": analysis_result["analysis"],
                    "metadata": {
                        "files_processed": analysis_result.get("documents_processed")
                        or analysis_result.get("images_processed"),
                        "method": analysis_result["method"],
                        "model_used": analysis_result.get("model_used"),
                        "analysis_strategy": analysis_result.get("analysis_strategy"),
                    },
                    "progress": 100,
                    "done": True,
                }
            )

            print(
                f"[WebSocketFileHandler] Sending {analysis_type}_analysis message ({len(message)} chars)"
            )
            success = await self._safe_send(message)

            if success:
                print(
                    f"[WebSocketFileHandler] Successfully sent {analysis_type}_analysis message"
                )
            else:
                print(
                    f"[WebSocketFileHandler] Failed to send {analysis_type}_analysis message"
                )

        except Exception as e:
            print(f"[WebSocketFileHandler] Error sending analysis complete: {e}")
            raise

    async def send_clear_progress(self) -> None:
        """Send a signal to clear progress and start fresh analysis content"""
        message = json.dumps(
            {
                "type": "clear_progress",
                "content": "",
                "progress": 75,
                "done": False,
            }
        )
        await self._safe_send(message)

    def validate_files(
        self, files: List[Dict[str, Any]]
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Validate uploaded files and separate documents from images"""
        documents = []
        images = []

        for file_data in files:
            if (
                not isinstance(file_data, dict)
                or "filename" not in file_data
                or "content" not in file_data
            ):
                raise Exception(
                    "Invalid file format. Each file must have 'filename' and 'content' fields."
                )

            filename = str(file_data["filename"])

            # Check if it's a document
            if document_service.is_supported_file(filename):
                documents.append(file_data)
            # Check if it's an image
            elif image_service.is_supported_image(filename):
                images.append(file_data)
            else:
                raise Exception(f"Unsupported file type: {filename}")

        return documents, images

    def create_progress_callback(self):
        """Create a progress callback function for file analysis"""

        async def progress_callback(message: str, progress: Union[int, float]):
            # Ensure progress never exceeds 100%
            safe_progress = min(int(progress), 100)
            await self.send_status(message, safe_progress)

        # Create a wrapper that handles the async callback properly
        def sync_progress_callback(message: str, progress: Union[int, float]):
            # Schedule the async callback to run
            asyncio.create_task(progress_callback(message, progress))

        return sync_progress_callback

    async def send_periodic_keepalive(self, stop_event: asyncio.Event):
        """Send periodic keepalive messages to prevent WebSocket timeout"""
        counter = 0
        while not stop_event.is_set():
            try:
                if self._check_connection():
                    counter += 1
                    # Send a minimal keepalive with very low progress to avoid interfering with actual progress
                    # Use progress 1 to indicate it's just a keepalive, not a real progress update
                    await self.send_status(f"Processing... ({counter})", 1)
                await asyncio.sleep(5)  # Send keepalive every 5 seconds (more frequent)
            except Exception as e:
                print(f"[WebSocketFileHandler] Keepalive error: {e}")
                break

    async def stream_analysis_result(self, analysis_text: str) -> None:
        """Stream the analysis result in chunks to the WebSocket client"""
        if not analysis_text:
            print("[WebSocketFileHandler] No analysis text to stream")
            return

        chunk_size = 100
        total_chunks = (len(analysis_text) + chunk_size - 1) // chunk_size

        print(
            f"[WebSocketFileHandler] Streaming {len(analysis_text)} characters in {total_chunks} chunks"
        )

        for i in range(0, len(analysis_text), chunk_size):
            # Check if connection is still open before sending
            if not self._check_connection():
                print(
                    "[WebSocketFileHandler] Connection closed during streaming, stopping"
                )
                return

            chunk = analysis_text[i : i + chunk_size]
            progress = min(
                75 + (i / len(analysis_text)) * 20, 95
            )  # Progress from 75% to 95%

            # Ensure progress never exceeds 100%
            safe_progress = min(int(progress), 100)

            # Use safe send and check if it succeeded
            success = await self.send_analysis_chunk(chunk, safe_progress)
            if not success:
                print("[WebSocketFileHandler] Failed to send chunk, stopping stream")
                return

            # Add a small delay to prevent overwhelming the connection
            await asyncio.sleep(0.05)  # Small delay for smooth streaming

        print(
            f"[WebSocketFileHandler] Successfully streamed {len(analysis_text)} characters"
        )

    async def create_session_and_save_messages(
        self,
        session_id: Optional[str],
        message: str,
        model: str,
        is_private: bool,
        files: List[Dict[str, Any]],
        analysis_result: Dict[str, Any],
        analysis_type: str,
    ) -> tuple[str, str, str]:
        """Create a session if needed and save messages to database"""
        # Create a session to store the analysis if no session_id provided
        if not session_id:
            safe_title = f"{analysis_type.title()} Analysis: {message[:50]}{'...' if len(message) > 50 else ''}"
            session_id = database_service.create_chat_session(
                title=safe_title, model=model, is_private=is_private
            )

        # Save user message (the prompt) to session FIRST
        user_message_id = database_service.add_message(
            chat_id=session_id,
            user_id="user",
            message=f"{analysis_type.title()} Analysis Request: {message}",
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
        analysis_type: str,
    ) -> None:
        """Generate and store conversation summary asynchronously in the background"""
        try:
            print(f"[Background] Starting summary generation for session {session_id}")
            summary_data = await summarization_service.summarize_conversation_exchange(
                user_message=f"{analysis_type.title()} Analysis Request: {message}",
                assistant_message=analysis_result["analysis"],
                model=model,
                timeout=180.0,  # Increased timeout for file analysis summaries
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
                    f"[Background] {analysis_type.title()} analysis summary generated and stored (ID: {summary_id})"
                )
            else:
                print("[Background] No session_id available, skipping summary storage")

        except Exception as summary_error:
            print(f"[Background] Summary generation failed: {summary_error}")

    async def handle_file_analysis(
        self,
        files: List[Dict[str, Any]],
        message: str,
        model: str,
        session_id: Optional[str],
        is_private: bool,
        stop_event: Optional[asyncio.Event] = None,
    ) -> None:
        """Handle the complete file analysis workflow via WebSocket (documents and images)"""
        try:
            # Validate files and separate documents from images
            await self.send_status("Validating uploaded files...", 5)
            documents, images = self.validate_files(files)
            await self.send_status("Files validated successfully!\n", 10)

            # Determine analysis type and model
            analysis_type = "mixed"
            if documents and not images:
                analysis_type = "document"
            elif images and not documents:
                analysis_type = "image"

            print(
                f"[WebSocketFileHandler] Analysis type: {analysis_type}, documents: {len(documents)}, images: {len(images)}"
            )

            # Check model compatibility
            if analysis_type in ["image", "mixed"]:
                if not ImageModelRegistry.is_vision_model(model):
                    best_vision_model = (
                        await ImageModelRegistry.find_best_vision_model()
                    )
                    await self.send_status(
                        f"⚠️ Using {best_vision_model} for image analysis. The selected model '{model}' doesn't support vision.\n",
                        12,
                    )
                    await asyncio.sleep(2)
                    model = best_vision_model
            elif analysis_type == "document":
                if ModelRegistry.is_small_model(model):
                    await self.send_status(
                        f"⚠️ Using {model} for document analysis. This model has limited capabilities and may provide basic results. Consider using a larger model like phi3:mini for better analysis.",
                        12,
                    )
                    await asyncio.sleep(2)

            # Initial status
            await self.send_status(
                f"Starting {analysis_type} analysis (this may take a while)... \n", 15
            )

            # Create progress callback
            progress_callback = self.create_progress_callback()

            # Perform analysis based on file types
            if analysis_type == "document":
                await self._handle_document_analysis(
                    documents,
                    message,
                    model,
                    session_id,
                    is_private,
                    progress_callback,
                    stop_event,
                )
            elif analysis_type == "image":
                await self._handle_image_analysis(
                    images,
                    message,
                    model,
                    session_id,
                    is_private,
                    progress_callback,
                    stop_event,
                )
            else:  # mixed
                await self._handle_mixed_analysis(
                    documents,
                    images,
                    message,
                    model,
                    session_id,
                    is_private,
                    progress_callback,
                    stop_event,
                )

        except Exception as analysis_error:
            error_message = f"File analysis failed: {str(analysis_error)}"
            # Only send error if connection is still open
            if self._check_connection():
                await self.send_error(error_message)
            print(f"File analysis error: {analysis_error}")
            raise

    async def _handle_document_analysis(
        self,
        documents: List[Dict[str, Any]],
        message: str,
        model: str,
        session_id: Optional[str],
        is_private: bool,
        progress_callback,
        stop_event: Optional[asyncio.Event] = None,
    ) -> None:
        """Handle document-only analysis"""
        await self.send_status("Extracting text from documents...\n", 20)

        # Perform document analysis
        try:
            analysis_result = await document_service.analyze_documents(
                files=documents,
                prompt=message,
                model=model,
                progress_callback=progress_callback,
                stop_event=stop_event,
            )

            # If the document is image-based, prompt the user for OCR or vision analysis
            if analysis_result.get("status") == "image_based_pdf":
                print(
                    "[WebSocketFileHandler] Image-based PDF detected, sending choice prompt"
                )
                # Clear progress before sending the choice prompt
                await self.send_clear_progress()

                # Send the choice prompt immediately
                choice_message = {
                    "type": "image_based_pdf_choice",
                    "message": analysis_result.get("message"),
                    "filename": analysis_result.get("filename"),
                    "file_path": analysis_result.get("file_path"),
                    "prompt": message,
                    "model": model,
                }

                print(
                    f"[WebSocketFileHandler] Sending choice message: {choice_message}"
                )
                await self._safe_send(json.dumps(choice_message))

                # Do not proceed with normal analysis/session creation until user responds
                print("[WebSocketFileHandler] Waiting for user choice...")
                return

            # Check if this is a partial result (stopped by user)
            if analysis_result.get("status") == "partial":
                await self.send_status("Analysis stopped by user request", 100)
                print(
                    "[WebSocketFileHandler] Document analysis stopped by user request - returning partial results"
                )
            else:
                await self.send_status("Analysis complete, preparing results...\n", 70)

            # Stream the analysis result in chunks
            await self.send_clear_progress()
            await self.stream_analysis_result(analysis_result["analysis"])

            # Send final completion message
            await self.send_analysis_complete(analysis_result, "document")

        except Exception as e:
            if "stopped by user request" in str(e):
                print(
                    "[WebSocketFileHandler] Document analysis stopped by user request"
                )
                await self.send_status("Analysis stopped by user request", 100)

                # Send a partial result message
                partial_result = {
                    "analysis": "Analysis was stopped by the user before completion. The partial results shown above represent what was analyzed before stopping.",
                    "documents_processed": len(documents),
                    "method": "partial",
                    "status": "stopped_by_user",
                }

                await self.send_analysis_complete(partial_result, "document")
            else:
                # Re-raise other exceptions
                raise

        # Create session and save messages
        session_id, user_message_id, assistant_message_id = (
            await self.create_session_and_save_messages(
                session_id,
                message,
                model,
                is_private,
                documents,
                analysis_result if "analysis_result" in locals() else partial_result,
                "document",
            )
        )

        # Generate and store conversation summary asynchronously in the background
        asyncio.create_task(
            self.generate_summary_background(
                session_id,
                user_message_id,
                assistant_message_id,
                message,
                analysis_result if "analysis_result" in locals() else partial_result,
                model,
                "document",
            )
        )

    async def handle_image_based_pdf_choice(
        self,
        choice: str,
        file_path: str,
        filename: str,
        prompt: str,
        model: str,
        session_id: Optional[str] = None,
        is_private: bool = True,
    ) -> None:
        print(
            f"[DEBUG] handle_image_based_pdf_choice called with choice={choice}, file_path={file_path}, filename={filename}, prompt={prompt}, model={model}, session_id={session_id}, is_private={is_private}"
        )

        # Create a progress callback for this analysis
        progress_callback = self.create_progress_callback()

        try:
            # Clear any existing progress and start fresh
            await self.send_clear_progress()
            progress_callback(f"Processing your choice: {choice}...", 25)

            if choice == "ocr":
                print("[DEBUG] Starting OCR branch...")

                # First extract text using OCR
                progress_callback("Extracting text using OCR...", 30)
                ocr_result = await document_service.analyze_documents_ocr(
                    file_path, filename, progress_callback
                )
                print(f"[DEBUG] OCR extraction result: {ocr_result}")

                if ocr_result.get("status") != "success":
                    print(f"[DEBUG] OCR failed with status: {ocr_result.get('status')}")
                    await self.send_error(
                        f"OCR extraction failed: {ocr_result.get('ocr_text', 'Unknown error')}"
                    )
                    return

                ocr_text = ocr_result.get("ocr_text", "")
                print(f"[DEBUG] OCR text length: {len(ocr_text)}")
                if not ocr_text.strip():
                    print("[DEBUG] OCR text is empty")
                    await self.send_error(
                        "OCR extraction returned empty text. The document may be unreadable."
                    )
                    return

                # Now analyze the OCR text with the AI model
                print("[DEBUG] Starting AI analysis...")
                progress_callback("Analyzing extracted text with AI...", 65)

                # Create a prompt that includes the OCR text and user's question
                analysis_prompt = f"""Analyze this document content and answer the user's question.

Document Content (extracted via OCR):
{ocr_text}

User's Question: {prompt}

Please provide a comprehensive analysis addressing the user's question:"""

                # Use ollama service directly to analyze the OCR text
                from app.services.ollama_service import ollama_service
                from app.config.settings import settings

                timeout = document_service.calculate_timeout(
                    len(ocr_text), is_chunked=False, model_name=model
                )
                print(
                    f"[DEBUG] Calling ollama_service with timeout={timeout}, model={model}, prompt_len={len(analysis_prompt)}, ocr_text_len={len(ocr_text)}"
                )

                try:
                    print("[DEBUG] About to call ollama_service.query_ollama...")
                    progress_callback(f"Processing with {model}...", 75)
                    ai_analysis = await ollama_service.query_ollama(
                        analysis_prompt, timeout, model
                    )
                    print(
                        f"[DEBUG] AI analysis received. Length: {len(str(ai_analysis))}"
                    )
                    print(f"[DEBUG] AI analysis preview: {str(ai_analysis)[:200]}...")

                    # Create the analysis result structure
                    analysis_result = {
                        "status": "success",
                        "analysis": ai_analysis,
                        "documents_processed": 1,
                        "total_text_length": len(ocr_text),
                        "method": "ocr_analysis",
                        "timeout_used": timeout,
                        "ocr_text": ocr_text,  # Include original OCR text for reference
                    }
                    print(
                        f"[DEBUG] Created analysis_result with method: {analysis_result['method']}"
                    )

                except Exception as e:
                    print(f"[DEBUG] AI analysis failed: {e}")
                    import traceback

                    traceback.print_exc()
                    # Fallback to just showing the OCR text with a note
                    analysis_result = {
                        "status": "partial",
                        "analysis": f"AI analysis failed: {str(e)}\n\nExtracted Text (OCR):\n{ocr_text}",
                        "documents_processed": 1,
                        "total_text_length": len(ocr_text),
                        "method": "ocr_fallback",
                        "timeout_used": timeout,
                        "ocr_text": ocr_text,
                    }
                    print(
                        f"[DEBUG] Created fallback analysis_result with method: {analysis_result['method']}"
                    )

                # Stream the AI analysis result
                print(
                    f"[DEBUG] About to stream analysis result: {len(analysis_result.get('analysis', ''))} chars"
                )
                progress_callback("Preparing results...", 90)
                await self.send_clear_progress()
                await self.stream_analysis_result(analysis_result.get("analysis", ""))
                print("[DEBUG] About to send_analysis_complete for OCR")
                await self.send_analysis_complete(analysis_result, "document")

                # Create session and save messages to database
                session_id, user_message_id, assistant_message_id = (
                    await self.create_session_and_save_messages(
                        session_id,
                        prompt,
                        model,
                        is_private,
                        [
                            {"filename": filename, "content": None}
                        ],  # File info for database
                        analysis_result,
                        "document",
                    )
                )

                # Generate and store conversation summary asynchronously in the background
                asyncio.create_task(
                    self.generate_summary_background(
                        session_id,
                        user_message_id,
                        assistant_message_id,
                        prompt,
                        analysis_result,
                        model,
                        "document",
                    )
                )

            elif choice == "vision":
                progress_callback("Converting PDF to images...", 30)
                result = await document_service.analyze_documents_vision(
                    file_path, filename, prompt, model, progress_callback
                )
                print(f"[DEBUG] Vision result: {result}")

                progress_callback("Preparing results...", 85)
                await self.send_clear_progress()
                await self.stream_analysis_result(
                    result.get("vision_result", {}).get("analysis", "")
                )
                print("[DEBUG] About to send_analysis_complete for Vision")
                await self.send_analysis_complete(
                    result.get("vision_result", {}), "image"
                )

                # Create session and save messages to database
                session_id, user_message_id, assistant_message_id = (
                    await self.create_session_and_save_messages(
                        session_id,
                        prompt,
                        model,
                        is_private,
                        [
                            {"filename": filename, "content": None}
                        ],  # File info for database
                        result.get("vision_result", {}),
                        "image",
                    )
                )

                # Generate and store conversation summary asynchronously in the background
                asyncio.create_task(
                    self.generate_summary_background(
                        session_id,
                        user_message_id,
                        assistant_message_id,
                        prompt,
                        result.get("vision_result", {}),
                        model,
                        "image",
                    )
                )
            else:
                await self.send_error("Invalid choice for image-based PDF analysis.")

        except Exception as e:
            print(f"[DEBUG] Error in handle_image_based_pdf_choice: {e}")
            import traceback

            traceback.print_exc()
            await self.send_error(f"Error processing {choice}: {str(e)}")

    async def _handle_image_analysis(
        self,
        images: List[Dict[str, Any]],
        message: str,
        model: str,
        session_id: Optional[str],
        is_private: bool,
        progress_callback,
        stop_event: Optional[asyncio.Event] = None,
    ) -> None:
        """Handle image-only analysis"""
        # Create a stop event for the keepalive mechanism
        stop_keepalive = asyncio.Event()

        try:
            # Check connection before starting
            if not self._check_connection():
                print("[WebSocketFileHandler] Connection closed before image analysis")
                return

            await self.send_status("Processing images...\n", 20)

            # Start keepalive mechanism
            keepalive_task = asyncio.create_task(
                self.send_periodic_keepalive(stop_keepalive)
            )

            # Perform image analysis with connection checking
            try:
                analysis_result = await image_service.analyze_images(
                    files=images,
                    prompt=message,
                    model=model,
                    progress_callback=progress_callback,
                    stop_event=stop_event,
                )
            except Exception as analysis_error:
                print(f"[WebSocketFileHandler] Image analysis failed: {analysis_error}")
                if self._check_connection():
                    await self.send_error(
                        f"Image analysis failed: {str(analysis_error)}"
                    )
                return
            finally:
                # Stop keepalive mechanism
                stop_keepalive.set()
                try:
                    await keepalive_task
                except asyncio.CancelledError:
                    pass

            # Check connection after analysis
            if not self._check_connection():
                print("[WebSocketFileHandler] Connection closed after image analysis")
                return

            await self.send_status("Analysis complete, preparing results...\n", 85)

            # Check connection before sending completion
            if not self._check_connection():
                print(
                    "[WebSocketFileHandler] Connection closed before sending completion"
                )
                return

            # Send the complete analysis result directly (no chunking for image analysis)
            await self.send_clear_progress()
            print(
                f"[WebSocketFileHandler] Sending complete image analysis result ({len(analysis_result['analysis'])} chars)"
            )
            await self.send_analysis_complete(analysis_result, "image")

            # Create session and save messages
            session_id, user_message_id, assistant_message_id = (
                await self.create_session_and_save_messages(
                    session_id,
                    message,
                    model,
                    is_private,
                    images,
                    analysis_result,
                    "image",
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
                    "image",
                )
            )

        except Exception as e:
            print(f"[WebSocketFileHandler] Unexpected error in image analysis: {e}")
            if self._check_connection():
                await self.send_error(f"Unexpected error: {str(e)}")
            raise
        finally:
            # Ensure keepalive is stopped
            stop_keepalive.set()

    async def _handle_mixed_analysis(
        self,
        documents: List[Dict[str, Any]],
        images: List[Dict[str, Any]],
        message: str,
        model: str,
        session_id: Optional[str],
        is_private: bool,
        progress_callback,
        stop_event: Optional[asyncio.Event] = None,
    ) -> None:
        """Handle mixed document and image analysis"""
        await self.send_status("Processing documents and images...\n", 20)

        # Perform both analyses
        document_result = None
        image_result = None

        if documents:
            await self.send_status("Analyzing documents...", 25)
            document_result = await document_service.analyze_documents(
                files=documents,
                prompt=message,
                model=model,
                progress_callback=lambda msg, prog: progress_callback(
                    f"Documents: {msg}\n", 25 + int(prog * 0.3)
                ),
                stop_event=stop_event,
            )

        if images:
            await self.send_status("Analyzing images...", 55)
            # Use vision model for images
            vision_model = await ImageModelRegistry.find_best_vision_model()
            image_result = await image_service.analyze_images(
                files=images,
                prompt=message,
                model=vision_model,
                progress_callback=lambda msg, prog: progress_callback(
                    f"Images: {msg}\n", 55 + int(prog * 0.3)
                ),
                stop_event=stop_event,
            )

        # Combine results
        combined_analysis = []
        if document_result:
            combined_analysis.append(
                f"Document Analysis:\n{document_result['analysis']}"
            )
        if image_result:
            combined_analysis.append(f"Image Analysis:\n{image_result['analysis']}")

        final_analysis = "\n\n" + "=" * 50 + "\n\n".join(combined_analysis)

        # Create combined result
        combined_result = {
            "status": "success",
            "analysis": final_analysis,
            "method": "mixed",
            "model_used": model,
            "documents_processed": len(documents) if documents else 0,
            "images_processed": len(images) if images else 0,
        }

        await self.send_status("Analysis complete, preparing results...\n", 85)

        # Stream the analysis result in chunks
        await self.send_clear_progress()
        await self.stream_analysis_result(combined_result["analysis"])

        # Send final completion message
        await self.send_analysis_complete(combined_result, "mixed")

        # Create session and save messages
        all_files = documents + images
        session_id, user_message_id, assistant_message_id = (
            await self.create_session_and_save_messages(
                session_id,
                message,
                model,
                is_private,
                all_files,
                combined_result,
                "mixed",
            )
        )

        # Generate and store conversation summary asynchronously in the background
        asyncio.create_task(
            self.generate_summary_background(
                session_id,
                user_message_id,
                assistant_message_id,
                message,
                combined_result,
                model,
                "mixed",
            )
        )

    def get_model_recommendations(self, current_model: str, analysis_type: str) -> str:
        """Get model recommendations for file analysis"""
        if analysis_type == "image":
            if not ImageModelRegistry.is_vision_model(current_model):
                return "For image analysis, consider using: llava:7b, llava:13b, or bakllava:7b"
        elif analysis_type == "document":
            if ModelRegistry.is_small_model(current_model):
                return "For better document analysis, consider using: phi3:mini, llama3:latest, or dolphin-mistral:7b"
        return ""
