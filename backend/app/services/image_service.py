import asyncio
import os
import tempfile
import base64
from typing import List, Dict, Any, Optional, Union, Callable, Tuple
from pathlib import Path
import aiofiles
import aiofiles.os

try:
    from PIL import Image
except ImportError:
    Image = None
import io
import re
import httpx
from app.services.ollama_service import ollama_service
from app.config.settings import settings


class ImageModelRegistry:
    """Registry of vision model capabilities and image processing settings"""

    # Vision models that support image analysis
    VISION_MODELS = {
        "llava:7b": {
            "context_length": 8192,
            "max_image_size": 1024,  # Max dimension for optimal performance
            "supports_detail_analysis": True,
            "supports_global_analysis": True,
        },
        "llava:13b": {
            "context_length": 8192,
            "max_image_size": 1024,
            "supports_detail_analysis": True,
            "supports_global_analysis": True,
        },
        "llava:34b": {
            "context_length": 8192,
            "max_image_size": 1024,
            "supports_detail_analysis": True,
            "supports_global_analysis": True,
        },
        "bakllava:7b": {
            "context_length": 8192,
            "max_image_size": 1024,
            "supports_detail_analysis": True,
            "supports_global_analysis": True,
        },
        "llava-llama3.2:8b": {
            "context_length": 8192,
            "max_image_size": 1024,
            "supports_detail_analysis": True,
            "supports_global_analysis": True,
        },
    }

    @classmethod
    def get_default_vision_model(cls) -> str:
        """Get default vision model from settings"""
        from app.config.settings import settings
        return settings.VISION_DEFAULT_MODEL

    @classmethod
    def get_fallback_models(cls) -> List[str]:
        """Get fallback models from settings"""
        from app.config.settings import settings
        return settings.VISION_FALLBACK_MODELS

    @classmethod
    def is_vision_model(cls, model_name: str) -> bool:
        """Check if a model supports vision/image analysis"""
        return model_name in cls.VISION_MODELS

    @classmethod
    def get_vision_model_info(cls, model_name: str) -> Dict[str, Any]:
        """Get vision model capabilities"""
        return cls.VISION_MODELS.get(model_name, {})

    @classmethod
    def get_optimal_image_size(cls, model_name: str) -> int:
        """Get optimal image size for a vision model"""
        model_info = cls.get_vision_model_info(model_name)
        return model_info.get("max_image_size", 1024)

    @classmethod
    def supports_detail_analysis(cls, model_name: str) -> bool:
        """Check if model supports detailed image analysis"""
        model_info = cls.get_vision_model_info(model_name)
        return model_info.get("supports_detail_analysis", False)

    @classmethod
    def supports_global_analysis(cls, model_name: str) -> bool:
        """Check if model supports global image analysis"""
        model_info = cls.get_vision_model_info(model_name)
        return model_info.get("supports_global_analysis", False)

    @classmethod
    async def find_best_vision_model(cls) -> str:
        """Find the best available vision model"""
        try:
            # Check available models
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get("http://localhost:11434/api/tags")
                if response.status_code == 200:
                    models_data = response.json()
                    available_models = [
                        m["name"] for m in models_data.get("models", [])
                    ]

                    # Check for vision models in order of preference
                    for vision_model in cls.VISION_MODELS.keys():
                        if vision_model in available_models:
                            return vision_model

                    # If no vision models available, return default
                    print(
                        f"[ImageModelRegistry] No vision models found. Available: {available_models}"
                    )
                    return cls.get_default_vision_model()
        except Exception as e:
            print(f"[ImageModelRegistry] Error checking available models: {e}")

        return cls.get_default_vision_model()


class ImageAnalysisStrategy:
    """Determines the best analysis strategy based on user prompt and image characteristics"""

    # Keywords that suggest global/overview analysis
    GLOBAL_ANALYSIS_KEYWORDS = [
        "overview",
        "describe",
        "what is",
        "what's in",
        "what does this show",
        "summarize",
        "general",
        "overall",
        "entire",
        "whole",
        "complete",
        "scene",
        "landscape",
        "portrait",
        "composition",
        "layout",
    ]

    # Keywords that suggest detailed/specific analysis
    DETAIL_ANALYSIS_KEYWORDS = [
        "find",
        "locate",
        "identify",
        "detect",
        "spot",
        "search for",
        "specific",
        "particular",
        "exact",
        "precise",
        "detailed",
        "text",
        "words",
        "numbers",
        "signs",
        "labels",
        "symbols",
        "objects",
        "items",
        "people",
        "faces",
        "animals",
        "vehicles",
    ]

    @classmethod
    def analyze_prompt_intent(cls, prompt: str) -> Dict[str, Union[bool, str]]:
        """Analyze user prompt to determine analysis intent"""
        prompt_lower = prompt.lower()

        global_intent = any(
            keyword in prompt_lower for keyword in cls.GLOBAL_ANALYSIS_KEYWORDS
        )
        detail_intent = any(
            keyword in prompt_lower for keyword in cls.DETAIL_ANALYSIS_KEYWORDS
        )

        # If both are detected, prioritize detail analysis
        if global_intent and detail_intent:
            return {
                "needs_global_analysis": True,
                "needs_detail_analysis": True,
                "primary_focus": "detail",
            }
        elif detail_intent:
            return {
                "needs_global_analysis": False,
                "needs_detail_analysis": True,
                "primary_focus": "detail",
            }
        else:
            return {
                "needs_global_analysis": True,
                "needs_detail_analysis": False,
                "primary_focus": "global",
            }

    @classmethod
    def should_scale_image(cls, image_size: Tuple[int, int], model_name: str) -> bool:
        """Determine if image should be scaled down"""
        optimal_size = ImageModelRegistry.get_optimal_image_size(model_name)
        max_dimension = max(image_size)
        return max_dimension > optimal_size

    @classmethod
    def should_split_image(cls, image_size: Tuple[int, int], model_name: str) -> bool:
        """Determine if image should be split into parts for detailed analysis"""
        # Split if image is very large and we need detailed analysis
        max_dimension = max(image_size)
        return max_dimension > 2048  # Very large images


class ImageService:
    """Service for analyzing and processing images"""

    SUPPORTED_EXTENSIONS = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".webp": "image/webp",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
    }

    def __init__(self):
        self.max_file_size = 10 * 1024 * 1024  # 10MB

    @property
    def image_timeout(self) -> float:
        """Get image timeout from settings, with fallback to default"""
        return getattr(settings, "image_timeout", 120.0)

    def is_supported_image(self, filename: str) -> bool:
        """Check if image file type is supported"""
        ext = Path(filename).suffix.lower()
        return ext in self.SUPPORTED_EXTENSIONS

    async def save_uploaded_image(self, file_content: bytes, filename: str) -> str:
        """Save uploaded image to temporary location"""
        # Create temp directory if it doesn't exist
        temp_dir = Path(tempfile.gettempdir()) / "elara_images"
        temp_dir.mkdir(exist_ok=True)

        # Generate unique filename
        file_path = temp_dir / f"{os.urandom(8).hex()}_{filename}"

        print(
            f"[ImageService] Saving image: {filename}, content size: {len(file_content)} bytes"
        )

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)

        # Verify file was saved correctly
        saved_size = os.path.getsize(file_path)
        print(f"[ImageService] Image saved: {file_path}, size: {saved_size} bytes")

        if saved_size != len(file_content):
            print(
                f"[ImageService] WARNING: File size mismatch! Expected: {len(file_content)}, Actual: {saved_size}"
            )

        return str(file_path)

    def get_image_info(self, image_path: str) -> Dict[str, Any]:
        """Get image information (size, format, etc.)"""
        if Image is None:
            raise Exception(
                "PIL (Pillow) is not installed. Please install it with: pip install Pillow"
            )

        try:
            with Image.open(image_path) as img:
                return {
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode,
                    "size_bytes": os.path.getsize(image_path),
                }
        except Exception as e:
            raise Exception(f"Failed to get image info: {str(e)}")

    def scale_image(self, image_path: str, max_size: int) -> str:
        """Scale image to fit within max_size while maintaining aspect ratio"""
        if Image is None:
            raise Exception(
                "PIL (Pillow) is not installed. Please install it with: pip install Pillow"
            )

        try:
            with Image.open(image_path) as img:
                # Calculate new size maintaining aspect ratio
                ratio = min(max_size / img.width, max_size / img.height)
                new_size = (int(img.width * ratio), int(img.height * ratio))

                if new_size == (img.width, img.height):
                    # No scaling needed
                    return image_path

                # Scale image
                scaled_img = img.resize(new_size, Image.Resampling.LANCZOS)

                # Save scaled image
                scaled_path = image_path.replace(".", "_scaled.")
                scaled_img.save(scaled_path, format=img.format or "PNG")

                print(f"[ImageService] Scaled image from {img.size} to {new_size}")
                return scaled_path
        except Exception as e:
            raise Exception(f"Failed to scale image: {str(e)}")

    def split_image(self, image_path: str, grid_size: int = 2) -> List[str]:
        """Split image into grid parts for detailed analysis"""
        if Image is None:
            raise Exception(
                "PIL (Pillow) is not installed. Please install it with: pip install Pillow"
            )

        try:
            with Image.open(image_path) as img:
                width, height = img.size
                part_width = width // grid_size
                part_height = height // grid_size

                parts = []
                for row in range(grid_size):
                    for col in range(grid_size):
                        # Calculate crop box
                        left = col * part_width
                        top = row * part_height
                        right = left + part_width
                        bottom = top + part_height

                        # Crop image part
                        part = img.crop((left, top, right, bottom))

                        # Save part
                        part_path = f"{image_path}_part_{row}_{col}.png"
                        part.save(part_path, format="PNG")
                        parts.append(part_path)

                print(f"[ImageService] Split image into {len(parts)} parts")
                return parts
        except Exception as e:
            raise Exception(f"Failed to split image: {str(e)}")

    def encode_image_base64(self, image_path: str) -> str:
        """Encode image to base64 for Ollama API"""
        try:
            with open(image_path, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
                return encoded_string
        except Exception as e:
            raise Exception(f"Failed to encode image: {str(e)}")

    async def query_vision_model(
        self, prompt: str, image_path: str, model: str, timeout: float
    ) -> str:
        """Query vision model with image and prompt"""
        try:
            print(
                f"[ImageService] Starting vision model query: model={model}, timeout={timeout}s"
            )

            # Encode image
            print(f"[ImageService] Encoding image: {image_path}")
            image_base64 = self.encode_image_base64(image_path)
            print(
                f"[ImageService] Image encoded successfully, size: {len(image_base64)} chars"
            )

            # Prepare request for Ollama vision API
            request_data = {
                "model": model,
                "prompt": prompt,
                "images": [image_base64],
                "stream": False,
            }

            print(
                f"[ImageService] Querying vision model {model} with image {image_path}"
            )

            # Use the full timeout for vision model queries (they can take longer)
            http_timeout = timeout

            print(f"[ImageService] Using HTTP timeout: {http_timeout}s")

            async with httpx.AsyncClient(timeout=http_timeout) as client:
                print(f"[ImageService] Sending request to Ollama API...")

                # Send the request and wait for response
                response = await client.post(
                    "http://localhost:11434/api/generate", json=request_data
                )
                print(
                    f"[ImageService] Received response: status={response.status_code}"
                )
                response.raise_for_status()

                result = response.json()
                response_text = result.get("response", "")
                print(
                    f"[ImageService] Vision model response received, length: {len(response_text)}"
                )

                if not response_text:
                    print("[ImageService] WARNING: Empty response from vision model!")
                    return (
                        "The vision model returned an empty response. Please try again."
                    )

                return response_text

        except httpx.TimeoutException as e:
            error_msg = f"Vision model query timed out after {timeout}s: {str(e)}"
            print(f"[ImageService] {error_msg}")
            raise Exception(error_msg)
        except httpx.HTTPStatusError as e:
            error_msg = f"Vision model HTTP error {e.response.status_code}: {str(e)}"
            print(f"[ImageService] {error_msg}")
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Vision model query failed: {str(e)}"
            print(f"[ImageService] {error_msg}")
            raise Exception(error_msg)

    async def _analyze_single_image(
        self,
        image_path: str,
        image_info: Dict[str, Any],
        prompt: str,
        model: str,
        intent: Dict[str, Union[bool, str]],
        image_index: int,
        total_images: int,
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None,
        stop_event: Optional[asyncio.Event] = None,
    ) -> Dict[str, Any]:
        """Analyze a single image with retry logic and better error handling"""

        image_size = (image_info["width"], image_info["height"])
        filename = image_info.get("filename", f"image_{image_index + 1}")

        print(
            f"[ImageService] Analyzing image {image_index + 1}/{total_images}: {filename}"
        )

        # Check if image needs scaling or splitting
        should_scale = ImageAnalysisStrategy.should_scale_image(image_size, model)
        should_split = ImageAnalysisStrategy.should_split_image(image_size, model)

        print(
            f"[ImageService] Image {image_index + 1}: size={image_size}, scale={should_scale}, split={should_split}"
        )

        image_analysis = {
            "filename": filename,
            "size": image_size,
            "analysis": "",
            "method": "direct",
        }

        # Calculate timeout for this image based on complexity
        base_timeout = self.image_timeout
        if should_split:
            # Split images need more time (4 parts)
            image_timeout = base_timeout * 1.5
        elif should_scale:
            # Scaled images need moderate time
            image_timeout = base_timeout * 1.2
        else:
            # Direct analysis
            image_timeout = base_timeout

        print(
            f"[ImageService] Using timeout {image_timeout}s for image {image_index + 1}"
        )

        # Calculate progress ranges for this image
        # Each image gets a progress range from 10% to 80%
        image_progress_start = 10 + (image_index / total_images) * 50
        image_progress_end = 10 + ((image_index + 1) / total_images) * 50
        image_progress_range = image_progress_end - image_progress_start

        # Count total steps for this image
        total_steps = 0
        if should_scale and intent["needs_global_analysis"]:
            total_steps += 1
        if should_split and intent["needs_detail_analysis"]:
            total_steps += 4  # 4 parts
        if not should_scale and not should_split:
            total_steps += 1

        current_step = 0

        try:
            # Global analysis (scaled)
            if should_scale and intent["needs_global_analysis"]:
                current_step += 1
                step_progress = (
                    image_progress_start
                    + (current_step - 1) / total_steps * image_progress_range
                )

                if progress_callback:
                    progress_callback(
                        f"Scaling image {image_index + 1}/{total_images} for global analysis...\n",
                        step_progress,
                    )

                scaled_path = self.scale_image(
                    image_path, ImageModelRegistry.get_optimal_image_size(model)
                )
                global_prompt = (
                    f"Provide a comprehensive overview of this image: {prompt}"
                )

                # Retry logic for global analysis
                for attempt in range(2):
                    # Check if analysis should be stopped
                    if stop_event and stop_event.is_set():
                        print("[ImageService] Analysis stopped by user request")
                        raise Exception("Analysis stopped by user request")

                    try:
                        step_progress = (
                            image_progress_start
                            + (current_step - 0.5) / total_steps * image_progress_range
                        )
                        if progress_callback:
                            progress_callback(
                                f"Global analysis {image_index + 1}/{total_images} (step {current_step}/{total_steps}, attempt {attempt + 1}/2)...\n",
                                step_progress,
                            )

                        global_analysis = await self.query_vision_model(
                            global_prompt, scaled_path, model, image_timeout
                        )
                        image_analysis[
                            "analysis"
                        ] += f"Global Overview:\n{global_analysis}\n\n"
                        image_analysis["method"] = "scaled"
                        print(f"[ImageService] Global analysis completed successfully")
                        break
                    except Exception as e:
                        if attempt == 0:
                            print(
                                f"[ImageService] Global analysis attempt 1 failed: {e}"
                            )
                            if progress_callback:
                                progress_callback(
                                    f"Retrying global analysis {image_index + 1}/{total_images} (step {current_step}/{total_steps})...\n",
                                    step_progress,
                                )
                            # Wait a bit before retry
                            await asyncio.sleep(2)
                        else:
                            print(
                                f"[ImageService] Global analysis failed after retry: {e}"
                            )
                            image_analysis[
                                "analysis"
                            ] += f"Global analysis failed: {str(e)}\n\n"

            # Detailed analysis (split)
            if should_split and intent["needs_detail_analysis"]:
                current_step += 1
                step_progress = (
                    image_progress_start
                    + (current_step - 1) / total_steps * image_progress_range
                )

                if progress_callback:
                    progress_callback(
                        f"Splitting image {image_index + 1}/{total_images} for detailed analysis...\n",
                        step_progress,
                    )

                parts = self.split_image(image_path, grid_size=2)
                detail_analyses = []

                for j, part_path in enumerate(parts):
                    # Check if analysis should be stopped
                    if stop_event and stop_event.is_set():
                        print("[ImageService] Analysis stopped by user request")
                        raise Exception("Analysis stopped by user request")

                    detail_prompt = (
                        f"Analyze this specific part of the image for: {prompt}"
                    )

                    # Retry logic for each part
                    for attempt in range(2):
                        try:
                            step_progress = (
                                image_progress_start
                                + (current_step - 0.5)
                                / total_steps
                                * image_progress_range
                            )
                            if progress_callback:
                                progress_callback(
                                    f"Detailed analysis {image_index + 1}/{total_images} - part {j+1}/{len(parts)} (step {current_step}/{total_steps}, attempt {attempt + 1}/2)...\n",
                                    step_progress,
                                )

                            part_analysis = await self.query_vision_model(
                                detail_prompt,
                                part_path,
                                model,
                                image_timeout / 4,  # Divide timeout by number of parts
                            )
                            detail_analyses.append(f"Part {j+1}: {part_analysis}")
                            print(f"[ImageService] Part {j+1} analysis completed")
                            break
                        except Exception as e:
                            if attempt == 0:
                                print(
                                    f"[ImageService] Part {j+1} analysis attempt 1 failed: {e}"
                                )
                                if progress_callback:
                                    progress_callback(
                                        f"Retrying part {j+1} analysis for image {image_index + 1}/{total_images} (step {current_step}/{total_steps})...\n",
                                        step_progress,
                                    )
                                await asyncio.sleep(2)
                            else:
                                print(
                                    f"[ImageService] Part {j+1} analysis failed after retry: {e}"
                                )
                                detail_analyses.append(
                                    f"Part {j+1}: Analysis failed - {str(e)}"
                                )

                    current_step += 1

                if detail_analyses:
                    image_analysis["analysis"] += (
                        f"Detailed Analysis:\n" + "\n".join(detail_analyses) + "\n\n"
                    )
                    image_analysis["method"] = (
                        "split"
                        if image_analysis["method"] == "direct"
                        else "scaled_split"
                    )

            # Direct analysis
            if not should_scale and not should_split:
                current_step += 1
                step_progress = (
                    image_progress_start
                    + (current_step - 0.5) / total_steps * image_progress_range
                )

                # Retry logic for direct analysis
                for attempt in range(2):
                    # Check if analysis should be stopped
                    if stop_event and stop_event.is_set():
                        print("[ImageService] Analysis stopped by user request")
                        raise Exception("Analysis stopped by user request")

                    try:
                        if progress_callback:
                            progress_callback(
                                f"Direct analysis {image_index + 1}/{total_images} (step {current_step}/{total_steps}, attempt {attempt + 1}/2)...\n",
                                step_progress,
                            )

                        direct_analysis = await self.query_vision_model(
                            prompt, image_path, model, image_timeout
                        )
                        image_analysis["analysis"] = direct_analysis
                        print(f"[ImageService] Direct analysis completed successfully")
                        break
                    except Exception as e:
                        if attempt == 0:
                            print(
                                f"[ImageService] Direct analysis attempt 1 failed: {e}"
                            )
                            if progress_callback:
                                progress_callback(
                                    f"Retrying direct analysis {image_index + 1}/{total_images} (step {current_step}/{total_steps})...\n",
                                    step_progress,
                                )
                            await asyncio.sleep(2)
                        else:
                            print(
                                f"[ImageService] Direct analysis failed after retry: {e}"
                            )
                            image_analysis["analysis"] = f"Analysis failed: {str(e)}"

        except Exception as e:
            print(f"[ImageService] Error during image analysis: {e}")
            image_analysis["analysis"] = f"Analysis error: {str(e)}"

        return image_analysis

    async def analyze_images(
        self,
        files: List[Dict[str, Union[str, bytes]]],
        prompt: str,
        model: Optional[str] = None,
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None,
        stop_event: Optional[asyncio.Event] = None,
    ) -> Dict[str, Any]:
        """Analyze images with intelligent strategy selection"""

        print(
            f"[ImageService] analyze_images called with {len(files)} files, model={model}, prompt='{prompt[:50]}...'"
        )

        # Determine best vision model
        if model is None or not ImageModelRegistry.is_vision_model(model):
            print(
                f"[ImageService] Model {model} is not a vision model, finding best vision model..."
            )
            model = await ImageModelRegistry.find_best_vision_model()
            print(f"[ImageService] Using vision model: {model}")

        print(
            f"[ImageService] Starting analysis: model={model}, files={len(files)}, prompt='{prompt[:50]}...'"
        )

        if progress_callback:
            progress_callback("Preparing image analysis...\n", 5)

        try:
            # Process images
            image_paths = []
            image_infos = []

            for i, file_data in enumerate(files):
                filename = str(file_data["filename"])
                file_content = file_data["content"]

                print(f"[ImageService] Processing file {i+1}/{len(files)}: {filename}")

                if progress_callback:
                    progress_callback(
                        f"Processing image {i+1}/{len(files)}: {filename}\n",
                        10 + (i / len(files)) * 10,
                    )

                # Handle base64-encoded content from frontend
                if isinstance(file_content, str):
                    try:
                        print(f"[ImageService] Decoding base64 content for {filename}")
                        file_content = base64.b64decode(file_content)
                        print(
                            f"[ImageService] Successfully decoded {len(file_content)} bytes"
                        )
                    except Exception as e:
                        print(
                            f"[ImageService] Failed to decode base64 for {filename}: {e}"
                        )
                        raise

                if not self.is_supported_image(filename):
                    raise Exception(f"Unsupported image type: {filename}")

                # Save image
                print(f"[ImageService] Saving image: {filename}")
                image_path = await self.save_uploaded_image(file_content, filename)
                image_paths.append(image_path)

                # Get image info
                print(f"[ImageService] Getting image info for: {image_path}")
                image_info = self.get_image_info(image_path)
                image_info["filename"] = filename  # Add filename to image_info
                image_infos.append(image_info)
                print(f"[ImageService] Image info: {image_info}")

            if progress_callback:
                progress_callback("Analyzing image content...\n", 30)

            # Analyze prompt intent
            intent = ImageAnalysisStrategy.analyze_prompt_intent(prompt)
            print(f"[ImageService] Analysis intent: {intent}")

            # Process images one at a time with better timeout management
            analysis_results = []
            total_images = len(image_paths)

            for i, (image_path, image_info) in enumerate(zip(image_paths, image_infos)):
                # Check if analysis should be stopped
                if stop_event and stop_event.is_set():
                    print("[ImageService] Analysis stopped by user request")
                    raise Exception("Analysis stopped by user request")

                print(
                    f"[ImageService] Starting analysis of image {i+1}/{total_images} \n"
                )

                if progress_callback:
                    progress_callback(
                        f"Starting analysis of image {i+1}/{total_images}... \n",
                        30 + (i / total_images) * 50,
                    )

                # Analyze single image with retry logic
                image_analysis = await self._analyze_single_image(
                    image_path=image_path,
                    image_info=image_info,
                    prompt=prompt,
                    model=model,
                    intent=intent,
                    image_index=i,
                    total_images=total_images,
                    progress_callback=progress_callback,
                    stop_event=stop_event,
                )

                analysis_results.append(image_analysis)

                print(
                    f"[ImageService] Completed analysis of image {i+1}/{total_images}"
                )

                # Small delay between images to prevent overwhelming the model
                if i < total_images - 1:
                    await asyncio.sleep(1)

            if progress_callback:
                progress_callback("Combining analysis results...", 85)

            # Combine results
            if len(analysis_results) == 1:
                final_analysis = analysis_results[0]["analysis"]
            else:
                combined_analyses = []
                for result in analysis_results:
                    combined_analyses.append(
                        f"Image: {result['filename']}\n{result['analysis']}"
                    )
                final_analysis = "\n\n".join(combined_analyses)

            print(
                f"[ImageService] Analysis completed successfully, final length: {len(final_analysis)}"
            )

            if progress_callback:
                progress_callback("Analysis completed successfully\n", 100)

            return {
                "status": "success",
                "analysis": final_analysis,
                "images_processed": len(image_paths),
                "method": "vision_model",
                "model_used": model,
                "analysis_strategy": intent,
                "image_details": image_infos,
                "total_images": total_images,
                "processed_images": len(analysis_results),
            }

        except Exception as e:
            print(f"[ImageService] Exception during analysis: {e}")
            import traceback

            traceback.print_exc()
            await self._cleanup_temp_files(image_paths)
            raise e

    async def _cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    await aiofiles.os.remove(file_path)

                    # Also clean up any related files (scaled, split parts)
                    base_path = str(file_path)
                    for related_file in Path(file_path).parent.glob(
                        f"{Path(file_path).stem}*"
                    ):
                        if str(related_file) != base_path:
                            await aiofiles.os.remove(str(related_file))
            except Exception:
                pass  # Ignore cleanup errors


# Global service instance
image_service = ImageService()
