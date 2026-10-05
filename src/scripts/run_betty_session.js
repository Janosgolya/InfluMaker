require('dotenv').config();
const BettyAgent = require('../agents/betty');

/**
 * Betty Live Runner CLI
 * Usage:
 *   node src/scripts/run_betty_session.js --dry-run
 *   node src/scripts/run_betty_session.js --live
 *   node src/scripts/run_betty_session.js --platform instagram
 */
async function main() {
    const args = process.argv.slice(2);
    const betty = new BettyAgent();

    const isLive = args.includes('--live');
    const isDryRun = args.includes('--dry-run') || !isLive;
    const isHeadless = !args.includes('--headful');

    let platform = 'instagram';
    const platIdx = args.indexOf('--platform');
    if (platIdx !== -1 && args[platIdx + 1]) {
        platform = args[platIdx + 1];
    }

    console.log(`\n🌹 Starting Betty Ryal session...`);
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (Safe Simulation)' : 'LIVE ONLINE'}`);
    console.log(`Platform: ${platform}`);

    const result = await betty.runAutonomousSession({
        platform,
        headless: isHeadless,
        dryRun: isDryRun,
        sendEmail: true
    });

    console.log(`\nSession result:`, JSON.stringify(result, null, 2));
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal execution error:', err);
        process.exit(1);
    });
}
