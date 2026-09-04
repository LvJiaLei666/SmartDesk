// main/memory.js
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

class MemoryStore {
    init() {
        const dbPath = path.join(app.getPath('userData'), 'smartdesk.db');
        this.db = new Database(dbPath);

        this.db.exec(`
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

        this.sessionId = Date.now().toString(36);
    }

    // 偏好
    setPreference(key, value) {
        this.db.prepare(
            'INSERT OR REPLACE INTO preferences (key, value, updated_at) VALUES (?, ?, datetime("now"))'
        ).run(key, value);
    }

    getPreference(key) {
        const row = this.db.prepare('SELECT value FROM preferences WHERE key = ?').get(key);
        return row?.value;
    }

    getAllPreferences() {
        return this.db.prepare('SELECT key, value FROM preferences').all()
            .reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    }

    // 对话
    addConversation(role, content) {
        this.db.prepare(
            'INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)'
        ).run(this.sessionId, role, content);
    }

    // 设置
    setSetting(key, value) {
        this.db.prepare(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
        ).run(key, JSON.stringify(value));
    }

    getSetting(key) {
        const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? JSON.parse(row.value) : null;
    }

    getAllSettings() {
        return this.db.prepare('SELECT key, value FROM settings').all()
            .reduce((acc, row) => ({ ...acc, [row.key]: JSON.parse(row.value) }), {});
    }
}

export { MemoryStore };