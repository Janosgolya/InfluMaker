require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const rawGenDir = 'D:/AntigravityProjects/InfluMaker/BettyRyal_18centuryServant/RawGenerations';
const selectedDir = 'D:/AntigravityProjects/InfluMaker/Selected_Content';
const rejectedDir = 'D:/AntigravityProjects/InfluMaker/Rejected_Slop';

// Clear selected and rejected folders as requested
function clearFolders() {
    const dirsToClear = [selectedDir, rejectedDir];
    dirsToClear.forEach(dir => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const itemPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(itemPath);
            }
        }
        console.log(`Cleared ${dir}`);
    });
}

// Ollama API call
async function callOllama(model, base64Image, prompt) {
    const body = JSON.stringify({
        model: model,
        prompt: prompt,
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
                try {
                    resolve(JSON.parse(data).response || '');
                } catch(e) {
                    reject(new Error(`Ollama parse error for ${model}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(body);
        req.end();
    });
}

// Gemini API call
async function callGemini(modelName, genAI, mimeType, base64Image, prompt) {
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType, data: base64Image } }
        ]);
        return result.response.text();
    } catch (err) {
        if (err.status === 429) {
            throw new Error('QUOTA_REACHED');
        }
        throw err;
    }
}

async function runComparison() {
    clearFolders();

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    const files = fs.readdirSync(rawGenDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.jfif'].includes(ext);
    });

    console.log(`Found ${files.length} images. Starting comparison test...\n`);

    const models = [
        { name: 'qwen2.5vl', type: 'ollama' }
    ];

    const resultsFile = path.join(__dirname, 'vision_model_comparison.md');
    fs.writeFileSync(resultsFile, '# Vision Model Comparison Results\n\n');

    const prompt = `You are a strict image auditor for an 18th-century period drama project.
Analyze this image and describe exactly what you see.
Format:
DESCRIPTION: [What is visible? Persons, nudity, modern artifacts?]
QUALITY: [1-10]
SENSUALITY: [1-10, where 6+ is nudity]
CATEGORY: [SFW or NSFW]
AI_SLOP: [YES/NO - is there deformed anatomy or plastic AI textures?]`;

    let quotaReached = false;

    for (let i = 0; i < files.length; i++) {
        if (quotaReached) break;

        const file = files[i];
        const filepath = path.join(rawGenDir, file);
        const ext = path.extname(file).toLowerCase();
        const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.jfif': 'image/jpeg' };
        const mimeType = mimeTypes[ext] || 'image/jpeg';
        
        const imageBuffer = fs.readFileSync(filepath);
        const base64Image = imageBuffer.toString('base64');

        console.log(`\n=== Testing Image: ${file} ===`);
        fs.appendFileSync(resultsFile, `\n## Image: ${file}\n\n`);

        for (const model of models) {
            if (quotaReached) break;
            if (model.type === 'gemini' && !genAI) {
                console.log(`Skipping ${model.name} - No API Key`);
                continue;
            }

            console.log(`  -> Asking ${model.name}...`);
            let responseText = '';
            
            try {
                if (model.type === 'ollama') {
                    responseText = await callOllama(model.name, base64Image, prompt);
                } else if (model.type === 'gemini') {
                    responseText = await callGemini(model.name, genAI, mimeType, base64Image, prompt);
                }
                
                fs.appendFileSync(resultsFile, `### Model: ${model.name}\n${responseText.trim()}\n\n`);
                console.log(`     Done.`);
            } catch (err) {
                if (err.message === 'QUOTA_REACHED' || (err.status && err.status === 429)) {
                    console.log(`     QUOTA REACHED for ${model.name}. Stopping test.`);
                    fs.appendFileSync(resultsFile, `### Model: ${model.name}\n**QUOTA REACHED**\n\n`);
                    quotaReached = true;
                } else {
                    console.log(`     ERROR: ${err.message}`);
                    fs.appendFileSync(resultsFile, `### Model: ${model.name}\n**ERROR: ${err.message}**\n\n`);
                }
            }
        }
        
        // Test 10 images for side-by-side comparison
        if (i >= 9) {
            console.log(`\nCompleted 10 test images for side-by-side comparison.`);
            break;
        }
    }
    console.log(`\nTest finished. Results written to ${resultsFile}`);
}

runComparison();
