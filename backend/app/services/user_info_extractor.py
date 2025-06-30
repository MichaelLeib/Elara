import json
from typing import Dict, List, Optional, Any
from app.services.ollama_service import ollama_service
from app.services.database_service import database_service
from app.config.settings import settings


class UserInfoExtractor:
    """Service for extracting and storing long-term relevant user information from messages"""

    def __init__(self):
        self.extraction_prompt = """Extract personal information from this message. Return ONLY valid JSON.

Format:
{
  "extracted_info": [
    {
      "key": "name",
      "value": "John",
      "category": "personal_info",
      "confidence": "high",
      "importance": 8
    }
  ],
  "confidence_level": "high"
}

Categories: personal_info, occupation, hobbies, preferences, location, family, goals, constraints
Confidence: high, medium, low
Importance: 1-10

Examples:
- "I am 37 years old" → {"key": "age", "value": "37", "category": "personal_info", "confidence": "high", "importance": 7}
- "I like coffee" → {"key": "coffee_preference", "value": "likes coffee", "category": "preferences", "confidence": "high", "importance": 5}
- "I work as a developer" → {"key": "occupation", "value": "developer", "category": "occupation", "confidence": "high", "importance": 8}

If no personal info found, return: {"extracted_info": [], "confidence_level": "low"}

Message: """

    async def extract_user_info(
        self, user_message: str, model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract long-term relevant information from a user message

        Args:
            user_message: The user's message to analyze
            model: Optional model to use for extraction

        Returns:
            Dict containing extracted information and confidence level
        """
        try:
            # Use a smaller, faster model for extraction if available
            extraction_model = (
                model or "tinyllama:1.1b"
            )  # Default to a smaller model for speed

            # Create the full prompt
            full_prompt = f"{self.extraction_prompt}{user_message}"

            # Get response from Ollama
            response = await ollama_service.query_ollama(
                prompt=full_prompt,
                timeout=10.0,  # Shorter timeout for extraction
                model=extraction_model,
            )

            # Parse the JSON response
            try:
                # Clean the response - remove any markdown formatting
                cleaned_response = response.strip()
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                cleaned_response = cleaned_response.strip()

                # Remove any comments (lines starting with //)
                lines = cleaned_response.split("\n")
                cleaned_lines = []
                for line in lines:
                    if not line.strip().startswith("//"):
                        cleaned_lines.append(line)
                cleaned_response = "\n".join(cleaned_lines)

                # Try to find JSON object boundaries
                start_idx = cleaned_response.find("{")
                end_idx = cleaned_response.rfind("}")
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    cleaned_response = cleaned_response[start_idx : end_idx + 1]

                extraction_result = json.loads(cleaned_response)
                return self._validate_and_clean_extraction(extraction_result)
            except json.JSONDecodeError as e:
                print(f"JSON parsing failed: {e}")
                print(f"Raw response: {response}")
                # Fallback if JSON parsing fails
                return {
                    "extracted_info": [],
                    "confidence_level": "low",
                    "error": "Failed to parse extraction response",
                }

        except Exception as e:
            print(f"User info extraction failed: {e}")
            return {"extracted_info": [], "confidence_level": "low", "error": str(e)}

    def _validate_and_clean_extraction(
        self, extraction_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate and clean the extraction result

        Args:
            extraction_data: Raw extraction data from the model

        Returns:
            Cleaned and validated extraction data
        """
        try:
            # Ensure required fields exist
            if not isinstance(extraction_data, dict):
                return {"extracted_info": [], "confidence_level": "low"}

            extracted_info = extraction_data.get("extracted_info", [])
            confidence_level = extraction_data.get("confidence_level", "low")

            # Validate confidence level
            if confidence_level not in ["high", "medium", "low"]:
                confidence_level = "low"

            # Clean and validate each extracted info item
            cleaned_info = []
            for item in extracted_info:
                if isinstance(item, dict):
                    # Ensure required fields
                    key = str(item.get("key", "")).strip()
                    value = str(item.get("value", "")).strip()
                    category = item.get("category", "personal_info")
                    confidence = item.get("confidence", "low")
                    importance = item.get("importance", 1)

                    # Validate fields
                    if key and value and confidence in ["high", "medium", "low"]:
                        # Ensure importance is a valid number
                        try:
                            importance = max(1, min(10, int(importance)))
                        except (ValueError, TypeError):
                            importance = 1

                        # Validate category
                        valid_categories = [
                            "personal_info",
                            "occupation",
                            "hobbies",
                            "preferences",
                            "location",
                            "family",
                            "goals",
                            "constraints",
                        ]
                        if category not in valid_categories:
                            category = "personal_info"

                        cleaned_info.append(
                            {
                                "key": key,
                                "value": value,
                                "category": category,
                                "confidence": confidence,
                                "importance": importance,
                            }
                        )

            return {
                "extracted_info": cleaned_info,
                "confidence_level": confidence_level,
            }

        except Exception as e:
            print(f"Error validating extraction data: {e}")
            return {"extracted_info": [], "confidence_level": "low"}

    async def process_and_save_user_info(
        self, user_message: str, model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract user information and save relevant items to memory

        Args:
            user_message: The user's message to analyze
            model: Optional model to use for extraction

        Returns:
            Dict containing extraction results and save status
        """
        try:
            # Extract information from the message
            extraction_result = await self.extract_user_info(user_message, model)

            saved_entries = []
            skipped_entries = []

            # Process each extracted piece of information
            for info in extraction_result.get("extracted_info", []):
                key = info.get("key", "")
                value = info.get("value", "")
                confidence = info.get("confidence", "low")
                importance = info.get("importance", 1)
                category = info.get("category", "personal_info")

                # Only save high-confidence information or medium-confidence with high importance
                if confidence == "high" or (confidence == "medium" and importance >= 7):
                    # Check if this information already exists
                    existing_entry = database_service.get_memory_entry(key)

                    if existing_entry:
                        # Update if the new information is more recent or has higher importance
                        existing_importance = existing_entry.get("importance", 1)
                        if importance > existing_importance:
                            database_service.add_memory_entry(
                                key=key,
                                value=value,
                                importance=importance,
                                category=category,
                            )
                            saved_entries.append(
                                {
                                    "key": key,
                                    "value": value,
                                    "action": "updated",
                                    "reason": f"Higher importance ({importance} > {existing_importance})",
                                }
                            )
                        else:
                            skipped_entries.append(
                                {
                                    "key": key,
                                    "value": value,
                                    "reason": f"Lower importance ({importance} <= {existing_importance})",
                                }
                            )
                    else:
                        # Save new information
                        database_service.add_memory_entry(
                            key=key,
                            value=value,
                            importance=importance,
                            category=category,
                        )
                        saved_entries.append(
                            {
                                "key": key,
                                "value": value,
                                "action": "saved",
                                "reason": "New information",
                            }
                        )
                else:
                    skipped_entries.append(
                        {
                            "key": key,
                            "value": value,
                            "reason": f"Low confidence ({confidence}) or importance ({importance})",
                        }
                    )

            return {
                "status": "success",
                "extraction_result": extraction_result,
                "saved_entries": saved_entries,
                "skipped_entries": skipped_entries,
                "total_extracted": len(extraction_result.get("extracted_info", [])),
                "total_saved": len(saved_entries),
                "total_skipped": len(skipped_entries),
            }

        except Exception as e:
            print(f"Error processing and saving user info: {e}")
            return {
                "status": "error",
                "error": str(e),
                "extraction_result": {"extracted_info": [], "confidence_level": "low"},
                "saved_entries": [],
                "skipped_entries": [],
                "total_extracted": 0,
                "total_saved": 0,
                "total_skipped": 0,
            }

    def get_user_info_summary(self) -> Dict[str, Any]:
        """
        Get a summary of all stored user information

        Returns:
            Dict containing categorized user information
        """
        try:
            all_entries = database_service.get_memory_entries(limit=1000)

            # Group by category
            categorized_info = {}
            for entry in all_entries:
                category = entry.get("category", "personal_info")
                if category not in categorized_info:
                    categorized_info[category] = []

                categorized_info[category].append(
                    {
                        "key": entry.get("key"),
                        "value": entry.get("value"),
                        "importance": entry.get("importance", 1),
                        "last_accessed": entry.get("last_accessed"),
                    }
                )

            # Sort each category by importance
            for category in categorized_info:
                categorized_info[category].sort(
                    key=lambda x: x["importance"], reverse=True
                )

            return {
                "status": "success",
                "total_entries": len(all_entries),
                "categories": categorized_info,
                "category_count": {
                    cat: len(entries) for cat, entries in categorized_info.items()
                },
            }

        except Exception as e:
            print(f"Error getting user info summary: {e}")
            return {
                "status": "error",
                "error": str(e),
                "total_entries": 0,
                "categories": {},
                "category_count": {},
            }


# Create a singleton instance
user_info_extractor = UserInfoExtractor()
