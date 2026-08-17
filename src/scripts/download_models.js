const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS = {
    "epicrealism_naturalSinRC1VAE.safetensors": "https://huggingface.co/Justin-Choo/epiCRealism-Natural_Sin_RC1_VAE/resolve/main/epicrealism_naturalSinRC1VAE.safetensors",
    "ponyDiffusionV6XL_v6StartWithThisOne.safetensors": "https://huggingface.co/Runware/Pony_Diffusion_V6_XL/resolve/main/ponyDiffusionV6XL_v6StartWithThisOne.safetensors"
};

const OUTPUT_DIR = "D:\\ComfyUI_Models\\checkpoints";

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
                console.log(`Redirecting to: ${response.headers.location}`);
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function runDownloads() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    for (const [filename, url] of Object.entries(MODELS)) {
        const dest = path.join(OUTPUT_DIR, filename);
        if (fs.existsSync(dest) && fs.statSync(dest).size > 1000000) {
            console.log(`[+] ${filename} already exists, skipping.`);
            continue;
        }
        console.log(`[ ] Downloading ${filename}...`);
        try {
            await downloadFile(url, dest);
            console.log(`[+] Successfully downloaded ${filename}`);
        } catch (err) {
            console.error(`[-] Failed to download ${filename}: ${err.message}`);
        }
    }
    console.log("All downloads completed.");
}

runDownloads();
