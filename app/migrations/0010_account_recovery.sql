-- 0010_account_recovery.sql
-- Recovery-code password reset (no email infrastructure needed). A user
-- generates a one-time recovery code; we store only its PBKDF2 hash. Reset
-- verifies the code, sets a new password, and clears the code (single use).
-- Additive.
ALTER TABLE users ADD COLUMN recovery_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN recovery_salt TEXT NOT NULL DEFAULT '';
