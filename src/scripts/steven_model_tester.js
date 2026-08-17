const fs = require('fs');
const path = require('path');
const http = require('http');

const TEST_DIR = path.join(__dirname, '..', '..', 'RawGenerations', 'Generations_Test');
const COMFYUI_URL = 'http://127.0.0.1:8188/prompt';
const HF_API_URL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';
const HF_TOKEN = process.env.HF_TOKEN || ''; // Ensure HF_TOKEN is in environment if using pipeline A

// The shared testing prompt
const PROMPT = "A highly detailed, museum-quality oil painting photography of a beautiful 18th-century woman in a dimly lit tavern, wearing a historically accurate corset and primitive lacing, sitting by a fireplace with lit candles, cinematic lighting, ultra realistic.";

// Helper to save base64/binary to file
function saveImage(filename, buffer) {
    if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(TEST_DIR, filename), buffer);
    console.log(`✅ Saved: ${filename}`);
}

async function testHuggingFaceAPI() {
    console.log("Testing Pipeline A: Hugging Face API (Flux-schnell)...");
    if (!HF_TOKEN) {
        console.log("⚠️ No HF_TOKEN found in environment. Skipping Hugging Face API test.");
        return;
    }
    
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(HF_API_URL, {
            headers: {
                Authorization: `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ inputs: PROMPT }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        saveImage('hf_flux_schnell_test.png', Buffer.from(buffer));
    } catch (err) {
        console.error("❌ Hugging Face API failed:", err.message);
    }
}

async function testComfyUI(workflowFile, outputName) {
    console.log(`Testing Pipeline B: Local ComfyUI (${outputName})...`);
    
    if (!fs.existsSync(workflowFile)) {
        console.log(`⚠️ Workflow file not found: ${workflowFile}. Skipping.`);
        return;
    }
    
    // Read and parse the API workflow JSON
    const workflowStr = fs.readFileSync(workflowFile, 'utf8');
    let workflow;
    try {
        workflow = JSON.parse(workflowStr);
    } catch (e) {
        console.error(`❌ Failed to parse workflow JSON: ${e.message}`);
        return;
    }
    
    // Inject the prompt and Betty image dynamically
    let promptInjected = false;
    for (const key in workflow) {
        const node = workflow[key];
        
        // Inject Prompt
        if (node.class_type === 'CLIPTextEncode' && node.inputs) {
            // Usually the positive prompt has a larger text or we just inject into all to be safe?
            // A simple heuristic: inject into the first one we find, or any that contain empty text.
            if (!promptInjected) {
                if (node.inputs.text !== undefined) {
                    node.inputs.text = PROMPT;
                    promptInjected = true;
                }
            }
        }
        
        // Inject Betty Image Reference
        if (node.class_type === 'LoadImage' && node.inputs) {
            if (node.inputs.image !== undefined) {
                node.inputs.image = 'betty_ref.jpeg';
            }
        }
    }
    
    // ComfyUI /prompt endpoint expects { prompt: { ... } }
    const payload = JSON.stringify({ prompt: workflow });
    
    // Send to ComfyUI API
    const req = http.request(COMFYUI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`✅ Sent to ComfyUI. Job Response: ${data}`);
            console.log(`Please check your ComfyUI 'output' folder for the result of ${outputName}.`);
        });
    });
    
    req.on('error', (e) => {
        console.error(`❌ ComfyUI API failed: ${e.message}`);
    });
    
    req.write(payload);
    req.end();
}

async function runBenchmark() {
    console.log("Starting Steven's Automated Model Benchmark\n============================================");
    
    // Test API
    await testHuggingFaceAPI();
    
    // Test Local Workflows using the new API format JSONs
    const fluxWorkflow = 'I:\\\\ComfyUI_windows_portable\\\\Workflows\\\\Flux_Ace++FaceSwap_SebastianKamph-Patreon_v5_API.json';
    const zImageWorkflow = 'I:\\\\ComfyUI_windows_portable\\\\Workflows\\\\image_z_image_API.json';
    
    await testComfyUI(fluxWorkflow, 'Flux_FaceSwap');
    
    // Wait a bit before sending the next one to avoid overwhelming ComfyUI
    setTimeout(() => {
        testComfyUI(zImageWorkflow, 'Z-Image_Local');
    }, 5000);
}

runBenchmark();
