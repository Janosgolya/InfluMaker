const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log(`\n======================================================`);
console.log(`🔐 GITHUB ACTIONS SECRETS CONFIGURATION`);
console.log(`Repository: https://github.com/Janosgolya/InfluMaker/settings/secrets/actions`);
console.log(`======================================================\n`);

const envPath = path.join(__dirname, '../../.env');
const igPath = path.join(__dirname, '../../config/instagram_session.json');
const ttPath = path.join(__dirname, '../../config/tiktok_session.json');

console.log(`1️⃣ Secret Name: FANVUE_ACCESS_TOKEN`);
console.log(`Value:`);
console.log(process.env.FANVUE_ACCESS_TOKEN || '(not set)');
console.log(`\n------------------------------------------------------\n`);

console.log(`2️⃣ Secret Name: FANVUE_REFRESH_TOKEN`);
console.log(`Value:`);
console.log(process.env.FANVUE_REFRESH_TOKEN || '(not set)');
console.log(`\n------------------------------------------------------\n`);

console.log(`3️⃣ Secret Name: INSTAGRAM_SESSION_JSON`);
if (fs.existsSync(igPath)) {
    console.log(`Value:`);
    console.log(fs.readFileSync(igPath, 'utf8').trim());
} else {
    console.log(`(file config/instagram_session.json not found)`);
}
console.log(`\n------------------------------------------------------\n`);

console.log(`4️⃣ Secret Name: TIKTOK_SESSION_JSON`);
if (fs.existsSync(ttPath)) {
    console.log(`Value:`);
    console.log(fs.readFileSync(ttPath, 'utf8').trim());
} else {
    console.log(`(file config/tiktok_session.json not found)`);
}
console.log(`\n------------------------------------------------------\n`);

const pinPath = path.join(__dirname, '../../config/pinterest_session.json');
console.log(`5️⃣ Secret Name: PINTEREST_SESSION_JSON`);
if (fs.existsSync(pinPath)) {
    console.log(`Value:`);
    console.log(fs.readFileSync(pinPath, 'utf8').trim());
} else {
    console.log(`(file config/pinterest_session.json not found - run 'node src/scripts/pinterest_browser_login.js' first)`);
}
console.log(`\n======================================================\n`);
