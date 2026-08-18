const growthAnalytics = require('../services/growth_analytics_service');
const NotificationService = require('../services/notification_service');

async function main() {
    console.log('======================================================');
    console.log('🏰 GEORGE: COMPILING & DISPATCHING EXECUTIVE REPORT');
    console.log('======================================================\n');

    const notifier = new NotificationService({ recipient: 'janosgolya@gmail.com' });
    const reportData = await growthAnalytics.generateExecutiveReport();

    console.log(`📊 Phase: ${reportData.phase.phaseLabel} (Frequency: ${reportData.phase.frequency})`);
    console.log(`🎯 Tom Daily Outreach Interactions: ${reportData.tomStats.totalInteractionsDaily}`);
    console.log(`📱 Total Social Posts Published: ${reportData.socialStats.totalPublished}`);
    console.log(`💰 Fanvue Active Tier: ${reportData.fanvueStats.activeTierPrice}`);
    console.log(`\n📧 Dispatching Report to: ${notifier.recipient}...`);

    const result = await notifier.sendExecutiveGrowthReport(reportData);
    console.log('\n✅ Report Dispatch Result:', result);
}

main().catch(console.error);
