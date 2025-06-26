#!/usr/bin/env python3
"""
Migration script to add is_private column to chat_sessions table
"""

import sqlite3
from pathlib import Path


def migrate_add_privacy():
    """Add is_private column to chat_sessions table"""

    db_path = "storage/elara.db"

    if not Path(db_path).exists():
        print(f"Database file {db_path} not found. Creating new database...")
        return

    print("Migrating database to add privacy support...")

    try:
        with sqlite3.connect(db_path) as conn:
            # Check if column already exists
            cursor = conn.execute("PRAGMA table_info(chat_sessions)")
            columns = [column[1] for column in cursor.fetchall()]

            if "is_private" not in columns:
                print("Adding is_private column to chat_sessions table...")
                conn.execute(
                    "ALTER TABLE chat_sessions ADD COLUMN is_private BOOLEAN DEFAULT TRUE"
                )
                conn.commit()
                print("✅ Successfully added is_private column")
            else:
                print("✅ is_private column already exists")

            # Check if summary tables exist, create them if not
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='conversation_summaries'"
            )
            if not cursor.fetchone():
                print("Creating conversation_summaries table...")
                conn.execute(
                    """
                    CREATE TABLE conversation_summaries (
                        id TEXT PRIMARY KEY,
                        chat_id TEXT NOT NULL,
                        user_message_id TEXT NOT NULL,
                        assistant_message_id TEXT NOT NULL,
                        summary_data TEXT NOT NULL,
                        confidence_level TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_message_id) REFERENCES messages_meta(id) ON DELETE CASCADE,
                        FOREIGN KEY (assistant_message_id) REFERENCES messages_meta(id) ON DELETE CASCADE
                    )
                """
                )
                conn.commit()
                print("✅ Created conversation_summaries table")

            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='session_summaries'"
            )
            if not cursor.fetchone():
                print("Creating session_summaries table...")
                conn.execute(
                    """
                    CREATE TABLE session_summaries (
                        id TEXT PRIMARY KEY,
                        chat_id TEXT NOT NULL,
                        summary_data TEXT NOT NULL,
                        message_count INTEGER NOT NULL,
                        confidence_level TEXT NOT NULL,
                        session_quality TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (chat_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
                    )
                """
                )
                conn.commit()
                print("✅ Created session_summaries table")

            # Create indexes if they don't exist
            indexes_to_create = [
                (
                    "idx_conversation_summaries_chat_id",
                    "CREATE INDEX idx_conversation_summaries_chat_id ON conversation_summaries(chat_id)",
                ),
                (
                    "idx_conversation_summaries_confidence",
                    "CREATE INDEX idx_conversation_summaries_confidence ON conversation_summaries(confidence_level)",
                ),
                (
                    "idx_session_summaries_chat_id",
                    "CREATE INDEX idx_session_summaries_chat_id ON session_summaries(chat_id)",
                ),
                (
                    "idx_session_summaries_quality",
                    "CREATE INDEX idx_session_summaries_quality ON session_summaries(session_quality)",
                ),
            ]

            for index_name, index_sql in indexes_to_create:
                cursor = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
                    (index_name,),
                )
                if not cursor.fetchone():
                    print(f"Creating index {index_name}...")
                    conn.execute(index_sql)
                    conn.commit()
                    print(f"✅ Created index {index_name}")

            print("\n🎉 Migration completed successfully!")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    migrate_add_privacy()
