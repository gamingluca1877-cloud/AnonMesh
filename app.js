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
// Initialization & Theme Management
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSourceProtection();
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
        }
    });
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
        return ciphertext; // Unencrypted legacy text
    }

    try {
        const parts = ciphertext.split(':');
        if (parts.length !== 3) return ciphertext;

        const ivHex = parts[1];
        const cipherHex = parts[2];

        const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const cipherBuffer = new Uint8Array(cipherHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

        const key = await getE2EEKey(otherUsername);
        if (!key) return '[Entschlüsselung nicht möglich]';

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            cipherBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (e) {
        console.warn('E2EE Decryption failed:', e);
        return '🔒 [Verschlüsselte Nachricht]';
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
    if (!state.token) {
        showAuthView();
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (!response.ok) {
            throw new Error('Sitzung abgelaufen.');
        }

        const data = await response.json();
        state.currentUser = data.user;
        showAppView();
    } catch (error) {
        console.warn('Session invalid:', error.message);
        handleLogout();
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
    const myAvatar = document.getElementById('my-avatar');
    myAvatar.textContent = state.currentUser.username.charAt(0).toUpperCase();
    myAvatar.style.backgroundColor = state.currentUser.avatar_color || '#3b82f6';
    
    document.getElementById('my-username').textContent = state.currentUser.username;
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
    state.socket.on('private_message', (msg) => {
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

        item.innerHTML = `
            <div class="avatar-wrapper">
                <div class="avatar" style="background-color: ${avatarColor};">${initial}</div>
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
    avatarEl.textContent = contact.username.charAt(0).toUpperCase();
    avatarEl.style.backgroundColor = contact.avatar_color || '#3b82f6';

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
    document.querySelector('.app-container').classList.remove('mobile-chat-open');
}

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

    // Remove empty placeholder if existing
    if (messagesList.children.length === 1 && messagesList.children[0].tagName !== 'DIV') {
        messagesList.innerHTML = '';
    }

    const row = document.createElement('div');
    row.className = `message-row ${isOutgoing ? 'outgoing' : 'incoming'}`;

    const timeStr = formatTime(msg.timestamp);
    const readClass = msg.is_read ? 'read' : '';
    const checkmarksStr = isOutgoing ? `<span class="checkmarks ${readClass}">${msg.is_read ? '✓✓' : '✓'}</span>` : '';

    const decryptedContent = await decryptMessageE2EE(msg.content, state.activeContact?.username);

    row.innerHTML = `
        <div class="msg-bubble">
            <div class="msg-content">${escapeHtml(decryptedContent)}</div>
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

