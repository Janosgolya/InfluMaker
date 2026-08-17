const fs = require('fs');
const path = require('path');
const http = require('http');

const COMFYUI_URL = 'http://127.0.0.1:8188';
const WORKFLOWS_DIR = 'I:\\\\ComfyUI_windows_portable\\\\Workflows';

function fetchObjectInfo() {
    return new Promise((resolve, reject) => {
        http.get(`${COMFYUI_URL}/object_info`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function convertToApi(uiGraph, objectInfo) {
    const prompt = {};
    const links = {};
    if (uiGraph.links) {
        for (const link of uiGraph.links) {
            links[link[0]] = link;
        }
    }

    for (const node of uiGraph.nodes) {
        const classDef = objectInfo[node.type];
        if (!classDef) {
            console.warn(`Unknown node type: ${node.type}`);
            continue;
        }

        const inputs = {};
        
        // Match links to inputs by input slot index or name
        // uiGraph nodes have 'inputs' array: [{name, type, link}]
        if (node.inputs) {
            for (let i = 0; i < node.inputs.length; i++) {
                const input = node.inputs[i];
                if (input.link !== null && input.link !== undefined) {
                    const link = links[input.link];
                    if (link) {
                        inputs[input.name] = [String(link[1]), link[2]];
                    }
                }
            }
        }

        // Match widgets
        // ComfyUI maps node.widgets_values (array) to the required inputs that are not connections.
        let widgetIdx = 0;
        if (classDef.input && classDef.input.required) {
            for (const [key, value] of Object.entries(classDef.input.required)) {
                // If this required input isn't satisfied by a link, it's a widget value
                let isLinked = false;
                if (node.inputs) {
                    isLinked = node.inputs.some(inp => inp.name === key && inp.link !== null);
                }
                
                if (!isLinked && node.widgets_values && widgetIdx < node.widgets_values.length) {
                    inputs[key] = node.widgets_values[widgetIdx++];
                }
            }
        }
        
        // Check optional inputs for widgets too
        if (classDef.input && classDef.input.optional) {
            for (const [key, value] of Object.entries(classDef.input.optional)) {
                let isLinked = false;
                if (node.inputs) {
                    isLinked = node.inputs.some(inp => inp.name === key && inp.link !== null);
                }
                if (!isLinked && node.widgets_values && widgetIdx < node.widgets_values.length) {
                    inputs[key] = node.widgets_values[widgetIdx++];
                }
            }
        }

        prompt[String(node.id)] = {
            class_type: node.type,
            inputs: inputs
        };
    }
    return prompt;
}

async function main() {
    console.log("Fetching /object_info from ComfyUI...");
    let objectInfo;
    try {
        objectInfo = await fetchObjectInfo();
    } catch (err) {
        console.error("Failed to connect to ComfyUI. Is it running?", err.message);
        process.exit(1);
    }

    const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json') && !f.endsWith('_API.json'));
    for (const file of files) {
        const filePath = path.join(WORKFLOWS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        try {
            const uiGraph = JSON.parse(content);
            if (uiGraph.nodes && uiGraph.links) {
                console.log(`Converting ${file}...`);
                const apiPrompt = convertToApi(uiGraph, objectInfo);
                const apiFileName = file.replace('.json', '_API.json');
                fs.writeFileSync(path.join(WORKFLOWS_DIR, apiFileName), JSON.stringify(apiPrompt, null, 2));
                console.log(` -> Saved ${apiFileName}`);
            }
        } catch (e) {
            console.error(`Failed to convert ${file}:`, e.message);
        }
    }
    console.log("Done!");
}

main();
