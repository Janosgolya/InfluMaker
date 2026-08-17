const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

// Instagram private API login (mobile app endpoint - not detected as bot)
function instagramLogin(username, password) {
    return new Promise((resolve, reject) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const deviceId = 'android-' + crypto.randomBytes(8).toString('hex');

        const postData = new URLSearchParams({
            username: username,
            password: password,
            device_id: deviceId,
            login_attempt_count: '0'
        }).toString();

        const options = {
            hostname: 'i.instagram.com',
            path: '/api/v1/accounts/login/',
            method: 'POST',
            headers: {
                'User-Agent': 'Instagram 319.0.0.34.109 Android (28/9; 411dpi; 1080x2220; Xiaomi; Mi 8; dipper; qcom; en_US; 545689048)',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'X-IG-Device-ID': deviceId,
                'X-IG-Android-ID': deviceId,
                'Accept': '*/*',
                'Accept-Language': 'en-US'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Response status: ${res.statusCode}`);
                const cookies = res.headers['set-cookie'] || [];
                const sessionCookie = cookies.find(c => c.startsWith('sessionid='));
                const userIdCookie = cookies.find(c => c.startsWith('ds_user_id='));

                if (sessionCookie) {
                    const sessionId = sessionCookie.split(';')[0].replace('sessionid=', '');
                    const userId = userIdCookie ? userIdCookie.split(';')[0].replace('ds_user_id=', '') : '';
                    resolve({ sessionId, userId, cookies, rawData: data });
                } else {
                    try {
                        const parsed = JSON.parse(data);
                        reject(new Error(parsed.message || parsed.error_type || JSON.stringify(parsed)));
                    } catch (e) {
                        reject(new Error(`No session. Status: ${res.statusCode}. Body: ${data.substring(0, 300)}`));
                    }
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function main() {
    console.log(`📸 Logging in to @secretsofthelondonmansion via Instagram API...`);
    try {
        const { sessionId, userId, cookies } = await instagramLogin('secretsofthelondonmansion', 'Blackstork2026!#');
        console.log(`✅ Login successful!`);
        console.log(`User ID: ${userId}`);
        console.log(`Session ID: ${sessionId.substring(0, 20)}...`);

        // Build storage state format (same as Playwright storageState)
        const storageState = {
            cookies: cookies.map(cookieStr => {
                const parts = cookieStr.split(';').map(p => p.trim());
                const [nameVal, ...rest] = parts;
                const [name, ...valParts] = nameVal.split('=');
                const value = valParts.join('=');
                const domainPart = rest.find(p => p.toLowerCase().startsWith('domain='));
                const pathPart = rest.find(p => p.toLowerCase().startsWith('path='));
                const securePart = rest.some(p => p.toLowerCase() === 'secure');
                const httpOnlyPart = rest.some(p => p.toLowerCase() === 'httponly');
                return {
                    name: name.trim(),
                    value,
                    domain: domainPart ? domainPart.split('=')[1] : '.instagram.com',
                    path: pathPart ? pathPart.split('=')[1] : '/',
                    expires: -1,
                    httpOnly: httpOnlyPart,
                    secure: securePart,
                    sameSite: 'Lax'
                };
            }),
            origins: []
        };

        fs.writeFileSync(SESSION_PATH, JSON.stringify(storageState, null, 2));
        console.log(`💾 Session saved to config/instagram_session.json`);
    } catch (err) {
        console.error(`❌ Login failed: ${err.message}`);
        process.exit(1);
    }
}

main();
