USE alupla;

ALTER TABLE users
  ADD COLUMN last_seen_at DATETIME NULL AFTER email_verified;

CREATE INDEX idx_users_last_seen_at ON users(last_seen_at);
