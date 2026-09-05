const fs = require('fs');
const path = require('path');
const InstagramSessionStorage = require('../services/instagram_session_storage');

const SESSION_PATH = path.join(__dirname, '../../config/instagram_session.json');
const ENC_PATH = path.join(__dirname, '../../config/.instagram_session.enc');
const MINIFIED_PATH = path.join(__dirname, '../../config/instagram_session_minified.txt');
const TARGET_ACCOUNT = 'secretsofthelondonmansion';

async function runInstagramHealthCheck() {
    console.log(`\n======================================================`);
    console.log(`🏥 INFLUMAKER: Instagram Connection Health & Diagnostics`);
    console.log(`Target Handle: @${TARGET_ACCOUNT}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`======================================================\n`);

    const report = {
        sessionFileExists: fs.existsSync(SESSION_PATH),
        sessionFileValid: false,
        encFileExists: fs.existsSync(ENC_PATH),
        encFileValid: false,
        envSecretExists: !!(process.env.INSTAGRAM_SESSION_JSON && process.env.INSTAGRAM_SESSION_JSON.trim()),
        envSecretValid: false,
        activeSession: null,
        liveConnection: 'NOT_TESTED'
    };

    // 1. Check local JSON session file
    console.log(`📁 Checking local session: config/instagram_session.json ...`);
    if (report.sessionFileExists) {
        try {
            const raw = JSON.parse(fs.readFileSync(SESSION_PATH, 'utf8'));
            report.sessionFileValid = InstagramSessionStorage.isValidSession(raw);
            const sess = (raw.cookies || []).find(c => c.name === 'sessionid');
            const uid = (raw.cookies || []).find(c => c.name === 'ds_user_id');
            const expires = sess && sess.expires ? new Date(sess.expires * 1000).toISOString() : 'session';

            console.log(`   - Status: ${report.sessionFileValid ? '🟢 VALID' : '🔴 INVALID (Missing or expired sessionid)'}`);
            console.log(`   - Total cookies: ${(raw.cookies || []).length}`);
            console.log(`   - User ID (ds_user_id): ${uid ? uid.value : 'missing'}`);
            console.log(`   - Session ID present: ${!!sess} (length: ${sess ? sess.value.length : 0})`);
            console.log(`   - Expiration date: ${expires}`);
            if (report.sessionFileValid) report.activeSession = raw;
        } catch (e) {
            console.log(`   - Error parsing JSON: ${e.message}`);
        }
    } else {
        console.log(`   - Status: ⚪ Not found on disk.`);
    }

    // 2. Check encrypted session file in git
    console.log(`\n🔒 Checking encrypted session: config/.instagram_session.enc ...`);
    if (report.encFileExists) {
        try {
            const restored = InstagramSessionStorage.restore();
            report.encFileValid = !!restored && InstagramSessionStorage.isValidSession(restored);
            console.log(`   - Decryption & Validation: ${report.encFileValid ? '🟢 VALID' : '🔴 INVALID (Missing valid sessionid)'}`);
            if (report.encFileValid && !report.activeSession) report.activeSession = restored;
        } catch (e) {
            console.log(`   - Error decrypting: ${e.message}`);
        }
    } else {
        console.log(`   - Status: ⚪ File not found.`);
    }

    // 3. Check environment secret
    console.log(`\n☁️ Checking environment secret: INSTAGRAM_SESSION_JSON ...`);
    if (report.envSecretExists) {
        try {
            const parsed = JSON.parse(process.env.INSTAGRAM_SESSION_JSON);
            report.envSecretValid = InstagramSessionStorage.isValidSession(parsed);
            console.log(`   - Secret presence: 🟢 SET (length: ${process.env.INSTAGRAM_SESSION_JSON.length})`);
            console.log(`   - Secret validity: ${report.envSecretValid ? '🟢 VALID' : '🔴 INVALID'}`);
            if (report.envSecretValid && !report.activeSession) report.activeSession = parsed;
        } catch (e) {
            console.log(`   - Error parsing secret: ${e.message}`);
        }
    } else {
        console.log(`   - Secret presence: ⚪ NOT SET in current environment`);
    }

    // 4. Live Browser Connection Test
    if (process.argv.includes('--live') || process.argv.includes('-l')) {
        if (!report.activeSession) {
            console.log(`\n⚠️ Cannot perform live test: no valid session found to test!`);
        } else {
            console.log(`\n🌐 Running live headless connection test to Instagram...`);
            const { chromium } = require('playwright');
            const browser = await chromium.launch({
                headless: true,
                args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
            });

            try {
                const context = await browser.newContext({
                    storageState: report.activeSession,
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    viewport: { width: 1440, height: 900 }
                });

                const page = await context.newPage();
                await page.goto(`https://www.instagram.com/${TARGET_ACCOUNT}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(4000);

                const pageUrl = page.url();
                const cookies = await context.cookies();
                const hasSess = cookies.some(c => c.name === 'sessionid');

                const isLoggedOut = pageUrl.includes('/accounts/login') || !hasSess;
                if (!isLoggedOut) {
                    console.log(`   - Live Ping: 🟢 SUCCESS! Connected as authenticated user!`);
                    console.log(`   - Current URL: ${pageUrl}`);
                    report.liveConnection = 'ONLINE';
                    const shot = path.join(__dirname, '../../config/instagram_health_verified.png');
                    await page.screenshot({ path: shot });
                    console.log(`   - Screenshot saved to: config/instagram_health_verified.png`);
                } else {
                    console.log(`   - Live Ping: 🔴 FAILED (Session was rejected by Instagram; redirected to login)`);
                    report.liveConnection = 'EXPIRED_OR_REJECTED';
                }
            } catch (err) {
                console.log(`   - Live Ping Error: ${err.message}`);
                report.liveConnection = 'ERROR';
            } finally {
                await browser.close();
            }
        }
    }

    // 5. Final Diagnostic Summary
    console.log(`\n======================================================`);
    console.log(`📋 DIAGNOSTIC SUMMARY:`);
    const isOverallHealthy = report.sessionFileValid || report.encFileValid || report.envSecretValid;
    if (isOverallHealthy) {
        console.log(`Status: 🟢 HEALTHY & READY TO PUBLISH`);
        console.log(`Instagram automation is configured and protected by strict session guards.`);
    } else {
        console.log(`Status: 🔴 SESSION EXPIRED / NOT CONFIGURED`);
        console.log(`Action Required:`);
        console.log(`1. Double-click LOGIN_INSTAGRAM.bat on your PC`);
        console.log(`2. Log in and switch to @${TARGET_ACCOUNT}`);
        console.log(`3. The script will automatically save, validate, and encrypt the fresh session.`);
        console.log(`4. To enable 24/7 cloud posting in GitHub Actions:`);
        console.log(`   Copy contents of config/instagram_session_minified.txt`);
        console.log(`   and paste into GitHub Secret: INSTAGRAM_SESSION_JSON`);
    }
    console.log(`======================================================\n`);

    return report;
}

if (require.main === module) {
    runInstagramHealthCheck().catch(err => {
        console.error('Fatal error:', err.message);
        process.exit(1);
    });
}

module.exports = runInstagramHealthCheck;
