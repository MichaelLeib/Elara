import json
import asyncio
import re
from typing import Dict, List, Optional, Any, Union
from urllib.parse import quote_plus
import httpx
from app.services.ollama_service import ollama_service
from app.config.settings import settings
from bs4 import BeautifulSoup


class WebSearchService:
    """Service for determining when web search is needed and performing web searches"""

    def __init__(self):
        # Keywords that suggest web search is needed
        self.web_search_keywords = [
            "latest",
            "recent",
            "current",
            "today",
            "yesterday",
            "this week",
            "this month",
            "this year",
            "news",
            "update",
            "announcement",
            "release",
            "launch",
            "new feature",
            "breaking",
            "price",
            "cost",
            "how much",
            "where to buy",
            "availability",
            "stock",
            "in stock",
            "weather",
            "forecast",
            "temperature",
            "climate",
            "location",
            "address",
            "directions",
            "near me",
            "local",
            "reviews",
            "ratings",
            "opinions",
            "feedback",
            "testimonials",
            "compare",
            "vs",
            "versus",
            "difference between",
            "which is better",
            "how to",
            "tutorial",
            "guide",
            "instructions",
            "steps",
            "what is",
            "definition",
            "meaning",
            "explain",
            "describe",
            "when",
            "where",
            "who",
            "why",
            "how",
            "trending",
            "popular",
            "viral",
            "hot",
            "trend",
            "statistics",
            "data",
            "numbers",
            "figures",
            "report",
            "official",
            "website",
            "source",
            "reference",
            "citation",
        ]

        # Questions that typically require current information
        self.current_info_patterns = [
            r"what (?:is|are) the (?:latest|current|recent|new)",
            r"when (?:was|is|will) .* (?:released|announced|launched)",
            r"how much (?:does|do|is|are) .* (?:cost|price)",
            r"where (?:can|could) .* (?:buy|find|get)",
            r"what (?:is|are) .* (?:reviews|ratings|opinions)",
            r"compare .* (?:vs|versus|and) .*",
            r"what (?:is|are) the (?:trending|popular|viral)",
            r"what (?:is|are) the (?:statistics|data|numbers) for",
            r"what (?:is|are) the (?:weather|forecast) for",
            r"what (?:is|are) the (?:latest|current) (?:news|updates) about",
        ]

        # Search engine configurations
        self.search_engines = {
            "duckduckgo": {
                "url": "https://api.duckduckgo.com/",
                "params": {
                    "q": "",
                    "format": "json",
                    "no_html": "1",
                    "skip_disambig": "1",
                },
            },
            "serper": {
                "url": "https://google.serper.dev/search",
                "headers": {"X-API-KEY": ""},  # Will be set from settings
            },
        }

        self.max_results = 5
        self.search_timeout = 10.0

    async def should_perform_web_search(
        self, message: str, context: str = ""
    ) -> Dict[str, Any]:
        """
        Determine if a web search is needed based on the message content

        Args:
            message: The user's message
            context: Additional context (optional)

        Returns:
            Dict containing decision and reasoning
        """
        try:
            # Combine message and context for analysis
            full_text = f"{message} {context}".lower()

            # Check for explicit web search requests
            explicit_indicators = [
                "search the web",
                "search online",
                "look up",
                "find information about",
                "search for",
                "web search",
                "online search",
                "internet search",
                "google",
                "bing",
                "duckduckgo",
                "search engine",
            ]

            for indicator in explicit_indicators:
                if indicator in full_text:
                    return {
                        "should_search": True,
                        "confidence": "high",
                        "reason": f"Explicit search request detected: '{indicator}'",
                        "search_terms": self._extract_search_terms(message),
                    }

            # Check for current information patterns
            for pattern in self.current_info_patterns:
                if re.search(pattern, full_text, re.IGNORECASE):
                    return {
                        "should_search": True,
                        "confidence": "high",
                        "reason": f"Current information pattern detected: '{pattern}'",
                        "search_terms": self._extract_search_terms(message),
                    }

            # Check for web search keywords
            found_keywords = []
            for keyword in self.web_search_keywords:
                if keyword in full_text:
                    found_keywords.append(keyword)

            if found_keywords:
                return {
                    "should_search": True,
                    "confidence": "medium",
                    "reason": f"Web search keywords detected: {', '.join(found_keywords)}",
                    "search_terms": self._extract_search_terms(message),
                }

            # Use AI to make a final decision for ambiguous cases
            return await self._ai_decision_helper(message, context)

        except Exception as e:
            print(f"Error in should_perform_web_search: {e}")
            return {
                "should_search": False,
                "confidence": "low",
                "reason": f"Error during analysis: {str(e)}",
                "search_terms": None,
            }

    def _extract_search_terms(self, message: str) -> str:
        """
        Extract relevant search terms from the message

        Args:
            message: The user's message

        Returns:
            Extracted search terms
        """
        # Remove common words and extract key terms
        common_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "can",
            "what",
            "when",
            "where",
            "who",
            "why",
            "how",
            "which",
            "that",
            "this",
            "these",
            "those",
        }

        # Clean the message
        cleaned = re.sub(r"[^\w\s]", " ", message.lower())
        words = cleaned.split()

        # Filter out common words and short words
        search_terms = [
            word for word in words if word not in common_words and len(word) > 2
        ]

        # Take the most relevant terms (first 5-7 words)
        return " ".join(search_terms[:7])

    async def _ai_decision_helper(
        self, message: str, context: str = ""
    ) -> Dict[str, Any]:
        """
        Use AI to help decide if web search is needed for ambiguous cases

        Args:
            message: The user's message
            context: Additional context

        Returns:
            AI-assisted decision
        """
        try:
            decision_prompt = f"""Analyze this message and determine if a web search is needed to provide accurate, up-to-date information.

Message: "{message}"
Context: "{context}"

Consider:
1. Does this require current/recent information?
2. Does this need factual data that might change over time?
3. Does this need reviews, prices, or availability information?
4. Does this need location-specific information?
5. Does this need news or trending information?

Return ONLY a JSON response:
{{
  "should_search": true/false,
  "confidence": "high/medium/low",
  "reason": "brief explanation",
  "search_terms": "relevant search terms if should_search is true"
}}

If should_search is true, provide 3-5 relevant search terms."""

            response = await ollama_service.query_ollama(
                prompt=decision_prompt,
                timeout=30.0,
                model="phi3:mini",  # Use small model for quick decision
            )

            # Parse the response
            try:
                # Clean the response
                cleaned_response = response.strip()
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                cleaned_response = cleaned_response.strip()

                decision = json.loads(cleaned_response)

                # Validate the response
                if not isinstance(decision, dict):
                    raise ValueError("Invalid response format")

                return {
                    "should_search": decision.get("should_search", False),
                    "confidence": decision.get("confidence", "low"),
                    "reason": decision.get("reason", "AI analysis"),
                    "search_terms": decision.get(
                        "search_terms", self._extract_search_terms(message)
                    ),
                }

            except (json.JSONDecodeError, ValueError) as e:
                print(f"Failed to parse AI decision response: {e}")
                # Fallback to keyword-based decision
                return {
                    "should_search": False,
                    "confidence": "low",
                    "reason": "AI analysis failed, using fallback",
                    "search_terms": None,
                }

        except Exception as e:
            print(f"AI decision helper failed: {e}")
            return {
                "should_search": False,
                "confidence": "low",
                "reason": f"AI analysis error: {str(e)}",
                "search_terms": None,
            }

    async def perform_web_search(
        self, query: str, engine: str = "duckduckgo"
    ) -> Dict[str, Any]:
        """
        Perform a web search using the configured provider
        """
        try:
            print(
                f"[WebSearchService] Starting web search with query: '{query}' (type: {type(query)})"
            )

            # Ensure query is a string and handle encoding properly
            if isinstance(query, bytes):
                print(f"[WebSearchService] Converting bytes query to string")
                query = query.decode("utf-8", errors="ignore")
            elif not isinstance(query, str):
                print(f"[WebSearchService] Converting {type(query)} query to string")
                query = str(query)

            # Clean the query
            query = query.strip()
            print(f"[WebSearchService] Cleaned query: '{query}'")

            if not query:
                print("[WebSearchService] Empty query after cleaning")
                return {
                    "status": "error",
                    "error": "Empty search query",
                    "results": [],
                    "query": query,
                    "engine": "unknown",
                }

            provider = getattr(settings, "web_search_search_provider", "serper").lower()
            print(f"[WebSearchService] Using provider: {provider}")

            if provider == "serper":
                return await self._search_serper(query)
            elif provider == "duckduckgo_html":
                return await self._search_duckduckgo_html(query)
            # fallback to duckduckgo API
            return await self._search_duckduckgo(query)
        except Exception as e:
            print(f"[WebSearchService] Error in perform_web_search: {e}")
            import traceback

            traceback.print_exc()
            return {
                "status": "error",
                "error": f"Web search failed: {str(e)}",
                "results": [],
                "query": query if "query" in locals() else "unknown",
                "engine": "unknown",
            }

    async def _search_duckduckgo(self, query: str) -> Dict[str, Any]:
        """
        Search using DuckDuckGo API

        Args:
            query: Search query

        Returns:
            Search results
        """
        try:
            # Ensure query is a string and handle encoding properly
            if isinstance(query, bytes):
                query = query.decode("utf-8", errors="ignore")
            elif not isinstance(query, str):
                query = str(query)

            # Clean the query
            query = query.strip()
            if not query:
                return {
                    "status": "error",
                    "error": "Empty query",
                    "results": [],
                    "query": query,
                    "engine": "duckduckgo",
                }
            async with httpx.AsyncClient(timeout=self.search_timeout) as client:
                params = self.search_engines["duckduckgo"]["params"].copy()
                params["q"] = query

                response = await client.get(
                    self.search_engines["duckduckgo"]["url"], params=params
                )

                if response.status_code == 200:
                    data = response.json()

                    results = []

                    # Extract AbstractText (snippet)
                    if data.get("AbstractText"):
                        results.append(
                            {
                                "title": data.get("AbstractSource", "DuckDuckGo"),
                                "snippet": data.get("AbstractText", ""),
                                "url": data.get("AbstractURL", ""),
                                "source": "abstract",
                            }
                        )

                    # Extract RelatedTopics
                    for topic in data.get("RelatedTopics", [])[: self.max_results]:
                        if isinstance(topic, dict) and topic.get("Text"):
                            results.append(
                                {
                                    "title": (
                                        topic.get("FirstURL", "").split("/")[-1]
                                        if topic.get("FirstURL")
                                        else "Related Topic"
                                    ),
                                    "snippet": topic.get("Text", ""),
                                    "url": topic.get("FirstURL", ""),
                                    "source": "related_topic",
                                }
                            )

                    # If no results from Instant Answer API, try a fallback approach
                    if not results:
                        # Create a simple result based on the query
                        results.append(
                            {
                                "title": f"Search results for '{query}'",
                                "snippet": f"Search query: {query}. Please check the web for current information about this topic.",
                                "url": f"https://duckduckgo.com/?q={quote_plus(query)}",
                                "source": "fallback",
                            }
                        )

                    return {
                        "status": "success",
                        "results": results[: self.max_results],
                        "query": query,
                        "engine": "duckduckgo",
                        "total_results": len(results),
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"DuckDuckGo API returned status {response.status_code}",
                        "results": [],
                        "query": query,
                        "engine": "duckduckgo",
                    }

        except Exception as e:
            return {
                "status": "error",
                "error": f"DuckDuckGo search failed: {str(e)}",
                "results": [],
                "query": query,
                "engine": "duckduckgo",
            }

    async def _search_serper(self, query: str) -> Dict[str, Any]:
        """
        Search using Serper API (Google search)

        Args:
            query: Search query

        Returns:
            Search results
        """
        try:
            # Ensure query is a string and handle encoding properly
            if isinstance(query, bytes):
                query = query.decode("utf-8", errors="ignore")
            elif not isinstance(query, str):
                query = str(query)

            # Clean the query
            query = query.strip()
            if not query:
                return {
                    "status": "error",
                    "error": "Empty query",
                    "results": [],
                    "query": query,
                    "engine": "serper",
                }
            # Get API key from settings
            api_key = getattr(settings, "SERPER_API_KEY", None)
            if not api_key:
                return {
                    "status": "error",
                    "error": "Serper API key not configured",
                    "results": [],
                    "query": query,
                    "engine": "serper",
                }

            async with httpx.AsyncClient(timeout=self.search_timeout) as client:
                headers = self.search_engines["serper"]["headers"].copy()
                headers["X-API-KEY"] = api_key

                payload = {"q": query, "num": self.max_results}

                response = await client.post(
                    self.search_engines["serper"]["url"], headers=headers, json=payload
                )

                if response.status_code == 200:
                    data = response.json()

                    results = []
                    for result in data.get("organic", [])[: self.max_results]:
                        results.append(
                            {
                                "title": result.get("title", ""),
                                "snippet": result.get("snippet", ""),
                                "url": result.get("link", ""),
                                "source": "organic",
                            }
                        )

                    return {
                        "status": "success",
                        "results": results,
                        "query": query,
                        "engine": "serper",
                        "total_results": len(results),
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"Serper API returned status {response.status_code}",
                        "results": [],
                        "query": query,
                        "engine": "serper",
                    }

        except Exception as e:
            return {
                "status": "error",
                "error": f"Serper search failed: {str(e)}",
                "results": [],
                "query": query,
                "engine": "serper",
            }

    def format_search_results(self, search_results: Dict[str, Any]) -> str:
        """
        Format search results into a readable string for the AI context

        Args:
            search_results: Search results from perform_web_search

        Returns:
            Formatted search results string
        """
        if search_results.get("status") != "success":
            return f"Web search failed: {search_results.get('error', 'Unknown error')}"

        results = search_results.get("results", [])
        if not results:
            return "No search results found."

        formatted = f"Search Results for '{search_results.get('query', '')}':\n"

        # Limit to first 2 results to keep context very manageable
        for i, result in enumerate(results[:2], 1):
            title = result.get("title", "No title")
            url = result.get("url", "No URL")
            snippet = result.get("snippet", "No snippet")

            # Truncate long snippets more aggressively
            if len(snippet) > 100:
                snippet = snippet[:100] + "..."

            formatted += f"{i}. {title} ({url})\n"
            formatted += f"   {snippet}\n\n"

        return formatted

    def extract_sources_from_results(
        self, search_results: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Extract sources from search results for frontend display

        Args:
            search_results: Search results from perform_web_search

        Returns:
            List of source objects with title, url, snippet, and favicon_url
        """
        if search_results.get("status") != "success":
            return []

        results = search_results.get("results", [])
        sources = []

        # Limit to first 3 results to keep context very manageable
        for result in results[:3]:
            url = result.get("url", "")
            if url and url != "No URL":
                # Extract domain for favicon
                try:
                    from urllib.parse import urlparse, parse_qs
                    from urllib.parse import unquote

                    # Handle DuckDuckGo redirect URLs
                    if url.startswith("//duckduckgo.com/l/?uddg="):
                        # Extract the encoded URL from the uddg parameter
                        if "?" in url:
                            query_part = url[url.index("?") :]
                            parsed_params = parse_qs(query_part)
                            if "uddg" in parsed_params:
                                encoded_url = parsed_params["uddg"][0]
                                decoded_url = unquote(encoded_url)
                                parsed_url = urlparse(decoded_url)
                                domain = parsed_url.netloc
                            else:
                                domain = "duckduckgo.com"
                        else:
                            domain = "duckduckgo.com"
                    # Handle protocol-relative URLs (starting with //)
                    elif url.startswith("//"):
                        domain = url[2:].split("/")[0]
                    else:
                        parsed_url = urlparse(url)
                        domain = parsed_url.netloc

                    favicon_url = (
                        f"https://www.google.com/s2/favicons?domain={domain}&sz=32"
                    )
                except Exception as e:
                    print(f"Error extracting domain from URL '{url}': {e}")
                    favicon_url = ""
                    domain = ""

                # Truncate long snippets to keep context very manageable
                snippet = result.get("snippet", "")
                if len(snippet) > 150:
                    snippet = snippet[:150] + "..."

                sources.append(
                    {
                        "title": result.get("title", "Unknown"),
                        "url": url,
                        "snippet": snippet,
                        "favicon_url": favicon_url,
                        "domain": domain if domain else "",
                    }
                )

        return sources

    async def search_and_format(self, query: str, engine: str = "duckduckgo") -> str:
        """
        Perform web search and return formatted results

        Args:
            query: Search query
            engine: Search engine to use

        Returns:
            Formatted search results string
        """
        search_results = await self.perform_web_search(query, engine)
        return self.format_search_results(search_results)

    async def _search_duckduckgo_html(self, query: str) -> Dict[str, Any]:
        """
        Fallback: Scrape DuckDuckGo HTML results page for organic results.
        """
        try:
            print(
                f"[DuckDuckGo HTML] Starting search with query: '{query}' (type: {type(query)})"
            )

            # Ensure query is a string and handle encoding properly
            if isinstance(query, bytes):
                print(f"[DuckDuckGo HTML] Converting bytes query to string")
                query = query.decode("utf-8", errors="ignore")
            elif not isinstance(query, str):
                print(f"[DuckDuckGo HTML] Converting {type(query)} query to string")
                query = str(query)

            # Clean the query to remove any problematic characters
            query = query.strip()
            print(f"[DuckDuckGo HTML] Cleaned query: '{query}'")

            if not query:
                print("[DuckDuckGo HTML] Empty query after cleaning")
                return {
                    "status": "error",
                    "error": "Empty query",
                    "results": [],
                    "query": query,
                    "engine": "duckduckgo_html",
                }

            print(f"[DuckDuckGo HTML] About to call quote_plus with query: '{query}'")
            url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            print(f"[DuckDuckGo HTML] Generated URL: {url}")
            headers = {"User-Agent": "Mozilla/5.0"}
            async with httpx.AsyncClient(timeout=self.search_timeout) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")
                    results = []
                    result_blocks = soup.select(".result")
                    print(
                        f"[DuckDuckGo HTML] Found {len(result_blocks)} .result blocks for query: {query}"
                    )
                    for result in result_blocks[: self.max_results]:
                        link_tag = result.select_one(".result__a")
                        snippet_tag = result.select_one(".result__snippet")
                        title = link_tag.get_text(strip=True) if link_tag else ""
                        url = (
                            link_tag["href"]
                            if link_tag and link_tag.has_attr("href")
                            else ""
                        )
                        snippet = (
                            snippet_tag.get_text(strip=True) if snippet_tag else ""
                        )
                        print(
                            f"[DuckDuckGo HTML] Result: title='{title}', url='{url}', snippet='{snippet[:60]}...'"
                        )
                        results.append(
                            {
                                "title": title,
                                "snippet": snippet,
                                "url": url,
                                "source": "duckduckgo_html",
                            }
                        )
                    return {
                        "status": "success",
                        "results": results,
                        "query": query,
                        "engine": "duckduckgo_html",
                        "total_results": len(results),
                    }
                else:
                    print(f"[DuckDuckGo HTML] Non-200 status: {response.status_code}")
                    return {
                        "status": "error",
                        "error": f"DuckDuckGo HTML returned status {response.status_code}",
                        "results": [],
                        "query": query,
                        "engine": "duckduckgo_html",
                    }
        except Exception as e:
            print(f"[DuckDuckGo HTML] Exception: {e}")
            return {
                "status": "error",
                "error": f"DuckDuckGo HTML scraping failed: {str(e)}",
                "results": [],
                "query": query,
                "engine": "duckduckgo_html",
            }


# Global web search service instance
web_search_service = WebSearchService()
