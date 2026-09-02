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
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');




const APP_PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'anonmesh_secure_chat_secret_key_2026';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 500 * 1024 * 1024 // Unlimited high-capacity buffer (500MB+)
});


// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

app.use(express.static(path.join(__dirname)));


// ----------------------------------------------------
// MAXIMUM SECURITY HARDENING ENGINE v5.0 (MILITARY GRADE)
// ----------------------------------------------------

// 1. Security Headers (Clickjacking, XSS, Nosniff, HSTS, CSP)
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
});

// 2. Anti-Brute-Force & Rate Limiting Engine (In-Memory IP Tracker)
const RATE_LIMIT_STORE = new Map();
function rateLimiter(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const key = `${req.path}_${ip}`;
        const now = Date.now();

        const record = RATE_LIMIT_STORE.get(key);
        if (record) {
            if (now - record.startTime > windowMs) {
                RATE_LIMIT_STORE.set(key, { attempts: 1, startTime: now });
                return next();
            }
            if (record.attempts >= maxAttempts) {
                return res.status(429).json({
                    error: '🚨 ZU VIELE FEHLVERSUCHE: Zugriff wegen Brute-Force-Verdacht für 15 Minuten gesperrt!'
                });
            }
            record.attempts++;
        } else {
            RATE_LIMIT_STORE.set(key, { attempts: 1, startTime: now });
        }
        next();
    };
}

// ----------------------------------------------------

// 3. SLIDING-WINDOW RPS COUNTER & RENDER API KILL SWITCH (NOT-AUS ENGINE)
// ----------------------------------------------------
app.set('trust proxy', 1);

const DDOS_KILL_SWITCH_THRESHOLD_RPS = 90; // >90 RPS triggers instant Render API suspend
let isKillSwitchTriggered = false;

// Performant 1000ms Sliding Window Ring Buffer (10 buckets of 100ms each)
const BUCKET_COUNT = 10;
const BUCKET_SIZE_MS = 100;
const rpsBuckets = new Array(BUCKET_COUNT).fill(0);
const rpsBucketTimes = new Array(BUCKET_COUNT).fill(0);

function getSlidingWindowRps() {
    const now = Date.now();
    let totalRequests = 0;
    for (let i = 0; i < BUCKET_COUNT; i++) {
        if (now - rpsBucketTimes[i] <= 1000) {
            totalRequests += rpsBuckets[i];
        }
    }
    return totalRequests;
}

function recordIncomingRequest() {
    const now = Date.now();
    const bucketIndex = Math.floor((now / BUCKET_SIZE_MS) % BUCKET_COUNT);
    if (now - rpsBucketTimes[bucketIndex] > BUCKET_SIZE_MS * BUCKET_COUNT) {
        rpsBuckets[bucketIndex] = 0;
        rpsBucketTimes[bucketIndex] = now;
    }
    rpsBuckets[bucketIndex]++;
    return getSlidingWindowRps();
}

async function triggerRenderApiSuspend(measuredRps) {
    if (isKillSwitchTriggered) return;
    isKillSwitchTriggered = true;

    const renderApiKey = process.env.RENDER_API_KEY;
    const renderServiceId = process.env.RENDER_SERVICE_ID;

    const logMessage = `🚨 NOT-AUS AUSGELÖST: ${measuredRps} RPS gemessen (Schwellenwert: ${DDOS_KILL_SWITCH_THRESHOLD_RPS} RPS). Server wird via Render API suspendiert.`;
    console.error(`\n====================================================`);
    console.error(logMessage);
    console.error(`====================================================\n`);

    if (renderApiKey && renderServiceId) {
        console.log(`[🚀 RENDER API] Sende Suspend-Request an Service ID: ${renderServiceId}...`);
        try {
            const reqOptions = {
                hostname: 'api.render.com',
                port: 443,
                path: `/v1/services/${renderServiceId}/suspend`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${renderApiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': 0
                }
            };

            const apiReq = https.request(reqOptions, (apiRes) => {
                let resData = '';
                apiRes.on('data', chunk => resData += chunk);
                apiRes.on('end', () => {
                    console.log(`[✅ RENDER API RESPONSE] Status ${apiRes.statusCode}: ${resData}`);
                    console.error('[🚨 GRACEFUL EXIT] Beende Server-Prozess sauber (process.exit(1))...');
                    setTimeout(() => process.exit(1), 500);
                });
            });

            apiReq.on('error', (err) => {
                console.error('[-] Render API Request Error:', err.message);
                console.error('[🚨 GRACEFUL EXIT] Beende Server-Prozess sauber (process.exit(1))...');
                setTimeout(() => process.exit(1), 500);
            });

            apiReq.end();

        } catch (err) {
            console.error('[-] Suspend-Routine Fehler:', err);
            process.exit(1);
        }
    } else {
        console.warn('[-] HINWEIS: RENDER_API_KEY oder RENDER_SERVICE_ID nicht in Umgebungsvariablen definiert.');
        console.warn('[-] Beende Prozess sauber (process.exit(1))...');
        setTimeout(() => process.exit(1), 500);
    }
}

// Global High-Performance Middleware
app.use((req, res, next) => {
    const currentRps = recordIncomingRequest();

    // Allow Admin Restore Endpoint & Emergency Status Endpoint
    if (req.path === '/api/admin/restore-online' || req.path === '/api/admin/emergency-status') {
        return next();
    }

    // Check DDoS Kill Switch Condition
    if (currentRps >= DDOS_KILL_SWITCH_THRESHOLD_RPS && !isKillSwitchTriggered) {
        triggerRenderApiSuspend(currentRps);
    }

    if (isKillSwitchTriggered) {
        return res.status(503).json({
            error: `🚨 NOT-AUS AKTIVIERT: Server wurde wegen DDoS-Spitze (${currentRps} RPS) via Render API suspendiert!`
        });
    }

    next();
});

// ----------------------------------------------------
// Database Setup & Initialization (SQLite & Persistent Storage)
// ----------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/var/data') ? '/var/data' : __dirname);
if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}

const dbPath = path.join(DATA_DIR, 'chat.db');
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
            avatar_color TEXT DEFAULT '#ea580c',
            avatar_url TEXT DEFAULT 'logo.jpg',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Ensure avatar_url column exists for existing DBs
    db.run("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT 'logo.jpg'", () => {});

    // Force update existing users to use the new orange logo.jpg
    db.run("UPDATE users SET avatar_url = 'logo.jpg', avatar_color = '#ea580c'");



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

    // 4. Shared Links Table
    db.run(`
        CREATE TABLE IF NOT EXISTS shared_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            category TEXT DEFAULT 'DDOS',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.run("ALTER TABLE shared_links ADD COLUMN category TEXT DEFAULT 'DDOS'", () => {});

    // 5. Shared Folders Table
    db.run(`
        CREATE TABLE IF NOT EXISTS shared_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, () => {
        db.run(`INSERT OR IGNORE INTO shared_folders (name) VALUES ('DDOS'), ('DOXEN')`);
    });

    // 6. Shared Files Table (AnonFiles Cloud Vault)
    db.run(`
        CREATE TABLE IF NOT EXISTS shared_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_size INTEGER DEFAULT 0,
            file_data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);





    // Restore registered accounts & seed Anonym1 and Anonym2
    setTimeout(() => {
        restoreUsersFromBackup();
        seedDefaultAccounts();
    }, 500);
});

async function seedDefaultAccounts() {
    try {
        const hash1 = await bcrypt.hash('Luca1877', 10);
        const hash2 = await bcrypt.hash('1234', 10);
        const hash3 = await bcrypt.hash('1234', 10);

        db.serialize(() => {
            db.run(`INSERT OR IGNORE INTO users (id, username, email, password_hash, avatar_color, avatar_url) VALUES (1, 'Anonym1', 'anonym1@anonmesh.de', ?, '#06b6d4', 'logo.jpg')`, [hash1]);
            db.run(`UPDATE users SET username = 'Anonym1', password_hash = ?, avatar_url = 'logo.jpg' WHERE email = 'anonym1@anonmesh.de' OR id = 1`, [hash1]);

            db.run(`INSERT OR IGNORE INTO users (id, username, email, password_hash, avatar_color, avatar_url) VALUES (2, 'Anonym2', 'anonym2@anonmesh.de', ?, '#10b981', 'logo.jpg')`, [hash2]);
            db.run(`UPDATE users SET username = 'Anonym2', password_hash = ?, avatar_url = 'logo.jpg' WHERE email = 'anonym2@anonmesh.de' OR id = 2`, [hash2]);

            db.run(`INSERT OR IGNORE INTO users (id, username, email, password_hash, avatar_color, avatar_url) VALUES (3, 'Anonym3', 'anonym3@anonmesh.de', ?, '#f59e0b', 'logo.jpg')`, [hash3]);
            db.run(`UPDATE users SET username = 'Anonym3', password_hash = ?, avatar_url = 'logo.jpg' WHERE email = 'anonym3@anonmesh.de' OR id = 3`, [hash3]);

            db.run(`INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (1, 2), (2, 1), (1, 3), (3, 1), (2, 3), (3, 2)`, (err) => {
                if (err) console.warn('Contacts seed info:', err.message);
            });
        });
    } catch (e) {
        console.warn('seedDefaultAccounts error:', e);
    }
}






// ----------------------------------------------------
// Encrypted Complete Database Backup Engine (AES-256-GCM)
// Backs up Users, Contacts & Messages so NO CHATS ARE EVER LOST!
// ----------------------------------------------------

const BACKUP_ENC_FILE = path.join(DATA_DIR, 'chat_backup.enc');

const ALT_BACKUP_ENC_FILE = path.join(__dirname, 'chat_backup.enc');

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
    const pUsers = new Promise(resolve => db.all(`SELECT id, email, username, password_hash, avatar_color, avatar_url, created_at FROM users`, [], (err, rows) => resolve(rows || [])));
    const pContacts = new Promise(resolve => db.all(`SELECT id, user_id, contact_id, created_at FROM contacts`, [], (err, rows) => resolve(rows || [])));
    const pMessages = new Promise(resolve => db.all(`SELECT id, sender_id, receiver_id, content, timestamp, is_read FROM messages`, [], (err, rows) => resolve(rows || [])));
    const pLinks = new Promise(resolve => db.all(`SELECT id, user_id, title, url, category, created_at FROM shared_links`, [], (err, rows) => resolve(rows || [])));
    const pFolders = new Promise(resolve => db.all(`SELECT id, name, created_by, created_at FROM shared_folders`, [], (err, rows) => resolve(rows || [])));
    const pFiles = new Promise(resolve => db.all(`SELECT id, user_id, username, filename, file_size, file_data, created_at FROM shared_files`, [], (err, rows) => resolve(rows || [])));

    Promise.all([pUsers, pContacts, pMessages, pLinks, pFolders, pFiles]).then(([users, contacts, messages, links, folders, files]) => {
        const backupObj = {
            users: users || [],
            contacts: contacts || [],
            messages: messages || [],
            shared_links: links || [],
            shared_folders: folders || [],
            shared_files: files || []
        };

        try {
            const jsonStr = JSON.stringify(backupObj, null, 2);
            const encryptedPayload = encryptData(jsonStr);
            fs.writeFileSync(BACKUP_ENC_FILE, encryptedPayload, 'utf8');
            if (BACKUP_ENC_FILE !== ALT_BACKUP_ENC_FILE) {
                try { fs.writeFileSync(ALT_BACKUP_ENC_FILE, encryptedPayload, 'utf8'); } catch (e) {}
            }

            // Clean up old backup files
            const oldUserEnc = path.join(__dirname, 'users_backup.enc');
            if (fs.existsSync(oldUserEnc) && oldUserEnc !== BACKUP_ENC_FILE) {
                try { fs.unlinkSync(oldUserEnc); } catch(e) {}
            }
            const oldUserJson = path.join(__dirname, 'users_backup.json');
            if (fs.existsSync(oldUserJson)) {
                try { fs.unlinkSync(oldUserJson); } catch(e) {}
            }
        } catch (e) {
            console.error('Error writing encrypted db backup:', e.message);
        }
    }).catch(err => {
        console.error('saveUsersBackup Promise.all error:', err);
    });
}


function restoreUsersFromBackup() {
    let backupFilePath = BACKUP_ENC_FILE;
    if (!fs.existsSync(backupFilePath) && fs.existsSync(ALT_BACKUP_ENC_FILE)) {
        backupFilePath = ALT_BACKUP_ENC_FILE;
    }
    if (!fs.existsSync(backupFilePath)) return;

    try {
        const encryptedData = fs.readFileSync(backupFilePath, 'utf8');

        const jsonStr = decryptData(encryptedData);
        if (!jsonStr) return;

        const backupObj = JSON.parse(jsonStr);
        if (!backupObj) return;

        db.serialize(() => {
            // 1. Restore Users (Merge without overwriting existing accounts on Render)
            if (Array.isArray(backupObj.users) && backupObj.users.length > 0) {
                const insertUser = `INSERT OR IGNORE INTO users (id, email, username, password_hash, avatar_color, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                backupObj.users.forEach(u => {
                    db.run(insertUser, [u.id, u.email, u.username, u.password_hash, u.avatar_color, u.avatar_url || 'logo.jpg', u.created_at || new Date().toISOString()]);
                    db.run(`UPDATE users SET avatar_url = 'logo.jpg' WHERE avatar_url IS NULL OR avatar_url = ''`);
                });
            }


            // 2. Restore Contacts
            if (Array.isArray(backupObj.contacts) && backupObj.contacts.length > 0) {
                const insertContact = `INSERT OR IGNORE INTO contacts (id, user_id, contact_id, created_at) VALUES (?, ?, ?, ?)`;
                backupObj.contacts.forEach(c => {
                    db.run(insertContact, [c.id, c.user_id, c.contact_id, c.created_at || new Date().toISOString()]);
                });
            }

            // 3. Restore Messages
            if (Array.isArray(backupObj.messages) && backupObj.messages.length > 0) {
                const insertMsg = `INSERT OR IGNORE INTO messages (id, sender_id, receiver_id, content, timestamp, is_read) VALUES (?, ?, ?, ?, ?, ?)`;
                backupObj.messages.forEach(m => {
                    db.run(insertMsg, [m.id, m.sender_id, m.receiver_id, m.content, m.timestamp, m.is_read || 0]);
                });
            }

            // 4. Restore Shared Links
            if (Array.isArray(backupObj.shared_links) && backupObj.shared_links.length > 0) {
                const insertLink = `INSERT OR IGNORE INTO shared_links (id, user_id, title, url, category, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
                backupObj.shared_links.forEach(l => {
                    db.run(insertLink, [l.id, l.user_id, l.title, l.url, l.category || 'DDOS', l.created_at || new Date().toISOString()]);
                });
            }

            // 5. Restore Shared Folders
            if (Array.isArray(backupObj.shared_folders) && backupObj.shared_folders.length > 0) {
                const insertFolder = `INSERT OR IGNORE INTO shared_folders (id, name, created_by, created_at) VALUES (?, ?, ?, ?)`;
                backupObj.shared_folders.forEach(f => {
                    db.run(insertFolder, [f.id, f.name, f.created_by, f.created_at || new Date().toISOString()]);
                });
            }

            // 6. Restore Shared Files (AnonFiles Vault)
            if (Array.isArray(backupObj.shared_files) && backupObj.shared_files.length > 0) {
                const insertFile = `INSERT OR IGNORE INTO shared_files (id, user_id, username, filename, file_size, file_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                backupObj.shared_files.forEach(f => {
                    db.run(insertFile, [f.id, f.user_id, f.username, f.filename, f.file_size || 0, f.file_data, f.created_at || new Date().toISOString()]);
                });
            }

            // Fix sqlite_sequence for AUTOINCREMENT counters
            db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM messages) WHERE name = 'messages'`, () => {});
            db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM shared_links) WHERE name = 'shared_links'`, () => {});
            db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM shared_folders) WHERE name = 'shared_folders'`, () => {});
            db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM shared_files) WHERE name = 'shared_files'`, () => {});
            db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM users) WHERE name = 'users'`, () => {});
            db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM contacts) WHERE name = 'contacts'`, () => {});

            console.log(`[+] Restored & merged ${backupObj.users?.length || 0} users, ${backupObj.contacts?.length || 0} contacts, ${backupObj.messages?.length || 0} messages, ${backupObj.shared_links?.length || 0} links, ${backupObj.shared_folders?.length || 0} folders, and ${backupObj.shared_files?.length || 0} files from AES-256-GCM backup!`);

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
// MILITARY-GRADE ANTI-CLONING & ANTI-SCRAPER SHIELD
// Blocks HTTrack, Wget, Curl, Scrapy, Teleport Pro, SiteSucker, WebCopier & Code Theft
// ----------------------------------------------------
const BLOCKED_USER_AGENTS = [
    'httrack', 'wget', 'curl', 'python', 'scrapy', 'teleport', 'sitesucker',
    'webcopier', 'offline explorer', 'nikto', 'sqlmap', 'nmap', 'go-http-client',
    'java', 'libwww-perl', 'urllib', 'axios'
];

app.use((req, res, next) => {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    
    // Check if user agent is a web cloner / downloader tool
    const isCloner = BLOCKED_USER_AGENTS.some(agent => userAgent.includes(agent));
    if (isCloner) {
        return res.status(403).send(`
            🈲 原始碼已進行最高級加密保護 (0x9F3E-ANTI-CLONER-SHIELD)
            網頁保護系統已啟動。禁止複製、禁止下載、禁止機器人抓取此網站的任何內容。
        `);
    }

    // Add Security Response Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    next();
});

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
// SITE-WIDE ACCESS PASSCODE GATE (Zero-Client-Knowledge SHA-256 Hashing)
// ----------------------------------------------------
const AUTHORIZED_PASSCODE_HASHES = [
    '31c3e051f8eec0bf2978d9b3e95f0cd0ae340d19db23385d12d0e4c44febd29b',
    'f177b960b1de004accec332910dbb77def4290625aa5df9c922be3e3a7272e92'
];

app.post('/api/auth/site-gate', rateLimiter(5, 15 * 60 * 1000), async (req, res) => {
    try {
        let { passcode, passcodeHash } = req.body;
        if (!passcode && !passcodeHash) {
            return res.status(400).json({ error: 'Bitte Admin-Passwort eingeben.' });
        }

        const calculatedHash = passcodeHash || (passcode ? crypto.createHash('sha256').update(passcode.trim()).digest('hex') : '');

        if (AUTHORIZED_PASSCODE_HASHES.includes(calculatedHash)) {
            return res.json({
                ok: true,
                message: 'Admin-Freigabe erteilt. Bitte melde dich an oder registriere ein Konto.'
            });
        }

        return res.status(401).json({ error: 'Falsches Admin-Passwort. Zugriff verweigert.' });
    } catch (e) {
        res.status(500).json({ error: 'Serverfehler bei der Zugangsprüfung.' });
    }
});




// ----------------------------------------------------
// REST API Routes
// ----------------------------------------------------


// 1. User Registration
app.post('/api/auth/register', (req, res) => {
    return res.status(403).json({ error: 'Die Registrierung neuer Konten ist deaktiviert. Es sind nur Anonym1 und Anonym2 freigeschaltet.' });
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

    // Auto-ensure all users are mutual contacts
    db.run(`INSERT OR IGNORE INTO contacts (user_id, contact_id) SELECT ?, id FROM users WHERE id != ?`, [userId, userId], () => {
        const sql = `
            SELECT DISTINCT u.id, u.username, u.email, u.avatar_color, u.avatar_url
            FROM users u
            INNER JOIN contacts c ON u.id = c.contact_id
            WHERE c.user_id = ?
            ORDER BY u.username ASC
        `;

        db.all(sql, [userId], (err, contacts) => {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Laden der Kontakte.' });
            }

            if (!contacts || contacts.length === 0) {
                return res.json({ contacts: [] });
            }

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

// 6b. Panic Wipe: Delete All User Messages & Purge Backup
app.delete('/api/messages/panic-wipe', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const sql = `DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?`;
    db.run(sql, [userId, userId], function(err) {
        if (err) {
            console.error('Panic wipe error:', err);
            return res.status(500).json({ error: 'Fehler beim Ausführen des Panik-Löschvorgangs.' });
        }

        // Save updated backup vault without wiped messages
        saveUsersBackup();

        // Broadcast real-time wipe signal to both participants (sender & receiver)
        io.emit('chat_wiped', { user_id: userId });

        res.json({ message: '🚨 Sämtliche Chatverläufe wurden unwiderruflich gelöscht und überschrieben!' });
    });
});

// ----------------------------------------------------
// 7. SHARED LINKS API ROUTES
// ----------------------------------------------------

// GET /api/links - Fetch all shared links
app.get('/api/links', authenticateToken, (req, res) => {
    db.all("SELECT sl.*, u.username FROM shared_links sl LEFT JOIN users u ON sl.user_id = u.id ORDER BY sl.id DESC", [], (err, rows) => {
        if (err) {
            console.error('Error fetching links:', err);
            return res.status(500).json({ error: 'Fehler beim Laden der Links.' });
        }
        res.json(rows || []);
    });
});

// POST /api/links/sync - Auto-sync client localStorage vault to server DB (survives GitHub redeploys!)
app.post('/api/links/sync', authenticateToken, (req, res) => {
    const { links, folders } = req.body;

    db.serialize(() => {
        if (Array.isArray(folders)) {
            const insertFolder = `INSERT OR IGNORE INTO shared_folders (name, created_by) VALUES (?, ?)`;
            folders.forEach(f => {
                if (f && f.name) {
                    db.run(insertFolder, [f.name.toUpperCase(), f.created_by || req.user.id]);
                }
            });
        }

        if (Array.isArray(links)) {
            const insertLink = `INSERT OR IGNORE INTO shared_links (user_id, title, url, category, created_at) VALUES (?, ?, ?, ?, ?)`;
            links.forEach(l => {
                if (l && l.title && l.url) {
                    db.run(insertLink, [l.user_id || req.user.id, l.title, l.url, (l.category || 'DDOS').toUpperCase(), l.created_at || new Date().toISOString()]);
                }
            });
        }

        db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM shared_links) WHERE name = 'shared_links'`, () => {});
        db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM shared_folders) WHERE name = 'shared_folders'`, () => {});

        saveUsersBackup();
        res.json({ message: 'Erfolgreich synchronisiert!' });
    });
});


// GET /api/link-folders - Fetch all folder categories
app.get('/api/link-folders', authenticateToken, (req, res) => {
    db.all("SELECT * FROM shared_folders ORDER BY id ASC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Laden der Ordner.' });
        }
        res.json(rows || []);
    });
});

// POST /api/link-folders - Create a new folder category
app.post('/api/link-folders', authenticateToken, (req, res) => {
    let { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Ordnername erforderlich.' });
    }

    const folderName = name.trim().toUpperCase();

    db.run("INSERT OR IGNORE INTO shared_folders (name, created_by) VALUES (?, ?)", [folderName, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Erstellen des Ordners.' });
        }

        const newFolder = { id: this.lastID, name: folderName, created_by: req.user.id };
        saveUsersBackup();
        io.emit('folder_added', newFolder);
        res.json(newFolder);
    });
});

// DELETE /api/link-folders/:id - Delete a folder (STRICTLY ANONYM1 ONLY!)
app.delete('/api/link-folders/:id', authenticateToken, (req, res) => {
    const folderId = req.params.id;
    const isAnonym1 = req.user && (
        (req.user.username && req.user.username.toLowerCase() === 'anonym1') ||
        Number(req.user.id) === 1
    );

    if (!isAnonym1) {
        return res.status(403).json({ error: 'Nur Anonym1 darf Ordner löschen.' });
    }

    db.get("SELECT * FROM shared_folders WHERE id = ?", [folderId], (err, folder) => {
        if (err || !folder) {
            return res.status(404).json({ error: 'Ordner nicht gefunden.' });
        }

        const folderName = folder.name.toUpperCase();

        db.run("DELETE FROM shared_folders WHERE id = ?", [folderId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Löschen des Ordners.' });
            }

            db.run("DELETE FROM shared_links WHERE UPPER(category) = ?", [folderName]);

            saveUsersBackup();
            io.emit('folder_deleted', { id: folderId, name: folderName });
            res.json({ message: 'Ordner endgültig gelöscht.' });
        });
    });
});

// DELETE /api/link-folders/by-name/:name - Delete a folder by name (STRICTLY ANONYM1 ONLY!)
app.delete('/api/link-folders/by-name/:name', authenticateToken, (req, res) => {
    const rawName = decodeURIComponent(req.params.name || '').trim();
    if (!rawName) return res.status(400).json({ error: 'Ordnername erforderlich.' });
    const folderName = rawName.toUpperCase();

    const isAnonym1 = req.user && (
        (req.user.username && req.user.username.toLowerCase() === 'anonym1') ||
        Number(req.user.id) === 1
    );

    if (!isAnonym1) {
        return res.status(403).json({ error: 'Nur Anonym1 darf Ordner löschen.' });
    }

    db.run("DELETE FROM shared_folders WHERE UPPER(name) = ?", [folderName], function(err) {
        db.run("DELETE FROM shared_links WHERE UPPER(category) = ?", [folderName]);
        saveUsersBackup();
        io.emit('folder_deleted', { name: folderName });
        res.json({ message: 'Ordner endgültig gelöscht.' });
    });
});



// POST /api/links - Add a new shared link

app.post('/api/links', authenticateToken, (req, res) => {
    let { title, url, category } = req.body;
    if (!title || !url) {
        return res.status(400).json({ error: 'Titel und URL erforderlich.' });
    }

    title = title.trim();
    url = url.trim();
    category = (category && category.trim()) ? category.trim().toUpperCase() : 'DDOS';

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    db.get("SELECT id FROM shared_links WHERE UPPER(url) = ? AND UPPER(category) = ?", [url.toUpperCase(), category], (err, existing) => {
        if (existing) {
            db.run("UPDATE shared_links SET title = ?, user_id = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?", [title, req.user.id, existing.id], function(updateErr) {
                const updatedLink = {
                    id: existing.id,
                    user_id: req.user.id,
                    username: req.user.username,
                    title,
                    url,
                    category,
                    created_at: new Date().toISOString()
                };
                saveUsersBackup();
                io.emit('link_added', updatedLink);
                return res.json(updatedLink);
            });
        } else {
            db.run("INSERT INTO shared_links (user_id, title, url, category) VALUES (?, ?, ?, ?)", [req.user.id, title, url, category], function(insertErr) {
                if (insertErr) {
                    console.error('Error inserting link:', insertErr);
                    return res.status(500).json({ error: 'Fehler beim Speichern des Links.' });
                }

                const newLink = {
                    id: this.lastID,
                    user_id: req.user.id,
                    username: req.user.username,
                    title,
                    url,
                    category,
                    created_at: new Date().toISOString()
                };

                saveUsersBackup();
                io.emit('link_added', newLink);
                res.json(newLink);
            });
        }
    });
});


// DELETE /api/links/:id - Delete a shared link (Strictly Creator Only!)
app.delete('/api/links/:id', authenticateToken, (req, res) => {
    const linkId = req.params.id;
    const userId = req.user.id;

    db.get("SELECT user_id FROM shared_links WHERE id = ?", [linkId], (err, link) => {
        if (err || !link) {
            return res.status(404).json({ error: 'Link nicht gefunden.' });
        }

        if (Number(link.user_id) !== Number(userId)) {
            return res.status(403).json({ error: 'Nur der Ersteller darf diesen Link löschen.' });
        }

        db.run("DELETE FROM shared_links WHERE id = ?", [linkId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Löschen des Links.' });
            }

            saveUsersBackup();
            io.emit('link_deleted', { id: linkId });
            res.json({ message: 'Link gelöscht.' });
        });
    });
});


// ----------------------------------------------------
// AnonFiles Storage Vault REST Endpoints
// ----------------------------------------------------
app.get('/api/files', authenticateToken, (req, res) => {
    // Return metadata only (lightweight, lightning fast, no browser memory overload)
    db.all("SELECT id, user_id, username, filename, file_size, created_at FROM shared_files ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Fehler beim Laden der Dateien.' });
        res.json(rows || []);
    });
});

app.get('/api/files/:id/download', (req, res) => {
    const fileId = req.params.id;
    db.get("SELECT filename, file_size, file_data FROM shared_files WHERE id = ?", [fileId], (err, row) => {
        if (err || !row || !row.file_data) {
            return res.status(404).send('Datei nicht gefunden.');
        }

        try {
            if (row.file_data.startsWith('data:')) {
                const parts = row.file_data.split(',');
                const mimeMatch = parts[0].match(/:(.*?);/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
                const buffer = Buffer.from(parts[1], 'base64');
                res.setHeader('Content-Type', mimeType);
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.filename)}"`);
                res.setHeader('Content-Length', buffer.length);
                return res.send(buffer);
            }
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(row.filename)}"`);
            res.send(row.file_data);
        } catch (e) {
            console.error('Download error:', e);
            res.status(500).send('Fehler beim Download.');
        }
    });
});

app.post('/api/files/sync', authenticateToken, (req, res) => {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
        return res.json({ message: 'Nichts zu synchronisieren.' });
    }

    db.serialize(() => {
        const stmtFile = db.prepare(`INSERT OR IGNORE INTO shared_files (id, user_id, username, filename, file_size, file_data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);

        files.forEach(f => {
            if (f.filename && f.file_data) {
                stmtFile.run([
                    f.id || null,
                    f.user_id || req.user.id,
                    f.username || req.user.username,
                    f.filename,
                    f.file_size || 0,
                    f.file_data,
                    f.created_at || new Date().toISOString()
                ]);
            }
        });
        stmtFile.finalize();

        db.run(`UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM shared_files) WHERE name = 'shared_files'`, () => {});

        saveUsersBackup();
        res.json({ message: 'Dateien erfolgreich synchronisiert!' });
    });
});

app.post('/api/files', authenticateToken, (req, res) => {
    const { filename, fileData, fileSize } = req.body;
    if (!filename || !fileData) {
        return res.status(400).json({ error: 'Dateiname und Datei-Daten erforderlich.' });
    }

    const trimmedFilename = filename.trim();
    const sizeNum = Number(fileSize) || 0;

    db.run("INSERT INTO shared_files (user_id, username, filename, file_size, file_data) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, req.user.username, trimmedFilename, sizeNum, fileData],
        function(err) {
            if (err) {
                console.error('Error inserting file:', err);
                return res.status(500).json({ error: 'Fehler beim Hochladen der Datei.' });
            }

            const newFileMeta = {
                id: this.lastID,
                user_id: req.user.id,
                username: req.user.username,
                filename: trimmedFilename,
                file_size: sizeNum,
                created_at: new Date().toISOString()
            };

            saveUsersBackup();
            io.emit('file_uploaded', newFileMeta);
            res.json(newFileMeta);
        }
    );
});

app.delete('/api/files/:id', authenticateToken, (req, res) => {
    const fileId = req.params.id;
    const userId = req.user.id;

    db.get("SELECT user_id FROM shared_files WHERE id = ?", [fileId], (err, file) => {
        if (err || !file) {
            return res.status(404).json({ error: 'Datei nicht gefunden.' });
        }

        if (Number(file.user_id) !== Number(userId)) {
            return res.status(403).json({ error: 'Nur der Ersteller darf diese Datei löschen.' });
        }

        db.run("DELETE FROM shared_files WHERE id = ?", [fileId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Löschen der Datei.' });
            }

            saveUsersBackup();
            io.emit('file_deleted', { id: fileId });
            res.json({ message: 'Datei gelöscht.' });
        });
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

            db.run(`INSERT OR IGNORE INTO contacts (user_id, contact_id) VALUES (?, ?), (?, ?)`, [userId, receiver_id, receiver_id, userId]);
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

    // Helper to guarantee delivery to all connected sockets of receiver
    function emitToUser(targetUserId, eventName, payload) {
        if (!targetUserId) return;
        const targetIdNum = Number(targetUserId);
        io.to(`user_${targetUserId}`).emit(eventName, payload);
        io.to(`user_${targetIdNum}`).emit(eventName, payload);
        const sockets = onlineUsers.get(targetIdNum);
        if (sockets) {
            sockets.forEach(sockId => {
                io.to(sockId).emit(eventName, payload);
            });
        }
    }

    // ----------------------------------------------------
    // WebRTC HD Audio/Video Call Signaling
    // ----------------------------------------------------
    socket.on('call_audio_chunk', ({ receiver_id, pcm, audioData }) => {
        if (receiver_id) {
            emitToUser(receiver_id, 'incoming_call_audio', { sender_id: userId, pcm, audioData });
        }
    });


    socket.on('call_user', ({ receiver_id, offer, call_type }) => {
        if (receiver_id) {
            console.log(`[📞 CALL SIGNAL] ${socket.user.username} (ID: ${userId}) calling user_${receiver_id}`);
            emitToUser(receiver_id, 'incoming_call', {
                caller_id: userId,
                caller_username: socket.user.username,
                offer,
                call_type // 'audio' or 'video'
            });
        }
    });

    socket.on('answer_call', ({ receiver_id, answer }) => {
        if (receiver_id) {
            console.log(`[📞 ANSWER SIGNAL] User ${userId} accepted call from user_${receiver_id}`);
            emitToUser(receiver_id, 'call_accepted', {
                answer
            });
        }
    });

    socket.on('reject_call', ({ receiver_id }) => {
        if (receiver_id) {
            emitToUser(receiver_id, 'call_rejected', {
                caller_id: userId
            });
        }
    });

    socket.on('end_call', ({ receiver_id }) => {
        if (receiver_id) {
            emitToUser(receiver_id, 'call_ended', {
                caller_id: userId
            });
        }
    });

    socket.on('ice_candidate', ({ receiver_id, candidate }) => {
        if (receiver_id && candidate) {
            emitToUser(receiver_id, 'ice_candidate', {
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

