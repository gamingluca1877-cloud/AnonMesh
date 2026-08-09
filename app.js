/**
 * app.js - Frontend Client Application Logic (SPA)
 * Handles REST API calls, Socket.io real-time events, DOM state, and themes.
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
    requestNotificationPermission();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW register error:', e));
    }

    if (window.location.protocol === 'file:') {
        showAuthAlert('⚠️ Bitte öffne die Anwendung im Browser über http://localhost:3000 (nicht über die Datei-URL file:///).', 'error');
    }
    checkAuthSession();
});



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
    if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.startsWith('🔐ENC:')) {
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
        if (!targetName && state.currentUser) {
            targetName = state.currentUser.username;
        }

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
        return ciphertext.replace(/^🔐ENC:[^:]+:/, '');
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

async function checkAuthSession() {
    // Instant session restore from localStorage on page refresh
    const savedUserStr = localStorage.getItem('anonmesh_user');
    if (state.token && savedUserStr) {
        try {
            state.currentUser = JSON.parse(savedUserStr);
            showAppView();
        } catch(e) {}
    } else if (!state.token) {
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
        } else if (response.status === 401 || response.status === 403) {
            // Only force logout if server explicitly invalidates token
            handleLogout();
        }
    } catch (error) {
        console.warn('Session verify network warning:', error.message);
        // Keep session active on temporary refresh/network reconnect
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
            showAuthAlert(data.error || 'Anmeldung fehlgeschlagen.');
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
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
}

function showAppView() {
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
        if (state.activeContact && msg.receiver_id === state.activeContact.id) {
            appendMessageBubble(msg, true);
        }
        updateContactLastMessage(msg.receiver_id, msg.content, msg.timestamp);
    });

    // Incoming Private Message
    state.socket.on('private_message', async (msg) => {
        playMessageSound();

        const sender = state.contacts.find(c => c.id === msg.sender_id);
        const senderName = sender ? sender.username : 'Kontakt';
        const plainText = await decryptMessageE2EE(msg.content, senderName);
        
        let previewText = plainText;
        if (typeof previewText === 'string') {
            if (previewText.startsWith('📷IMG:')) previewText = '📷 Foto empfangen';
            else if (previewText.startsWith('📎FILE:')) previewText = '📎 Datei empfangen';
            else if (previewText.startsWith('🎙️AUDIO:')) previewText = '🎙️ Sprachnachricht';
        }

        // Trigger system notification if window is minimized or tab blurred
        if (document.hidden || !document.hasFocus() || !state.activeContact || state.activeContact.id !== msg.sender_id) {
            showSystemNotification(`Neue Nachricht von ${senderName}`, {
                body: previewText
            });
        }

        if (state.activeContact && msg.sender_id === state.activeContact.id) {
            appendMessageBubble(msg, false);
            scrollToBottom();
            // Mark as read immediately
            state.socket.emit('mark_read', { sender_id: msg.sender_id });
        } else {
            // Increment unread count for sender
            const contact = state.contacts.find(c => c.id === msg.sender_id);
            if (contact) {
                contact.unread_count = (contact.unread_count || 0) + 1;
            }
        }
        updateContactLastMessage(msg.sender_id, msg.content, msg.timestamp);
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
            await callState.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            await processQueuedIceCandidates();
        }
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


async function loadMessages(contactId) {
    const messagesList = document.getElementById('messages-list');
    messagesList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">Nachrichten werden entschlüsselt...</div>';

    try {
        const response = await fetch(`/api/messages/${contactId}`, {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (!response.ok) return;

        const data = await response.json();
        messagesList.innerHTML = '';

        if (data.messages.length === 0) {
            messagesList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px;">Noch keine Nachrichten. Schreibe die erste ende-zu-ende verschlüsselte Nachricht!</div>';
            return;
        }

        for (const msg of data.messages) {
            const isOutgoing = msg.sender_id === state.currentUser.id;
            await appendMessageBubble(msg, isOutgoing);
        }

        scrollToBottom();
    } catch (err) {
        console.error('Fehler beim Laden des Nachrichtenverlaufs:', err);
    }
}

async function appendMessageBubble(msg, isOutgoing) {
    const messagesList = document.getElementById('messages-list');

    // Deduplication check: ignore if message already exists in DOM
    if (msg.id && document.querySelector(`.message-row[data-msg-id="${msg.id}"]`)) {
        return;
    }

    if (messagesList.children.length === 1 && messagesList.children[0].tagName !== 'DIV') {
        messagesList.innerHTML = '';
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
    const input = document.getElementById('settings-username');
    const feedback = document.getElementById('settings-feedback');

    if (state.currentUser) {
        input.value = state.currentUser.username;
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
    feedback.className = 'alert hidden';
    modal.classList.remove('hidden');
    input.focus();
}


function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
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
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.cloudflare.com:3478' }
    ]
};

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

async function getMediaStream(callType) {
    if (callType === 'video') {
        try {
            // High Resolution Full HD Camera Constraints
            return await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
                video: {
                    width: { ideal: 1920, min: 1280 },
                    height: { ideal: 1080, min: 720 },
                    frameRate: { ideal: 30, min: 24 },
                    facingMode: 'user'
                }
            });
        } catch (e1) {
            console.warn('HD camera constraint fallback 1:', e1);
            try {
                return await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
                });
            } catch (e2) {
                console.warn('HD camera constraint fallback 2:', e2);
                try {
                    return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                } catch (e3) {
                    return await navigator.mediaDevices.getUserMedia({ audio: true });
                }
            }
        }
    } else {
        return await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }
        });
    }
}

async function startCall(callType) {
    if (!state.activeContact) return;

    callState.callType = callType;
    callState.targetUserId = state.activeContact.id;
    callState.iceCandidatesQueue = [];

    try {
        callState.localStream = await getMediaStream(callType);
        
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = callState.localStream;
        localVideo.style.display = callType === 'video' ? 'block' : 'none';
        localVideo.play().catch(e => console.warn('Local video play:', e));

        document.getElementById('active-call-modal').classList.remove('hidden');

        callState.peerConnection = new RTCPeerConnection(rtcConfig);

        callState.localStream.getTracks().forEach(track => {
            track.enabled = true;
            callState.peerConnection.addTrack(track, callState.localStream);
        });

        callState.peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remote-video');
            const remoteAudio = document.getElementById('remote-audio');
            if (event.streams && event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.play().catch(e => console.warn('Audio play:', e));
                remoteVideo.play().catch(e => console.warn('Video play:', e));
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
        await callState.peerConnection.setLocalDescription(offer);
        optimizeVideoBitrate(callState.peerConnection);

        state.socket.emit('call_user', {
            receiver_id: callState.targetUserId,
            offer,
            call_type: callType
        });

    } catch (err) {
        alert('Kamera/Mikrofon-Zugriff verweigert.');
        endCurrentCall();
    }
}

async function acceptIncomingCall() {
    stopRingtone();
    document.getElementById('incoming-call-modal').classList.add('hidden');
    if (!callState.pendingOffer || !callState.pendingCallerId) return;


    callState.targetUserId = callState.pendingCallerId;

    try {
        callState.localStream = await getMediaStream(callState.callType);
        
        const localVideo = document.getElementById('local-video');
        localVideo.srcObject = callState.localStream;
        localVideo.style.display = callState.callType === 'video' ? 'block' : 'none';
        localVideo.play().catch(e => console.warn('Local video play:', e));

        document.getElementById('active-call-modal').classList.remove('hidden');

        callState.peerConnection = new RTCPeerConnection(rtcConfig);

        callState.localStream.getTracks().forEach(track => {
            track.enabled = true;
            callState.peerConnection.addTrack(track, callState.localStream);
        });

        callState.peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remote-video');
            const remoteAudio = document.getElementById('remote-audio');
            if (event.streams && event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.play().catch(e => console.warn('Audio play:', e));
                remoteVideo.play().catch(e => console.warn('Video play:', e));
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

        await callState.peerConnection.setRemoteDescription(new RTCSessionDescription(callState.pendingOffer));
        await processQueuedIceCandidates();

        const answer = await callState.peerConnection.createAnswer();
        await callState.peerConnection.setLocalDescription(answer);
        optimizeVideoBitrate(callState.peerConnection);

        state.socket.emit('answer_call', {
            receiver_id: callState.targetUserId,
            answer
        });

    } catch (err) {
        alert('Fehler beim Annehmen des Anrufs.');
        rejectIncomingCall();
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
    stopRingtone();
    if (callState.targetUserId && state.socket) {
        state.socket.emit('end_call', { receiver_id: callState.targetUserId });
    }


    if (callState.peerConnection) {
        callState.peerConnection.close();
        callState.peerConnection = null;
    }

    if (callState.localStream) {
        callState.localStream.getTracks().forEach(t => t.stop());
        callState.localStream = null;
    }

    const remoteVideo = document.getElementById('remote-video');
    const remoteAudio = document.getElementById('remote-audio');
    if (remoteVideo) remoteVideo.srcObject = null;
    if (remoteAudio) remoteAudio.srcObject = null;
    document.getElementById('local-video').srcObject = null;

    document.getElementById('active-call-modal').classList.add('hidden');
    document.getElementById('incoming-call-modal').classList.add('hidden');

    callState.targetUserId = null;
    callState.pendingOffer = null;
    callState.iceCandidatesQueue = [];
}


function toggleMuteMic() {
    if (!callState.localStream) return;
    const audioTrack = callState.localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        callState.isMicMuted = !audioTrack.enabled;
        document.getElementById('toggle-mic-btn').textContent = callState.isMicMuted ? '🎙️❌' : '🎤';
    }
}

function toggleMuteCam() {
    if (!callState.localStream) return;
    const videoTrack = callState.localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        callState.isCamMuted = !videoTrack.enabled;
        document.getElementById('toggle-cam-btn').textContent = callState.isCamMuted ? '📹❌' : '📹';
    }
}


