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
     * Restore session to config/instagram_session.json:
     * 1. First priority: decrypt config/.instagram_session.enc (persisted and rotated in git)
     * 2. Second priority: read process.env.INSTAGRAM_SESSION_JSON (from GitHub Secrets)
     * 3. Third priority: existing config/instagram_session.json
     */
    static restore() {
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
                            if (parsed.cookies && parsed.cookies.length > 0) {
                                fs.writeFileSync(JSON_FILE, JSON.stringify(parsed, null, 2), 'utf8');
                                console.log(`[Instagram Auth] 🔑 Decrypted and restored session from config/.instagram_session.enc (updated: ${raw.updatedAt || 'recent'})`);
                                return parsed;
                            }
                        } catch (err) {
                            // Try next candidate key
                        }
                    }
                    console.warn(`[Instagram Auth] Warning: none of candidate keys could decrypt .instagram_session.enc.`);
                }
            } catch (e) {
                console.warn(`[Instagram Auth] Warning: could not parse .instagram_session.enc (${e.message}).`);
            }
        }

        if (process.env.INSTAGRAM_SESSION_JSON && process.env.INSTAGRAM_SESSION_JSON.trim()) {
            try {
                const parsed = JSON.parse(process.env.INSTAGRAM_SESSION_JSON);
                if (parsed.cookies && parsed.cookies.length > 0) {
                    fs.writeFileSync(JSON_FILE, JSON.stringify(parsed, null, 2), 'utf8');
                    console.log(`[Instagram Auth] 🔑 Restored session from INSTAGRAM_SESSION_JSON secret.`);
                    return parsed;
                }
            } catch (e) {}
        }

        if (fs.existsSync(JSON_FILE)) {
            try {
                return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
            } catch (e) {}
        }

        return null;
    }

    /**
     * Encrypt and persist storage state to config/.instagram_session.enc for git tracking
     */
    static persist(storageStateData = null) {
        try {
            let data = storageStateData;
            if (!data && fs.existsSync(JSON_FILE)) {
                data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
            }
            if (!data) return;

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
            console.log(`[Instagram Auth] 💾 Encrypted fresh Instagram session to config/.instagram_session.enc!`);
        } catch (e) {
            console.error('[Instagram Auth] Error persisting encrypted session:', e.message);
        }
    }
}

module.exports = InstagramSessionStorage;
