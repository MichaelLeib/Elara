# Web Search Integration

This document explains how the web search functionality works in the Elara chat system.

## Overview

The web search service automatically determines when a user's query requires current, up-to-date information from the web and performs searches to provide more accurate and timely responses.

## How It Works

### 1. Automatic Detection

The system automatically detects when web search is needed based on:

- **Explicit search requests**: "search the web", "look up", "find information about"
- **Current information patterns**: "latest news", "current price", "recent updates"
- **Time-sensitive keywords**: "today", "this week", "latest", "recent"
- **Location-based queries**: "near me", "local", "address"
- **Comparison requests**: "compare", "vs", "which is better"
- **How-to questions**: "how to", "tutorial", "guide"
- **Factual queries**: "what is", "definition", "meaning"

### 2. Search Engines

The system supports multiple search engines:

- **DuckDuckGo** (default): Free, privacy-focused search engine
- **Serper** (Google): Requires API key for Google search results

### 3. Integration

When web search is needed:

1. The system determines search terms from the user's message
2. Performs the search using the configured engine
3. Formats the results and adds them to the AI context
4. The AI generates a response using both conversation history and web search results

## Configuration

### Settings File

Update `storage/settings.json` to configure web search:

```json
{
  "web_search": {
    "ENABLED": true,
    "ENGINE": "duckduckgo",
    "SERPER_API_KEY": ""
  }
}
```

### Configuration Options

- **ENABLED**: Enable/disable web search functionality (default: true)
- **ENGINE**: Search engine to use ("duckduckgo" or "serper")
- **SERPER_API_KEY**: API key for Serper (Google search) - optional

## API Endpoints

### Check if Web Search is Needed

```http
POST /api/web-search/check
Content-Type: application/json

{
  "message": "What's the latest news about AI?",
  "context": ""
}
```

Response:

```json
{
  "status": "success",
  "should_search": true,
  "confidence": "high",
  "reason": "Current information pattern detected: 'what (?:is|are) the (?:latest|current|recent|new)'",
  "search_terms": "latest news AI"
}
```

### Manual Web Search

```http
POST /api/web-search?query=latest AI news&engine=duckduckgo
```

Response:

```json
{
  "status": "success",
  "query": "latest AI news",
  "engine": "duckduckgo",
  "results": [...],
  "total_results": 5,
  "formatted_results": "Web Search Results for 'latest AI news':\n\n1. Latest AI News..."
}
```

## WebSocket Integration

When using WebSocket chat, the system automatically:

1. Sends a `web_search` notification when search is performed
2. Includes search results in the AI context
3. Provides search metadata in the response

Example WebSocket message:

```json
{
  "type": "web_search",
  "content": "Performing web search for: latest AI news",
  "search_terms": "latest AI news",
  "confidence": "high",
  "reason": "Current information pattern detected",
  "done": false
}
```

## Testing

Run the test script to verify web search functionality:

```bash
cd backend
python test_web_search.py
```

## Examples

### Queries that trigger web search:

- "What's the latest news about AI?"
- "How much does a Tesla Model 3 cost?"
- "What's the weather like in New York?"
- "Find the best restaurants near me"
- "Compare iPhone vs Android"
- "How to install Python on Windows"

### Queries that don't trigger web search:

- "Hello, how are you?"
- "Tell me a joke"
- "What's 2+2?"
- "Explain quantum physics" (general knowledge)

## Troubleshooting

### Common Issues

1. **Web search not working**: Check if `ENABLED` is set to `true` in settings
2. **No search results**: Verify internet connection and search engine availability
3. **Serper API errors**: Ensure valid API key is configured
4. **Timeout errors**: Search may take longer than expected, check network

### Logs

Check the console output for web search related messages:

- "Web search needed: [reason]"
- "Web search completed, found [X] characters of results"
- "No web search needed: [reason]"
- "Web search failed: [error]"

## Privacy and Security

- DuckDuckGo searches are privacy-focused and don't require API keys
- Serper API requires an API key but provides Google search results
- Search terms are extracted from user messages but not stored permanently
- Search results are only used for the current conversation context
