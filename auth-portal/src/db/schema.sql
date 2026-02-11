-- ═══════════════════════════════════════════════════════════════════════════
-- Auth Portal Database Schema
-- Inspired by MediaWiki user_table structure
-- ═══════════════════════════════════════════════════════════════════════════

-- Users table (core)
CREATE TABLE IF NOT EXISTS user (
    user_id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name           VARCHAR(255) NOT NULL UNIQUE,
    user_name_lower     VARCHAR(255) NOT NULL UNIQUE,  -- Lowercase for lookups
    user_password       VARCHAR(255) NOT NULL,          -- Format: :B:salt:hash
    user_email          VARCHAR(255),
    user_email_confirmed BOOLEAN DEFAULT FALSE,
    user_email_token    VARCHAR(64),                    -- Email confirmation token
    user_email_token_expires DATETIME,
    user_created        DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_touched        DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Last activity

    -- Preferences (JSON blob for flexibility)
    user_preferences    TEXT DEFAULT '{}',

    -- Security
    user_epr_enabled    BOOLEAN DEFAULT FALSE,  -- Enhanced Password Reset
    user_locked         BOOLEAN DEFAULT FALSE,
    user_locked_reason  TEXT,

    INDEX idx_user_email (user_email),
    INDEX idx_user_name_lower (user_name_lower)
);

-- Password reset requests
CREATE TABLE IF NOT EXISTS password_reset (
    pr_id               INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_user_id          INTEGER NOT NULL,
    pr_token            VARCHAR(64) NOT NULL UNIQUE,
    pr_created          DATETIME DEFAULT CURRENT_TIMESTAMP,
    pr_expires          DATETIME NOT NULL,
    pr_used             BOOLEAN DEFAULT FALSE,
    pr_used_at          DATETIME,
    pr_ip_address       VARCHAR(45),  -- IPv6 max length

    FOREIGN KEY (pr_user_id) REFERENCES user(user_id) ON DELETE CASCADE,
    INDEX idx_pr_token (pr_token),
    INDEX idx_pr_user_id (pr_user_id)
);

-- Sessions
CREATE TABLE IF NOT EXISTS session (
    session_id          VARCHAR(64) PRIMARY KEY,
    session_user_id     INTEGER NOT NULL,
    session_created     DATETIME DEFAULT CURRENT_TIMESTAMP,
    session_expires     DATETIME NOT NULL,
    session_ip_address  VARCHAR(45),
    session_user_agent  TEXT,
    session_remember    BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (session_user_id) REFERENCES user(user_id) ON DELETE CASCADE,
    INDEX idx_session_user_id (session_user_id),
    INDEX idx_session_expires (session_expires)
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limit (
    rl_id               INTEGER PRIMARY KEY AUTOINCREMENT,
    rl_type             VARCHAR(50) NOT NULL,  -- 'password_reset', 'login', etc.
    rl_key              VARCHAR(255) NOT NULL, -- IP, user_id, email, etc.
    rl_count            INTEGER DEFAULT 1,
    rl_window_start     DATETIME DEFAULT CURRENT_TIMESTAMP,
    rl_window_end       DATETIME NOT NULL,

    UNIQUE(rl_type, rl_key, rl_window_end),
    INDEX idx_rl_lookup (rl_type, rl_key, rl_window_end)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    log_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    log_timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
    log_user_id         INTEGER,
    log_action          VARCHAR(50) NOT NULL,  -- 'login', 'password_reset', 'settings_change'
    log_target_user_id  INTEGER,               -- For admin actions
    log_ip_address      VARCHAR(45),
    log_details         TEXT,                  -- JSON blob

    FOREIGN KEY (log_user_id) REFERENCES user(user_id) ON DELETE SET NULL,
    INDEX idx_log_user_id (log_user_id),
    INDEX idx_log_action (log_action),
    INDEX idx_log_timestamp (log_timestamp)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Views for common queries
-- ═══════════════════════════════════════════════════════════════════════════

-- Users with emails (for password reset)
CREATE VIEW IF NOT EXISTS v_users_with_email AS
SELECT
    user_id,
    user_name,
    user_email,
    user_email_confirmed,
    user_epr_enabled
FROM user
WHERE user_email IS NOT NULL
  AND user_locked = FALSE;

-- Active sessions
CREATE VIEW IF NOT EXISTS v_active_sessions AS
SELECT
    s.session_id,
    s.session_user_id,
    u.user_name,
    s.session_created,
    s.session_expires,
    s.session_ip_address
FROM session s
JOIN user u ON s.session_user_id = u.user_id
WHERE s.session_expires > CURRENT_TIMESTAMP;

-- ═══════════════════════════════════════════════════════════════════════════
-- Example queries (for reference)
-- ═══════════════════════════════════════════════════════════════════════════

-- Find user by email (for password reset)
-- SELECT user_name FROM user WHERE user_email = 'user@example.com' AND user_locked = FALSE;

-- Find all usernames for an email (multi-account reset)
-- SELECT user_name FROM user WHERE user_email = 'user@example.com' AND user_epr_enabled = FALSE;

-- Check if EPR blocks reset (when only username provided)
-- SELECT user_epr_enabled FROM user WHERE user_name_lower = lower('username');

-- Password format: :B:salt:hash (MediaWiki compatible)
-- Hash = MD5(salt + '-' + MD5(password))
-- Example: UPDATE user SET user_password = ':B:1234:' || ... WHERE user_name = 'someuser';
