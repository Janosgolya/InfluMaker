const fs = require('fs');
const http = require('http');
const path = require('path');

const rawGenDir = 'D:/AntigravityProjects/InfluMaker/BettyRyal_18centuryServant/RawGenerations';
// Pick 3 files - one jpeg scene, one png, one webp
const files = fs.readdirSync(rawGenDir).filter(f => fs.statSync(path.join(rawGenDir, f)).isFile());
const jpegs = files.filter(f => f.endsWith('.jpeg')).slice(0, 1);
const pngs = files.filter(f => f.endsWith('.png')).slice(0, 1);
const webps = files.filter(f => f.endsWith('.webp')).slice(0, 1);
const testFiles = [...jpegs, ...pngs, ...webps];

async function callVision(filepath) {
    const imageBuffer = fs.readFileSync(filepath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(filepath).toLowerCase();
    const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    
    const body = JSON.stringify({
        model: 'llava:7b',
        prompt: `You are a strict image quality auditor and content classifier for a historical period drama project set in 18th-century London.

Analyze this image and respond with EXACTLY this format (fill in each section):

DESCRIPTION: [2-3 sentences describing exactly what you see - persons, clothing, setting, lighting, actions]

QUALITY: [number 1-10 where 1=terrible/blurry/distorted, 10=museum fine art photography]
QUALITY_REASON: [1 sentence explaining the quality score]

SENSUALITY: [number 1-10 where 1=fully clothed everyday scene, 6+=nudity present, 10=explicit sexual content]
SENSUALITY_REASON: [1 sentence explaining the sensuality score]

CATEGORY: [SFW or NSFW]

THEME: [MORNING or MIDDAY or PREP or NIGHT]
THEME_REASON: [1 sentence explaining why this theme]

ISSUES: [List any problems: AI artifacts, distortion, modern elements, poor quality, or NONE]`,
        images: [base64Image],
        stream: false
    });

    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 11434,
            path: '/api/generate', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data).response || ''); }
                catch(e) { reject(new Error('Parse error: ' + data.substring(0,200))); }
            });
        });
        req.on('error', reject);
        req.setTimeout(90000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(body);
        req.end();
    });
}

async function main() {
    console.log(`Testing real vision on ${testFiles.length} images...\n`);
    for (const file of testFiles) {
        const filepath = path.join(rawGenDir, file);
        const sizeKB = (fs.statSync(filepath).size / 1024).toFixed(1);
        console.log(`\n=== ${file} (${sizeKB} KB) ===`);
        try {
            const response = await callVision(filepath);
            console.log(response);
        } catch(err) {
            console.error('ERROR:', err.message);
        }
    }
}

main();
