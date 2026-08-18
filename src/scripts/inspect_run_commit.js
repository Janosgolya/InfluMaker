const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'NodeJS', 'Accept': 'application/vnd.github.v3+json' } }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function main() {
    const run = await get('https://api.github.com/repos/Janosgolya/InfluMaker/actions/runs/32161097156');
    console.log(`Run 32161097156 Commit: ${run.head_commit.id} (${run.head_commit.message})`);
    console.log(`Created At: ${run.created_at} | Updated At: ${run.updated_at}`);
}

main().catch(console.error);
