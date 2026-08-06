-- J005: Add surface column to session to enforce wrong-surface gate
ALTER TABLE identity_sessions 
ADD COLUMN surface text NOT NULL DEFAULT 'unknown';
