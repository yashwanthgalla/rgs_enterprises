-- V3__add_user_email_and_must_change_password.sql
-- Add email and first-time password change enforcement to app_user

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;

-- Update existing administrator records
UPDATE app_user 
SET email = 'rgsenterprise2026@gmail.com', username = 'Sai Babu P', full_name = 'Sai Babu P'
WHERE username = 'admin' OR email = 'rgsenterprise2026@gmail.com';

UPDATE app_user 
SET email = 'bschandrasekhar4@gmail.com', username = 'B Chandrasekhar', full_name = 'B Chandrasekhar'
WHERE username = 'admin2' OR email = 'bschandrasekhar4@gmail.com';
