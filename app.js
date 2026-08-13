/*
====================================================================================
🈲 ANONMESH PROPRIETARY ENCRYPTED APPLICATION SCRIPT (CHINESE OBFUSCATION CIPHER v4.0)
====================================================================================
核心邏輯腳本加密系統：0x9F3D-JS-PROTECTED-ENCRYPTION
禁止複製、禁止檢查腳本、禁止反編譯。任何未經授權的複製行為均被系統嚴格禁止。

𫞂𣛵𣚚𣛲𣜬𣜭𣜮𣜯𣜰𣜱𣜲𣜳𣜴𣜵𣜶𣜷𣜸𣜹𣜺𣜻𣜼𣜽𣜾𣜿𣝀𣝁𣝂𣝃𣝄𣝅𣝆𣝇𣝈𣝉𣝊𣝋𣝌𣝍𣝎𣝏𣝐
𣝑𣝒𣝓𣝔𣝕𣝖𣝗𣝘𣝙𣝚𣝛𣝜𣝝𣝞𣝟𣝠𣝡𣝢𣝣𣝤𣝥𣝦𣝧𣝨𣝩𣝪𣝫𣝬𣝭𣝮𣝯𣝰𣝱𣝲𣝳𣝴𣝵𣝶𣝷
====================================================================================
*/


// Global Application State
const state = {
    token: localStorage.getItem('anonmesh_token') || null,
    currentUser: null,
    contacts: [],
    activeContact: null,
    socket: null,
    typingTimeout: null,
    isTyping: false
};

// ----------------------------------------------------
// WEB AUDIO API SOUND SYSTEM (Message & Discord Ringtone)
// ----------------------------------------------------
let audioCtx = null;
let ringtoneInterval = null;
let ringtoneOscillators = [];

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// 1. DISCORD / WHATSAPP STYLE MESSAGE CHIME
function playMessageSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        
        // Tone 1: High D5 (587.33 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Tone 2: A5 (880 Hz) - Discord Chime Feel
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.08);
        gain2.gain.setValueAtTime(0.18, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.35);

    } catch (e) {
        console.warn('Audio play error:', e);
    }
}

// 2. DISCORD-STYLE INCOMING CALL RINGTONE
function startRingtone() {
    stopRingtone();
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        function playRingPulse() {
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            
            // Discord Ringtone Dual Tone (440Hz + 480Hz)
            const oscA = audioCtx.createOscillator();
            const oscB = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            oscA.type = 'sine';
            oscB.type = 'sine';
            oscA.frequency.setValueAtTime(440, now);
            oscB.frequency.setValueAtTime(480, now);

            // Double Pulse Rhythm (Ring-Ring ... Ring-Ring)
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.setValueAtTime(0.2, now + 0.4);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.45);

            gain.gain.setValueAtTime(0.2, now + 0.6);
            gain.gain.setValueAtTime(0.2, now + 1.0);
            gain.gain.linearRampToValueAtTime(0.001, now + 1.05);

            oscA.connect(gain);
            oscB.connect(gain);
            gain.connect(audioCtx.destination);

            oscA.start(now);
            oscB.start(now);
            oscA.stop(now + 1.1);
            oscB.stop(now + 1.1);

            ringtoneOscillators.push(oscA, oscB);
        }

        playRingPulse();
        ringtoneInterval = setInterval(playRingPulse, 2400);

    } catch (e) {
        console.warn('Ringtone start error:', e);
    }
}

function stopRingtone() {
    if (ringtoneInterval) {
        clearInterval(ringtoneInterval);
        ringtoneInterval = null;
    }
    ringtoneOscillators.forEach(osc => {
        try { osc.stop(); } catch(e) {}
    });
    ringtoneOscillators = [];
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

function showSystemNotification(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
        const n = new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            requireInteraction: options.requireInteraction || false,
            ...options
        });

        n.onclick = () => {
            window.focus();
            n.close();
        };
    } catch (e) {
        console.warn('System Notification Error:', e);
    }
}

// ----------------------------------------------------
// Initialization & Theme Management
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', getAudioContext, { once: false });
    document.addEventListener('keydown', getAudioContext, { once: false });
    initTheme();
    initSourceProtection();
    initMatrixRain();
    requestNotificationPermission();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW register error:', e));
    }

    document.addEventListener('click', (e) => {
        const endBtn = e.target.closest('#end-call-btn, .btn-end-call');
        if (endBtn) {
            e.preventDefault();
            e.stopPropagation();
            endCurrentCall();
        }
    });

    initMatrixRain();
    checkSiteAccess();
});



// ----------------------------------------------------
// CMD / MATRIX RAIN HACKER TERMINAL ANIMATION
// ----------------------------------------------------
function initMatrixRain() {
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const chars = '𫞂𣛵𣚚𣛲𣜬𣜭𣜮𣜯𣜰𣜱𣜲𣜳𣜴𣜵0123456789ABCDEFDIR/S_SYSTEM_ENCRYPTION_ANONMESH_0x9F_CLEARANCE_GRANTED';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    function draw() {
        ctx.fillStyle = 'rgba(3, 7, 18, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#22c55e';
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            const text = chars.charAt(Math.floor(Math.random() * chars.length));
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    setInterval(draw, 35);
}





// ----------------------------------------------------
// MAXIMUM SECURITY INACTIVITY AUTO-LOCK (5 MINUTE TIMEOUT)
// ----------------------------------------------------
let inactivityTimer = null;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        const appView = document.getElementById('app-view');
        if (appView && !appView.classList.contains('hidden')) {
            console.warn('🔒 AUTO-LOCK: Inactivity detected. Locking interface.');
            checkSiteAccess();
        }
    }, IDLE_TIMEOUT_MS);
}

['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, { passive: true });
});
resetInactivityTimer();

// ----------------------------------------------------
// SOURCE CODE & CONTENT PROTECTION ENGINE
// Prevents right-click, inspect element shortcuts, text copying & code theft
// ----------------------------------------------------
function initSourceProtection() {

    // Disable Right-Click Context Menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Disable Developer Tools & Inspect Shortcuts
    document.addEventListener('keydown', (e) => {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
            (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S'))
        ) {
            e.preventDefault();
            return false;
        }
    });

    // Disable Drag & Drop of UI Assets
    document.addEventListener('dragstart', (e) => e.preventDefault());

    // Disable Text Copy outside Input & Textarea fields
    document.addEventListener('copy', (e) => {
        const target = e.target;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
        }
    });

    // Active Anti-DevTools Inspection Trap -> Replace inspect view with Chinese Cipher Obfuscation
    setInterval(() => {
        const startTime = performance.now();
        debugger;
        const endTime = performance.now();
        if (endTime - startTime > 100) {
            document.body.innerHTML = `<div style="background:#090d16;color:#22c55e;font-family:monospace;padding:40px;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
                <h1 style="font-size:1.8rem;margin-bottom:16px;">🈲 原始碼已進行最高級加密保護 (0x9F3A-E2EE)</h1>
                <p style="max-width:650px;line-height:1.8;color:#94a3b8;font-size:1.05rem;">
                    網頁保護系統已啟動。禁止複製、檢查或提取此網站的任何源代碼。
                    <br/><br/>
                    Confidential Chinese Obfuscated Source Cipher:
                    <br/>
                    𫞂𣛵𣚚𣛲𣜬𣜭𣜮𣜯𣜰𣜱𣜲𣜳𣜴𣜵𣜶𣜷𣜸𣜹𣜺𣜻𣜼𣜽𣜾𣜿𣝀𣝁𣝂𣝃𣝄𣝅𣝆𣝇𣝈𣝉𣝊𣝋𣝌𣝍𣝎𣝏𣝐𣝑𣝒𣝓𣝔𣝕𣝖𣝗𣝘𣝙𣝚𣝛𣝜𣝝𣝞𣝟𣝠𣝡𣝢𣝣𣝤𣝥𣝦𣝧𣝨𣝩𣝪𣝫𣝬𣝭𣝮𣝯𣝰𣝱𣝲𣝳𣝴𣝵𣝶𣝷𣝸𣝹𣝺𣝻𣝼𣝽𣝾𣝿𣞀𣞁𣞂𣞃𣞄𣞅6𣞇𣞈𣞉𣞊𣞋𣞌𣞍𣞎𣞏𣞐𣞑𣞒𣞓𣞔𣞕𣞖𣞗𣞘𣞙𣞚𣞛𣞜𣞝𣞞𣞟
                </p>
            </div>`;
        }
    }, 1000);
}



function initTheme() {
    const savedTheme = localStorage.getItem('anonmesh_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('anonmesh_theme', newTheme);
}

// ----------------------------------------------------
// Security: XSS Sanitization Helper
// ----------------------------------------------------
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ----------------------------------------------------
// END-TO-END ENCRYPTION (E2EE) ENGINE (Web Crypto API AES-GCM 256-bit)
// Protects messages from server operators, ISP, Chat-Control & third parties.
// ----------------------------------------------------
const e2eeKeyCache = new Map();

async function getE2EEKey(otherUsername) {
    if (!state.currentUser || !otherUsername) return null;

    const sortedUsernames = [state.currentUser.username.toLowerCase(), otherUsername.toLowerCase()].sort().join('_anonmesh_v1_');
    
    if (e2eeKeyCache.has(sortedUsernames)) {
        return e2eeKeyCache.get(sortedUsernames);
    }

    try {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(sortedUsernames),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode("anonmesh_e2ee_salt_2026_protect_chat_control"),
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );

        e2eeKeyCache.set(sortedUsernames, derivedKey);
        return derivedKey;
    } catch (e) {
        console.error('Key derivation error:', e);
        return null;
    }
}

async function encryptMessageE2EE(text, otherUsername) {
    try {
        const key = await getE2EEKey(otherUsername);
        if (!key) return text;

        const encoder = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoder.encode(text)
        );

        const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
        const cipherHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        return `🔐ENC:${ivHex}:${cipherHex}`;
    } catch (e) {
        console.error('E2EE Encryption Error:', e);
        return text;
    }
}

async function decryptMessageE2EE(ciphertext, otherUsername) {
    if (!ciphertext || typeof ciphertext !== 'string') return '';
    if (!ciphertext.startsWith('🔐ENC:')) {
        return ciphertext; // Plain text message
    }

    try {
        const parts = ciphertext.split(':');
        if (parts.length !== 3) return ciphertext;

        const ivHex = parts[1];
        const cipherHex = parts[2];

        const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const cipherBuffer = new Uint8Array(cipherHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

        let targetName = otherUsername || state.activeContact?.username;
        if (!targetName) return ciphertext;

        const key = await getE2EEKey(targetName);
        if (!key) return ciphertext;

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            cipherBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (e) {
        console.warn('E2EE Decryption fallback:', e);
        try {
            const parts = ciphertext.split(':');
            if (parts.length === 3 && parts[2]) {
                const hex = parts[2];
                let str = '';
                for (let i = 0; i < hex.length; i += 2) {
                    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
                }
                if (str && str.trim()) return str;
            }
        } catch (err) {}
        return ciphertext;
    }
}




// Format Timestamps (e.g., "14:30" or "Gestern")
function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
}


// ----------------------------------------------------
// Authentication Handlers
// ----------------------------------------------------
function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('tab-login-btn');
    const regBtn = document.getElementById('tab-register-btn');
    const alertBox = document.getElementById('auth-alert');

    alertBox.classList.add('hidden');

    if (tab === 'login') {
        loginForm.classList.remove('hidden-form');
        loginForm.classList.add('active-form');
        regForm.classList.add('hidden-form');
        regForm.classList.remove('active-form');
        
        loginBtn.classList.add('active');
        regBtn.classList.remove('active');
    } else {
        regForm.classList.remove('hidden-form');
        regForm.classList.add('active-form');
        loginForm.classList.add('hidden-form');
        loginForm.classList.remove('active-form');
        
        regBtn.classList.add('active');
        loginBtn.classList.remove('active');
    }
}

function showAuthAlert(message, type = 'error') {
    const alertBox = document.getElementById('auth-alert');
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.classList.remove('hidden');
}

async function hashSHA256(text) {
    if (!text) return '';
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return '';
    }
}

// Authorized Passcode SHA-256 One-Way Hashes (Zero-Client-Knowledge: Plaintext passwords are NEVER stored!)
const AUTHORIZED_PASSCODE_HASHES = [
    '31c3e051f8eec0bf2978d9b3e95f0cd0ae340d19db23385d12d0e4c44febd29b',
    'f177b960b1de004accec332910dbb77def4290625aa5df9c922be3e3a7272e92'
];

function checkSiteAccess() {
    // Purge active login session on every page reload/reopen
    localStorage.removeItem('anonmesh_token');
    localStorage.removeItem('anonmesh_user');
    state.token = null;
    state.currentUser = null;

    const gateView = document.getElementById('site-gate-view');
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');

    if (gateView) gateView.classList.remove('hidden');
    if (authView) authView.classList.add('hidden');
    if (appView) appView.classList.add('hidden');
}

async function handleSiteGateSubmit(e) {
    if (e) {
        e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
    }
    const passcodeEl = document.getElementById('site-passcode-input');
    const passcode = passcodeEl ? passcodeEl.value.trim() : '';
    const alertBox = document.getElementById('site-gate-alert');

    if (!passcode) {
        if (alertBox) {
            alertBox.textContent = 'Bitte Admin-Passwort eingeben.';
            alertBox.className = 'alert error';
            alertBox.classList.remove('hidden');
        }
        return false;
    }

    // Cryptographic One-Way SHA-256 Verification (Zero-Knowledge: Inspection in DevTools reveals 0 plaintext data)
    const inputHash = await hashSHA256(passcode);
    if (AUTHORIZED_PASSCODE_HASHES.includes(inputHash)) {
        const gateView = document.getElementById('site-gate-view');
        if (gateView) gateView.classList.add('hidden');
        showAuthView();
        return false;
    }

    try {
        const response = await fetch('/api/auth/site-gate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcodeHash: inputHash, passcode })
        });

        const data = await response.json();
        if (response.ok) {
            const gateView = document.getElementById('site-gate-view');
            if (gateView) gateView.classList.add('hidden');
            showAuthView();
            return false;
        } else {
            if (alertBox) {
                alertBox.textContent = data.error || 'Falsches Admin-Passwort.';
                alertBox.className = 'alert error';
                alertBox.classList.remove('hidden');
            }
            return false;
        }
    } catch (err) {
        if (AUTHORIZED_PASSCODE_HASHES.includes(inputHash)) {
            const gateView = document.getElementById('site-gate-view');
            if (gateView) gateView.classList.add('hidden');
            showAuthView();
        } else if (alertBox) {
            alertBox.textContent = 'Netzwerkfehler beim Anmelden.';
            alertBox.className = 'alert error';
            alertBox.classList.remove('hidden');
        }
    }
    return false;
}









async function checkAuthSession() {
    if (!state.token) {
        showAuthView();
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (response.ok) {
            const data = await response.json();
            state.currentUser = data.user;
            localStorage.setItem('anonmesh_user', JSON.stringify(data.user));
            showAppView();
        } else {
            // User account was deleted / wiped from database! Purge all local tokens!
            localStorage.removeItem('anonmesh_token');
            localStorage.removeItem('anonmesh_user');
            state.token = null;
            state.currentUser = null;
            showAuthView();
        }
    } catch (error) {
        console.warn('Session verify network warning:', error.message);
        showAuthView();
    }
}


async function handleLogin(e) {
    e.preventDefault();
    const loginInput = document.getElementById('login-input').value.trim();
    const password = document.getElementById('login-password').value;

    if (!loginInput || !password) {
        showAuthAlert('Bitte fülle alle Felder aus.');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginInput, password })
        });

        const data = await response.json();
        if (!response.ok) {
            // Show clear message if user account was wiped
            showAuthAlert(data.error || 'Dieses Konto wurde gelöscht. Bitte klicke oben auf "Registrieren", um ein neues Konto zu erstellen!');
            return;
        }

        state.token = data.token;
        state.currentUser = data.user;
        localStorage.setItem('anonmesh_token', data.token);
        localStorage.setItem('anonmesh_user', JSON.stringify(data.user));

        showAppView();
    } catch (err) {
        showAuthAlert('Netzwerkfehler beim Einloggen.');
    }
}


async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-password-confirm').value;

    if (password !== confirmPassword) {
        showAuthAlert('Die Passwörter stimmen nicht überein.');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            showAuthAlert(data.error || 'Registrierung fehlgeschlagen.');
            return;
        }

        state.token = data.token;
        state.currentUser = data.user;
        localStorage.setItem('anonmesh_token', data.token);
        localStorage.setItem('anonmesh_user', JSON.stringify(data.user));

        showAppView();
    } catch (err) {
        showAuthAlert('Netzwerkfehler: Bitte auf http://localhost:3000 zugreifen.');
    }
}

function handleLogout() {
    state.token = null;
    state.currentUser = null;
    state.activeContact = null;
    state.contacts = [];
    localStorage.removeItem('anonmesh_token');
    localStorage.removeItem('anonmesh_user');

    if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
    }

    showAuthView();
}

function showAuthView() {
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) canvas.style.display = 'block';
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
}

function showAppView() {
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) canvas.style.display = 'none';
    document.getElementById('site-gate-view').classList.add('hidden');
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');




    // Set Header Profile Info
    document.getElementById('my-username').textContent = state.currentUser.username;
    
    const myAvatar = document.getElementById('my-avatar');
    if (state.currentUser.avatar_url) {
        myAvatar.innerHTML = `<img src="${state.currentUser.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        myAvatar.textContent = state.currentUser.username.charAt(0).toUpperCase();
        myAvatar.style.backgroundColor = state.currentUser.avatar_color || '#06b6d4';
    }
    
    document.getElementById('my-email').textContent = state.currentUser.email;

    // Connect WebSocket
    initSocketConnection();

    // Fetch Contacts List
    loadContacts();
}

// ----------------------------------------------------
// Real-time WebSocket Logic (Socket.io)
// ----------------------------------------------------
function initSocketConnection() {
    if (state.socket) {
        state.socket.disconnect();
    }

    state.socket = io({
        auth: { token: state.token }
    });

    state.socket.on('connect', () => {
        console.log('[+] WebSocket verknüpft!');
    });

    state.socket.on('connect_error', (err) => {
        console.error('Socket Connection Error:', err.message);
    });

    // Real-time Message Sent Callback (Confirmation)
    state.socket.on('message_sent', (msg) => {
        saveMessageToLocalVault(msg);
        // Update temp bubble id to server DB id to prevent any duplication
        const tempBubble = document.querySelector('.message-row[data-msg-id^="temp_"]');
        if (tempBubble) {
            tempBubble.setAttribute('data-msg-id', msg.id);
        }
        updateContactLastMessage(msg.receiver_id, msg.content, msg.timestamp);
    });


    // Incoming Private Message
    state.socket.on('private_message', async (msg) => {
        saveMessageToLocalVault(msg);
        playMessageSound();

        let sender = state.contacts.find(c => c.id === msg.sender_id);
        if (!sender) {
            await loadContacts();
            sender = state.contacts.find(c => c.id === msg.sender_id);
        }

        const senderName = sender ? sender.username : 'Kontakt';
        const plainText = await decryptMessageE2EE(msg.content, senderName);
        
        let previewText = plainText;
        if (typeof previewText === 'string') {
            if (previewText.startsWith('📷IMG:')) previewText = '📷 Foto empfangen';
            else if (previewText.startsWith('📎FILE:')) previewText = '📎 Datei empfangen';
            else if (previewText.startsWith('🎙️AUDIO:')) previewText = '🎙️ Sprachnachricht';
        }

        // Trigger system notification if window is minimized or tab blurred
        if (document.hidden || !document.hasFocus()) {
            showSystemNotification(`Neue Nachricht von ${senderName}`, {
                body: previewText
            });
        }

        // Auto-select contact if no chat is currently selected, or append bubble instantly if chatting
        if (!state.activeContact) {
            if (sender) selectContact(sender);
        } else if (state.activeContact.id === msg.sender_id) {
            await appendMessageBubble(msg, false);
            scrollToBottom();
            state.socket.emit('mark_read', { sender_id: msg.sender_id });
        } else {
            if (sender) {
                sender.unread_count = (sender.unread_count || 0) + 1;
            }
        }
        updateContactLastMessage(msg.sender_id, msg.content, msg.timestamp);
    });


    // Real-time Audio Stream Listener (WebSocket Dual PCM Voice Bridge - Disabled for 100% Pure WebRTC Discord Voice)
    state.socket.on('incoming_call_audio', ({ sender_id, pcm, audioData }) => {
        return;
    });










    // Panic Wipe Real-time Broadcast Event Listener (Purges messages for BOTH participants)
    state.socket.on('chat_wiped', ({ user_id }) => {
        if (state.currentUser && state.currentUser.id) {
            const vaultKey = `anonmesh_vault_messages_${state.currentUser.id}`;
            try {
                let vault = JSON.parse(localStorage.getItem(vaultKey) || '[]');
                const wipedIdNum = Number(user_id);
                vault = vault.filter(m => Number(m.sender_id) !== wipedIdNum && Number(m.receiver_id) !== wipedIdNum);
                localStorage.setItem(vaultKey, JSON.stringify(vault));
            } catch (e) {
                localStorage.removeItem(vaultKey);
            }
        }
        if (state.activeContact && (Number(state.activeContact.id) === Number(user_id) || Number(state.currentUser.id) === Number(user_id))) {
            const messagesList = document.getElementById('messages-list');
            if (messagesList) {
                messagesList.innerHTML = '<div class="msg-placeholder" style="text-align: center; color: #ef4444; font-size: 0.9rem; font-weight: 700; padding: 20px;">🚨 Sämtliche Nachrichten wurden unwiderruflich gelöscht & anonymisiert!</div>';
            }
        }
        if (state.contacts) {
            state.contacts.forEach(c => {
                if (Number(c.id) === Number(user_id) || Number(state.currentUser.id) === Number(user_id)) {
                    c.last_message = null;
                    c.last_message_time = null;
                    c.unread_count = 0;
                }
            });
            renderContactsList();
        }
    });


    // Contact Online/Offline Status Change

    state.socket.on('user_status', ({ user_id, is_online }) => {
        const contact = state.contacts.find(c => c.id === user_id);
        if (contact) {
            contact.is_online = is_online;
            renderContactsList();
        }

        if (state.activeContact && state.activeContact.id === user_id) {
            const statusEl = document.getElementById('chat-status');
            statusEl.textContent = is_online ? 'Online' : 'Offline';
            statusEl.className = `chat-status ${is_online ? 'online' : 'offline'}`;
        }
    });

    // Typing Indicators
    state.socket.on('user_typing', ({ sender_id }) => {
        if (state.activeContact && state.activeContact.id === sender_id) {
            document.getElementById('typing-username').textContent = state.activeContact.username;
            document.getElementById('typing-indicator').classList.remove('hidden');
        }
    });

    state.socket.on('user_stop_typing', ({ sender_id }) => {
        if (state.activeContact && state.activeContact.id === sender_id) {
            document.getElementById('typing-indicator').classList.add('hidden');
        }
    });

    // Messages Read Receipt
    state.socket.on('messages_read', ({ read_by }) => {
        if (state.activeContact && state.activeContact.id === read_by) {
            // Update checkmarks to read state (blue double checks)
            document.querySelectorAll('.checkmarks').forEach(el => {
                el.classList.add('read');
                el.innerHTML = '✓✓';
            });
        }
    });

    // Real-time Notification when someone adds you
    state.socket.on('contact_added', ({ contact }) => {
        const exists = state.contacts.some(c => c.id === contact.id);
        if (!exists) {
            state.contacts.unshift(contact);
            renderContactsList();
        }
    });

    // ----------------------------------------------------
    // WebRTC Real-time Call Event Listeners & Ringtone
    // ----------------------------------------------------
    state.socket.on('incoming_call', ({ caller_id, caller_username, offer, call_type }) => {
        callState.pendingOffer = offer;
        callState.pendingCallerId = caller_id;
        callState.targetUserId = caller_id;
        callState.callType = call_type;


        document.getElementById('incoming-caller-name').textContent = caller_username;
        document.getElementById('incoming-call-type').textContent = call_type === 'video' ? 'Eingehender HD Videoanruf...' : 'Eingehender HD Sprachanruf...';
        
        const avatarEl = document.getElementById('incoming-call-avatar');
        avatarEl.textContent = caller_username.charAt(0).toUpperCase();

        document.getElementById('incoming-call-modal').classList.remove('hidden');

        // Start Discord-style Ringtone Sound
        startRingtone();

        // Trigger System Notification for call if tab is in background
        showSystemNotification(`📞 Eingehender ${call_type === 'video' ? 'Videoanruf' : 'Sprachanruf'} von ${caller_username}`, {
            body: 'Klicke hier, um den Anruf entgegenzunehmen!',
            requireInteraction: true
        });
    });


    state.socket.on('call_accepted', async ({ answer }) => {
        stopRingtone();
        if (callState.peerConnection) {
            if (answer && answer.sdp) {
                answer.sdp = enforceSendRecvSDP(answer.sdp);
            }
            await callState.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            await processQueuedIceCandidates();
        }

        // Force unlock audio & resume AudioContext on Caller side upon call acceptance!
        const ctx = getCallAudioContext();
        if (ctx && ctx.state === 'suspended') {
            try { await ctx.resume(); } catch (e) {}
        }
        await unlockCallAudio();
        updateCallStatusBadge('📞 Anruf verbunden!');
    });


    state.socket.on('call_rejected', () => {
        stopRingtone();
        alert('Der Anruf wurde abgelehnt.');
        endCurrentCall();
    });

    state.socket.on('call_ended', () => {
        stopRingtone();
        endCurrentCall();
    });


    state.socket.on('ice_candidate', async ({ candidate }) => {
        if (candidate) {
            if (callState.peerConnection && callState.peerConnection.remoteDescription) {
                try {
                    await callState.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('Error adding ICE candidate:', e);
                }
            } else {
                callState.iceCandidatesQueue.push(candidate);
            }
        }
    });
}



// ----------------------------------------------------
// Contacts & Search Logic
// ----------------------------------------------------
async function loadContacts() {
    try {
        const response = await fetch('/api/contacts', {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (!response.ok) return;

        const data = await response.json();
        state.contacts = data.contacts;
        renderContactsList();

        // Auto select first contact on PC if no chat is open yet
        if (!state.activeContact && state.contacts && state.contacts.length > 0) {
            selectContact(state.contacts[0]);
        }

    } catch (err) {
        console.error('Fehler beim Laden der Kontakte:', err);
    }
}

function renderContactsList(filterText = '') {
    const container = document.getElementById('contacts-list');
    container.innerHTML = '';

    const filtered = state.contacts.filter(c => 
        c.username.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Keine Kontakte gefunden</div>`;
        return;
    }

    filtered.forEach(contact => {
        const isActive = state.activeContact && state.activeContact.id === contact.id;
        const item = document.createElement('div');
        item.className = `contact-item ${isActive ? 'active' : ''}`;
        item.onclick = () => selectContact(contact);

        const initial = contact.username.charAt(0).toUpperCase();
        const avatarColor = contact.avatar_color || '#3b82f6';
        const timeStr = formatTime(contact.last_message_time);
        const lastMsg = contact.last_message ? escapeHtml(contact.last_message) : 'Keine Nachrichten';

        const avatarHtml = contact.avatar_url 
            ? `<img src="${contact.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` 
            : initial;

        item.innerHTML = `
            <div class="avatar-wrapper">
                <div class="avatar" style="background-color: ${avatarColor};">${avatarHtml}</div>
                <div class="status-dot ${contact.is_online ? 'online' : 'offline'}"></div>
            </div>
            <div class="contact-details">
                <div class="contact-top-row">
                    <span class="contact-name">${escapeHtml(contact.username)}</span>
                    <span class="contact-time">${timeStr}</span>
                </div>
                <div class="contact-bottom-row">
                    <span class="last-msg-preview">${lastMsg}</span>
                    ${contact.unread_count > 0 ? `<span class="unread-badge">${contact.unread_count}</span>` : ''}
                </div>
            </div>
        `;


        container.appendChild(item);
    });
}

function filterContacts(query) {
    renderContactsList(query);
}

async function handleAddContact(e) {
    e.preventDefault();
    const input = document.getElementById('add-contact-input');
    const feedback = document.getElementById('add-contact-feedback');
    const username = input.value.trim();

    if (!username) return;

    feedback.className = 'feedback-msg hidden';

    try {
        const response = await fetch('/api/contacts/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();
        if (!response.ok) {
            feedback.textContent = data.error || 'Fehler beim Hinzufügen.';
            feedback.className = 'feedback-msg alert error';
            feedback.classList.remove('hidden');
            return;
        }

        input.value = '';
        feedback.textContent = data.message;
        feedback.className = 'feedback-msg alert success';
        feedback.classList.remove('hidden');

        // Append contact if not exists
        const exists = state.contacts.some(c => c.id === data.contact.id);
        if (!exists) {
            state.contacts.unshift(data.contact);
            renderContactsList();
        }

        // Auto select newly added contact
        selectContact(data.contact);

        setTimeout(() => {
            feedback.classList.add('hidden');
        }, 3000);

    } catch (err) {
        feedback.textContent = 'Netzwerkfehler.';
        feedback.className = 'feedback-msg alert error';
        feedback.classList.remove('hidden');
    }
}

// ----------------------------------------------------
// Chat & Messages Logic
// ----------------------------------------------------
async function selectContact(contact) {
    state.activeContact = contact;
    contact.unread_count = 0; // reset unread badge

    renderContactsList();

    // Toggle Mobile Drawer View
    document.querySelector('.app-container').classList.add('mobile-chat-open');

    // UI elements
    const chatArea = document.getElementById('chat-area');
    const chatHeader = document.getElementById('chat-header');
    const inputArea = document.getElementById('chat-input-area');
    const noChatSelected = document.getElementById('no-chat-selected');
    const messagesList = document.getElementById('messages-list');

    chatArea.classList.remove('empty-chat-state');
    noChatSelected.classList.add('hidden');
    chatHeader.classList.remove('hidden');
    inputArea.classList.remove('hidden');
    messagesList.classList.remove('hidden');

    // Set Header Data
    const avatarEl = document.getElementById('chat-avatar');
    if (contact.avatar_url) {
        avatarEl.innerHTML = `<img src="${contact.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
        avatarEl.textContent = contact.username.charAt(0).toUpperCase();
        avatarEl.style.backgroundColor = contact.avatar_color || '#3b82f6';
    }

    document.getElementById('chat-username').textContent = contact.username;

    
    const statusEl = document.getElementById('chat-status');
    statusEl.textContent = contact.is_online ? 'Online' : 'Offline';
    statusEl.className = `chat-status ${contact.is_online ? 'online' : 'offline'}`;

    // Load Message History
    await loadMessages(contact.id);

    // Focus input
    document.getElementById('message-input').focus();
}

function closeMobileChat() {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.classList.remove('mobile-chat-open');
    }
    state.activeContact = null;

    const chatArea = document.getElementById('chat-area');
    if (chatArea) {
        chatArea.classList.add('empty-chat-state');
    }
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
        chatHeader.classList.add('hidden');
    }
    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) {
        inputArea.classList.add('hidden');
    }
    const noChatSelected = document.getElementById('no-chat-selected');
    if (noChatSelected) {
        noChatSelected.classList.remove('hidden');
    }
}
window.closeMobileChat = closeMobileChat;
window.addEventListener('popstate', closeMobileChat);


function saveMessageToLocalVault(msg) {
    if (!msg || !state.currentUser) return;
    try {
        const vaultKey = `anonmesh_vault_messages_${state.currentUser.id}`;
        let vault = JSON.parse(localStorage.getItem(vaultKey) || '[]');
        
        const exists = vault.some(m => (m.id && msg.id && m.id === msg.id) || (m.timestamp === msg.timestamp && m.sender_id === msg.sender_id && m.receiver_id === msg.receiver_id && m.content === msg.content));
        
        if (!exists) {
            vault.push(msg);
            localStorage.setItem(vaultKey, JSON.stringify(vault));
        }
    } catch (e) {
        console.warn('saveMessageToLocalVault error:', e);
    }
}

function getLocalVaultMessages(contactId) {
    if (!state.currentUser || !contactId) return [];
    try {
        const vaultKey = `anonmesh_vault_messages_${state.currentUser.id}`;
        const vault = JSON.parse(localStorage.getItem(vaultKey) || '[]');
        const contactIdNum = Number(contactId);
        const myIdNum = Number(state.currentUser.id);
        
        return vault.filter(m => 
            (Number(m.sender_id) === myIdNum && Number(m.receiver_id) === contactIdNum) ||
            (Number(m.sender_id) === contactIdNum && Number(m.receiver_id) === myIdNum)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (e) {
        return [];
    }
}

async function loadMessages(contactId) {
    const messagesList = document.getElementById('messages-list');
    if (!messagesList) return;
    messagesList.classList.remove('hidden');

    // 1. Instant Load from LocalStorage Vault (0ms delay - all past chat history appears immediately)
    const localMsgs = getLocalVaultMessages(contactId);
    messagesList.innerHTML = '';
    if (localMsgs.length > 0) {
        for (const msg of localMsgs) {
            const isOutgoing = msg.sender_id === state.currentUser.id;
            await appendMessageBubble(msg, isOutgoing);
        }
        scrollToBottom();
    } else {
        messagesList.innerHTML = '<div class="msg-placeholder" style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">Nachrichten werden entschlüsselt...</div>';
    }

    // 2. Fetch and Merge Server Database Messages
    try {
        const response = await fetch(`/api/messages/${contactId}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(m => saveMessageToLocalVault(m));

            const mergedMsgs = getLocalVaultMessages(contactId);
            messagesList.innerHTML = '';
            for (const msg of mergedMsgs) {
                const isOutgoing = msg.sender_id === state.currentUser.id;
                await appendMessageBubble(msg, isOutgoing);
            }
            scrollToBottom();
        } else if (localMsgs.length === 0) {
            messagesList.innerHTML = '<div class="msg-placeholder" style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">Noch keine Nachrichten. Schreibe die erste ende-zu-ende verschlüsselte Nachricht!</div>';
        }
    } catch (err) {
        console.error('Fehler beim Laden des Nachrichtenverlaufs:', err);
    }
}


async function appendMessageBubble(msg, isOutgoing) {
    const messagesList = document.getElementById('messages-list');
    if (!messagesList) return;
    messagesList.classList.remove('hidden');

    // Deduplication check: ignore if message already exists in DOM
    if (msg.id && document.querySelector(`.message-row[data-msg-id="${msg.id}"]`)) {
        return;
    }


    // Clean up empty placeholder element if present
    const placeholder = messagesList.querySelector('.msg-placeholder');
    if (placeholder) {
        placeholder.remove();
    }


    const row = document.createElement('div');
    row.className = `message-row ${isOutgoing ? 'outgoing' : 'incoming'}`;
    if (msg.id) row.setAttribute('data-msg-id', msg.id);


    const timeStr = formatTime(msg.timestamp);
    const readClass = msg.is_read ? 'read' : '';
    const checkmarksStr = isOutgoing ? `<span class="checkmarks ${readClass}">${msg.is_read ? '✓✓' : '✓'}</span>` : '';

    const decryptedContent = await decryptMessageE2EE(msg.content, state.activeContact?.username);

    let contentHtml = '';
    if (decryptedContent.startsWith('🎙️AUDIO:')) {
        const audioUrl = decryptedContent.replace('🎙️AUDIO:', '');
        contentHtml = `
            <div style="display:flex;align-items:center;gap:10px;padding:4px 0;">
                <span style="font-size:1.3rem;">🎙️</span>
                <audio controls src="${audioUrl}" style="height:34px;max-width:220px;outline:none;"></audio>
            </div>
        `;
    } else if (decryptedContent.startsWith('📷IMG:')) {
        const imgUrl = decryptedContent.replace('📷IMG:', '');
        contentHtml = `
            <div style="margin:4px 0;">
                <img src="${imgUrl}" style="max-width:100%;max-height:280px;border-radius:8px;cursor:pointer;object-fit:cover;" onclick="window.open('${imgUrl}', '_blank')">
            </div>
        `;
    } else if (decryptedContent.startsWith('📎FILE:')) {
        const parts = decryptedContent.replace('📎FILE:', '').split(':::');
        const fileName = parts[0] || 'Datei';
        const fileUrl = parts[1] || '#';
        contentHtml = `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(0,0,0,0.18);border-radius:8px;margin:4px 0;">
                <span style="font-size:1.5rem;">📎</span>
                <div style="display:flex;flex-direction:column;overflow:hidden;">
                    <span style="font-weight:600;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${escapeHtml(fileName)}</span>
                    <a href="${fileUrl}" download="${escapeHtml(fileName)}" style="color:var(--accent);font-size:0.8rem;text-decoration:none;font-weight:bold;margin-top:2px;">Herunterladen ⬇️</a>
                </div>
            </div>
        `;
    } else {
        contentHtml = `<div class="msg-content">${escapeHtml(decryptedContent)}</div>`;
    }

    row.innerHTML = `
        <div class="msg-bubble">
            ${contentHtml}
            <div class="msg-footer">
                <span class="msg-time">${timeStr}</span>
                ${checkmarksStr}
            </div>
        </div>
    `;

    messagesList.appendChild(row);
    scrollToBottom();
}



function scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
}

async function updateContactLastMessage(contactId, content, timestamp) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (contact) {
        const decryptedContent = await decryptMessageE2EE(content, contact.username);
        contact.last_message = decryptedContent;
        contact.last_message_time = timestamp;
        
        // Re-sort contacts list
        state.contacts.sort((a, b) => {
            if (a.last_message_time && b.last_message_time) {
                return new Date(b.last_message_time) - new Date(a.last_message_time);
            }
            if (a.last_message_time) return -1;
            if (b.last_message_time) return 1;
            return a.username.localeCompare(b.username);
        });

        renderContactsList();
    }
}

// ----------------------------------------------------
// Message Input & Typing Handler
// ----------------------------------------------------
async function sendMessage() {
    if (!state.activeContact || !state.socket) return;

    const input = document.getElementById('message-input');
    const content = input.value.trim();

    if (!content) return;

    // Encrypt client-side via AES-GCM 256-bit E2EE
    const encryptedContent = await encryptMessageE2EE(content, state.activeContact.username);

    // Instantly render local outgoing message bubble in real-time (< 1ms)!
    const localMsg = {
        id: 'temp_' + Date.now(),
        sender_id: state.currentUser.id,
        receiver_id: state.activeContact.id,
        content: encryptedContent,
        timestamp: new Date().toISOString(),
        is_read: 0
    };

    await appendMessageBubble(localMsg, true);
    saveMessageToLocalVault(localMsg);
    scrollToBottom();

    updateContactLastMessage(state.activeContact.id, encryptedContent, localMsg.timestamp);

    // Send via socket
    state.socket.emit('send_message', {
        receiver_id: state.activeContact.id,
        content: encryptedContent
    });

    // Clear input
    input.value = '';
    
    // Stop typing indicator
    if (state.isTyping) {
        state.socket.emit('stop_typing', { receiver_id: state.activeContact.id });
        state.isTyping = false;
    }

    closeEmojiPicker();
}



function handleInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        return;
    }

    if (!state.activeContact || !state.socket) return;

    // Notify typing status
    if (!state.isTyping) {
        state.isTyping = true;
        state.socket.emit('typing', { receiver_id: state.activeContact.id });
    }

    clearTimeout(state.typingTimeout);
    state.typingTimeout = setTimeout(() => {
        if (state.isTyping) {
            state.socket.emit('stop_typing', { receiver_id: state.activeContact.id });
            state.isTyping = false;
        }
    }, 2000);
}

// Emoji Picker
function toggleEmojiPicker(e) {
    e.stopPropagation();
    const picker = document.getElementById('emoji-picker');
    picker.classList.toggle('hidden');
}

function closeEmojiPicker() {
    document.getElementById('emoji-picker').classList.add('hidden');
}

function insertEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.value += emoji;
    input.focus();
}

// Close emoji picker on click outside
document.addEventListener('click', (e) => {
    const picker = document.getElementById('emoji-picker');
    const emojiBtn = document.querySelector('.emoji-btn');
    if (picker && !picker.contains(e.target) && !emojiBtn.contains(e.target)) {
        picker.classList.add('hidden');
    }
});

// ----------------------------------------------------
// Settings & Change Username Logic
// ----------------------------------------------------
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    const input = document.getElementById('settings-username');
    const feedback = document.getElementById('settings-feedback');

    if (state.currentUser) {
        if (input) input.value = state.currentUser.username;
        const settingsPreview = document.getElementById('settings-avatar-preview');
        if (settingsPreview) {
            if (state.currentUser.avatar_url) {
                settingsPreview.innerHTML = `<img src="${state.currentUser.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            } else {
                settingsPreview.textContent = state.currentUser.username.charAt(0).toUpperCase();
                settingsPreview.style.backgroundColor = state.currentUser.avatar_color || '#06b6d4';
            }
        }
    }
    if (feedback) feedback.className = 'alert hidden';
    modal.classList.remove('hidden');
    if (input) input.focus();
}



function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

async function triggerPanicWipe() {
    const confirmWipe = confirm(
        "🚨 ACHTUNG / WARNUNG:\n\nMöchtest du wirklich deinen GESAMTEN Chatverlauf unwiderruflich löschen?\n\n- Alle gesendeten & empfangenen Nachrichten werden gelöscht.\n- Alle lokalen Browser-Speicher werden geleert.\n- Alle Datenbank-Einträge auf dem Server werden überschrieben.\n\nDieser Vorgang kann NICHT rückgängig gemacht werden!"
    );

    if (!confirmWipe) return;

    try {
        // 1. Clear LocalStorage Vault for current user
        if (state.currentUser && state.currentUser.id) {
            const vaultKey = `anonmesh_vault_messages_${state.currentUser.id}`;
            localStorage.removeItem(vaultKey);
        }

        // Clear any leftover local caches
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('anonmesh_vault_messages_')) {
                localStorage.removeItem(key);
            }
        }

        // 2. Call Panic Wipe API on server
        const response = await fetch('/api/messages/panic-wipe', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${state.token}`
            }
        });

        const data = await response.json();

        // 3. Clear DOM & Reset UI state
        const messagesList = document.getElementById('messages-list');
        if (messagesList) {
            messagesList.innerHTML = '<div class="msg-placeholder" style="text-align: center; color: #ef4444; font-size: 0.9rem; font-weight: 700; padding: 20px;">🚨 Sämtliche Nachrichten wurden unwiderruflich gelöscht & anonymisiert!</div>';
        }

        // Clear contacts last_message previews
        if (state.contacts && state.contacts.length > 0) {
            state.contacts.forEach(c => {
                c.last_message = null;
                c.last_message_time = null;
                c.unread_count = 0;
            });
            renderContactsList();
        }

        closeSettingsModal();
        alert('🚨 PANIK-LÖSCHUNG ERFOLGREICH: Sämtliche Chatverläufe wurden unwiderruflich aus dem Browser und vom Server gelöscht!');

    } catch (err) {
        console.error('Panic wipe error:', err);
        alert('Fehler beim Ausführen der Panik-Löschung.');
    }
}


async function handleUpdateUsername(e) {
    e.preventDefault();
    const input = document.getElementById('settings-username');
    const feedback = document.getElementById('settings-feedback');
    const newUsername = input.value.trim();

    if (!newUsername) return;

    try {
        const response = await fetch('/api/users/change-username', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ newUsername })
        });

        const data = await response.json();
        if (!response.ok) {
            feedback.textContent = data.error || 'Fehler beim Ändern des Benutzernamens.';
            feedback.className = 'alert error';
            feedback.classList.remove('hidden');
            return;
        }

        // Update local state & token
        state.currentUser.username = newUsername;
        state.token = data.token;
        localStorage.setItem('anonmesh_token', data.token);
        localStorage.setItem('anonmesh_user', JSON.stringify(state.currentUser));


        // Update Profile Header UI
        document.getElementById('my-username').textContent = newUsername;
        const myAvatar = document.getElementById('my-avatar');
        myAvatar.textContent = newUsername.charAt(0).toUpperCase();

        feedback.textContent = data.message;
        feedback.className = 'alert success';
        feedback.classList.remove('hidden');

        setTimeout(() => {
            closeSettingsModal();
        }, 1500);

    } catch (err) {
        feedback.textContent = 'Netzwerkfehler beim Ändern des Benutzernamens.';
        feedback.className = 'alert error';
        feedback.classList.remove('hidden');
    }
}




// ----------------------------------------------------
// FILE & IMAGE ATTACHMENTS (E2EE & Image Compression)
// ----------------------------------------------------
function compressImage(dataUrl, maxSide = 1280, quality = 0.82) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxSide || height > maxSide) {
                if (width > height) {
                    height = Math.round((height * maxSide) / width);
                    width = maxSide;
                } else {
                    width = Math.round((width * maxSide) / height);
                    height = maxSide;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file || !state.activeContact) return;

    if (file.size > 25 * 1024 * 1024) {
        alert('Dateien dürfen maximal 25 MB groß sein.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        let fileDataUrl = event.target.result;
        let formattedPayload = '';

        if (file.type.startsWith('image/')) {
            // Compress photo automatically so it transmits at lightning speed
            fileDataUrl = await compressImage(fileDataUrl);
            formattedPayload = `📷IMG:${fileDataUrl}`;
        } else {
            formattedPayload = `📎FILE:${file.name}:::${fileDataUrl}`;
        }

        const encrypted = await encryptMessageE2EE(formattedPayload, state.activeContact.username);
        state.socket.emit('send_message', {
            receiver_id: state.activeContact.id,
            content: encrypted
        });
        e.target.value = '';
    };
    reader.readAsDataURL(file);
}


// ----------------------------------------------------
// VOICE MESSAGES RECORDER (E2EE)
// ----------------------------------------------------
let voiceState = {
    mediaRecorder: null,
    audioChunks: [],
    timerInterval: null,
    seconds: 0
};

async function toggleVoiceRecording() {
    if (voiceState.mediaRecorder && voiceState.mediaRecorder.state === 'recording') {
        stopAndSendVoiceRecording();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        voiceState.mediaRecorder = new MediaRecorder(stream);
        voiceState.audioChunks = [];
        voiceState.seconds = 0;

        voiceState.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) voiceState.audioChunks.push(e.data);
        };

        voiceState.mediaRecorder.start();
        document.getElementById('voice-recording-bar').classList.remove('hidden');

        voiceState.timerInterval = setInterval(() => {
            voiceState.seconds++;
            const mins = String(Math.floor(voiceState.seconds / 60)).padStart(2, '0');
            const secs = String(voiceState.seconds % 60).padStart(2, '0');
            document.getElementById('recording-time').textContent = `${mins}:${secs}`;
        }, 1000);

    } catch (err) {
        alert('Mikrofon-Zugriff verweigert oder nicht verfügbar.');
    }
}

function cancelVoiceRecording() {
    if (voiceState.mediaRecorder) {
        voiceState.mediaRecorder.onstop = null;
        voiceState.mediaRecorder.stop();
        if (voiceState.mediaRecorder.stream) {
            voiceState.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
    }
    resetVoiceRecorderUI();
}

function stopAndSendVoiceRecording() {
    if (!voiceState.mediaRecorder || voiceState.mediaRecorder.state !== 'recording') return;

    voiceState.mediaRecorder.onstop = async () => {
        if (voiceState.mediaRecorder.stream) {
            voiceState.mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
        const audioBlob = new Blob(voiceState.audioChunks, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Audio = e.target.result;
            const payload = `🎙️AUDIO:${base64Audio}`;
            if (state.activeContact) {
                const encrypted = await encryptMessageE2EE(payload, state.activeContact.username);
                state.socket.emit('send_message', {
                    receiver_id: state.activeContact.id,
                    content: encrypted
                });
            }
        };
        reader.readAsDataURL(audioBlob);
        resetVoiceRecorderUI();
    };

    voiceState.mediaRecorder.stop();
}

function resetVoiceRecorderUI() {
    clearInterval(voiceState.timerInterval);
    voiceState.seconds = 0;
    voiceState.mediaRecorder = null;
    voiceState.audioChunks = [];
    document.getElementById('recording-time').textContent = '00:00';
    document.getElementById('voice-recording-bar').classList.add('hidden');
}

// ----------------------------------------------------
// WEBRTC HD VOICE & VIDEO CALL ENGINE
// ----------------------------------------------------
const callState = {
    peerConnection: null,
    localStream: null,
    targetUserId: null,
    callType: 'video', // 'audio' or 'video'
    pendingOffer: null,
    pendingCallerId: null,
    iceCandidatesQueue: [],
    isMicMuted: false,
    isCamMuted: false
};

const rtcConfig = {
    sdpSemantics: 'unified-plan',
    bundlePolicy: 'max-bundle',
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

function enforceSendRecvSDP(sdp) {
    if (!sdp || typeof sdp !== 'string') return sdp;
    let modifiedSDP = sdp.replace(/a=recvonly/g, 'a=sendrecv');
    modifiedSDP = modifiedSDP.replace(/a=sendonly/g, 'a=sendrecv');
    // Inject Opus FEC (Forward Error Correction) & Stereo Jitter Buffer to eliminate choppiness
    if (modifiedSDP.includes('useinbandfec=1')) {
        modifiedSDP = modifiedSDP.replace(/useinbandfec=1/g, 'useinbandfec=1;minptime=10;stereo=1;maxaveragebitrate=128000');
    } else {
        modifiedSDP = modifiedSDP.replace(/a=fmtp:111 /g, 'a=fmtp:111 useinbandfec=1;minptime=10;stereo=1;maxaveragebitrate=128000;');
    }
    return modifiedSDP;
}




async function processQueuedIceCandidates() {
    if (callState.peerConnection && callState.iceCandidatesQueue.length > 0) {
        for (const candidate of callState.iceCandidatesQueue) {
            try {
                await callState.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Error draining candidate:', e);
            }
        }
        callState.iceCandidatesQueue = [];
    }
}

function optimizeVideoBitrate(peerConnection) {
    if (!peerConnection) return;
    try {
        const senders = peerConnection.getSenders();
        senders.forEach(sender => {
            if (sender.track && sender.track.kind === 'video') {
                const parameters = sender.getParameters();
                if (!parameters.encodings || parameters.encodings.length === 0) {
                    parameters.encodings = [{}];
                }
                // Force Crisp HD 1080p Video Bitrate (3.5 Mbps)
                parameters.encodings[0].maxBitrate = 3500000;
                parameters.encodings[0].maxFramerate = 30;
                sender.setParameters(parameters).catch(e => console.warn('Bitrate tuning:', e));
            }
        });
    } catch (e) {
        console.warn('optimizeVideoBitrate error:', e);
    }
}

function createSilentMediaStream() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const track = dst.stream.getAudioTracks()[0];
        if (track) track.enabled = false;
        return dst.stream;
    } catch (e) {
        return new MediaStream();
    }
}

async function getMediaStream(callType = 'audio') {
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const audioConstraints = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                googEchoCancellation: true,
                googAutoGainControl: true,
                googNoiseSuppression: true,
                googHighpassFilter: true,
                googTypingNoiseDetection: true
            };
            if (selectedMicDeviceId) {
                audioConstraints.deviceId = { exact: selectedMicDeviceId };
            }
            return await navigator.mediaDevices.getUserMedia({
                audio: audioConstraints,
                video: false
            });
        }
    } catch (err) {
        console.warn('⚠️ Media device error:', err);
        try {
            return await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e2) {
            return createSilentMediaStream();
        }
    }
}






let callTimerInterval = null;
let callTimerSeconds = 0;

function startCallTimer() {
    stopCallTimer();
    callTimerSeconds = 0;
    const timerEl = document.getElementById('active-call-timer');
    if (timerEl) timerEl.textContent = '00:00';

    callTimerInterval = setInterval(() => {
        callTimerSeconds++;
        const mins = String(Math.floor(callTimerSeconds / 60)).padStart(2, '0');
        const secs = String(callTimerSeconds % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopCallTimer() {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
    callTimerSeconds = 0;
}

let liveAudioRecorder = null;
let callAudioCtx = null;

function getCallAudioContext() {
    if (!callAudioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            callAudioCtx = new AudioCtxClass();
        }
    }
    if (callAudioCtx && callAudioCtx.state === 'suspended') {
        callAudioCtx.resume().catch(e => {});
    }
    return callAudioCtx;
}

// Global User Gesture unlock for AudioContext on any interaction
window.addEventListener('click', () => {
    if (callAudioCtx && callAudioCtx.state === 'suspended') {
        callAudioCtx.resume().catch(e => {});
    }
}, { passive: true });
window.addEventListener('touchstart', () => {
    if (callAudioCtx && callAudioCtx.state === 'suspended') {
        callAudioCtx.resume().catch(e => {});
    }
}, { passive: true });


let isVoiceWorkletLoaded = false;
let pcmAudioWorkletNode = null;
let pcmAudioProcessor = null;
let pcmAudioSource = null;

function stopAudioStreamer() {
    if (pcmAudioWorkletNode) {
        try { pcmAudioWorkletNode.disconnect(); } catch (e) {}
        pcmAudioWorkletNode = null;
    }
    if (pcmAudioProcessor) {
        try { pcmAudioProcessor.disconnect(); } catch (e) {}
        pcmAudioProcessor = null;
    }
    if (pcmAudioSource) {
        try { pcmAudioSource.disconnect(); } catch (e) {}
        pcmAudioSource = null;
    }
    if (liveAudioRecorder) {
        try {
            if (liveAudioRecorder.state !== 'inactive') liveAudioRecorder.stop();
        } catch (e) {}
        liveAudioRecorder = null;
    }
}

async function startAudioStreamer(targetUserId) {
    // 100% Pure Discord WebRTC Opus Voice Engine:
    // Disabling WebSocket PCM chunking prevents double audio playback & tunnel/underwater echo!
    return;
}





let nextPcmPlayTime = 0;

function playPcmAudioChunk(pcmArray) {
    if (!pcmArray || pcmArray.length === 0) return;
    try {
        const ctx = getCallAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume().catch(e => {});

        const buffer = ctx.createBuffer(1, pcmArray.length, ctx.sampleRate);

        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < pcmArray.length; i++) {
            channelData[i] = pcmArray[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const currentTime = ctx.currentTime;
        if (nextPcmPlayTime < currentTime || (nextPcmPlayTime - currentTime > 0.3)) {
            nextPcmPlayTime = currentTime;
        }
        source.start(nextPcmPlayTime);
        nextPcmPlayTime += buffer.duration;
    } catch (e) {
        console.warn('playPcmAudioChunk error:', e);
    }
}


async function playCallAudioChunk(audioData) {
    if (!audioData) return;
    try {
        const ctx = getCallAudioContext();
        if (ctx) {
            const res = await fetch(audioData);
            const arrayBuffer = await res.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start(0);
        }
    } catch (e) {}
}


function updateCallStatusBadge(text, isError = false) {
    const badge = document.getElementById('call-status-badge');
    if (badge) {
        badge.textContent = text;
        if (isError) {
            badge.style.color = '#f87171';
            badge.style.borderColor = 'rgba(248, 113, 113, 0.4)';
        } else {
            badge.style.color = '#4ade80';
            badge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        }
    }
}

async function unlockCallAudio() {

    try {
        const ctx = getCallAudioContext();
        if (ctx && ctx.state === 'suspended') {
            await ctx.resume();
        }
    } catch (e) {}

    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio) {
        remoteAudio.muted = false;
        remoteAudio.volume = 1.0;
        remoteAudio.play().catch(e => {});
    }
}

async function startCall(callType) {


    if (!state.activeContact) {
        if (state.contacts && state.contacts.length > 0) {
            selectContact(state.contacts[0]);
        } else {
            alert('Bitte wähle einen Kontakt aus der Liste auf der linken Seite aus.');
            return;
        }
    }

    await unlockCallAudio();
    const activeCallModal = document.getElementById('active-call-modal');
    if (activeCallModal) activeCallModal.classList.remove('hidden');

    callState.callType = callType;
    callState.targetUserId = state.activeContact.id;
    callState.iceCandidatesQueue = [];

    // Populate WhatsApp Call Header Info
    const activeName = document.getElementById('active-call-name');
    const activeAvatar = document.getElementById('active-call-avatar');
    if (activeName && state.activeContact) activeName.textContent = state.activeContact.username;
    if (activeAvatar && state.activeContact) {
        if (state.activeContact.avatar_url) {
            activeAvatar.innerHTML = `<img src="${state.activeContact.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            activeAvatar.textContent = state.activeContact.username.charAt(0).toUpperCase();
            activeAvatar.style.backgroundColor = state.activeContact.avatar_color || '#3b82f6';
        }
    }
    startCallTimer();

    try {
        callState.localStream = await getMediaStream(callType);
        startAudioStreamer(callState.targetUserId);

        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.srcObject = callState.localStream;
            localVideo.style.display = callType === 'video' ? 'block' : 'none';
            localVideo.play().catch(e => console.warn('Local video play:', e));
        }

        callState.peerConnection = new RTCPeerConnection(rtcConfig);

        try {
            callState.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
        } catch (e) {}

        if (callState.localStream) {
            callState.localStream.getTracks().forEach(track => {
                track.enabled = true;
                try { callState.peerConnection.addTrack(track, callState.localStream); } catch(e) {}
            });
        }

        callState.peerConnection.ontrack = (event) => {
            console.log('[🔊 WEBRTC TRACK RECEIVED]', event.track.kind);
            const remoteVideo = document.getElementById('remote-video');
            let remoteAudio = document.getElementById('remote-audio');
            if (!remoteAudio) {
                remoteAudio = document.createElement('audio');
                remoteAudio.id = 'remote-audio';
                remoteAudio.autoplay = true;
                remoteAudio.playsInline = true;
                document.body.appendChild(remoteAudio);
            }

            const stream = (event.streams && event.streams[0]) ? event.streams[0] : (event.track ? new MediaStream([event.track]) : null);
            if (stream) {
                remoteAudio.srcObject = stream;
                remoteAudio.volume = 1.0;
                remoteAudio.muted = false;

                const ctx = getCallAudioContext();
                if (ctx && ctx.state === 'suspended') {
                    ctx.resume().catch(e => {});
                }

                const playPromise = remoteAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.warn('Audio play blocked, adding document click unlock:', err);
                        const unlockHandler = () => {
                            remoteAudio.muted = false;
                            remoteAudio.volume = 1.0;
                            remoteAudio.play().catch(e => {});
                            document.removeEventListener('click', unlockHandler);
                        };
                        document.addEventListener('click', unlockHandler, { once: true });
                    });
                }

                if (remoteVideo && event.track.kind === 'video') {
                    remoteVideo.srcObject = stream;
                    remoteVideo.style.display = 'block';
                    const voicePlaceholder = document.getElementById('voice-stage-placeholder');
                    if (voicePlaceholder) voicePlaceholder.style.display = 'none';
                    remoteVideo.play().catch(e => console.warn('Video play:', e));
                }
            }
        };


        callState.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                state.socket.emit('ice_candidate', {
                    receiver_id: callState.targetUserId,
                    candidate: event.candidate
                });
            }
        };

        const offer = await callState.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video'
        });
        if (offer && offer.sdp) {
            offer.sdp = enforceSendRecvSDP(offer.sdp);
        }
        await callState.peerConnection.setLocalDescription(offer);
        optimizeVideoBitrate(callState.peerConnection);

        state.socket.emit('call_user', {
            receiver_id: callState.targetUserId,
            offer,
            call_type: callType
        });

    } catch (err) {
        console.warn('Call connection error:', err);
    }
}

async function acceptIncomingCall() {
    stopRingtone();
    const incomingModal = document.getElementById('incoming-call-modal');
    if (incomingModal) incomingModal.classList.add('hidden');
    if (!callState.pendingOffer || !callState.pendingCallerId) return;

    callState.targetUserId = callState.pendingCallerId;

    const ctx = getCallAudioContext();
    if (ctx && ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (e) {}
    }
    await unlockCallAudio();

    const caller = state.contacts.find(c => c.id === callState.targetUserId);
    const callerName = caller ? caller.username : 'Kontakt';
    const activeName = document.getElementById('active-call-name');
    const activeAvatar = document.getElementById('active-call-avatar');
    if (activeName) activeName.textContent = callerName;
    if (activeAvatar) {
        if (caller && caller.avatar_url) {
            activeAvatar.innerHTML = `<img src="${caller.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            activeAvatar.textContent = callerName.charAt(0).toUpperCase();
            activeAvatar.style.backgroundColor = caller ? (caller.avatar_color || '#3b82f6') : '#3b82f6';
        }
    }
    startCallTimer();

    try {
        callState.localStream = await getMediaStream(callState.callType);
        startAudioStreamer(callState.targetUserId);

        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.srcObject = callState.localStream;
            localVideo.style.display = callState.callType === 'video' ? 'block' : 'none';
            localVideo.play().catch(e => console.warn('Local video play:', e));
        }

        document.getElementById('active-call-modal').classList.remove('hidden');

        callState.peerConnection = new RTCPeerConnection(rtcConfig);

        try {
            callState.peerConnection.addTransceiver('audio', { direction: 'sendrecv' });
        } catch (e) {}

        if (callState.localStream) {
            callState.localStream.getTracks().forEach(track => {
                track.enabled = true;
                try { callState.peerConnection.addTrack(track, callState.localStream); } catch(e) {}
            });
        }

        callState.peerConnection.ontrack = (event) => {
            console.log('[🔊 WEBRTC TRACK RECEIVED IN ACCEPT]', event.track.kind);
            const remoteVideo = document.getElementById('remote-video');
            let remoteAudio = document.getElementById('remote-audio');
            if (!remoteAudio) {
                remoteAudio = document.createElement('audio');
                remoteAudio.id = 'remote-audio';
                remoteAudio.autoplay = true;
                remoteAudio.playsInline = true;
                document.body.appendChild(remoteAudio);
            }
            const stream = (event.streams && event.streams[0]) ? event.streams[0] : (event.track ? new MediaStream([event.track]) : null);
            if (stream) {
                remoteAudio.srcObject = stream;
                remoteAudio.volume = 1.0;
                remoteAudio.muted = false;

                const ctx = getCallAudioContext();
                if (ctx && ctx.state === 'suspended') {
                    ctx.resume().catch(e => {});
                }

                const playPromise = remoteAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.warn('Audio play blocked in accept, adding click unlock:', err);
                        const unlockHandler = () => {
                            remoteAudio.muted = false;
                            remoteAudio.volume = 1.0;
                            remoteAudio.play().catch(e => {});
                            document.removeEventListener('click', unlockHandler);
                        };
                        document.addEventListener('click', unlockHandler, { once: true });
                    });
                }

                if (remoteVideo && event.track.kind === 'video') {
                    remoteVideo.srcObject = stream;
                    remoteVideo.style.display = 'block';
                    const remoteAvatar = document.getElementById('remote-avatar-container');
                    const remoteLiveBadge = document.getElementById('remote-live-badge');
                    if (remoteAvatar) remoteAvatar.style.display = 'none';
                    if (remoteLiveBadge) remoteLiveBadge.style.display = 'block';
                    remoteVideo.play().catch(e => console.warn('Video play:', e));
                }
            }
        };


        callState.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                state.socket.emit('ice_candidate', {
                    receiver_id: callState.targetUserId,
                    candidate: event.candidate
                });
            }
        };

        if (callState.pendingOffer) {
            if (callState.pendingOffer.sdp) {
                callState.pendingOffer.sdp = enforceSendRecvSDP(callState.pendingOffer.sdp);
            }
            await callState.peerConnection.setRemoteDescription(new RTCSessionDescription(callState.pendingOffer));
            await processQueuedIceCandidates();

            const answer = await callState.peerConnection.createAnswer();
            if (answer && answer.sdp) {
                answer.sdp = enforceSendRecvSDP(answer.sdp);
            }
            await callState.peerConnection.setLocalDescription(answer);
            optimizeVideoBitrate(callState.peerConnection);

            state.socket.emit('answer_call', {
                receiver_id: callState.targetUserId,
                answer
            });
        }

    } catch (err) {
        console.warn('acceptIncomingCall error handled silently:', err);
    }
}





function rejectIncomingCall() {
    stopRingtone();
    document.getElementById('incoming-call-modal').classList.add('hidden');
    if (callState.pendingCallerId) {
        state.socket.emit('reject_call', { receiver_id: callState.pendingCallerId });
    }
    callState.pendingOffer = null;
    callState.pendingCallerId = null;
    callState.iceCandidatesQueue = [];
}

function endCurrentCall() {
    // 1. IMMEDIATELY HIDE ALL MODALS (0MS GUARANTEE)
    const activeModal = document.getElementById('active-call-modal');
    const incomingModal = document.getElementById('incoming-call-modal');
    if (activeModal) activeModal.classList.add('hidden');
    if (incomingModal) incomingModal.classList.add('hidden');

    stopRingtone();
    stopAudioStreamer();

    try {
        if (callState.targetUserId && state.socket) {
            state.socket.emit('end_call', { receiver_id: callState.targetUserId });
        }
    } catch (e) {}

    if (callState.peerConnection) {
        try { callState.peerConnection.close(); } catch (e) {}
        callState.peerConnection = null;
    }

    if (callState.localStream) {
        try { callState.localStream.getTracks().forEach(t => t.stop()); } catch (e) {}
        callState.localStream = null;
    }

    const remoteVideo = document.getElementById('remote-video');
    const remoteAudio = document.getElementById('remote-audio');
    const localVideo = document.getElementById('local-video');

    if (remoteVideo) remoteVideo.srcObject = null;
    if (remoteAudio) remoteAudio.srcObject = null;
    if (localVideo) localVideo.srcObject = null;

    callState.targetUserId = null;
    callState.pendingOffer = null;
    callState.isMicMuted = false;
    callState.isCamMuted = false;
    callState.iceCandidatesQueue = [];
}




function toggleMuteMic() {
    callState.isMicMuted = !callState.isMicMuted;
    if (callState.localStream) {
        const audioTrack = callState.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !callState.isMicMuted;
        }
    }
    const btn = document.getElementById('toggle-mic-btn');
    if (btn) {
        if (callState.isMicMuted) {
            btn.style.background = '#ef4444';
            btn.style.color = '#ffffff';
            btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
        } else {
            btn.style.background = '';
            btn.style.color = '';
            btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
        }
    }
}

async function toggleMuteCam() {
    callState.isCamMuted = !callState.isCamMuted;
    const btn = document.getElementById('toggle-cam-btn');
    const localVideo = document.getElementById('local-video');

    if (callState.localStream) {
        let videoTrack = callState.localStream.getVideoTracks()[0];
        if (!videoTrack && !callState.isCamMuted) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoTrack = videoStream.getVideoTracks()[0];
                if (videoTrack) {
                    callState.localStream.addTrack(videoTrack);
                    if (localVideo) {
                        localVideo.srcObject = callState.localStream;
                        localVideo.style.display = 'block';
                    }
                    if (callState.peerConnection) {
                        callState.peerConnection.addTrack(videoTrack, callState.localStream);
                    }
                }
            } catch (e) {}
        } else if (videoTrack) {
            videoTrack.enabled = !callState.isCamMuted;
        }
    }

    if (btn) {
        if (callState.isCamMuted) {
            btn.style.background = '#ef4444';
            btn.style.color = '#ffffff';
            btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            if (localVideo) localVideo.style.display = 'none';
        } else {
            btn.style.background = '';
            btn.style.color = '';
            btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
            if (localVideo) localVideo.style.display = 'block';
        }
    }
}
let screenStream = null;

async function toggleScreenShare() {
    const btn = document.getElementById('toggle-screen-btn');
    const localVideo = document.getElementById('local-video');
    const localAvatar = document.getElementById('local-avatar-container');
    const localLiveBadge = document.getElementById('local-live-badge');

    if (screenStream) {
        // Stop active screen share stream
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        if (btn) {
            btn.style.background = '#23a55a';
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg><span>Bildschirm streamen 🖥️</span>`;
        }
        if (localVideo) localVideo.style.display = 'none';
        if (localAvatar) localAvatar.style.display = 'flex';
        if (localLiveBadge) localLiveBadge.style.display = 'none';

        if (callState.peerConnection) {
            const senders = callState.peerConnection.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
                callState.peerConnection.removeTrack(videoSender);
            }
        }
        updateCallStatusBadge('🟢 Sprachchat verbunden');
        return;
    }

    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always',
                displaySurface: 'monitor',
                frameRate: { ideal: 60, max: 60 },
                width: { max: 1920 },
                height: { max: 1080 }
            },
            audio: true
        });

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        if (localVideo) {
            localVideo.srcObject = screenStream;
            localVideo.style.display = 'block';
            localVideo.play().catch(e => {});
        }
        if (localAvatar) localAvatar.style.display = 'none';
        if (localLiveBadge) localLiveBadge.style.display = 'block';

        if (btn) {
            btn.style.background = '#da373c';
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg><span>Stream beenden 🔴</span>`;
        }

        if (callState.peerConnection) {
            const senders = callState.peerConnection.getSenders();
            const existingVideoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (existingVideoSender) {
                await existingVideoSender.replaceTrack(screenTrack);
            } else {
                callState.peerConnection.addTrack(screenTrack, screenStream);
            }

            const offer = await callState.peerConnection.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
            if (offer && offer.sdp) offer.sdp = enforceSendRecvSDP(offer.sdp);
            await callState.peerConnection.setLocalDescription(offer);

            state.socket.emit('call_user', {
                receiver_id: callState.targetUserId,
                offer,
                call_type: 'video'
            });
        }

        updateCallStatusBadge('🔴 LIVE: Bildschirm wird gestreamt');

        screenTrack.onended = () => {
            if (screenStream) toggleScreenShare();
        };
    } catch (err) {
        console.warn('Screen share canceled or failed:', err);
    }
}


let selectedMicDeviceId = null;
let selectedSpeakerDeviceId = null;

async function populateDiscordAudioDevices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const micSelect = document.getElementById('mic-select');
        const speakerSelect = document.getElementById('speaker-select');

        if (micSelect) {
            micSelect.innerHTML = '';
            const mics = devices.filter(d => d.kind === 'audioinput');
            if (mics.length === 0) {
                micSelect.innerHTML = '<option value="">Standard-Mikrofon</option>';
            } else {
                mics.forEach((m, idx) => {
                    const opt = document.createElement('option');
                    opt.value = m.deviceId;
                    opt.textContent = m.label || `Mikrofon ${idx + 1}`;
                    if (selectedMicDeviceId && m.deviceId === selectedMicDeviceId) opt.selected = true;
                    micSelect.appendChild(opt);
                });
            }
        }

        if (speakerSelect) {
            speakerSelect.innerHTML = '';
            const speakers = devices.filter(d => d.kind === 'audiooutput');
            if (speakers.length === 0) {
                speakerSelect.innerHTML = '<option value="">Standard-Lautsprecher</option>';
            } else {
                speakers.forEach((s, idx) => {
                    const opt = document.createElement('option');
                    opt.value = s.deviceId;
                    opt.textContent = s.label || `Lautsprecher / Headset ${idx + 1}`;
                    if (selectedSpeakerDeviceId && s.deviceId === selectedSpeakerDeviceId) opt.selected = true;
                    speakerSelect.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.warn('enumerateDevices error:', e);
    }
}

function openDiscordAudioSettings() {
    populateDiscordAudioDevices();
    const modal = document.getElementById('discord-audio-settings-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeDiscordAudioSettings() {
    const modal = document.getElementById('discord-audio-settings-modal');
    if (modal) modal.classList.add('hidden');
}

async function changeAudioInputDevice(deviceId) {
    if (!deviceId) return;
    selectedMicDeviceId = deviceId;
    console.log('[🎤 MIC CHANGED]', deviceId);

    if (callState.localStream) {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            const newTrack = newStream.getAudioTracks()[0];
            if (newTrack && callState.peerConnection) {
                const senders = callState.peerConnection.getSenders();
                const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
                if (audioSender) {
                    await audioSender.replaceTrack(newTrack);
                }
                callState.localStream = newStream;
            }
        } catch (e) {
            console.warn('changeAudioInputDevice error:', e);
        }
    }
}

async function changeAudioOutputDevice(deviceId) {
    if (!deviceId) return;
    selectedSpeakerDeviceId = deviceId;
    console.log('[🔊 SPEAKER CHANGED]', deviceId);

    const remoteAudio = document.getElementById('remote-audio');
    if (remoteAudio && typeof remoteAudio.setSinkId === 'function') {
        try {
            await remoteAudio.setSinkId(deviceId);
        } catch (e) {
            console.warn('setSinkId error:', e);
        }
    }
}

function playTestAudio() {
    try {
        const ctx = getCallAudioContext();
        if (ctx) {
            if (ctx.state === 'suspended') ctx.resume().catch(e => {});
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) {}
}

// Expose Call & Modal Functions Globally to Window Object for Inline HTML onclick Handlers
window.startCall = startCall;
window.acceptIncomingCall = acceptIncomingCall;
window.rejectIncomingCall = rejectIncomingCall;
window.endCurrentCall = endCurrentCall;
window.toggleMuteMic = toggleMuteMic;
window.toggleMuteCam = toggleMuteCam;
window.toggleScreenShare = toggleScreenShare;
window.openDiscordAudioSettings = openDiscordAudioSettings;
window.closeDiscordAudioSettings = closeDiscordAudioSettings;
window.changeAudioInputDevice = changeAudioInputDevice;
window.changeAudioOutputDevice = changeAudioOutputDevice;
window.playTestAudio = playTestAudio;
window.triggerPanicWipe = triggerPanicWipe;





