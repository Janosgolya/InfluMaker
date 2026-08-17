const fs = require('fs');
const path = require('path');
const http = require('http');
const JonesCensorAgent = require('./jones');

const COMFYUI_URL = 'http://127.0.0.1:8188/prompt';
const HISTORY_URL = 'http://127.0.0.1:8188/history/';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'BettyRyal_18centuryServant', 'RawGenerations');

// The ONE reference image to use — always
const BETTY_REF_SRC  = path.join(__dirname, '..', '..', 'BettyRyal_18centuryServant', 'CharacterReferences', 'BettyRyal_character_reference_main.jpeg');
const BETTY_REF_DEST = 'I:\\ComfyUI_windows_portable\\ComfyUI\\input\\BettyReference_Steven.jpeg';
const BETTY_CACHE    = path.join(__dirname, '..', '..', 'BettyRyal_18centuryServant', 'Betty_visual_description.txt');

// ============================================================
// 1. LLM Prompter via ComfyUI (Gemma Heretic)
// ============================================================
async function generateLLMPrompt(systemPromptPath) {
    console.log(`[Steven] 🧠 Querying Gemma Heretic for a dynamic prompt...`);
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');

    const workflow = {
        "1": {
            "inputs": {
                "clip_name": "gemma-3-12b-it-heretic-v2_nvfp4.safetensors",
                "type": "krea2",
                "device": "default"
            },
            "class_type": "CLIPLoader"
        },
        "2": {
            "inputs": {
                "prompt": systemPrompt,
                "max_length": 512,
                "sampling_mode": "on",
                "sampling_mode.temperature": 0.75,
                "sampling_mode.top_k": 64,
                "sampling_mode.top_p": 0.95,
                "sampling_mode.min_p": 0.05,
                "sampling_mode.repetition_penalty": 1.05,
                "sampling_mode.seed": Math.floor(Math.random() * 1000000000),
                "sampling_mode.presence_penalty": 0,
                "thinking": true,
                "use_default_template": true,
                "clip": ["1", 0]
            },
            "class_type": "TextGenerate"
        },
        "3": { "inputs": { "source": ["2", 0] }, "class_type": "PreviewAny" }
    };

    const promptId = await queueWorkflow(workflow);
    const history  = await waitForComfyUI(promptId);

    try {
        if (history.outputs['3'] && history.outputs['3'].text) return history.outputs['3'].text[0];
        if (history.outputs['2'] && history.outputs['2'].text) return history.outputs['2'].text[0];
    } catch (e) {}

    console.log(`[Steven] ⚠️ Fallback prompt used (LLM output not parseable)`);
    return "A beautiful 18th century servant woman in a candlelit inn corridor at night, hyperrealistic, Rembrandt lighting, shallow depth of field, masterpiece photography.";
}

// ============================================================
// 2. Betty Reference Image — copy to ComfyUI input
// ============================================================
function prepareBettyReference() {
    if (fs.existsSync(BETTY_REF_SRC)) {
        fs.copyFileSync(BETTY_REF_SRC, BETTY_REF_DEST);
        console.log(`[Steven] 📸 Betty reference image copied to ComfyUI input.`);
    } else {
        console.error(`[Steven] ❌ Betty reference not found: ${BETTY_REF_SRC}`);
    }
    return path.basename(BETTY_REF_DEST); // just the filename for LoadImage node
}

// ============================================================
// 3. Model Graph Architectures
// ============================================================

// --- 3a. ZImage / Krea2 --- (with character reference + realism LoRA)
// useEditPatch: the Krea2EditModelPatch node wraps the diffusion model expecting a
// SingleStreamDiT (.patch attribute). ZImage checkpoints load as raw NextDiT and crash
// KSampler with "'NextDiT' object has no attribute 'patch'" — so for ZImage we skip the
// edit patch and run plain txt2img (Betty likeness via the text description instead).
function getZImageGraph(prompt, ckpt, filenamePrefix, loraName = null, useEditPatch = true) {
    const modelSource = loraName ? ["lora1", 0] : ["76:97", 0];
    // Text encoder must match the DiT backbone's conditioning width:
    // - Krea2 (SingleStreamDiT, 30720): qwen3vl_4b with type "krea2" -> krea2.te 12-layer tap.
    // - ZImage (NextDiT, 2560): qwen_3_4b routes to z_image.te (last-but-one layer, 2560-dim).
    //   Feeding the krea2 12-layer tap into NextDiT dies in KSampler with
    //   "Given normalized_shape=[2560] ... got input of size [1, N, 30720]".
    const clipName = useEditPatch ? "qwen3vl_4b_fp8_scaled.safetensors" : "qwen_3_4b.safetensors";
    const clipType = useEditPatch ? "krea2" : "lumina2";
    // Latent formats differ too: Krea2 emits Wan21 video-style latents (needs its Wan VAE),
    // ZImage emits Flux-style 2D latents (needs the Flux VAE) — a Wan VAE fed 4D latents
    // dies in VAEDecode with "tuple index out of range" (its memory formula expects 5D).
    const vaeName = useEditPatch ? "krea2RealVae_v10.safetensors" : "ae.safetensors";
    const nodes = {
        "95":    { "inputs": { "filename_prefix": filenamePrefix, "format": "png", "format.bit_depth": "8-bit", "format.input_color_space": "sRGB", "images": ["76:65", 0] }, "class_type": "SaveImageAdvanced" },
        "76:68": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptySD3LatentImage" },
        "76:63": { "inputs": { "vae_name": vaeName }, "class_type": "VAELoader" },
        "76:65": { "inputs": { "samples": ["76:69", 0], "vae": ["76:63", 0] }, "class_type": "VAEDecode" },
        // Checkpoint
        "76:97": { "inputs": { "ckpt_name": ckpt }, "class_type": "CheckpointLoaderSimple" },
        "76:70": { "inputs": { "shift": 3, "model": useEditPatch ? ["109", 0] : modelSource }, "class_type": "ModelSamplingAuraFlow" },
        // Text Encoder
        "76:62": { "inputs": { "clip_name": clipName, "type": clipType, "device": "default" }, "class_type": "CLIPLoader" },
        "76:71": { "inputs": { "text": "ugly, blurry, deformed, modern, electricity, studio lighting, painting, illustration, anime, 3d render", "clip": ["76:62", 0] }, "class_type": "CLIPTextEncode" },
        "76:67": { "inputs": { "text": prompt, "clip": ["76:62", 0] }, "class_type": "CLIPTextEncode" },
        "76:69": { "inputs": { "seed": Math.floor(Math.random() * 10000000), "steps": 25, "cfg": 7, "sampler_name": "euler", "scheduler": "normal", "denoise": 1, "model": ["76:70", 0], "positive": ["76:67", 0], "negative": ["76:71", 0], "latent_image": ["76:68", 0] }, "class_type": "KSampler" }
    };

    // Betty Reference chain + Krea2 Edit Patch (Krea2-arch checkpoints only)
    if (useEditPatch) {
        const refImageFilename = prepareBettyReference();
        nodes["151"] = { "inputs": { "image": refImageFilename }, "class_type": "LoadImage" };
        nodes["129"] = { "inputs": { "resize_type": "scale height", "resize_type.height": 1024, "scale_method": "area", "input": ["151", 0] }, "class_type": "ResizeImageMaskNode" };
        nodes["108"] = { "inputs": { "pixels": ["129", 0], "vae": ["76:63", 0] }, "class_type": "VAEEncode" };
        nodes["109"] = { "inputs": { "ref_boost": 0.5, "ref_boost_a": 0.5, "fit_mode": "fit", "model": modelSource, "source_latent": ["108", 0], "source_latent_b": ["108", 0], "vae": ["76:63", 0] }, "class_type": "Krea2EditModelPatch" };
    }

    // Inject LoRA if provided
    if (loraName) {
        nodes["lora1"] = { "inputs": { "lora_name": loraName, "strength_model": 0.75, "model": ["76:97", 0] }, "class_type": "LoraLoaderModelOnly" };
    }

    return nodes;
}

// --- 3b. SDXL --- (with Betty text description, portrait-oriented)
function getSDXLGraph(prompt, ckpt, filenamePrefix) {
    return {
        "9": { "inputs": { "filename_prefix": filenamePrefix, "images": ["8", 0] }, "class_type": "SaveImage" },
        "3": { "inputs": { "seed": Math.floor(Math.random() * 10000000), "steps": 30, "cfg": 7, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
        "4": { "inputs": { "ckpt_name": ckpt }, "class_type": "CheckpointLoaderSimple" },
        "5": { "inputs": { "width": 832, "height": 1216, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
        "6": { "inputs": { "text": prompt, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
        "7": { "inputs": { "text": "ugly, blurry, lowres, modern, electricity, studio lighting, painting, anime, 3d render, bad hands, extra fingers, deformed", "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
        "8": { "inputs": { "samples": ["3", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" }
    };
}

// --- 3c. SD 1.5 --- (native 512x768 portrait, Betty text description)
function getSD15Graph(prompt, ckpt, filenamePrefix) {
    return {
        "9": { "inputs": { "filename_prefix": filenamePrefix, "images": ["8", 0] }, "class_type": "SaveImage" },
        "3": { "inputs": { "seed": Math.floor(Math.random() * 10000000), "steps": 30, "cfg": 7.5, "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
        "4": { "inputs": { "ckpt_name": ckpt }, "class_type": "CheckpointLoaderSimple" },
        "5": { "inputs": { "width": 512, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
        "6": { "inputs": { "text": prompt, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
        "7": { "inputs": { "text": "ugly, blurry, lowres, modern, studio lighting, painting, anime, bad hands, deformed, nsfw", "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
        "8": { "inputs": { "samples": ["3", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" }
    };
}

// --- 3d. Pony V6 XL --- (quality tags + photorealism anchors required; Pony defaults to illustrated/painted without them)
function getPonyGraph(prompt, ckpt, filenamePrefix) {
    // Pony requires quality booster tags AND explicit photorealism anchors to avoid painting/illustration outputs
    const ponyPositive = `score_9, score_8_up, score_7_up, masterpiece, best quality, photorealistic photography, RAW photo, (realistic:1.4), hyperrealistic, 8k uhd, DSLR, film grain, ${prompt}`;
    const ponyNegative = `score_4, score_5, score_6, ugly, blurry, lowres, modern, studio lighting, painting, illustration, artwork, canvas, sketch, watercolor, charcoal, drawing, anime, cartoon, 3d render, bad hands, deformed, nsfw, explicit, multi-panel, collage`;
    return {
        "9":  { "inputs": { "filename_prefix": filenamePrefix, "images": ["8", 0] }, "class_type": "SaveImage" },
        // euler_ancestral + lower cfg gives better photorealism on Pony/SDXL-based models vs plain euler at high cfg
        "3":  { "inputs": { "seed": Math.floor(Math.random() * 10000000), "steps": 25, "cfg": 5, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
        "4":  { "inputs": { "ckpt_name": ckpt }, "class_type": "CheckpointLoaderSimple" },
        "5":  { "inputs": { "width": 832, "height": 1216, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
        "6":  { "inputs": { "text": ponyPositive, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
        "7":  { "inputs": { "text": ponyNegative, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
        "8":  { "inputs": { "samples": ["3", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" }
    };
}

// --- 3e. Qwen Image Edit 2512 --- (native image reference for identity, but generates NEW scene via empty latent)
// Problem with the previous approach: using VAEEncode(reference) as latent_image with denoise=1 caused the model to
// re-render the reference image exactly (plus Q3_K_M quantization introduced red/orange color stripe artifacts).
// Fix: use an EmptySD3LatentImage as latent so the model generates a fresh scene from the text prompt while the
// reference image is still injected via TextEncodeQwenImageEditPlus.image1 for identity/style conditioning.
// Steps bumped 4→8 to reduce Lightning quantization artifacts at the cost of modest extra compute.
function getQwenImageEditGraph(prompt, filenamePrefix) {
    const refImageFilename = prepareBettyReference();
    return {
        "60":     { "inputs": { "filename_prefix": filenamePrefix, "images": ["115:8", 0] }, "class_type": "SaveImage" },
        "78":     { "inputs": { "image": refImageFilename }, "class_type": "LoadImage" },
        "115:93": { "inputs": { "upscale_method": "lanczos", "megapixels": 1, "resolution_steps": 1, "image": ["78", 0] }, "class_type": "ImageScaleToTotalPixels" },
        "115:39": { "inputs": { "vae_name": "qwen_image_vae.safetensors" }, "class_type": "VAELoader" },
        "115:38": { "inputs": { "clip_name": "qwen\\qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default" }, "class_type": "CLIPLoader" },
        // Load Qwen Image 2512 UNet (GGUF) + Lightning LoRA
        "115:124": { "inputs": { "unet_name": "qwen-image-2512-Q3_K_M.gguf" }, "class_type": "UnetLoaderGGUF" },
        "115:89":  { "inputs": { "lora_name": "qwen\\Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors", "strength_model": 1, "model": ["115:124", 0] }, "class_type": "LoraLoaderModelOnly" },
        // CFGNorm for Lightning distilled models
        "115:75":  { "inputs": { "strength": 1, "pre_cfg": false, "model": ["115:89", 0] }, "class_type": "CFGNorm" },
        "115:66":  { "inputs": { "shift": 3, "model": ["115:75", 0] }, "class_type": "ModelSamplingAuraFlow" },
        // Empty latent — we generate a fresh scene; reference identity comes from text encoding (image1), not from img2img
        "115:em":  { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptySD3LatentImage" },
        // Text encoding with Betty reference image for identity conditioning
        "115:111": { "inputs": { "prompt": prompt, "clip": ["115:38", 0], "vae": ["115:39", 0], "image1": ["115:93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" },
        "115:110": { "inputs": { "prompt": "ugly, blurry, modern, studio, electricity, bad anatomy, multi-panel, collage, triptych, painting, illustration", "clip": ["115:38", 0], "vae": ["115:39", 0], "image1": ["115:93", 0] }, "class_type": "TextEncodeQwenImageEditPlus" },
        // KSampler — 8 steps (Lightning range), euler + simple, CFG=1 (Lightning requires CFG=1)
        "115:3":   { "inputs": { "seed": Math.floor(Math.random() * 10000000), "steps": 8, "cfg": 1, "sampler_name": "euler", "scheduler": "simple", "denoise": 1, "model": ["115:66", 0], "positive": ["115:111", 0], "negative": ["115:110", 0], "latent_image": ["115:em", 0] }, "class_type": "KSampler" },
        "115:8":   { "inputs": { "samples": ["115:3", 0], "vae": ["115:39", 0] }, "class_type": "VAEDecode" }
    };
}

// ============================================================
// 4. Core API Functions
// ============================================================
async function queueWorkflow(workflow) {
    const payload = JSON.stringify({ prompt: workflow });
    return new Promise((resolve, reject) => {
        const req = http.request(COMFYUI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let response;
                try { response = JSON.parse(data); } catch (e) { return reject(new Error('Bad JSON from ComfyUI: ' + data.substring(0, 200))); }
                if (response.error) {
                    console.error("[Steven] API Validation Error:", JSON.stringify(response.node_errors, null, 2));
                    reject(new Error(response.error.message));
                } else {
                    resolve(response.prompt_id);
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function waitForComfyUI(promptId) {
    return new Promise((resolve) => {
        const poll = () => {
            http.get(HISTORY_URL + promptId, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const history = JSON.parse(data);
                        if (history[promptId]) resolve(history[promptId]);
                        else setTimeout(poll, 2000);
                    } catch (e) { setTimeout(poll, 2000); }
                });
            }).on('error', () => setTimeout(poll, 2000));
        };
        poll();
    });
}

async function extractSavedFilename(historyObj) {
    const outputs = historyObj.outputs;
    for (const key in outputs) {
        if (outputs[key].images && outputs[key].images.length > 0) {
            return outputs[key].images[0].filename;
        }
    }
    return null;
}

async function saveOutput(outputFilename) {
    const srcPath = path.join('I:', 'ComfyUI_windows_portable', 'ComfyUI', 'output', outputFilename);
    const destPath = path.join(OUTPUT_DIR, outputFilename);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
    } else {
        console.warn(`[Steven] ⚠️ Output file not found at: ${srcPath} — may already be moved`);
    }
}

// ============================================================
// 5. SFW Benchmark — 6 Models
// ============================================================
async function runSFWBenchmark(onlyType = null) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Steven] SFW MULTI-MODEL BENCHMARK — 6 ARCHITECTURES${onlyType ? ` (only: ${onlyType})` : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    const sfwPromptPath = path.join(__dirname, '..', '..', 'BettyRyal_18centuryServant', 'SFW_auto_prompt.txt');
    const jones = new JonesCensorAgent();

    // Step 1: Generate Betty text description (once, cached)
    console.log(`[Steven] Step 1/2 — Generating Betty visual description (cached)...`);
    const bettyDesc = await jones.generateBettyCharacterDescription(BETTY_REF_SRC, BETTY_CACHE);
    console.log(`[Steven] Betty description: "${bettyDesc.substring(0, 100)}..."\n`);

    // Helper: prepend Betty description for text-only models
    const withBetty = (prompt) => `${bettyDesc}, ${prompt}`;

    // Step 2: Define model rotation (optionally filtered to a single type for smoke tests)
    const modelsToTest = [
        {
            label:   "1/6 — ZImage (NextDiT) + Betty text desc",
            name:    "ZImage\\pornmasterZImage_baseV1.safetensors",
            type:    "zimage"
        },
        {
            label:   "2/6 — Krea2 darkBeast + Betty ref img",
            name:    "Krea\\darkBeastINT8Convrot2_darkBeastKREA2FP8.safetensors",
            type:    "krea2"
        },
        {
            label:   "3/6 — SD 1.5 epiCRealism + Betty text desc",
            name:    "epicrealism_naturalSinRC1VAE.safetensors",
            type:    "sd15"
        },
        {
            label:   "4/6 — SDXL Juggernaut XL v9 + Betty text desc",
            name:    "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors",
            type:    "sdxl"
        },
        {
            label:   "5/6 — Pony Diffusion V6 XL + Betty text desc",
            name:    "ponyDiffusionV6XL_v6StartWithThisOne.safetensors",
            type:    "pony"
        },
        {
            label:   "6/6 — Qwen Image Edit 2512 (4-step Lightning) + Betty ref img",
            name:    "qwen-image-edit",
            type:    "qwen"
        }
    ].filter(m => !onlyType || m.type === onlyType);

    // Step 3: Run each model
    for (const model of modelsToTest) {
        console.log(`\n[Steven] >>> ${model.label}`);

        // Generate LLM prompt
        let prompt = await generateLLMPrompt(sfwPromptPath);
        const prefix = `Steven_SFW_${model.type.toUpperCase()}_`;

        // For text-only models, prepend Betty description (zimage included: its NextDiT
        // backbone can't take the Krea2 edit/ref patch, so likeness comes from the text)
        const needsTextDesc = ['sd15', 'sdxl', 'pony', 'zimage'].includes(model.type);
        if (needsTextDesc) prompt = withBetty(prompt);

        // Build workflow
        let workflow;
        switch (model.type) {
            case 'zimage':  workflow = getZImageGraph(prompt, model.name, prefix, model.lora || null, false); break;
            case 'krea2':   workflow = getZImageGraph(prompt, model.name, prefix, model.lora || null, true); break;
            case 'sd15':    workflow = getSD15Graph(prompt, model.name, prefix); break;
            case 'sdxl':    workflow = getSDXLGraph(prompt, model.name, prefix); break;
            case 'pony':    workflow = getPonyGraph(prompt, model.name, prefix); break;
            case 'qwen':    workflow = getQwenImageEditGraph(prompt, prefix); break;
            default: console.error(`Unknown model type: ${model.type}`); continue;
        }

        try {
            const promptId       = await queueWorkflow(workflow);
            const historyObj     = await waitForComfyUI(promptId);
            const outputFilename = await extractSavedFilename(historyObj);

            if (outputFilename) {
                await saveOutput(outputFilename);
                console.log(`[Steven] ✅ SUCCESS: ${outputFilename}`);
                await jones.evaluateAndSortRawGenerations();
            } else {
                throw new Error("ComfyUI returned no image — check ComfyUI console for errors.");
            }
        } catch (e) {
            console.error(`[Steven] ❌ FAILED [${model.type}]: ${e.message}`);
        }
    }

    console.log(`\n[Steven] SFW BENCHMARK COMPLETE — Jones has evaluated all results.`);
}

// ============================================================
// 6. NSFW Benchmark (legacy, unchanged)
// ============================================================
async function runMassiveTest() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Steven] INITIALIZING MASSIVE MULTI-MODEL BENCHMARK (NSFW)`);
    console.log(`${'='.repeat(60)}\n`);

    const nsfwPromptPath = path.join(__dirname, '..', '..', 'BettyRyal_18centuryServant', 'NSFW_auto_prompt.txt');
    const jones = new JonesCensorAgent();

    const modelsToTest = [
        { name: "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors", type: "sdxl" },
        { name: "Krea\\darkBeastINT8Convrot2_darkBeastKREA2FP8.safetensors",  type: "zimage" },
        { name: "Krea\\moodyKrea2Mix_v40.safetensors",                         type: "zimage" },
        { name: "Krea\\krea2turbobadmilkmela_v10.safetensors",                 type: "zimage" },
        { name: "Krea\\redcraft23INT8INT4FP8_30Krea2.safetensors",             type: "zimage" }
    ];

    for (const model of modelsToTest) {
        console.log(`\n[Steven] >>> Starting rotation for model: ${model.name}`);
        const prompt = await generateLLMPrompt(nsfwPromptPath);
        const prefix = `Steven_${model.type.toUpperCase()}_`;
        let workflow;
        if (model.type === 'zimage') workflow = getZImageGraph(prompt, model.name, prefix);
        else workflow = getSDXLGraph(prompt, model.name, prefix);

        try {
            const promptId       = await queueWorkflow(workflow);
            const historyObj     = await waitForComfyUI(promptId);
            const outputFilename = await extractSavedFilename(historyObj);
            if (outputFilename) {
                await saveOutput(outputFilename);
                console.log(`[Steven] ✅ ${model.name} → ${outputFilename}`);
                await jones.evaluateAndSortRawGenerations();
            } else {
                throw new Error("ComfyUI returned no image.");
            }
        } catch (e) {
            console.error(`[Steven] ❌ Failed [${model.name}]: ${e.message}`);
        }
    }
    console.log(`\n[Steven] MASSIVE BENCHMARK COMPLETE!`);
}

// ============================================================
// Entry Point
// ============================================================
if (require.main === module) {
    const mode = process.argv[2] || 'sfw';
    if (mode === 'sfw') {
        runSFWBenchmark(process.argv[3] || null); // e.g. `node steven.js sfw zimage` for a single-model smoke test
    } else if (mode === 'nsfw') {
        runMassiveTest();
    } else {
        console.error(`Unknown mode: ${mode}. Use 'sfw' or 'nsfw'`);
        process.exit(1);
    }
}

module.exports = { runSFWBenchmark, runMassiveTest };
