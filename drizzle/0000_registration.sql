CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE roles (principal TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('admin','manager','editor','analyst','scanner')));
--> statement-breakpoint
CREATE TABLE content (id INTEGER PRIMARY KEY CHECK(id=1), draft TEXT NOT NULL, published TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, published_at TEXT);
--> statement-breakpoint
CREATE TABLE templates (id TEXT PRIMARY KEY, subject TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
--> statement-breakpoint
CREATE TABLE registrations (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, data TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','approved','waitlisted','rejected','cancelled')),
 consent_version TEXT NOT NULL, consent_text TEXT NOT NULL, marketing INTEGER NOT NULL CHECK(marketing IN(0,1)),
 marketing_version TEXT NOT NULL, marketing_text TEXT NOT NULL, utm TEXT NOT NULL,
 request_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, actor TEXT NOT NULL,
 checked_in_at TEXT, version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX registrations_status ON registrations(status, created_at);
--> statement-breakpoint
CREATE TABLE mail_jobs (
 id TEXT PRIMARY KEY, registration_id TEXT REFERENCES registrations(id) ON DELETE CASCADE, kind TEXT NOT NULL,
 recipient TEXT, subject TEXT NOT NULL, body TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN('queued','sending','sent','failed','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
 provider_id TEXT, last_error TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(registration_id,kind)
);
--> statement-breakpoint
CREATE INDEX mail_due ON mail_jobs(state,available_at);
--> statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 1, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TRIGGER registration_guard BEFORE INSERT ON registrations BEGIN
 SELECT CASE WHEN COALESCE((SELECT json_extract(data,'$.mode') FROM settings WHERE id=1),'closed')='closed' THEN RAISE(ABORT,'registration_closed') END;
 SELECT CASE WHEN COALESCE((SELECT json_extract(data,'$.legalApproved') FROM settings WHERE id=1),0)!=1 THEN RAISE(ABORT,'legal_not_configured') END;
 SELECT CASE WHEN NEW.consent_version!=(SELECT json_extract(data,'$.consentVersion') FROM settings WHERE id=1) OR NEW.marketing_version!=(SELECT json_extract(data,'$.marketingVersion') FROM settings WHERE id=1) THEN RAISE(ABORT,'consent_changed') END;
 SELECT CASE WHEN (SELECT json_extract(data,'$.maxApplications') FROM settings WHERE id=1) IS NOT NULL AND (SELECT COUNT(*) FROM registrations)>=(SELECT json_extract(data,'$.maxApplications') FROM settings WHERE id=1) THEN RAISE(ABORT,'application_limit') END;
 SELECT CASE WHEN NEW.status='approved' AND (SELECT COUNT(*) FROM registrations WHERE status='approved')>=(SELECT json_extract(data,'$.capacity') FROM settings WHERE id=1) THEN RAISE(ABORT,'capacity_exceeded') END;
END;
--> statement-breakpoint
CREATE TRIGGER approval_guard BEFORE UPDATE OF status ON registrations WHEN NEW.status='approved' AND OLD.status!='approved' BEGIN
 SELECT CASE WHEN OLD.status NOT IN ('pending','waitlisted') THEN RAISE(ABORT,'invalid_transition') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM registrations WHERE status='approved')>=(SELECT json_extract(data,'$.capacity') FROM settings WHERE id=1) THEN RAISE(ABORT,'capacity_exceeded') END;
END;
--> statement-breakpoint
CREATE TRIGGER settings_guard BEFORE UPDATE ON settings BEGIN
 SELECT CASE WHEN json_extract(NEW.data,'$.capacity')<(SELECT COUNT(*) FROM registrations WHERE status='approved') THEN RAISE(ABORT,'capacity_below_confirmed') END;
END;
--> statement-breakpoint
CREATE TRIGGER registration_created AFTER INSERT ON registrations BEGIN
 INSERT INTO audit(actor,action,resource) VALUES(NEW.actor,'registration.created',NEW.id);
 INSERT INTO mail_jobs(id,registration_id,kind,subject,body) SELECT NEW.id||':registered',NEW.id,'registered',subject,body FROM templates WHERE id='registered';
 INSERT INTO mail_jobs(id,registration_id,kind,subject,body) SELECT NEW.id||':approved',NEW.id,'approved',subject,body FROM templates WHERE id='approved' AND NEW.status='approved';
END;
--> statement-breakpoint
CREATE TRIGGER registration_updated AFTER UPDATE OF status ON registrations WHEN NEW.status!=OLD.status BEGIN
 INSERT INTO audit(actor,action,resource) VALUES(NEW.actor,'registration.'||NEW.status,NEW.id);
 UPDATE mail_jobs SET state='cancelled' WHERE registration_id=NEW.id AND state IN('queued','failed') AND NEW.status IN('cancelled','rejected');
 INSERT OR IGNORE INTO mail_jobs(id,registration_id,kind,subject,body) SELECT NEW.id||':approved',NEW.id,'approved',subject,body FROM templates WHERE id='approved' AND NEW.status='approved';
 INSERT OR IGNORE INTO mail_jobs(id,registration_id,kind,subject,body) SELECT NEW.id||':rejected',NEW.id,'rejected',subject,body FROM templates WHERE id='rejected' AND NEW.status='rejected' AND (SELECT json_extract(data,'$.rejectionMail') FROM settings WHERE id=1)=1;
END;
