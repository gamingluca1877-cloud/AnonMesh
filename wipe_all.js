const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'chat.db');
const backupPath = path.join(__dirname, 'chat_backup.enc');
const BACKUP_ENCRYPTION_KEY = crypto.createHash('sha256').update('AnonMesh_E2EE_Backup_Secret_Key_2026!').digest();

// 1. Wipe SQLite database tables
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }

    db.serialize(() => {
        db.run('DELETE FROM users;');
        db.run('DELETE FROM contacts;');
        db.run('DELETE FROM messages;');
        db.run("DELETE FROM sqlite_sequence WHERE name IN ('users', 'contacts', 'messages');");
        console.log('✅ SQLite database tables (users, contacts, messages) completely wiped!');
    });

    db.close();
});

// 2. Overwrite chat_backup.enc with clean empty state
function encryptData(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', BACKUP_ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return JSON.stringify({ iv: iv.toString('hex'), tag, content: encrypted });
}

const emptyBackupObj = { users: [], contacts: [], messages: [] };
const encryptedEmpty = encryptData(JSON.stringify(emptyBackupObj));
fs.writeFileSync(backupPath, encryptedEmpty, 'utf8');
console.log('✅ Encrypted backup chat_backup.enc completely reset to empty state!');
