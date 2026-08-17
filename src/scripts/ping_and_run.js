const http = require('http');
const cp = require('child_process');
const path = require('path');

const checkInterval = setInterval(() => {
    http.get('http://127.0.0.1:8188', (res) => {
        if (res.statusCode === 200) {
            console.log('ComfyUI is up! Starting benchmark...');
            clearInterval(checkInterval);
            
            const scriptPath = path.join(__dirname, '..', 'agents', 'steven.js');
            const child = cp.spawn('node', [scriptPath], { stdio: 'inherit' });
            
            child.on('close', (code) => {
                console.log(`Benchmark finished with code ${code}`);
            });
        }
    }).on('error', () => {
        console.log('Waiting for ComfyUI to restart...');
    });
}, 3000);
