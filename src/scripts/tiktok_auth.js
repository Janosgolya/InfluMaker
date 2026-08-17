require('dotenv').config();
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('hex');
}

function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('hex');
}

async function startTikTokOAuth() {
    const port = 57285;
    const clientKey = process.env.TIKTOK_CLIENT_KEY || 'awxyz_influmaker_betty';
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET || '';
    const redirectUri = `http://localhost:${port}/oauth/tiktok/callback`;
    const state = crypto.randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    console.log(`\n======================================================`);
    console.log(`🔐 INFLUMAKER: TikTok Content Posting API OAuth Helper`);
    console.log(`======================================================`);

    const scopes = 'user.info.basic,video.publish,video.upload';
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    const server = http.createServer(async (req, res) => {
        const reqUrl = new URL(req.url, `http://localhost:${port}`);

        if (reqUrl.pathname === '/oauth/tiktok/callback') {
            const code = reqUrl.searchParams.get('code');
            const error = reqUrl.searchParams.get('error');

            if (error) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<h1>Błąd logowania TikTok: ${error}</h1>`);
                console.error(`❌ TikTok OAuth error: ${error}`);
                server.close();
                return;
            }

            if (!code) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<h1>Brak kodu autoryzacyjnego.</h1>`);
                server.close();
                return;
            }

            console.log(`[TikTok OAuth] 🔑 Authorization code received! Exchanging for access token...`);

            const tokenParams = new URLSearchParams({
                client_key: clientKey,
                client_secret: clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code_verifier: codeVerifier
            });

            const postData = tokenParams.toString();

            const tokenReq = https.request('https://open.tiktokapis.com/v2/oauth/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'Cache-Control': 'no-cache'
                }
            }, (tokenRes) => {
                let tokenData = '';
                tokenRes.on('data', chunk => tokenData += chunk);
                tokenRes.on('end', () => {
                    try {
                        const json = JSON.parse(tokenData);
                        if (json.data && json.data.access_token) {
                            const tokens = json.data;
                            console.log(`\n🎉 SUCCESS: TikTok Access Token Acquired!`);

                            const envPath = path.join(__dirname, '../../.env');
                            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

                            if (envContent.includes('TIKTOK_ACCESS_TOKEN=')) {
                                envContent = envContent.replace(/TIKTOK_ACCESS_TOKEN=.*/, `TIKTOK_ACCESS_TOKEN=${tokens.access_token}`);
                            } else {
                                envContent += `\nTIKTOK_ACCESS_TOKEN=${tokens.access_token}`;
                            }

                            if (tokens.refresh_token) {
                                if (envContent.includes('TIKTOK_REFRESH_TOKEN=')) {
                                    envContent = envContent.replace(/TIKTOK_REFRESH_TOKEN=.*/, `TIKTOK_REFRESH_TOKEN=${tokens.refresh_token}`);
                                } else {
                                    envContent += `\nTIKTOK_REFRESH_TOKEN=${tokens.refresh_token}`;
                                }
                            }

                            if (tokens.open_id) {
                                if (envContent.includes('TIKTOK_OPEN_ID=')) {
                                    envContent = envContent.replace(/TIKTOK_OPEN_ID=.*/, `TIKTOK_OPEN_ID=${tokens.open_id}`);
                                } else {
                                    envContent += `\nTIKTOK_OPEN_ID=${tokens.open_id}`;
                                }
                            }

                            fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
                            console.log(`💾 TikTok tokens saved to .env file!`);

                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(`
                                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                                    <h1 style="color: #fe2c55;">🎉 Sukces! TikTok połączony z InfluMaker</h1>
                                    <p style="font-size: 18px;">Token autoryzacyjny został zapisany. Możesz zamknąć tę kartę.</p>
                                </div>
                            `);
                        } else {
                            console.error(`❌ Token exchange error:`, tokenData);
                            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(`<h1>Błąd wymiany tokenu: ${tokenData}</h1>`);
                        }
                    } catch (e) {
                        console.error(`❌ Parse error:`, e.message);
                        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`<h1>Błąd serwera.</h1>`);
                    }
                    setTimeout(() => server.close(), 1000);
                });
            });

            tokenReq.on('error', (err) => {
                console.error(`❌ Connection error:`, err.message);
                server.close();
            });

            tokenReq.write(postData);
            tokenReq.end();
        }
    });

    server.listen(port, () => {
        console.log(`🌐 Callback listener active at ${redirectUri}`);
        console.log(`👉 Aby autoryzować TikToka, przejdź do:\n`);
        console.log(authUrl);
        console.log(`\n======================================================`);
        exec(`start "" "${authUrl}"`);
    });
}

if (require.main === module) {
    startTikTokOAuth();
}

module.exports = startTikTokOAuth;
