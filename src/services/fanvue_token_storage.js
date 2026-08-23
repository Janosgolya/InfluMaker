const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_FILE = path.join(__dirname, '../../config/.fanvue_auth.json');
const DEFAULT_CLIENT_ID = '7W956X2fWJuFSugXDBwOl80ZMnt3fNyBmg9pJ20MgOD';

function getEncryptionKey() {
    const secret = process.env.GEMINI_API_KEY || 'influmaker_fanvue_secure_key_2026';
    return crypto.createHash('sha256').update(secret).digest();
}

class FanvueTokenStorage {
    static load() {
        // 1. Try reading encrypted auth file first (persisted in git)
        if (fs.existsSync(AUTH_FILE)) {
            try {
                const raw = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
                if (raw.iv && raw.data && raw.tag) {
                    const key = getEncryptionKey();
                    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'hex'));
                    decipher.setAuthTag(Buffer.from(raw.tag, 'hex'));
                    let decrypted = decipher.update(raw.data, 'hex', 'utf8');
                    decrypted += decipher.final('utf8');
                    const parsed = JSON.parse(decrypted);
                    if (parsed.refreshToken || parsed.accessToken) {
                        console.log(`[Fanvue Auth] 🔑 Loaded persisted tokens from config/.fanvue_auth.json (updated: ${parsed.updatedAt})`);
                        return parsed;
                    }
                }
            } catch (e) {
                console.warn('[Fanvue Auth] Warning: could not decrypt .fanvue_auth.json, falling back to environment variables.');
            }
        }

        // 2. Fallback to process.env
        return {
            accessToken: process.env.FANVUE_ACCESS_TOKEN || null,
            refreshToken: process.env.FANVUE_REFRESH_TOKEN || null,
            clientId: process.env.FANVUE_CLIENT_ID || DEFAULT_CLIENT_ID
        };
    }

    static save(tokens) {
        try {
            const dataToSave = {
                accessToken: tokens.accessToken || null,
                refreshToken: tokens.refreshToken || null,
                clientId: tokens.clientId || DEFAULT_CLIENT_ID,
                updatedAt: new Date().toISOString()
            };

            const key = getEncryptionKey();
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            let encrypted = cipher.update(JSON.stringify(dataToSave), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const tag = cipher.getAuthTag();

            const payload = {
                iv: iv.toString('hex'),
                data: encrypted,
                tag: tag.toString('hex'),
                updatedAt: dataToSave.updatedAt
            };

            const configDir = path.dirname(AUTH_FILE);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(AUTH_FILE, JSON.stringify(payload, null, 2), 'utf8');
            console.log(`[Fanvue Auth] 💾 Rotated tokens encrypted and persisted to config/.fanvue_auth.json!`);

            // Also update .env locally if exists
            const envPath = path.join(__dirname, '../../.env');
            if (fs.existsSync(envPath)) {
                let envContent = fs.readFileSync(envPath, 'utf8');
                if (tokens.accessToken) envContent = envContent.replace(/FANVUE_ACCESS_TOKEN=.*/, `FANVUE_ACCESS_TOKEN=${tokens.accessToken}`);
                if (tokens.refreshToken) envContent = envContent.replace(/FANVUE_REFRESH_TOKEN=.*/, `FANVUE_REFRESH_TOKEN=${tokens.refreshToken}`);
                fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
            }
        } catch (e) {
            console.error('[Fanvue Auth] Error persisting token storage:', e.message);
        }
    }
}

module.exports = FanvueTokenStorage;
