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

    console.log(`✅ Session imported, saved to ${SESSION_PATH} and encrypted to config/.instagram_session.enc!`);
    return sessionData;
}

if (require.main === module) {
    const sessionid = process.argv[2];
    const csrftoken = process.argv[3];
    if (sessionid) {
        importSession({ sessionid, csrftoken });
    } else {
        console.log('Usage: node import_instagram_cookie.js <sessionid> [csrftoken]');
    }
}

module.exports = importSession;
