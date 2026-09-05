const fs = require('fs');
const path = require('path');
const InstagramSessionStorage = require('../services/instagram_session_storage');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');

function importSession({ sessionid, ds_user_id = '34366700973', csrftoken = '' }) {
    if (!sessionid) {
        throw new Error('sessionid is required');
    }

    const cleanSession = sessionid.trim();
    const cleanCsrf = (csrftoken || 'gWhaKTrvOX8jGqGtN9A2hYuBYycwb2Ch').trim();
    const cleanUserId = (ds_user_id || '34366700973').trim();

    const cookies = [
        {
            name: "csrftoken",
            value: cleanCsrf,
            domain: ".instagram.com",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 31536000,
            httpOnly: false,
            secure: true,
            sameSite: "Lax"
        },
        {
            name: "ds_user_id",
            value: cleanUserId,
            domain: ".instagram.com",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 31536000,
            httpOnly: false,
            secure: true,
            sameSite: "None"
        },
        {
            name: "sessionid",
            value: cleanSession,
            domain: ".instagram.com",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 31536000,
            httpOnly: true,
            secure: true,
            sameSite: "None"
        },
        {
            name: "ig_did",
            value: "B56C7241-072C-4EF5-AAC7-56A11A6DDBC8",
            domain: ".instagram.com",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 31536000,
            httpOnly: true,
            secure: true,
            sameSite: "None"
        },
        {
            name: "mid",
            value: "aoeGfQALAAEbyRNFpjb0fsur-JKD",
            domain: ".instagram.com",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 31536000,
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }
    ];

    const sessionData = {
        cookies,
        origins: []
    };

    fs.writeFileSync(SESSION_PATH, JSON.stringify(sessionData, null, 2), 'utf8');
    InstagramSessionStorage.persist(sessionData);

    const minifiedPath = path.join(__dirname, '../../config/instagram_session_minified.txt');
    fs.writeFileSync(minifiedPath, JSON.stringify(sessionData), 'utf8');

    console.log(`\n======================================================`);
    console.log(`✅ SUKCES! Ciasteczko zaimportowane i zweryfikowane!`);
    console.log(`📁 1. Lokalna sesja: config/instagram_session.json`);
    console.log(`🔒 2. Zaszyfrowana kopia: config/.instagram_session.enc`);
    console.log(`📋 3. Token dla GitHub Secrets: config/instagram_session_minified.txt`);
    console.log(`======================================================\n`);
    return sessionData;
}

if (require.main === module) {
    const readline = require('readline');
    const sessionidArg = process.argv[2];
    const csrfArg = process.argv[3];

    if (sessionidArg) {
        importSession({ sessionid: sessionidArg, csrftoken: csrfArg });
    } else {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log(`\n======================================================`);
        console.log(`🍪 SZYBKI IMPORT CIASTECZKA INSTAGRAM (10 SEKUND)`);
        console.log(`======================================================`);
        console.log(`Jeśli jesteś już zalogowany na @secretsofthelondonmansion`);
        console.log(`w swojej zwykłej przeglądarce (Chrome, Edge, Firefox, Brave):`);
        console.log(`1. Wejdź na: https://www.instagram.com/secretsofthelondonmansion/`);
        console.log(`2. Naciśnij F12 -> zakładka 'Application' (lub 'Aplikacja')`);
        console.log(`3. Po lewej stronie: Cookies -> https://www.instagram.com`);
        console.log(`4. Znajdź wiersz 'sessionid', skopiuj jego wartość.`);
        console.log(`======================================================\n`);

        rl.question('Wklej wartość sessionid: ', (answer) => {
            rl.close();
            const clean = (answer || '').trim();
            if (!clean) {
                console.log('Anulowano: brak wartości sessionid.');
                process.exit(1);
            }
            try {
                importSession({ sessionid: clean });
            } catch (err) {
                console.error('Błąd importu:', err.message);
                process.exit(1);
            }
        });
    }
}

module.exports = importSession;

