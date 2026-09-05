const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure .env is loaded if present
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    try {
        require('dotenv').config({ path: envPath });
    } catch (e) {}
}

const ENC_FILE = path.join(__dirname, '../../config/.instagram_session.enc');
const JSON_FILE = path.join(__dirname, '../../config/instagram_session.json');

function getCandidateKeys() {
    const candidates = [];
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
        candidates.push(process.env.GEMINI_API_KEY.trim());
    }
    // Also try reading directly from .env file
    if (fs.existsSync(envPath)) {
        try {
            const rawEnv = fs.readFileSync(envPath, 'utf8');
            const match = rawEnv.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
            if (match && match[1] && !candidates.includes(match[1].trim())) {
                candidates.push(match[1].trim());
            }
        } catch (e) {}
    }
    candidates.push('influmaker_instagram_secure_key_2026');
    return candidates.map(secret => crypto.createHash('sha256').update(secret).digest());
}

class InstagramSessionStorage {
    /**
     * Validate whether a storage state or cookies bundle is a genuine, active Instagram session.
     * Must contain a non-empty, unexpired sessionid cookie.
     */
    static isValidSession(data) {
        if (!data || !Array.isArray(data.cookies) || data.cookies.length === 0) {
            return false;
        }
        const sessionCookie = data.cookies.find(c => c.name === 'sessionid');
        if (!sessionCookie || !sessionCookie.value || typeof sessionCookie.value !== 'string' || sessionCookie.value.trim().length < 15) {
            return false;
        }
        if (sessionCookie.expires && sessionCookie.expires > 0) {
            // Check if expired (with a 5-minute safety margin)
            if (sessionCookie.expires * 1000 < Date.now() + 300000) {
                return false;
            }
        }
        return true;
    }

    /**
     * Restore session to config/instagram_session.json:
     * 1. First priority: read process.env.INSTAGRAM_SESSION_JSON (from GitHub Secrets)
     * 2. Second priority: existing valid config/instagram_session.json on disk
     * 3. Third priority: decrypt config/.instagram_session.enc (persisted in git)
     *
     * In all cases, STRICT validation is enforced. Invalid sessions lacking sessionid are rejected.
     */
    static restore() {
        // Priority 1: GitHub Secret INSTAGRAM_SESSION_JSON (takes precedence in cloud runners)
        if (process.env.INSTAGRAM_SESSION_JSON && process.env.INSTAGRAM_SESSION_JSON.trim()) {
            try {
                const parsed = JSON.parse(process.env.INSTAGRAM_SESSION_JSON);
                if (this.isValidSession(parsed)) {
                    fs.writeFileSync(JSON_FILE, JSON.stringify(parsed, null, 2), 'utf8');
                    console.log(`[Instagram Auth] 🔑 Restored valid session from INSTAGRAM_SESSION_JSON secret.`);
                    return parsed;
                } else {
                    console.warn(`[Instagram Auth] ⚠️ INSTAGRAM_SESSION_JSON secret is set but invalid (missing or expired sessionid).`);
                }
            } catch (e) {
                console.warn(`[Instagram Auth] ⚠️ Could not parse INSTAGRAM_SESSION_JSON secret: ${e.message}`);
            }
        }

        // Priority 2: Existing valid config/instagram_session.json on disk
        if (fs.existsSync(JSON_FILE)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
                if (this.isValidSession(parsed)) {
                    return parsed;
                }
            } catch (e) {}
        }

        // Priority 3: Decrypt config/.instagram_session.enc
        if (fs.existsSync(ENC_FILE)) {
            try {
                const raw = JSON.parse(fs.readFileSync(ENC_FILE, 'utf8'));
                if (raw.iv && raw.data && raw.tag) {
                    const keys = getCandidateKeys();
                    for (const key of keys) {
                        try {
                            const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'hex'));
                            decipher.setAuthTag(Buffer.from(raw.tag, 'hex'));
                            let decrypted = decipher.update(raw.data, 'hex', 'utf8');
                            decrypted += decipher.final('utf8');
                            const parsed = JSON.parse(decrypted);
                            if (this.isValidSession(parsed)) {
                                fs.writeFileSync(JSON_FILE, JSON.stringify(parsed, null, 2), 'utf8');
                                console.log(`[Instagram Auth] 🔑 Decrypted and restored valid session from config/.instagram_session.enc (updated: ${raw.updatedAt || 'recent'})`);
                                return parsed;
                            }
                        } catch (err) {
                            // Try next candidate key
                        }
                    }
                    console.warn(`[Instagram Auth] Warning: could not decrypt a valid session with sessionid from .instagram_session.enc.`);
                }
            } catch (e) {
                console.warn(`[Instagram Auth] Warning: could not parse .instagram_session.enc (${e.message}).`);
            }
        }

        return null;
    }

    /**
     * Encrypt and persist storage state to config/.instagram_session.enc for git tracking.
     * HARD GUARD: strictly refuses to persist if sessionid cookie is missing or invalid!
     */
    static persist(storageStateData = null) {
        try {
            let data = storageStateData;
            if (!data && fs.existsSync(JSON_FILE)) {
                data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
            }
            if (!data) return false;

            // HARD GUARD: NEVER persist an invalid or unauthenticated session!
            if (!this.isValidSession(data)) {
                console.warn(`[Instagram Auth] ⛔ ABORTING PERSIST: Provided storageState does not contain a valid sessionid cookie. Refusing to overwrite .instagram_session.enc with unauthenticated state!`);
                return false;
            }

            // Use primary candidate key for encryption
            const keys = getCandidateKeys();
            const primaryKey = keys[0];
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', primaryKey, iv);
            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();

            const payload = {
                iv: iv.toString('hex'),
                data: encrypted,
                tag: tag.toString('hex'),
                updatedAt: new Date().toISOString()
            };

            fs.writeFileSync(ENC_FILE, JSON.stringify(payload, null, 2), 'utf8');
            console.log(`[Instagram Auth] 💾 Encrypted fresh, authenticated Instagram session to config/.instagram_session.enc!`);
            return true;
        } catch (e) {
            console.error('[Instagram Auth] Error persisting encrypted session:', e.message);
            return false;
        }
    }
}

module.exports = InstagramSessionStorage;
