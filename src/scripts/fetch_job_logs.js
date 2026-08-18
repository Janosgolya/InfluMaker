const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'NodeJS', 'Accept': 'application/vnd.github.v3+json' } }, res => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                return get(res.headers.location).then(resolve, reject);
            }
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function printAllLogs() {
    const runs = JSON.parse(await get('https://api.github.com/repos/Janosgolya/InfluMaker/actions/runs?per_page=1'));
    const r = runs.workflow_runs[0];
    const jobs = JSON.parse(await get(r.jobs_url));
    const jobId = jobs.jobs[0].id;
    console.log(`Job URL: https://github.com/Janosgolya/InfluMaker/actions/runs/${r.id}/job/${jobId}`);

    const rawLogs = await get(`https://api.github.com/repos/Janosgolya/InfluMaker/actions/jobs/${jobId}/logs`);
    console.log('Logs length:', rawLogs.length);
    console.log(rawLogs.substring(0, 3000));
}

printAllLogs().catch(console.error);
