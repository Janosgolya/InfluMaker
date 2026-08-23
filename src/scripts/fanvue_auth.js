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

const FanvueTokenStorage = require('../services/fanvue_token_storage');
const OFFICIAL_CLIENT_ID = '7W956X2fWJuFSugXDBwOl80ZMnt3fNyBmg9pJ20MgOD';

async function registerDynamicClient(port) {
    return { client_id: OFFICIAL_CLIENT_ID };
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
                            
                            // Persist to encrypted git-tracked storage and local .env
                            FanvueTokenStorage.save({
                                accessToken: tokens.access_token,
                                refreshToken: tokens.refresh_token,
                                clientId: OFFICIAL_CLIENT_ID
                            });

                            console.log(`💾 Tokens & Client ID encrypted and saved to config/.fanvue_auth.json and .env!`);

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
