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
    const jobs = await get('https://api.github.com/repos/Janosgolya/InfluMaker/actions/runs/32161097156/jobs');
    const job = jobs.jobs[0];
    console.log(`Job: ${job.id} | Status: ${job.status} | Conclusion: ${job.conclusion}`);
    for (const s of job.steps) {
        console.log(`  Step ${s.number} [${s.name}]: ${s.conclusion || s.status}`);
    }
}

main().catch(console.error);
