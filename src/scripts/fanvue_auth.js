require('dotenv').config();
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function base64UrlEncode(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateCodeVerifier() {
    return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return base64UrlEncode(hash);
}

async function registerDynamicClient(port) {
    const clientData = JSON.stringify({
        client_name: "InfluMaker Ana Agent",
        redirect_uris: [`http://localhost:${port}/oauth/callback`],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: "fanvue_mcp:read fanvue_mcp:write"
    });

    return new Promise((resolve, reject) => {
        const req = https.request('https://auth.mcp.fanvue.com/oauth2/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(clientData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.client_id) {
                        resolve(json);
                    } else {
                        // Fallback client ID if open registration is bypassed
                        resolve({ client_id: 'V-d7H5jF6uLNiNuQlSw37pY0Oj-3_I8nFqBUl0ZjC2h' });
                    }
                } catch (e) {
                    resolve({ client_id: 'V-d7H5jF6uLNiNuQlSw37pY0Oj-3_I8nFqBUl0ZjC2h' });
                }
            });
        });
        req.on('error', () => resolve({ client_id: 'V-d7H5jF6uLNiNuQlSw37pY0Oj-3_I8nFqBUl0ZjC2h' }));
        req.write(clientData);
        req.end();
    });
}

async function startOAuthFlow() {
    const port = 57280;
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID();

    console.log(`\n======================================================`);
    console.log(`🔐 INFLUMAKER: Fanvue OAuth Authentication Assistant`);
    console.log(`======================================================`);

    const clientReg = await registerDynamicClient(port);
    const clientId = clientReg.client_id;

    const authUrl = `https://auth.mcp.fanvue.com/oauth2/auth?response_type=code&client_id=${clientId}&code_challenge=${codeChallenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(`http://localhost:${port}/oauth/callback`)}&state=${state}&scope=fanvue_mcp%3Aread+fanvue_mcp%3Awrite&resource=https%3A%2F%2Fmcp.fanvue.com%2Fmcp`;

    const server = http.createServer(async (req, res) => {
        const reqUrl = new URL(req.url, `http://localhost:${port}`);
        
        if (reqUrl.pathname === '/oauth/callback') {
            const code = reqUrl.searchParams.get('code');
            const returnedState = reqUrl.searchParams.get('state');
            const error = reqUrl.searchParams.get('error');

            if (error) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<h1>Błąd logowania Fanvue: ${error}</h1>`);
                console.error(`❌ Fanvue OAuth error: ${error}`);
                server.close();
                return;
            }

            if (!code) {
                res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<h1>Brak kodu autoryzacyjnego.</h1>`);
                server.close();
                return;
            }

            console.log(`\n[OAuth] 🔑 Authorization code received! Exchanging for tokens...`);

            // Exchange authorization code for token
            const tokenParams = new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `http://localhost:${port}/oauth/callback`,
                client_id: clientId,
                code_verifier: codeVerifier,
                resource: 'https://mcp.fanvue.com/mcp'
            });

            const tokenPostData = tokenParams.toString();

            const tokenReq = https.request('https://auth.mcp.fanvue.com/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(tokenPostData)
                }
            }, (tokenRes) => {
                let tokenData = '';
                tokenRes.on('data', chunk => tokenData += chunk);
                tokenRes.on('end', () => {
                    try {
                        const tokens = JSON.parse(tokenData);
                        if (tokens.access_token) {
                            console.log(`\n🎉 SUCCESS: Fanvue Access Token Acquired!`);
                            
                            // Save tokens to .env
                            const envPath = path.join(__dirname, '../../.env');
                            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

                            if (clientId) {
                                if (envContent.includes('FANVUE_CLIENT_ID=')) {
                                    envContent = envContent.replace(/FANVUE_CLIENT_ID=.*/, `FANVUE_CLIENT_ID=${clientId}`);
                                } else {
                                    envContent += `\nFANVUE_CLIENT_ID=${clientId}`;
                                }
                            }

                            if (envContent.includes('FANVUE_ACCESS_TOKEN=')) {
                                envContent = envContent.replace(/FANVUE_ACCESS_TOKEN=.*/, `FANVUE_ACCESS_TOKEN=${tokens.access_token}`);
                            } else {
                                envContent += `\nFANVUE_ACCESS_TOKEN=${tokens.access_token}`;
                            }

                            if (tokens.refresh_token) {
                                if (envContent.includes('FANVUE_REFRESH_TOKEN=')) {
                                    envContent = envContent.replace(/FANVUE_REFRESH_TOKEN=.*/, `FANVUE_REFRESH_TOKEN=${tokens.refresh_token}`);
                                } else {
                                    envContent += `\nFANVUE_REFRESH_TOKEN=${tokens.refresh_token}`;
                                }
                            }

                            fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
                            console.log(`💾 Tokens & Client ID saved to .env file!`);

                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(`
                                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                                    <h1 style="color: #2e7d32;">🎉 Sukces! Fanvue połączone z InfluMaker</h1>
                                    <p style="font-size: 18px;">Token autoryzacyjny został zapisany. Możesz zamknąć tę kartę i wrócić do terminala.</p>
                                </div>
                            `);
                        } else {
                            console.error(`❌ Token exchange error:`, tokenData);
                            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(`<h1>Błąd wymiany tokenu: ${tokenData}</h1>`);
                        }
                    } catch (e) {
                        console.error(`❌ Parse token error:`, e.message);
                        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(`<h1>Błąd serwera.</h1>`);
                    }
                    setTimeout(() => server.close(), 1000);
                });
            });

            tokenReq.on('error', (err) => {
                console.error(`❌ Token request error:`, err.message);
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<h1>Błąd połączenia: ${err.message}</h1>`);
                server.close();
            });

            tokenReq.write(tokenPostData);
            tokenReq.end();
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n❌ BŁĄD: Port ${port} jest obecnie zajęty przez inny proces.`);
            console.error(`Uruchom login_fanvue.bat, który automatycznie zwolni port 57280 i wznowi autoryzację.\n`);
        } else {
            console.error(`❌ Błąd serwera lokalnego:`, err.message);
        }
    });

    server.listen(port, () => {
        console.log(`🌐 Callback listener active at http://localhost:${port}/oauth/callback`);
        console.log(`👉 Otwórz poniższy link w przeglądarce, aby się zalogować:\n`);
        console.log(authUrl);
        console.log(`\n======================================================`);

        // Automatically open URL in default browser
        exec(`start "" "${authUrl}"`);
    });
}

startOAuthFlow();
