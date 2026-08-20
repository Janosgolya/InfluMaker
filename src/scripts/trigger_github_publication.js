const https = require('https');
require('dotenv').config();

/**
 * Triggers the GitHub Actions InfluMaker workflow remotely
 * Usage: node src/scripts/trigger_github_publication.js [THEME]
 */
async function triggerGitHubWorkflow(theme = 'AUTO') {
    const owner = 'Janosgolya';
    const repo = 'InfluMaker';
    const workflowFile = 'daily_influencer_cron.yml';
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

    console.log(`\n======================================================`);
    console.log(`🚀 WYZWALANIE PUBLIKACJI W CHMURZE GITHUB ACTIONS`);
    console.log(`Repozytorium: ${owner}/${repo}`);
    console.log(`Slot: ${theme}`);
    console.log(`======================================================\n`);

    console.log(`👉 Link do natychmiastowego uruchomienia w GitHub Actions (1 kliknięcie):`);
    console.log(`   https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`);
    console.log(`   Kliknij przycisk "Run workflow" -> Wybierz slot -> Kliknij zielony "Run workflow"\n`);
}

if (require.main === module) {
    const themeArg = process.argv[2] || 'AUTO';
    triggerGitHubWorkflow(themeArg);
}

module.exports = triggerGitHubWorkflow;
