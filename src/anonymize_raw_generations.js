const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rawGenDir = 'd:/AntigravityProjects/InfluMaker/BettyRyal_18centuryServant/RawGenerations';
const mappingFile = 'd:/AntigravityProjects/InfluMaker/config/anonymization_mapping.json';

if (!fs.existsSync(rawGenDir)) {
    console.error("RawGenerations folder not found!");
    process.exit(1);
}

const files = fs.readdirSync(rawGenDir).filter(f => {
    const full = path.join(rawGenDir, f);
    return fs.statSync(full).isFile() && !f.startsWith('.');
});

const mapping = {};
let count = 0;

for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const hash = crypto.randomBytes(4).toString('hex').toUpperCase();
    const newName = `IMG_${hash}${ext}`;
    
    const srcPath = path.join(rawGenDir, file);
    const destPath = path.join(rawGenDir, newName);

    // Prevent collision
    if (!fs.existsSync(destPath)) {
        fs.renameSync(srcPath, destPath);
        mapping[newName] = file;
        count++;
    }
}

fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
console.log(`✅ Anonymized ${count} files in RawGenerations! Saved mapping log to ${mappingFile}.`);
