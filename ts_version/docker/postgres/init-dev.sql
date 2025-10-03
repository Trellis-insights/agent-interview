-- Development database initialization

-- Create additional schemas if needed
CREATE SCHEMA IF NOT EXISTS app_data;

-- Create tables for application data (if you want to store chat history, etc.)
CREATE TABLE IF NOT EXISTS app_data.chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_data.chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES app_data.chat_sessions(session_id),
    message_type VARCHAR(20) CHECK (message_type IN ('user', 'agent')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_data.file_uploads (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    content_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON app_data.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON app_data.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_session_id ON app_data.file_uploads(session_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA app_data TO temporal;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app_data TO temporal;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app_data TO temporal;