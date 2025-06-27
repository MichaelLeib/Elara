import asyncio
import os
import tempfile
import base64
from typing import List, Dict, Any, Optional, Union, Callable
from pathlib import Path
import aiofiles
import aiofiles.os
from docx import Document

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None
import io
from app.services.ollama_service import ollama_service
from app.config.settings import settings


class ModelRegistry:
    """Registry of model capabilities and context windows"""

    # Known model context windows (in tokens)
    MODEL_CONTEXTS = {
        "tinyllama:1.1b": 2048,
        "phi3:mini": 8192,
        "llama3:latest": 8192,
        "codellama:7b-instruct": 8192,
        "deepseek-coder:6.7b": 8192,
        "dolphin-mistral:7b": 8192,
        "starcoder2:3b": 8192,
        "qwen2.5-coder:1.5b": 8192,
        "qwen2.5-coder:3b": 8192,
        "gemma:2b": 8192,
    }

    # Models known to be slower and need more aggressive chunking
    SLOW_MODELS = {
        "dolphin-mistral:7b",
        "deepseek-coder:6.7b",
        "codellama:7b-instruct",
    }

    # Default context window for unknown models
    DEFAULT_CONTEXT = 4096

    @classmethod
    def get_context_length(cls, model_name: str) -> int:
        """Get context length for a model"""
        return cls.MODEL_CONTEXTS.get(model_name, cls.DEFAULT_CONTEXT)

    @classmethod
    def estimate_tokens(cls, text: str) -> int:
        """Rough estimate of tokens in text (4 chars per token is a reasonable approximation)"""
        return len(text) // 4

    @classmethod
    def should_chunk(cls, text: str, model_name: str, prompt_length: int = 500) -> bool:
        """Determine if text should be chunked based on model context"""
        context_length = cls.get_context_length(model_name)
        estimated_tokens = cls.estimate_tokens(text) + prompt_length

        # Leave some buffer for response (about 25% of context)
        available_tokens = int(context_length * 0.75)

        return estimated_tokens > available_tokens

    @classmethod
    def get_optimal_chunk_size(cls, model_name: str, prompt_length: int = 500) -> int:
        """Get optimal chunk size for a model"""
        context_length = cls.get_context_length(model_name)
        available_tokens = int(context_length * 0.75) - prompt_length

        # Convert tokens to characters (rough estimate)
        base_size = available_tokens * 4

        # For slow models, use much smaller chunks
        if model_name in cls.SLOW_MODELS:
            return int(base_size * 0.3)  # 30% of normal size for slow models

        return base_size

    @classmethod
    async def update_model_info(cls, model_name: str) -> None:
        """Dynamically update model information from Ollama"""
        try:
            model_info = await ollama_service.get_model_info(model_name)
            if "model_info" in model_info:
                info = model_info["model_info"]
                if "llama.context_length" in info:
                    context_length = info["llama.context_length"]
                    cls.MODEL_CONTEXTS[model_name] = context_length
                    print(f"Updated context length for {model_name}: {context_length}")
        except Exception as e:
            print(f"Could not update model info for {model_name}: {e}")


class DocumentService:
    """Service for analyzing and processing various document types"""

    SUPPORTED_EXTENSIONS = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".csv": "text/csv",
        ".json": "application/json",
        ".xml": "application/xml",
        ".html": "text/html",
        ".htm": "text/html",
    }

    def __init__(self):
        self.max_chunk_size = 4000  # Tokens per chunk (legacy, will be overridden)
        self.max_total_tokens = 32000  # Total tokens for analysis (legacy)

    @property
    def document_timeout(self) -> float:
        """Get document timeout from settings, with fallback to default"""
        return settings.document_timeout

    def calculate_timeout(
        self,
        text_length: int,
        is_chunked: bool = False,
        model_name: Optional[str] = None,
    ) -> float:
        """Calculate appropriate timeout based on document size and model"""
        base_timeout = self.document_timeout

        # For slow models, use shorter timeouts
        if model_name and model_name in ModelRegistry.SLOW_MODELS:
            base_timeout = base_timeout * 0.6  # 60% of normal timeout for slow models

        if is_chunked:
            # For chunked analysis, use shorter timeouts per chunk
            # For very large documents, use more reasonable timeouts
            if text_length > 20000:
                # Use more reasonable timeout for large documents, especially with better models
                if model_name and model_name in ["phi3:mini", "llama3:latest"]:
                    return min(
                        45.0, base_timeout / 3
                    )  # Better timeout for capable models
                else:
                    return min(
                        25.0, base_timeout / 5
                    )  # Still reasonable for other models
            elif model_name and model_name in ModelRegistry.SLOW_MODELS:
                return min(25.0, base_timeout / 5)  # Reasonable timeout for slow models
            else:
                return min(40.0, base_timeout / 3)  # Standard chunked timeout

        # For direct analysis, scale timeout based on document size
        if text_length < 1000:
            return min(30.0, base_timeout / 2)  # Small documents
        elif text_length < 5000:
            return min(60.0, base_timeout / 1.5)  # Medium documents
        elif text_length < 15000:
            return base_timeout  # Large documents use full timeout
        else:
            # Very large documents should be chunked, but if not, use shorter timeout
            return min(90.0, base_timeout * 0.75)

    def get_model_aware_chunk_size(self, model_name: str) -> int:
        """Get chunk size optimized for the specific model"""
        return ModelRegistry.get_optimal_chunk_size(model_name)

    def should_chunk_documents(self, combined_text: str, model_name: str) -> bool:
        """Determine if documents should be chunked based on model capabilities and document size"""
        # Check if it exceeds model context window
        if ModelRegistry.should_chunk(combined_text, model_name):
            return True

        # Also chunk if document is very large (>15k chars) to prevent timeouts
        # Large documents can cause timeouts even if they fit in context
        if len(combined_text) > 15000:
            print(
                f"[DocumentService] Document is large ({len(combined_text)} chars), chunking to prevent timeouts"
            )
            return True

        return False

    def chunk_text(
        self, text: str, model_name: str, chunk_overlap: int = 200
    ) -> List[str]:
        """Split text into chunks optimized for the model"""
        # Get optimal chunk size for the model
        optimal_size = self.get_model_aware_chunk_size(model_name)

        # For very large documents, use smaller chunks to prevent timeouts
        if len(text) > 20000:
            # Use much smaller chunks for large documents to prevent timeouts
            if model_name in ["phi3:mini", "llama3:latest"]:
                chunk_size = int(
                    optimal_size * 0.4
                )  # Use 40% of optimal size for large documents
                print(
                    f"[DocumentService] Using conservative chunks ({chunk_size} chars) for large document with {model_name} ({len(text)} chars)"
                )
            else:
                chunk_size = int(
                    optimal_size * 0.3
                )  # Use even smaller chunks for other models
                print(
                    f"[DocumentService] Using smaller chunks ({chunk_size} chars) for large document ({len(text)} chars)"
                )
        elif len(text) > 10000:
            # For medium-large documents, use moderate chunk sizes
            if model_name in ["phi3:mini", "llama3:latest"]:
                chunk_size = int(optimal_size * 0.6)  # Use 60% of optimal size
                print(
                    f"[DocumentService] Using moderate chunks ({chunk_size} chars) for medium document with {model_name} ({len(text)} chars)"
                )
            else:
                chunk_size = int(optimal_size * 0.5)
                print(
                    f"[DocumentService] Using moderate chunks ({chunk_size} chars) for medium document ({len(text)} chars)"
                )
        elif model_name in ModelRegistry.SLOW_MODELS:
            # For slow models, use even smaller chunks
            chunk_size = int(optimal_size * 0.5)
            print(
                f"[DocumentService] Using smaller chunks ({chunk_size} chars) for slow model {model_name} ({len(text)} chars)"
            )
        else:
            chunk_size = optimal_size

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size

            # If this isn't the last chunk, try to break at a sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 200 characters of the chunk
                search_start = max(start, end - 200)
                for i in range(end, search_start, -1):
                    if text[i] in ".!?\n":
                        end = i + 1
                        break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            # Move start position, accounting for overlap
            start = end - chunk_overlap
            if start >= len(text):
                break

        print(f"[DocumentService] Split document into {len(chunks)} chunks")
        return chunks

    def is_supported_file(self, filename: str) -> bool:
        """Check if file type is supported"""
        ext = Path(filename).suffix.lower()
        return ext in self.SUPPORTED_EXTENSIONS

    async def save_uploaded_file(self, file_content: bytes, filename: str) -> str:
        """Save uploaded file to temporary location"""
        # Create temp directory if it doesn't exist
        temp_dir = Path(tempfile.gettempdir()) / "elara_documents"
        temp_dir.mkdir(exist_ok=True)

        # Generate unique filename
        file_path = temp_dir / f"{os.urandom(8).hex()}_{filename}"

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)

        return str(file_path)

    async def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            doc = Document(file_path)
            text_parts = []

            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)

            # Also extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = []
                    for cell in row.cells:
                        if cell.text.strip():
                            row_text.append(cell.text.strip())
                    if row_text:
                        text_parts.append(" | ".join(row_text))

            return "\n\n".join(text_parts)
        except Exception as e:
            raise Exception(f"Failed to extract text from DOCX file: {str(e)}")

    async def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        if PyPDF2 is None:
            raise Exception(
                "PyPDF2 is not installed. Please install it with: pip install PyPDF2"
            )

        try:
            text_parts = []

            with open(file_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)

                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text.strip():
                        text_parts.append(f"Page {page_num + 1}:\n{page_text}")

            return "\n\n".join(text_parts)
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF file: {str(e)}")

    async def extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from plain text file"""
        try:
            async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                content = await f.read()
            return content
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                async with aiofiles.open(file_path, "r", encoding="latin-1") as f:
                    content = await f.read()
                return content
            except Exception as e:
                raise Exception(f"Failed to read text file with any encoding: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to extract text from text file: {str(e)}")

    async def extract_text_from_file(self, file_path: str, filename: str) -> str:
        """Extract text from file based on its extension"""
        ext = Path(filename).suffix.lower()

        if ext == ".docx":
            return await self.extract_text_from_docx(file_path)
        elif ext == ".pdf":
            return await self.extract_text_from_pdf(file_path)
        elif ext in [".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm"]:
            return await self.extract_text_from_txt(file_path)
        else:
            raise Exception(f"Unsupported file type: {ext}")

    async def analyze_documents(
        self,
        files: List[Dict[str, Union[str, bytes]]],
        prompt: str,
        model: Optional[str] = None,
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None,
    ) -> Dict[str, Any]:
        if model is None:
            model = settings.OLLAMA_MODEL

        # Try to update model info if not in registry
        if model not in ModelRegistry.MODEL_CONTEXTS:
            await ModelRegistry.update_model_info(model)

        print(
            f"[DocumentService] Starting analysis: model={model}, files={len(files)}, prompt='{prompt[:50]}...', settings_timeout={self.document_timeout}"
        )

        if progress_callback:
            progress_callback("Initializing analysis...", 35)

        try:
            # Extract text from all documents
            document_texts = []
            file_paths = []

            for i, file_data in enumerate(files):
                filename = str(file_data["filename"])
                file_content = file_data["content"]

                if progress_callback:
                    progress_callback(
                        f"Processing file {i+1}/{len(files)}: {filename}",
                        35 + (i / len(files)) * 10,
                    )

                # Handle base64-encoded content from frontend
                if isinstance(file_content, str):
                    try:
                        file_content = base64.b64decode(file_content)
                    except Exception as e:
                        print(
                            f"[DocumentService] Failed to decode base64 for {filename}: {e}"
                        )
                        raise

                if not self.is_supported_file(filename):
                    print(f"[DocumentService] Unsupported file type: {filename}")
                    raise Exception(f"Unsupported file type: {filename}")

                file_path = await self.save_uploaded_file(file_content, filename)
                file_paths.append(file_path)

                if progress_callback:
                    progress_callback(
                        f"Extracting text from {filename}...", 40 + (i / len(files)) * 5
                    )

                text = await self.extract_text_from_file(file_path, filename)
                document_texts.append(
                    {"filename": filename, "text": text, "length": len(text)}
                )
                print(
                    f"[DocumentService] Extracted text from {filename}: {len(text)} chars"
                )

            if progress_callback:
                progress_callback("Combining document content...", 50)

            combined_text = (
                "\n\n"
                + "=" * 50
                + "\n\n".join(
                    [
                        f"Document: {doc['filename']}\n\n{doc['text']}"
                        for doc in document_texts
                    ]
                )
            )

            should_chunk = self.should_chunk_documents(combined_text, model)
            context_length = ModelRegistry.get_context_length(model)
            estimated_tokens = ModelRegistry.estimate_tokens(combined_text)
            print(
                f"[DocumentService] Combined text length: {len(combined_text)} chars, estimated tokens: {estimated_tokens}, model context: {context_length}, should_chunk: {should_chunk}"
            )

            if should_chunk:
                if progress_callback:
                    progress_callback(
                        "Document is large, preparing chunked analysis...", 55
                    )
                print(f"[DocumentService] Using chunked analysis method.")
                result = await self._analyze_documents_chunked(
                    document_texts, prompt, model, file_paths, progress_callback
                )
                result.update(
                    {
                        "chunking_info": {
                            "model_context_length": context_length,
                            "estimated_tokens": estimated_tokens,
                            "chunking_decision": "chunked",
                            "reason": f"Text too long for model context ({estimated_tokens} tokens > {int(context_length * 0.75)} available)",
                        }
                    }
                )
                print(f"[DocumentService] Chunked analysis complete. Returning result.")
                return result
            else:
                if progress_callback:
                    progress_callback(
                        "Document size is manageable, using direct analysis...", 55
                    )
                print(f"[DocumentService] Using direct analysis method.")
                result = await self._analyze_documents_direct(
                    combined_text, prompt, model, file_paths, progress_callback
                )
                result.update(
                    {
                        "chunking_info": {
                            "model_context_length": context_length,
                            "estimated_tokens": estimated_tokens,
                            "chunking_decision": "direct",
                            "reason": f"Text fits in model context ({estimated_tokens} tokens <= {int(context_length * 0.75)} available)",
                        }
                    }
                )
                print(f"[DocumentService] Direct analysis complete. Returning result.")
                return result
        except Exception as e:
            print(f"[DocumentService] Exception during analysis: {e}")
            import traceback

            traceback.print_exc()
            await self._cleanup_temp_files(file_paths)
            raise e

    async def _analyze_documents_direct(
        self,
        combined_text: str,
        prompt: str,
        model: str,
        file_paths: List[str],
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None,
    ) -> Dict[str, Any]:
        try:
            if progress_callback:
                progress_callback("Preparing AI model request...", 60)

            timeout = self.calculate_timeout(
                len(combined_text), is_chunked=False, model_name=model
            )
            print(
                f"[DocumentService] [Direct] Calling ollama_service.query_ollama with timeout={timeout}, model={model}, prompt_len={len(prompt)}, text_len={len(combined_text)}"
            )

            if progress_callback:
                progress_callback(
                    f"Analyzing document with {model} (timeout: {timeout}s)...", 65
                )

            full_prompt = f"""Analyze these documents and answer: {prompt}\n\nDocuments:\n{combined_text}\n\nProvide a clear, concise analysis addressing the question directly."""
            response = await ollama_service.query_ollama(full_prompt, timeout, model)
            print(
                f"[DocumentService] [Direct] Model response received. Length: {len(str(response))}"
            )

            if progress_callback:
                progress_callback("Analysis completed successfully", 95)

            return {
                "status": "success",
                "analysis": response,
                "documents_processed": len(file_paths),
                "total_text_length": len(combined_text),
                "method": "direct",
                "timeout_used": timeout,
            }
        except Exception as e:
            print(f"[DocumentService] [Direct] Exception: {e}")
            import traceback

            traceback.print_exc()
            raise
        finally:
            await self._cleanup_temp_files(file_paths)

    async def _analyze_documents_chunked(
        self,
        document_texts: List[Dict[str, Any]],
        prompt: str,
        model: str,
        file_paths: List[str],
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None,
    ) -> Dict[str, Any]:
        try:
            if progress_callback:
                progress_callback("Preparing document chunks...", 60)

            all_chunks = []
            for doc in document_texts:
                chunks = self.chunk_text(doc["text"], model)
                for i, chunk in enumerate(chunks):
                    all_chunks.append(
                        {"filename": doc["filename"], "chunk_index": i, "text": chunk}
                    )
            timeout_per_chunk = self.calculate_timeout(
                0, is_chunked=True, model_name=model
            )
            print(
                f"[DocumentService] [Chunked] Total chunks: {len(all_chunks)}, timeout per chunk: {timeout_per_chunk}"
            )

            if progress_callback:
                progress_callback(f"Split document into {len(all_chunks)} chunks", 65)

            chunk_analyses = []

            # Calculate dynamic progress range based on model and document characteristics
            avg_chunk_size = (
                sum(len(chunk["text"]) for chunk in all_chunks) // len(all_chunks)
                if all_chunks
                else 0
            )
            progress_start, progress_end = self.calculate_progress_range(
                len(all_chunks), model, avg_chunk_size
            )
            total_chunks = len(all_chunks)
            progress_per_chunk = (progress_end - progress_start) / max(total_chunks, 1)

            for i, chunk in enumerate(all_chunks):
                if progress_callback:
                    progress = progress_start + (i * progress_per_chunk)
                    progress_callback(
                        f"Analyzing chunk {i+1}/{total_chunks} ({chunk['filename']})...",
                        int(progress),
                    )

                chunk_prompt = f"""Extract key info relevant to: {prompt}\n\nDocument: {chunk['filename']} (Chunk {chunk['chunk_index'] + 1})\n{chunk['text']}\n\nBrief analysis focusing on the question:"""
                print(
                    f"[DocumentService] [Chunked] Calling ollama_service.query_ollama for chunk {chunk['chunk_index']+1} of {chunk['filename']} (chunk_len={len(chunk['text'])})"
                )

                # Try up to 2 times for each chunk
                analysis = None
                for attempt in range(2):
                    try:
                        analysis = await ollama_service.query_ollama(
                            chunk_prompt, timeout_per_chunk, model
                        )
                        print(
                            f"[DocumentService] [Chunked] Model response for chunk {chunk['chunk_index']+1} received. Length: {len(str(analysis))}"
                        )
                        break
                    except Exception as e:
                        if attempt == 0:
                            print(
                                f"[DocumentService] [Chunked] First attempt failed for chunk {i+1}, retrying with longer timeout: {e}"
                            )
                            # Try with longer timeout on retry for timeout-related errors
                            retry_timeout = timeout_per_chunk * 1.5
                            try:
                                analysis = await ollama_service.query_ollama(
                                    chunk_prompt, retry_timeout, model
                                )
                                print(
                                    f"[DocumentService] [Chunked] Retry successful for chunk {chunk['chunk_index']+1}"
                                )
                                break
                            except Exception as retry_e:
                                print(
                                    f"[DocumentService] [Chunked] Retry also failed for chunk {chunk['chunk_index']+1}: {retry_e}"
                                )
                                # Use a fallback analysis
                                analysis = f"[Analysis failed for chunk {chunk['chunk_index']+1} - content too complex for model]"
                        else:
                            print(
                                f"[DocumentService] [Chunked] Both attempts failed for chunk {chunk['chunk_index']+1}, using fallback"
                            )
                            analysis = f"[Analysis failed for chunk {chunk['chunk_index']+1} - content too complex for model]"

                chunk_analyses.append(
                    {
                        "filename": chunk["filename"],
                        "chunk_index": chunk["chunk_index"],
                        "analysis": analysis,
                    }
                )

                # Progress after each chunk
                if progress_callback:
                    progress = progress_start + ((i + 1) * progress_per_chunk)
                    progress_callback(
                        f"Completed chunk {i+1}/{total_chunks} ({chunk['filename']})",
                        int(progress),
                    )

            if progress_callback:
                progress_callback("Combining chunk analyses...", 92)

            combined_analyses = "\n\n".join(
                [
                    f"From {analysis['filename']} (Chunk {analysis['chunk_index'] + 1}):\n{analysis['analysis']}"
                    for analysis in chunk_analyses
                ]
            )
            final_timeout = self.calculate_timeout(
                len(combined_analyses), is_chunked=False, model_name=model
            )

            if progress_callback:
                progress_callback(f"Synthesizing final analysis with {model}...", 96)

            final_prompt = f"""Synthesize this information to answer: {prompt}\n\nAnalyses:\n{combined_analyses}\n\nProvide a coherent, comprehensive answer:"""
            print(
                f"[DocumentService] [Chunked] Calling ollama_service.query_ollama for final summary with timeout={final_timeout}, combined_analyses_len={len(combined_analyses)}"
            )
            final_analysis = await ollama_service.query_ollama(
                final_prompt, final_timeout, model
            )
            print(
                f"[DocumentService] [Chunked] Final summary response received. Length: {len(str(final_analysis))}"
            )

            if progress_callback:
                progress_callback("Chunked analysis completed successfully", 100)

            return {
                "status": "success",
                "analysis": final_analysis,
                "documents_processed": len(document_texts),
                "chunks_analyzed": len(all_chunks),
                "method": "chunked",
                "timeout_per_chunk": timeout_per_chunk,
                "final_timeout": final_timeout,
            }
        except Exception as e:
            print(f"[DocumentService] [Chunked] Exception: {e}")
            import traceback

            traceback.print_exc()
            raise
        finally:
            await self._cleanup_temp_files(file_paths)

    def calculate_progress_range(
        self,
        total_chunks: int,
        model_name: str,
        avg_chunk_size: int,
        has_retries: bool = True,
    ) -> tuple[int, int]:
        """
        Calculate dynamic progress range based on model and document characteristics.

        Returns:
            tuple: (progress_start, progress_end) for chunk processing
        """
        # Base progress allocation for chunk processing
        base_chunk_progress = 25  # 25% of total progress for chunk processing

        # Adjust based on model speed
        if model_name in ModelRegistry.SLOW_MODELS:
            # Slow models need more time, so allocate more progress space
            chunk_progress = base_chunk_progress * 1.5  # 37.5%
        elif model_name in ["phi3:mini", "llama3:latest"]:
            # Fast models can use less progress space
            chunk_progress = base_chunk_progress * 0.8  # 20%
        else:
            chunk_progress = base_chunk_progress

        # Adjust based on number of chunks
        if total_chunks > 10:
            # Many chunks = more processing time
            chunk_progress *= 1.3
        elif total_chunks > 5:
            # Moderate number of chunks
            chunk_progress *= 1.1
        elif total_chunks <= 2:
            # Few chunks = faster processing
            chunk_progress *= 0.7

        # Adjust based on chunk size complexity
        if avg_chunk_size > 3000:
            # Large chunks take longer
            chunk_progress *= 1.2
        elif avg_chunk_size < 1000:
            # Small chunks are faster
            chunk_progress *= 0.8

        # Account for retry attempts
        if has_retries:
            chunk_progress *= 1.1  # 10% extra for potential retries

        # Ensure reasonable bounds
        chunk_progress = max(15, min(45, chunk_progress))

        # Calculate start and end points
        progress_start = 65
        progress_end = progress_start + int(chunk_progress)

        print(
            f"[DocumentService] Progress calculation: chunks={total_chunks}, model={model_name}, avg_chunk_size={avg_chunk_size}, progress_range={progress_start}-{progress_end}"
        )

        return progress_start, progress_end

    async def _cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    await aiofiles.os.remove(file_path)
            except Exception:
                pass  # Ignore cleanup errors


# Global service instance
document_service = DocumentService()
