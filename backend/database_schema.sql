-- Elara AI Chat Database Schema
-- Optimized for AI model context retrieval and semantic search

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,  -- UUID
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    is_private BOOLEAN DEFAULT TRUE,  -- Privacy flag for summarization and context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT  -- JSON for additional session data
);

-- Messages table with full-text search (FTS5 doesn't support foreign keys)
CREATE VIRTUAL TABLE IF NOT EXISTS messages USING fts5(
    id UNINDEXED,  -- Store but don't index the ID
    chat_id UNINDEXED,  -- Store but don't index chat_id
    user_id UNINDEXED,  -- Store but don't index user_id
    message,  -- Index the message content for search
    model UNINDEXED,  -- Store but don't index model
    created_at UNINDEXED,  -- Store but don't index timestamp
    updated_at UNINDEXED  -- Store but don't index timestamp
);

-- Regular messages table for foreign key relationships
CREATE TABLE IF NOT EXISTS messages_meta (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Conversation summaries table
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,  -- UUID
    chat_id TEXT NOT NULL,
    user_message_id TEXT NOT NULL,
    assistant_message_id TEXT NOT NULL,
    summary_data TEXT NOT NULL,  -- JSON containing structured summary
    confidence_level TEXT NOT NULL,  -- high|medium|low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_message_id) REFERENCES messages_meta(id) ON DELETE CASCADE,
    FOREIGN KEY (assistant_message_id) REFERENCES messages_meta(id) ON DELETE CASCADE
);

-- Session summaries table
CREATE TABLE IF NOT EXISTS session_summaries (
    id TEXT PRIMARY KEY,  -- UUID
    chat_id TEXT NOT NULL,
    summary_data TEXT NOT NULL,  -- JSON containing structured summary
    message_count INTEGER NOT NULL,
    confidence_level TEXT NOT NULL,  -- high|medium|low
    session_quality TEXT,  -- excellent|good|fair|poor
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Memory entries for AI context
CREATE TABLE IF NOT EXISTS memory_entries (
    id TEXT PRIMARY KEY,  -- UUID
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    importance INTEGER DEFAULT 1,  -- 1-10 scale for context prioritization
    category TEXT,  -- e.g., 'user_preferences', 'conversation_context'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message embeddings for semantic search
CREATE TABLE IF NOT EXISTS message_embeddings (
    message_id TEXT PRIMARY KEY,
    embedding BLOB NOT NULL,  -- Vector as binary data
    embedding_model TEXT NOT NULL,  -- Which model generated the embedding
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages_meta(id) ON DELETE CASCADE
);

-- Memory embeddings for semantic search
CREATE TABLE IF NOT EXISTS memory_embeddings (
    memory_id TEXT PRIMARY KEY,
    embedding BLOB NOT NULL,
    embedding_model TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_id) REFERENCES memory_entries(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_meta_chat_id ON messages_meta(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_meta_created_at ON messages_meta(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_chat_id ON conversation_summaries(chat_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_confidence ON conversation_summaries(confidence_level);
CREATE INDEX IF NOT EXISTS idx_session_summaries_chat_id ON session_summaries(chat_id);
CREATE INDEX IF NOT EXISTS idx_session_summaries_quality ON session_summaries(session_quality);
CREATE INDEX IF NOT EXISTS idx_memory_category ON memory_entries(category);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory_entries(importance);
CREATE INDEX IF NOT EXISTS idx_memory_last_accessed ON memory_entries(last_accessed);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_chat_sessions_updated_at 
    AFTER UPDATE ON chat_sessions
    BEGIN
        UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_messages_meta_updated_at 
    AFTER UPDATE ON messages_meta
    BEGIN
        UPDATE messages_meta SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_conversation_summaries_updated_at 
    AFTER UPDATE ON conversation_summaries
    BEGIN
        UPDATE conversation_summaries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_session_summaries_updated_at 
    AFTER UPDATE ON session_summaries
    BEGIN
        UPDATE session_summaries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_memory_entries_updated_at 
    AFTER UPDATE ON memory_entries
    BEGIN
        UPDATE memory_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS recent_chat_context AS
SELECT 
    m.id,
    m.chat_id,
    m.user_id,
    m.message,
    m.model,
    m.created_at,
    cs.title as chat_title
FROM messages m
JOIN messages_meta mm ON m.id = mm.id
JOIN chat_sessions cs ON mm.chat_id = cs.id
WHERE mm.created_at > datetime('now', '-7 days')
ORDER BY mm.created_at DESC;

CREATE VIEW IF NOT EXISTS important_memory AS
SELECT 
    id,
    key,
    value,
    importance,
    category,
    last_accessed
FROM memory_entries
WHERE importance >= 5
ORDER BY importance DESC, last_accessed DESC;

CREATE VIEW IF NOT EXISTS high_confidence_summaries AS
SELECT 
    cs.id,
    cs.chat_id,
    cs.summary_data,
    cs.confidence_level,
    cs.created_at,
    chat_sessions.title as chat_title
FROM conversation_summaries cs
JOIN chat_sessions ON cs.chat_id = chat_sessions.id
WHERE cs.confidence_level IN ('high', 'medium')
ORDER BY cs.created_at DESC; 