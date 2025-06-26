# Conversation Summarization Feature

## Overview

The Elara AI chat application now includes an intelligent conversation summarization system that automatically extracts key insights, action items, and context from chat conversations. This feature helps users track important information and provides valuable context for future interactions.

## Features

### 1. Automatic Conversation Summarization

- **Real-time summarization**: Every user-assistant message exchange is automatically summarized
- **Structured insights**: Extracts key insights, action items, context notes, and topics
- **Confidence scoring**: Each summary includes a confidence level (high/medium/low)
- **Database storage**: All summaries are stored for future reference and analysis

### 2. Session-Level Summarization

- **Complete session analysis**: Summarizes entire chat sessions with comprehensive insights
- **Quality assessment**: Evaluates session quality and provides follow-up recommendations
- **Message count tracking**: Tracks the number of messages in each session

### 3. API Endpoints

- **Individual summaries**: Generate summaries for specific conversation exchanges
- **Session summaries**: Create comprehensive session-level summaries
- **Summary retrieval**: Access stored summaries and insights
- **High-confidence insights**: Retrieve the most valuable insights across all sessions

## Architecture

### Core Components

1. **SummarizationService** (`app/services/summarization_service.py`)

   - Handles conversation and session summarization
   - Uses structured prompts for consistent output
   - Includes error handling and fallback mechanisms

2. **Database Integration** (`app/services/database_service.py`)

   - Stores conversation and session summaries
   - Provides retrieval and query capabilities
   - Maintains relationships between messages and summaries

3. **API Routes** (`app/routes/chat.py`)
   - RESTful endpoints for summary operations
   - WebSocket integration for real-time summaries
   - Error handling and validation

### Database Schema

```sql
-- Conversation summaries table
CREATE TABLE conversation_summaries (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    user_message_id TEXT NOT NULL,
    assistant_message_id TEXT NOT NULL,
    summary_data TEXT NOT NULL,  -- JSON containing structured summary
    confidence_level TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session summaries table
CREATE TABLE session_summaries (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    summary_data TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    confidence_level TEXT NOT NULL,
    session_quality TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Reference

### WebSocket Integration

The WebSocket chat endpoint now automatically generates summaries and sends them to clients:

```json
{
  "type": "summary",
  "content": {
    "key_insights": [
      "User is having Python import issues",
      "Pandas ModuleNotFoundError"
    ],
    "action_items": ["Check Python environment", "Verify pandas installation"],
    "context_notes": [
      "User has tried pip install",
      "Issue persists after installation"
    ],
    "conversation_summary": "User experiencing pandas import error despite installation",
    "confidence_level": "high",
    "topics": ["Python", "pandas", "import errors", "troubleshooting"]
  },
  "summary_id": "uuid-here",
  "done": true
}
```

### REST Endpoints

#### Generate Conversation Summary

```http
POST /api/summarize-conversation
Content-Type: application/json

{
  "user_message": "I'm having trouble with my Python code...",
  "assistant_message": "The 'ModuleNotFoundError' for pandas is a common issue...",
  "model": "llama3.1:8b"
}
```

#### Generate Session Summary

```http
POST /api/chat-sessions/{session_id}/summarize
Content-Type: application/json

{
  "model": "llama3.1:8b"
}
```

#### Get Session Summaries

```http
GET /api/chat-sessions/{session_id}/summaries?limit=50&offset=0
```

#### Get Session Insights

```http
GET /api/chat-sessions/{session_id}/insights?limit=10
```

#### Get High-Confidence Summaries

```http
GET /api/summaries/high-confidence?limit=20
```

## Summary Structure

### Conversation Summary

```json
{
  "key_insights": ["List of 2-3 most important insights from the exchange"],
  "action_items": ["List of specific actions, tasks, or next steps"],
  "context_notes": [
    "Important context, preferences, or information to remember"
  ],
  "conversation_summary": "A 1-2 sentence summary of what was discussed",
  "confidence_level": "high|medium|low",
  "topics": ["List of main topics or themes discussed"]
}
```

### Session Summary

```json
{
  "key_insights": [
    "List of 3-5 most important insights from the entire session"
  ],
  "action_items": ["List of specific actions, tasks, or next steps"],
  "context_notes": [
    "Important context, preferences, or information to remember"
  ],
  "conversation_summary": "A 2-3 sentence summary of the entire session",
  "confidence_level": "high|medium|low",
  "topics": ["List of main topics or themes discussed"],
  "session_quality": "excellent|good|fair|poor",
  "recommended_follow_up": ["Suggested follow-up questions or actions"],
  "message_count": 8
}
```

## Prompt Engineering

The summarization system uses carefully crafted prompts to ensure consistent, high-quality output:

### Conversation Summary Prompt

- **Role**: Expert conversation analyst
- **Task**: Analyze last two messages and create structured summary
- **Format**: JSON with specific fields
- **Guidelines**: Focus on actionable insights, context, and patterns
- **Quality control**: Confidence level assessment

### Session Summary Prompt

- **Scope**: Entire conversation session
- **Analysis**: Patterns, decisions, key learnings
- **Assessment**: Session quality and completeness
- **Recommendations**: Follow-up actions and questions

## Configuration

### Settings

The summarization service uses the same model configuration as the main chat:

- Default model: `settings.OLLAMA_MODEL`
- Timeout: 30 seconds for conversation summaries, 60 seconds for session summaries
- Fallback handling for JSON parsing errors

### Customization

To customize the summarization behavior:

1. Modify prompts in `SummarizationService.__init__()`
2. Adjust confidence thresholds in the WebSocket handler
3. Change timeout values for different model performance
4. Add new summary fields by updating the database schema

## Error Handling

The system includes comprehensive error handling:

- **JSON parsing errors**: Fallback summary generation
- **Model failures**: Graceful degradation with error summaries
- **Database errors**: Logging without breaking chat functionality
- **WebSocket errors**: Summary failures don't interrupt chat flow

## Performance Considerations

- **Async processing**: All summarization is non-blocking
- **Database indexing**: Optimized queries for summary retrieval
- **Memory management**: Efficient JSON handling and storage
- **Scalability**: Designed to handle high-volume chat sessions

## Testing

Run the test script to verify the summarization service:

```bash
cd backend
python test_summarization.py
```

## Future Enhancements

Potential improvements for the summarization system:

1. **Semantic search**: Use embeddings for similarity-based summary retrieval
2. **User preferences**: Allow customization of summary focus areas
3. **Multi-language support**: Extend prompts for different languages
4. **Summary clustering**: Group similar summaries for better organization
5. **Export functionality**: Generate summary reports in various formats
6. **Integration with memory system**: Use summaries to enhance long-term context

## Best Practices

1. **Monitor confidence levels**: Focus on high/medium confidence summaries
2. **Regular session summaries**: Generate session summaries for longer conversations
3. **Insight aggregation**: Use the insights endpoint for trend analysis
4. **Error monitoring**: Watch for summary generation failures
5. **Performance tuning**: Adjust timeouts based on model performance
