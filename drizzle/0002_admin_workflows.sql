CREATE TABLE invitees (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, data TEXT NOT NULL, search_text TEXT NOT NULL, actor TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE TABLE content_history (
 id INTEGER PRIMARY KEY AUTOINCREMENT, version INTEGER NOT NULL UNIQUE, data TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
INSERT INTO content_history(version,data,created_at) SELECT version,published,COALESCE(published_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) FROM content;
--> statement-breakpoint
CREATE TRIGGER content_initial_history AFTER INSERT ON content BEGIN
 INSERT OR IGNORE INTO content_history(version,data) VALUES(NEW.version,NEW.published);
END;
--> statement-breakpoint
CREATE TRIGGER content_publish_history AFTER UPDATE OF published ON content WHEN NEW.published!=OLD.published BEGIN
 INSERT INTO content_history(version,data) VALUES(NEW.version,NEW.published);
END;
--> statement-breakpoint
ALTER TABLE mail_jobs ADD COLUMN first_attempt_at INTEGER;
--> statement-breakpoint
ALTER TABLE mail_jobs ADD COLUMN payload TEXT;
--> statement-breakpoint
ALTER TABLE mail_jobs ADD COLUMN delivery_status TEXT;
--> statement-breakpoint
ALTER TABLE mail_jobs ADD COLUMN delivery_checked_at TEXT;
--> statement-breakpoint
UPDATE mail_jobs SET first_attempt_at=CAST(strftime('%s',created_at) AS INTEGER)*1000 WHERE attempts>0;
