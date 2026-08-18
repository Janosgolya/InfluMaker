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

async function checkLatest() {
    const runs = await get('https://api.github.com/repos/Janosgolya/InfluMaker/actions/runs?per_page=3');
    const r = runs.workflow_runs[0];
    console.log(`Run ID: ${r.id} | Status: ${r.status} | Conclusion: ${r.conclusion} | Event: ${r.event}`);
    const jobs = await get(r.jobs_url);
    if (jobs.jobs && jobs.jobs[0]) {
        for (const s of jobs.jobs[0].steps) {
            console.log(`- ${s.name}: ${s.conclusion || s.status}`);
        }
    }
}

checkLatest().catch(console.error);
