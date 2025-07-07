import asyncio
import os
import tempfile
import base64
from typing import List, Dict, Any, Optional, Union, Callable, Tuple
from pathlib import Path
import aiofiles
import aiofiles.os

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
except ImportError:
    Image = None

import io
import httpx
from app.services.ollama_service import ollama_service
from app.config.settings import settings


class ImageCreationService:
    """Service for creating and modifying images"""

    SUPPORTED_OUTPUT_FORMATS = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg", 
        ".png": "image/png",
        ".bmp": "image/bmp",
        ".webp": "image/webp",
        ".tiff": "image/tiff",
    }

    def __init__(self):
        self.max_retries = 3
        self.default_size = (1024, 768)  # Default image size

    @property
    def creation_timeout(self) -> float:
        """Get creation timeout from settings, with fallback to default"""
        return getattr(settings, "image_timeout", 120.0)

    async def create_image_from_prompt(
        self,
        prompt: str,
        style: str = "realistic",
        size: Tuple[int, int] = None,
        format_type: str = "png",
        model: Optional[str] = None,
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None,
        stop_event: Optional[asyncio.Event] = None,
    ) -> Dict[str, Any]:
        """Create an image based on a text prompt
        
        Note: This creates a procedural/programmatic image based on the description.
        For AI-generated images, you would need to integrate with services like DALL-E or Stable Diffusion.
        """
        
        if Image is None:
            return {
                "status": "error",
                "error": "PIL not installed",
                "message": "PIL (Pillow) is required for image creation. Please install it with: pip install Pillow"
            }

        if progress_callback:
            progress_callback("Analyzing image requirements...", 10)

        size = size or self.default_size
        
        try:
            # Check for stop event
            if stop_event and stop_event.is_set():
                raise Exception("Image creation stopped by user request")

            if progress_callback:
                progress_callback("Generating image description...", 30)

            # Use AI to analyze the prompt and generate detailed image specifications
            model = model or settings.OLLAMA_MODEL
            image_spec = await self._generate_image_specifications(prompt, style, size, model)
            
            if progress_callback:
                progress_callback("Creating image...", 60)

            # Create the image based on specifications
            image_path = await self._create_procedural_image(image_spec, size, format_type, progress_callback)
            
            if progress_callback:
                progress_callback("Image created successfully!", 100)

            return {
                "status": "success",
                "file_path": image_path,
                "specifications": image_spec,
                "format": format_type,
                "size": size,
                "file_size": os.path.getsize(image_path),
                "filename": os.path.basename(image_path)
            }

        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to create image: {str(e)}"
            }

    async def modify_image(
        self,
        file_content: bytes,
        filename: str,
        modification_prompt: str,
        model: Optional[str] = None,
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None,
        stop_event: Optional[asyncio.Event] = None,
    ) -> Dict[str, Any]:
        """Modify an existing image based on a prompt"""
        
        if Image is None:
            return {
                "status": "error", 
                "error": "PIL not installed",
                "message": "PIL (Pillow) is required for image modification. Please install it with: pip install Pillow"
            }

        if progress_callback:
            progress_callback("Loading original image...", 10)

        try:
            # Save the uploaded file temporarily
            temp_path = await self._save_temp_file(file_content, filename)
            
            # Load and analyze the original image
            with Image.open(temp_path) as original_image:
                image_info = {
                    "size": original_image.size,
                    "mode": original_image.mode,
                    "format": original_image.format
                }
            
            if progress_callback:
                progress_callback("Analyzing modification requirements...", 40)

            # Check for stop event
            if stop_event and stop_event.is_set():
                raise Exception("Image modification stopped by user request")

            # Use AI to determine what modifications to make
            model = model or settings.OLLAMA_MODEL
            modification_spec = await self._generate_modification_specifications(
                modification_prompt, image_info, model
            )
            
            if progress_callback:
                progress_callback("Applying modifications...", 70)

            # Apply the modifications
            modified_path = await self._apply_image_modifications(
                temp_path, modification_spec, progress_callback
            )
            
            # Cleanup temp file
            try:
                os.remove(temp_path)
            except:
                pass

            if progress_callback:
                progress_callback("Image modified successfully!", 100)

            return {
                "status": "success",
                "file_path": modified_path,
                "original_info": image_info,
                "modifications": modification_spec,
                "file_size": os.path.getsize(modified_path),
                "filename": os.path.basename(modified_path)
            }

        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "message": f"Failed to modify image: {str(e)}"
            }

    async def _generate_image_specifications(
        self, prompt: str, style: str, size: Tuple[int, int], model: str
    ) -> Dict[str, Any]:
        """Use AI to generate detailed image specifications"""
        
        analysis_prompt = f"""Analyze this image creation request and provide detailed specifications for creating a procedural image:

Request: {prompt}
Style: {style}
Size: {size[0]}x{size[1]}

Please provide specifications in the following format:
- Background color (as RGB values)
- Primary shapes to draw (rectangles, circles, lines, etc.)
- Text elements to include
- Color scheme
- Layout suggestions
- Any specific visual elements mentioned

Focus on creating a clear, visually appealing design that can be implemented programmatically using basic shapes, colors, and text.

Respond in a structured format that can guide procedural image generation."""

        try:
            response = await ollama_service.query_ollama(
                analysis_prompt,
                timeout=self.creation_timeout,
                model=model
            )
            
            # Parse the AI response and convert to structured specifications
            return self._parse_image_specifications(response, style, size)
            
        except Exception as e:
            # Fallback to default specifications
            return self._get_default_specifications(prompt, style, size)

    def _parse_image_specifications(self, ai_response: str, style: str, size: Tuple[int, int]) -> Dict[str, Any]:
        """Parse AI response into structured image specifications"""
        
        # This is a simplified parser - in production, you might use more sophisticated parsing
        spec = {
            "background_color": (240, 240, 240),  # Light gray default
            "primary_colors": [(100, 150, 200), (200, 100, 100), (100, 200, 100)],
            "shapes": [],
            "text_elements": [],
            "style": style,
            "size": size
        }
        
        response_lower = ai_response.lower()
        
        # Extract background color hints
        if "white" in response_lower:
            spec["background_color"] = (255, 255, 255)
        elif "black" in response_lower:
            spec["background_color"] = (0, 0, 0)
        elif "blue" in response_lower:
            spec["background_color"] = (230, 240, 255)
        elif "red" in response_lower:
            spec["background_color"] = (255, 240, 240)
        elif "green" in response_lower:
            spec["background_color"] = (240, 255, 240)
            
        # Extract shape suggestions
        if "circle" in response_lower or "round" in response_lower:
            spec["shapes"].append({"type": "circle", "color": spec["primary_colors"][0]})
        if "rectangle" in response_lower or "square" in response_lower:
            spec["shapes"].append({"type": "rectangle", "color": spec["primary_colors"][1]})
        if "line" in response_lower:
            spec["shapes"].append({"type": "line", "color": spec["primary_colors"][2]})
            
        # Extract text suggestions
        lines = ai_response.split('\n')
        for line in lines:
            if any(word in line.lower() for word in ["title", "text", "label", "heading"]):
                # Extract potential text content
                text_content = line.strip()
                if len(text_content) > 0 and len(text_content) < 100:
                    spec["text_elements"].append({
                        "text": text_content,
                        "position": "center",
                        "size": "medium"
                    })
                    
        return spec

    def _get_default_specifications(self, prompt: str, style: str, size: Tuple[int, int]) -> Dict[str, Any]:
        """Provide default specifications when AI parsing fails"""
        
        return {
            "background_color": (240, 248, 255),  # Alice blue
            "primary_colors": [(70, 130, 180), (255, 69, 0), (50, 205, 50)],
            "shapes": [
                {"type": "rectangle", "color": (70, 130, 180)},
                {"type": "circle", "color": (255, 69, 0)}
            ],
            "text_elements": [
                {
                    "text": prompt[:50] + "..." if len(prompt) > 50 else prompt,
                    "position": "center",
                    "size": "large"
                }
            ],
            "style": style,
            "size": size
        }

    async def _create_procedural_image(
        self,
        spec: Dict[str, Any],
        size: Tuple[int, int],
        format_type: str,
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None
    ) -> str:
        """Create a procedural image based on specifications"""
        
        # Create new image
        image = Image.new("RGB", size, spec["background_color"])
        draw = ImageDraw.Draw(image)
        
        # Draw shapes
        if spec.get("shapes"):
            shape_count = len(spec["shapes"])
            for i, shape in enumerate(spec["shapes"]):
                self._draw_shape(draw, shape, size)
                
                if progress_callback and shape_count > 1:
                    progress = 60 + (i / shape_count) * 20
                    progress_callback(f"Drawing shape {i+1}/{shape_count}...", progress)
        
        # Add text elements
        if spec.get("text_elements"):
            for text_elem in spec["text_elements"]:
                self._draw_text(draw, text_elem, size)
                
        # Save image
        temp_dir = Path(tempfile.gettempdir()) / "elara_created_images"
        temp_dir.mkdir(exist_ok=True)
        
        timestamp = int(asyncio.get_event_loop().time())
        filename = f"created_image_{timestamp}.{format_type}"
        file_path = temp_dir / filename
        
        # Convert format if needed
        if format_type.lower() in ['jpg', 'jpeg']:
            # Convert to RGB for JPEG
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image.save(str(file_path), format='JPEG', quality=95)
        else:
            image.save(str(file_path), format=format_type.upper())
            
        return str(file_path)

    def _draw_shape(self, draw: ImageDraw.Draw, shape: Dict[str, Any], size: Tuple[int, int]):
        """Draw a shape on the image"""
        
        width, height = size
        shape_type = shape.get("type", "rectangle")
        color = shape.get("color", (100, 100, 100))
        
        if shape_type == "rectangle":
            # Draw a rectangle in the center
            margin = min(width, height) // 10
            x1, y1 = margin, margin
            x2, y2 = width - margin, height - margin
            draw.rectangle([x1, y1, x2, y2], fill=color, outline=(0, 0, 0), width=2)
            
        elif shape_type == "circle":
            # Draw a circle in the center
            radius = min(width, height) // 6
            center_x, center_y = width // 2, height // 2
            x1, y1 = center_x - radius, center_y - radius
            x2, y2 = center_x + radius, center_y + radius
            draw.ellipse([x1, y1, x2, y2], fill=color, outline=(0, 0, 0), width=2)
            
        elif shape_type == "line":
            # Draw diagonal lines
            draw.line([0, 0, width, height], fill=color, width=3)
            draw.line([width, 0, 0, height], fill=color, width=3)

    def _draw_text(self, draw: ImageDraw.Draw, text_elem: Dict[str, Any], size: Tuple[int, int]):
        """Draw text on the image"""
        
        text = text_elem.get("text", "Sample Text")
        position = text_elem.get("position", "center")
        text_size = text_elem.get("size", "medium")
        
        width, height = size
        
        # Try to load a font, fallback to default if not available
        try:
            if text_size == "large":
                font_size = min(width, height) // 20
            elif text_size == "small":
                font_size = min(width, height) // 40
            else:  # medium
                font_size = min(width, height) // 30
                
            font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        # Get text dimensions
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Calculate position
        if position == "center":
            x = (width - text_width) // 2
            y = (height - text_height) // 2
        elif position == "top":
            x = (width - text_width) // 2
            y = height // 10
        elif position == "bottom":
            x = (width - text_width) // 2
            y = height - height // 10 - text_height
        else:
            x, y = width // 4, height // 4
            
        # Draw text with outline for better visibility
        outline_color = (0, 0, 0)
        text_color = (255, 255, 255)
        
        # Draw outline
        for adj in range(-2, 3):
            for adj2 in range(-2, 3):
                draw.text((x + adj, y + adj2), text, font=font, fill=outline_color)
        
        # Draw main text
        draw.text((x, y), text, font=font, fill=text_color)

    async def _generate_modification_specifications(
        self, modification_prompt: str, image_info: Dict[str, Any], model: str
    ) -> Dict[str, Any]:
        """Use AI to determine what modifications to apply"""
        
        analysis_prompt = f"""Analyze this image modification request:

Request: {modification_prompt}
Current image info: {image_info}

Determine what modifications should be applied. Consider these options:
- Resize (new dimensions)
- Rotate (degrees)
- Flip (horizontal/vertical)
- Adjust brightness, contrast, or saturation
- Apply filters (blur, sharpen, etc.)
- Crop (coordinates)
- Add text or shapes
- Change colors

Provide specific modification instructions that can be implemented programmatically."""

        try:
            response = await ollama_service.query_ollama(
                analysis_prompt,
                timeout=self.creation_timeout,
                model=model
            )
            
            return self._parse_modification_specifications(response, modification_prompt)
            
        except Exception as e:
            # Fallback to basic modifications based on keywords
            return self._get_default_modifications(modification_prompt)

    def _parse_modification_specifications(self, ai_response: str, prompt: str) -> Dict[str, Any]:
        """Parse AI response into modification specifications"""
        
        spec = {
            "operations": []
        }
        
        response_lower = ai_response.lower()
        prompt_lower = prompt.lower()
        
        # Parse common modifications
        if "resize" in response_lower or "size" in prompt_lower:
            spec["operations"].append({"type": "resize", "factor": 0.8})
            
        if "rotate" in response_lower or "turn" in prompt_lower:
            angle = 90  # Default rotation
            if "180" in response_lower:
                angle = 180
            elif "270" in response_lower:
                angle = 270
            spec["operations"].append({"type": "rotate", "angle": angle})
            
        if "flip" in response_lower or "mirror" in prompt_lower:
            spec["operations"].append({"type": "flip", "direction": "horizontal"})
            
        if "bright" in response_lower or "dark" in prompt_lower:
            factor = 1.3 if "bright" in response_lower else 0.7
            spec["operations"].append({"type": "brightness", "factor": factor})
            
        if "blur" in response_lower:
            spec["operations"].append({"type": "blur", "radius": 2})
            
        if "sharpen" in response_lower:
            spec["operations"].append({"type": "sharpen"})
            
        # If no specific operations found, add a default enhancement
        if not spec["operations"]:
            spec["operations"].append({"type": "enhance", "factor": 1.1})
            
        return spec

    def _get_default_modifications(self, prompt: str) -> Dict[str, Any]:
        """Provide default modifications when AI parsing fails"""
        
        prompt_lower = prompt.lower()
        operations = []
        
        # Simple keyword-based fallbacks
        if "smaller" in prompt_lower or "resize" in prompt_lower:
            operations.append({"type": "resize", "factor": 0.7})
        elif "larger" in prompt_lower:
            operations.append({"type": "resize", "factor": 1.3})
        elif "brighter" in prompt_lower:
            operations.append({"type": "brightness", "factor": 1.2})
        elif "darker" in prompt_lower:
            operations.append({"type": "brightness", "factor": 0.8})
        else:
            # Default: slight enhancement
            operations.append({"type": "enhance", "factor": 1.05})
            
        return {"operations": operations}

    async def _apply_image_modifications(
        self,
        image_path: str,
        spec: Dict[str, Any],
        progress_callback: Optional[Callable[[str, Union[int, float]], None]] = None
    ) -> str:
        """Apply modifications to an image"""
        
        with Image.open(image_path) as original:
            modified = original.copy()
            
            operations = spec.get("operations", [])
            op_count = len(operations)
            
            for i, operation in enumerate(operations):
                op_type = operation.get("type")
                
                if op_type == "resize":
                    factor = operation.get("factor", 1.0)
                    new_size = (int(modified.width * factor), int(modified.height * factor))
                    modified = modified.resize(new_size, Image.Resampling.LANCZOS)
                    
                elif op_type == "rotate":
                    angle = operation.get("angle", 90)
                    modified = modified.rotate(angle, expand=True)
                    
                elif op_type == "flip":
                    direction = operation.get("direction", "horizontal")
                    if direction == "horizontal":
                        modified = modified.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                    else:
                        modified = modified.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
                        
                elif op_type == "brightness":
                    factor = operation.get("factor", 1.0)
                    enhancer = ImageEnhance.Brightness(modified)
                    modified = enhancer.enhance(factor)
                    
                elif op_type == "contrast":
                    factor = operation.get("factor", 1.0)
                    enhancer = ImageEnhance.Contrast(modified)
                    modified = enhancer.enhance(factor)
                    
                elif op_type == "blur":
                    radius = operation.get("radius", 1)
                    modified = modified.filter(ImageFilter.GaussianBlur(radius=radius))
                    
                elif op_type == "sharpen":
                    modified = modified.filter(ImageFilter.SHARPEN)
                    
                elif op_type == "enhance":
                    factor = operation.get("factor", 1.1)
                    # Apply subtle enhancements
                    enhancer = ImageEnhance.Sharpness(modified)
                    modified = enhancer.enhance(factor)
                    enhancer = ImageEnhance.Contrast(modified)
                    modified = enhancer.enhance(factor)
                
                if progress_callback and op_count > 1:
                    progress = 70 + (i / op_count) * 20
                    progress_callback(f"Applying modification {i+1}/{op_count}...", progress)
        
        # Save modified image
        temp_dir = Path(tempfile.gettempdir()) / "elara_modified_images"
        temp_dir.mkdir(exist_ok=True)
        
        timestamp = int(asyncio.get_event_loop().time())
        original_name = Path(image_path).stem
        original_ext = Path(image_path).suffix
        filename = f"modified_{original_name}_{timestamp}{original_ext}"
        file_path = temp_dir / filename
        
        modified.save(str(file_path))
        return str(file_path)

    async def _save_temp_file(self, file_content: bytes, filename: str) -> str:
        """Save uploaded file to temporary location"""
        temp_dir = Path(tempfile.gettempdir()) / "elara_image_creation"
        temp_dir.mkdir(exist_ok=True)
        
        file_path = temp_dir / f"{os.urandom(8).hex()}_{filename}"
        
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)
            
        return str(file_path)

    async def cleanup_temp_files(self, file_paths: List[str]):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    await aiofiles.os.remove(file_path)
                    print(f"[ImageCreationService] Cleaned up temp file: {file_path}")
            except Exception as e:
                print(f"[ImageCreationService] Failed to cleanup {file_path}: {e}")

# Create global instance
image_creation_service = ImageCreationService()