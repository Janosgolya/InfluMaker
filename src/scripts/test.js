const http = require('http');

function getSDXLGraph(prompt, ckpt, filenamePrefix) {
    return {
      "9": { "inputs": { "filename_prefix": filenamePrefix, "images": ["8", 0] }, "class_type": "SaveImage" },
      "3": { "inputs": { "seed": Math.floor(Math.random()*10000000), "steps": 30, "cfg": 7, "sampler_name": "euler_ancestral", "scheduler": "normal", "denoise": 1, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0] }, "class_type": "KSampler" },
      "4": { "inputs": { "ckpt_name": ckpt }, "class_type": "CheckpointLoaderSimple" },
      "5": { "inputs": { "width": 1024, "height": 1024, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
      "6": { "inputs": { "text": prompt, "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
      "7": { "inputs": { "text": "ugly, blurry, lowres", "clip": ["4", 1] }, "class_type": "CLIPTextEncode" },
      "8": { "inputs": { "samples": ["3", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" }
    };
}

const payload = JSON.stringify({ prompt: getSDXLGraph('test', 'ponyDiffusionV6XL_v6StartWithThisOne.safetensors', 'test') });
const req = http.request('http://127.0.0.1:8188/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
    let data = ''; res.on('data', c => data += c);
    res.on('end', () => console.log(data));
});
req.write(payload);
req.end();
