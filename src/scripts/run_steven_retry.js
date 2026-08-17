const http = require('http');
const cp = require('child_process');
const path = require('path');

let attempts = 0;
const checkInterval = setInterval(() => {
    attempts++;
    console.log(`Checking ComfyUI... (Attempt ${attempts})`);
    const req = http.get('http://127.0.0.1:8188', (res) => {
        if (res.statusCode === 200) {
            console.log('ComfyUI is online! Starting Steven benchmark...');
            clearInterval(checkInterval);
            const scriptPath = path.join(__dirname, '..', 'agents', 'steven.js');
            const child = cp.spawn('node', [scriptPath], { stdio: 'inherit' });
            child.on('close', (code) => {
                console.log(`Benchmark finished with code ${code}`);
            });
        }
    }).on('error', () => {
        console.log('Waiting for ComfyUI to bind to port 8188...');
    });
    
    // Timeout the request so it doesn't hang forever
    req.setTimeout(2000, () => req.destroy());
    
}, 5000);
