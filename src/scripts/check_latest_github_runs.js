const https = require('https');

async function checkLatestGitHubRun() {
    const options = {
        hostname: 'api.github.com',
        path: '/repos/Janosgolya/InfluMaker/actions/runs?per_page=5',
        method: 'GET',
        headers: {
            'User-Agent': 'InfluMaker-Status-Checker'
        }
    };

    const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                console.log('=== LATEST GITHUB ACTIONS RUNS ===');
                if (parsed.workflow_runs) {
                    parsed.workflow_runs.forEach(r => {
                        console.log(`• ID: ${r.id} | Name: "${r.name}" | Status: ${r.status} | Conclusion: ${r.conclusion} | Created: ${r.created_at}`);
                    });
                } else {
                    console.log('No runs found or rate limited:', parsed.message || parsed);
                }
            } catch (e) {
                console.error('JSON parse error:', e.message);
            }
        });
    });

    req.on('error', err => console.error(err.message));
    req.end();
}

checkLatestGitHubRun();
