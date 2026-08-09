const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'chat.db');
const BACKUP_ENC_FILE = path.join(__dirname, 'chat_backup.enc');
const JWT_SECRET = 'anonmesh_secure_chat_secret_key_2026';
const MASTER_KEY = crypto.createHash('sha256').update(JWT_SECRET + '_anonmesh_master_db_key_2026').digest();

function encryptData(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error('Database connection error:', err);
        return;
    }

    const newPassword = 'Luca1877';
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    db.run(`UPDATE users SET password_hash = ? WHERE LOWER(username) = 'anonym1'`, [newHash], function(err) {
        if (err) {
            console.error('Error updating password:', err);
        } else {
            console.log(`✅ Password for Anonym1 successfully updated to: ${newPassword}`);
            
            // Save updated backup file
            db.all(`SELECT id, email, username, password_hash, avatar_color, avatar_url, created_at FROM users`, [], (err, users) => {
                db.all(`SELECT id, user_id, contact_id, created_at FROM contacts`, [], (err, contacts) => {
                    db.all(`SELECT id, sender_id, receiver_id, content, timestamp, is_read FROM messages`, [], (err, messages) => {
                        const backupObj = { users: users || [], contacts: contacts || [], messages: messages || [] };
                        const jsonStr = JSON.stringify(backupObj, null, 2);
                        const encryptedPayload = encryptData(jsonStr);
                        fs.writeFileSync(BACKUP_ENC_FILE, encryptedPayload, 'utf8');
                        console.log('✅ Updated encrypted backup chat_backup.enc with new password hash!');
                        db.close();
                    });
                });
            });
        }
    });
});
