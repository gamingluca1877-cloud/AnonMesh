/**
 * server.js - Backend Node.js Server for Web-Chat Application
 * Telegram/WhatsApp Style Real-time Chat App
 * Stack: Express, Socket.io, SQLite3, JWT, bcryptjs
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const APP_PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'anonmesh_secure_chat_secret_key_2026';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 50 * 1024 * 1024 // 50MB limit for high-res images & media
});


// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(express.static(path.join(__dirname)));


// ----------------------------------------------------
// Database Setup & Initialization (SQLite)
// ----------------------------------------------------
const dbPath = path.join(__dirname, 'chat.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('[-] Database connection error:', err.message);
    } else {
        console.log('[+] Connected to SQLite database:', dbPath);
    }
});

// Enable foreign key constraints and create tables
db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON;');

    // 1. Users Table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar_color TEXT DEFAULT '#3b82f6',
            avatar_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Ensure avatar_url column exists for existing DBs
    db.run("ALTER TABLE users ADD COLUMN avatar_url TEXT", () => {});


    // 2. Contacts Table
    db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            contact_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, contact_id)
        )
    `);

    // 3. Messages Table
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_read INTEGER DEFAULT 0,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Restore registered accounts from backup if DB restarted, then sync backup file
    setTimeout(() => {
        restoreUsersFromBackup();
        saveUsersBackup();
    }, 500);
});


// ----------------------------------------------------
// Encrypted Complete Database Backup Engine (AES-256-GCM)
// Backs up Users, Contacts & Messages so NO CHATS ARE EVER LOST!
// ----------------------------------------------------
const fs = require('fs');
const crypto = require('crypto');
const BACKUP_ENC_FILE = path.join(__dirname, 'chat_backup.enc');

// Master encryption key derived from JWT_SECRET
const MASTER_KEY = crypto.createHash('sha256').update(JWT_SECRET + '_anonmesh_master_db_key_2026').digest();

function encryptData(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptData(encryptedStr) {
    if (!encryptedStr || !encryptedStr.startsWith('enc:')) return null;
    const parts = encryptedStr.split(':');
    if (parts.length !== 4) return null;
    
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const ciphertext = parts[3];

    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function saveUsersBackup() {
    db.all(`SELECT id, email, username, password_hash, avatar_color, avatar_url, created_at FROM users`, [], (err, users) => {
        if (err || !users) return;
        db.all(`SELECT id, user_id, contact_id, created_at FROM contacts`, [], (err, contacts) => {
            if (err || !contacts) return;
            db.all(`SELECT id, sender_id, receiver_id, content, timestamp, is_read FROM messages`, [], (err, messages) => {
                if (err || !messages) return;

                const backupObj = {
                    users: users || [],
                    contacts: contacts || [],
                    messages: messages || []
                };

                try {
                    const jsonStr = JSON.stringify(backupObj, null, 2);
                    const encryptedPayload = encryptData(jsonStr);
                    fs.writeFileSync(BACKUP_ENC_FILE, encryptedPayload, 'utf8');

                    // Clean up old backup files
                    const oldUserEnc = path.join(__dirname, 'users_backup.enc');
                    if (fs.existsSync(oldUserEnc)) fs.unlinkSync(oldUserEnc);
                    const oldUserJson = path.join(__dirname, 'users_backup.json');
                    if (fs.existsSync(oldUserJson)) fs.unlinkSync(oldUserJson);
                } catch (e) {
                    console.error('Error writing encrypted db backup:', e.message);
                }
            });
        });
    });
}

function restoreUsersFromBackup() {
    if (!fs.existsSync(BACKUP_ENC_FILE)) return;
    try {
        const encryptedData = fs.readFileSync(BACKUP_ENC_FILE, 'utf8');
        const jsonStr = decryptData(encryptedData);
        if (!jsonStr) return;

        const backupObj = JSON.parse(jsonStr);
        if (!backupObj) return;

        db.serialize(() => {
            // 1. Restore Users (With avatar_url & username updates)
            if (Array.isArray(backupObj.users)) {
                const insertUser = `INSERT OR REPLACE INTO users (id, email, username, password_hash, avatar_color, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                backupObj.users.forEach(u => {
                    db.run(insertUser, [u.id, u.email, u.username, u.password_hash, u.avatar_color, u.avatar_url || null, u.created_at || new Date().toISOString()]);
                });
            }


            // 2. Restore Contacts
            if (Array.isArray(backupObj.contacts)) {
                const insertContact = `INSERT OR IGNORE INTO contacts (id, user_id, contact_id, created_at) VALUES (?, ?, ?, ?)`;
                backupObj.contacts.forEach(c => {
                    db.run(insertContact, [c.id, c.user_id, c.contact_id, c.created_at || new Date().toISOString()]);
                });
            }

            // 3. Restore Messages (All Chats!)
            if (Array.isArray(backupObj.messages)) {
                const insertMsg = `INSERT OR IGNORE INTO messages (id, sender_id, receiver_id, content, timestamp, is_read) VALUES (?, ?, ?, ?, ?, ?)`;
                backupObj.messages.forEach(m => {
                    db.run(insertMsg, [m.id, m.sender_id, m.receiver_id, m.content, m.timestamp, m.is_read || 0]);
                });
            }

            console.log(`[+] Restored ${backupObj.users?.length || 0} users, ${backupObj.contacts?.length || 0} contacts, and ${backupObj.messages?.length || 0} chat messages from AES-256-GCM backup!`);
        });

    } catch (e) {
        console.error('Error restoring encrypted db backup:', e.message);
    }
}




// Helper colors for user avatars
const AVATAR_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ec4899', 
    '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6'
];

function getRandomColor() {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

// ----------------------------------------------------
// Authentication Middleware (REST API)
// ----------------------------------------------------
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Nicht autorisiert. Token fehlt.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Ungültiges oder abgelaufenes Token.' });
        }
        req.user = user;
        next();
    });
}

// ----------------------------------------------------
// REST API Routes
// ----------------------------------------------------

// 1. User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        let { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: 'Alle Felder müssen ausgefüllt sein.' });
        }

        email = email.trim().toLowerCase();
        username = username.trim();

        // Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein.' });
        }

        if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ error: 'Benutzername muss 3-20 Zeichen lang sein und darf nur Buchstaben, Zahlen & Unterstriche enthalten.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein.' });
        }

        // Hash password securely with bcrypt
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const avatarColor = getRandomColor();

        // Insert into database
        const sql = `INSERT INTO users (email, username, password_hash, avatar_color) VALUES (?, ?, ?, ?)`;
        db.run(sql, [email, username, passwordHash, avatarColor], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: users.email')) {
                    return res.status(400).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet.' });
                }
                if (err.message.includes('UNIQUE constraint failed: users.username')) {
                    return res.status(400).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
                }
                return res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers.' });
            }

            const userId = this.lastID;
            saveUsersBackup();

            const token = jwt.sign({ id: userId, email, username }, JWT_SECRET, { expiresIn: '30d' });

            res.status(201).json({
                message: 'Registrierung erfolgreich.',
                token,
                user: { id: userId, email, username, avatar_color: avatarColor, avatar_url: null }
            });
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Serverfehler bei der Registrierung.' });
    }
});

// 2. User Login
app.post('/api/auth/login', (req, res) => {
    let { loginInput, password } = req.body;

    if (!loginInput || !password) {
        return res.status(400).json({ error: 'Bitte E-Mail/Benutzername und Passwort eingeben.' });
    }

    loginInput = loginInput.trim().toLowerCase();

    // Query user by email OR username (case-insensitive & trimmed)
    const sql = `SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) OR LOWER(TRIM(username)) = LOWER(TRIM(?))`;
    db.get(sql, [loginInput, loginInput], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler bei der Datenbankabfrage.' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Ungültige Anmeldedaten. Benutzer nicht gefunden.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Ungültige Anmeldedaten. Passwort falsch.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Anmeldung erfolgreich.',
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar_color: user.avatar_color,
                avatar_url: user.avatar_url
            }
        });
    });
});


// 3. Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const sql = `SELECT id, email, username, avatar_color, avatar_url, created_at FROM users WHERE id = ?`;
    db.get(sql, [req.user.id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
        }
        res.json({ user });
    });
});

// 3c. Update Profile Picture
app.put('/api/users/profile-picture', authenticateToken, (req, res) => {
    const { avatarDataUrl } = req.body;
    if (!avatarDataUrl) {
        return res.status(400).json({ error: 'Kein Profilbild übergeben.' });
    }

    const sql = `UPDATE users SET avatar_url = ? WHERE id = ?`;
    db.run(sql, [avatarDataUrl, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Speichern des Profilbilds.' });
        }
        saveUsersBackup();
        res.json({ message: 'Profilbild erfolgreich aktualisiert!', avatar_url: avatarDataUrl });
    });
});


// 3b. Change Username
app.put('/api/users/change-username', authenticateToken, (req, res) => {
    let { newUsername } = req.body;

    if (!newUsername) {
        return res.status(400).json({ error: 'Bitte einen neuen Benutzernamen eingeben.' });
    }

    newUsername = newUsername.trim();

    if (newUsername.length < 3 || newUsername.length > 20 || !/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        return res.status(400).json({ error: 'Benutzername muss 3-20 Zeichen lang sein und darf nur Buchstaben, Zahlen & Unterstriche enthalten.' });
    }

    if (newUsername.toLowerCase() === req.user.username.toLowerCase()) {
        return res.status(400).json({ error: 'Der neue Benutzername ist identisch mit deinem aktuellen Namen.' });
    }

    // Check if newUsername is taken
    const checkSql = `SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?`;
    db.get(checkSql, [newUsername, req.user.id], (err, existing) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler bei der Überprüfung.' });
        }
        if (existing) {
            return res.status(400).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
        }

        // Update username
        const updateSql = `UPDATE users SET username = ? WHERE id = ?`;
        db.run(updateSql, [newUsername, req.user.id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Aktualisieren des Benutzernamens.' });
            }

            saveUsersBackup();

            const token = jwt.sign(
                { id: req.user.id, email: req.user.email, username: newUsername },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.json({
                message: 'Benutzername erfolgreich geändert!',
                token,
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    username: newUsername
                }
            });
        });
    });
});



// 4. Get User Contacts (with online status, last message & unread count)
app.get('/api/contacts', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // Get all contacts added by current user
    const sql = `
        SELECT u.id, u.username, u.email, u.avatar_color
        FROM contacts c
        JOIN users u ON c.contact_id = u.id
        WHERE c.user_id = ?
        ORDER BY u.username ASC
    `;

    db.all(sql, [userId], (err, contacts) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Laden der Kontakte.' });
        }

        if (contacts.length === 0) {
            return res.json({ contacts: [] });
        }

        // Augment each contact with last message & unread count
        let completed = 0;
        const augmentedContacts = [];

        contacts.forEach((contact) => {
            const lastMsgSql = `
                SELECT content, timestamp, sender_id
                FROM messages
                WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
                ORDER BY id DESC LIMIT 1
            `;

            const unreadSql = `
                SELECT COUNT(*) as unread_count
                FROM messages
                WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
            `;

            db.get(lastMsgSql, [userId, contact.id, contact.id, userId], (err, lastMsg) => {
                db.get(unreadSql, [contact.id, userId], (err, unreadRes) => {
                    const isOnline = onlineUsers.has(contact.id);
                    augmentedContacts.push({
                        ...contact,
                        is_online: isOnline,
                        last_message: lastMsg ? lastMsg.content : null,
                        last_message_time: lastMsg ? lastMsg.timestamp : null,
                        unread_count: unreadRes ? unreadRes.unread_count : 0
                    });

                    completed++;
                    if (completed === contacts.length) {
                        // Sort by latest message timestamp if present, otherwise username
                        augmentedContacts.sort((a, b) => {
                            if (a.last_message_time && b.last_message_time) {
                                return new Date(b.last_message_time) - new Date(a.last_message_time);
                            }
                            if (a.last_message_time) return -1;
                            if (b.last_message_time) return 1;
                            return a.username.localeCompare(b.username);
                        });
                        res.json({ contacts: augmentedContacts });
                    }
                });
            });
        });
    });
});

// 5. Add Contact by Username
app.post('/api/contacts/add', authenticateToken, (req, res) => {
    let { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Bitte einen Benutzernamen eingeben.' });
    }

    username = username.trim();

    if (username.toLowerCase() === req.user.username.toLowerCase()) {
        return res.status(400).json({ error: 'Du kannst dich nicht selbst als Kontakt hinzufügen.' });
    }

    // Find target user by username or email (trimmed & case-insensitive)
    const findSql = `SELECT id, username, email, avatar_color, avatar_url FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) OR LOWER(TRIM(email)) = LOWER(TRIM(?))`;
    db.get(findSql, [username, username], (err, targetUser) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler bei der Suche.' });
        }

        if (!targetUser) {
            return res.status(404).json({ error: 'Benutzer mit diesem Namen oder dieser E-Mail wurde nicht gefunden.' });
        }


        // Add bi-directional contact (both users see each other)
        const addSql = `INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?), (?, ?)`;
        db.run(addSql, [req.user.id, targetUser.id, targetUser.id, req.user.id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Speichern des Kontakts.' });
            }

            const isOnline = onlineUsers.has(targetUser.id);
            const contactObj = {
                id: targetUser.id,
                username: targetUser.username,
                email: targetUser.email,
                avatar_color: targetUser.avatar_color,
                is_online: isOnline,
                last_message: null,
                last_message_time: null,
                unread_count: 0
            };

            // Notify target user via WebSocket if online
            const targetSockets = onlineUsers.get(targetUser.id);
            if (targetSockets) {
                // Get current user details for target
                db.get(`SELECT id, username, email, avatar_color FROM users WHERE id = ?`, [req.user.id], (err, myInfo) => {
                    if (myInfo) {
                        const myContactObj = {
                            ...myInfo,
                            is_online: onlineUsers.has(req.user.id),
                            last_message: null,
                            last_message_time: null,
                            unread_count: 0
                        };
                        io.to(`user_${targetUser.id}`).emit('contact_added', { contact: myContactObj });
                    }
                });
            }

            res.status(201).json({
                message: `${targetUser.username} wurde zu deinen Kontakten hinzugefügt!`,
                contact: contactObj
            });
        });
    });
});

// 6. Get Chat History with a Contact
app.get('/api/messages/:contactId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId, 10);

    if (isNaN(contactId)) {
        return res.status(400).json({ error: 'Ungültige Kontakt-ID.' });
    }

    // Fetch conversation
    const sql = `
        SELECT id, sender_id, receiver_id, content, timestamp, is_read
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY timestamp ASC
    `;

    db.all(sql, [userId, contactId, contactId, userId], (err, messages) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Laden des Nachrichtenverlaufs.' });
        }

        // Mark incoming messages as read
        const updateReadSql = `
            UPDATE messages SET is_read = 1 
            WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
        `;
        db.run(updateReadSql, [contactId, userId], (err) => {
            if (!err) {
                // Notify sender that messages were read
                io.to(`user_${contactId}`).emit('messages_read', { read_by: userId });
            }
        });

        res.json({ messages });
    });
});

// ----------------------------------------------------
// Real-time WebSocket Logic (Socket.io)
// ----------------------------------------------------

// Map to track active online user connections: Map<userId, Set<socketId>>
const onlineUsers = new Map();

// Socket Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
        return next(new Error('Authentifizierungs-Token erforderlich.'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Ungültiges Token.'));
        }
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`[+] User connected: ${socket.user.username} (ID: ${userId}) [Socket: ${socket.id}]`);

    // Add to online users map
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal user room for targeted notifications
    socket.join(`user_${userId}`);

    // Broadcast online status to contacts
    broadcastStatus(userId, true);

    // Socket Event: Send Private Message
    socket.on('send_message', ({ receiver_id, content }) => {
        if (!receiver_id || !content || typeof content !== 'string') return;
        const trimmedContent = content.trim();
        if (!trimmedContent) return;

        const timestamp = new Date().toISOString();

        const sql = `INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, ?)`;
        db.run(sql, [userId, receiver_id, trimmedContent, timestamp], function(err) {
            if (err) {
                console.error('Error saving message:', err.message);
                return;
            }

            saveUsersBackup();

            const messageObj = {
                id: this.lastID,
                sender_id: userId,
                receiver_id,
                content: trimmedContent,
                timestamp,
                is_read: 0
            };


            // Emit to sender
            socket.emit('message_sent', messageObj);

            // Emit to receiver's room
            io.to(`user_${receiver_id}`).emit('private_message', messageObj);
        });
    });

    // Socket Event: Typing Indicator
    socket.on('typing', ({ receiver_id }) => {
        if (receiver_id) {
            io.to(`user_${receiver_id}`).emit('user_typing', { sender_id: userId });
        }
    });

    socket.on('stop_typing', ({ receiver_id }) => {
        if (receiver_id) {
            io.to(`user_${receiver_id}`).emit('user_stop_typing', { sender_id: userId });
        }
    });

    // Socket Event: Mark Read
    socket.on('mark_read', ({ sender_id }) => {
        if (!sender_id) return;
        const sql = `UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`;
        db.run(sql, [sender_id, userId], function(err) {
            if (!err && this.changes > 0) {
                io.to(`user_${sender_id}`).emit('messages_read', { read_by: userId });
            }
        });
    });

    // ----------------------------------------------------
    // WebRTC HD Audio/Video Call Signaling
    // ----------------------------------------------------
    socket.on('call_user', ({ receiver_id, offer, call_type }) => {
        if (receiver_id) {
            io.to(`user_${receiver_id}`).emit('incoming_call', {
                caller_id: userId,
                caller_username: socket.user.username,
                offer,
                call_type // 'audio' or 'video'
            });
        }
    });

    socket.on('answer_call', ({ receiver_id, answer }) => {
        if (receiver_id) {
            io.to(`user_${receiver_id}`).emit('call_accepted', {
                answer
            });
        }
    });

    socket.on('reject_call', ({ receiver_id }) => {
        if (receiver_id) {
            io.to(`user_${receiver_id}`).emit('call_rejected', {
                caller_id: userId
            });
        }
    });

    socket.on('end_call', ({ receiver_id }) => {
        if (receiver_id) {
            io.to(`user_${receiver_id}`).emit('call_ended', {
                caller_id: userId
            });
        }
    });

    socket.on('ice_candidate', ({ receiver_id, candidate }) => {
        if (receiver_id) {
            io.to(`user_${receiver_id}`).emit('ice_candidate', {
                candidate,
                sender_id: userId
            });
        }
    });


    // Handle Disconnect
    socket.on('disconnect', () => {
        console.log(`[-] User disconnected: ${socket.user.username} [Socket: ${socket.id}]`);
        const userSockets = onlineUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
                onlineUsers.delete(userId);
                broadcastStatus(userId, false);
            }
        }
    });
});

// Helper: Notify contacts about status change (Online / Offline)
function broadcastStatus(userId, isOnline) {
    const sql = `SELECT user_id FROM contacts WHERE contact_id = ?`;
    db.all(sql, [userId], (err, rows) => {
        if (err || !rows) return;
        rows.forEach(row => {
            io.to(`user_${row.user_id}`).emit('user_status', {
                user_id: userId,
                is_online: isOnline
            });
        });
    });
}

// Start Server
server.listen(APP_PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 AnonMesh Chat-Server läuft!`);
    console.log(`   Local:   http://localhost:${APP_PORT}`);
    console.log(`   Domain:  http://www.anonmesh.net:${APP_PORT}`);
    console.log(`====================================================`);
});

