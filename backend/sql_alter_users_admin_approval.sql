ALTER TABLE users
  ADD COLUMN admin_approved TINYINT(1) NOT NULL DEFAULT 1 AFTER email_verified;

UPDATE users
SET admin_approved = 1
WHERE admin_approved IS NULL OR admin_approved = 0;
