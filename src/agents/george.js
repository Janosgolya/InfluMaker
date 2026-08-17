require('dotenv').config();
const fs = require('fs');
const path = require('path');
const EveScreenwriterAgent = require('./eve');
const AnaSocialManager = require('./ana');
const RoombaAgent = require('./roomba');

class GeorgeProducerAgent {
    constructor(options = {}) {
        this.name = "George";
        this.role = "Executive Producer & Autonomous Multi-Agent Orchestrator";
        this.schedulePath = options.schedulePath || path.join(__dirname, '../../config/posting_schedule.json');
        this.selectedContentDir = options.selectedContentDir || path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');
        this.logPath = options.logPath || path.join(__dirname, '../../config/published_log.json');
        
        this.eve = new EveScreenwriterAgent();
        this.ana = new AnaSocialManager();
        this.roomba = new RoombaAgent();
        
        this.loadSchedule();
    }

    loadSchedule() {
        if (fs.existsSync(this.schedulePath)) {
            this.scheduleConfig = JSON.parse(fs.readFileSync(this.schedulePath, 'utf8'));
        } else {
            this.scheduleConfig = {
                fanvue_schedule: {
                    daily_image_posts: 4,
                    weekly_video_posts: 1,
                    times: { morning: "08:00", midday: "13:00", prep: "18:00", night: "22:00" }
                }
            };
        }
    }

    /**
     * Determine current posting theme based on hour of the day
     */
    getCurrentThemeForTime(date = new Date()) {
        const hour = date.getHours();
        if (hour >= 6 && hour < 12) return 'MORNING';
        if (hour >= 12 && hour < 17) return 'MIDDAY';
        if (hour >= 17 && hour < 21) return 'PREP';
        return 'NIGHT';
    }

    /**
     * Execute one scheduling cycle tick (Used by Cron / GitHub Actions / GCP)
     */
    async runTick(forcedTheme = null) {
        const theme = forcedTheme || this.getCurrentThemeForTime();
        console.log(`\n======================================================`);
        console.log(`🎬 GEORGE: Running Scheduled Cycle Tick`);
        console.log(`Time: ${new Date().toISOString()} | Target Theme: ${theme}`);
        console.log(`======================================================\n`);

        // 1. Ensure story exists for next unposted item in this theme
        let nextItem = this.ana.getNextContentForTheme(theme, 'Fanvue');
        
        if (!nextItem) {
            console.log(`[George] 🔍 No unposted item with story found for ${theme}. Triggering Eve to create stories...`);
            const themeDir = path.join(this.selectedContentDir, theme);
            if (fs.existsSync(themeDir)) {
                await this.eve.processFolder(themeDir, { limit: 2 });
            }
            nextItem = this.ana.getNextContentForTheme(theme, 'Fanvue');
        }

        if (!nextItem) {
            console.log(`[George] ⚠️ No available images found in ${theme} folder.`);
            return { success: false, reason: `No images in ${theme}` };
        }

        console.log(`[George] 🚀 Next asset selected: ${path.basename(nextItem.imagePath)}`);

        // 2. Delegate publication to Ana
        const results = {};
        try {
            console.log(`[George] Delegating Fanvue publication to Ana...`);
            results.fanvue = await this.ana.publishFanvueItem(nextItem.imagePath, nextItem.storyPath, { theme });
        } catch (e) {
            console.error(`[George] Fanvue publication error:`, e.message);
            results.fanvue = { error: e.message };
        }

        // Publish to Instagram (if morning or night slot)
        if (theme === 'MORNING' || theme === 'NIGHT') {
            try {
                console.log(`[George] Delegating Instagram post to Ana...`);
                results.instagram = await this.ana.publishInstagramPost(theme);
            } catch (e) {
                console.error(`[George] Instagram publication error:`, e.message);
                results.instagram = { error: e.message };
            }
        }

        // 3. Post-publish health audit & auto-healing
        console.log(`[George] 🛡️ Running Ana's Health Audit & Auto-Correction...`);
        const audit = await this.ana.verifyAllChannels();
        results.audit = audit;

        // 4. Roomba storage inspection
        const storageReport = this.roomba.inspectStorage();
        results.storage = storageReport;

        console.log(`\n======================================================`);
        console.log(`✅ GEORGE: Scheduled Tick Completed Successfully`);
        console.log(`======================================================\n`);

        return results;
    }

    /**
     * Content Seeding: Populate Instagram and Fanvue to professional baseline
     */
    async seedBaselineContent() {
        console.log(`\n======================================================`);
        console.log(`🌱 GEORGE: Content Seeding & Profile Baseline Setup`);
        console.log(`======================================================\n`);

        // 1. Generate stories for top assets across all themes with Eve
        const themes = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'];
        for (const t of themes) {
            const dir = path.join(this.selectedContentDir, t);
            if (fs.existsSync(dir)) {
                console.log(`[George] ✍️ Ensuring Eve stories for theme ${t}...`);
                await this.eve.processFolder(dir, { limit: 3 });
            }
        }

        // 2. Seed 10-Photo VIP Vault Bundle on Fanvue ($24.99)
        console.log(`\n[George] 💎 Publishing 10-Photo VIP Vault Bundle to Fanvue...`);
        try {
            await this.ana.publish10PhotoBundle();
            console.log(`[George] ✅ VIP Vault Bundle live!`);
        } catch (e) {
            console.log(`[George] Bundle seeding note:`, e.message);
        }

        // 3. Run full verification & audit
        console.log(`\n[George] 🛡️ Auditing all channels...`);
        await this.ana.verifyAllChannels();

        console.log(`\n======================================================`);
        console.log(`🎉 GEORGE: Baseline Content Seeding Complete!`);
        console.log(`======================================================\n`);
    }

    /**
     * Generate Friday Weekly Producer Summary
     */
    generateWeeklySummary() {
        let log = [];
        if (fs.existsSync(this.logPath)) {
            try { log = JSON.parse(fs.readFileSync(this.logPath, 'utf8')); } catch (e) { log = []; }
        }
        const roombaReport = this.roomba.inspectStorage();

        return {
            title: "🎬 Producer George - Weekly Execution Summary",
            date: new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            character: "Betty Ryal (@bettyryal / @secretsofthelondonmansion)",
            producer: this.name,
            totalPostsLogged: log.length,
            platforms: {
                fanvue: log.filter(p => p.platform === 'Fanvue').length,
                instagram: log.filter(p => p.platform === 'Instagram').length,
                tiktok: log.filter(p => p.platform === 'TikTok').length,
                omnichannel_video: log.filter(p => p.platform === 'OmniChannel_Video').length
            },
            storageQuota: roombaReport.storage,
            status: "ALL AGENTS OPERATIONAL & AUTONOMOUS"
        };
    }
}

// CLI Execution Support
if (require.main === module) {
    const args = process.argv.slice(2);
    const george = new GeorgeProducerAgent();

    (async () => {
        try {
            if (args.includes('--seed') || args.includes('--seed-baseline')) {
                await george.seedBaselineContent();
            } else if (args.includes('--tick') || args.includes('-t')) {
                const themeIdx = args.indexOf('--theme');
                const forcedTheme = themeIdx !== -1 ? args[themeIdx + 1] : null;
                await george.runTick(forcedTheme);
            } else if (args.includes('--summary') || args.includes('-s')) {
                console.log(JSON.stringify(george.generateWeeklySummary(), null, 2));
            } else {
                console.log(`\n======================================================`);
                console.log(`🎬 GEORGE: Main Producer & Workflow Coordinator`);
                console.log(`Role: ${george.role}`);
                console.log(`======================================================`);
                console.log(`Commands:`);
                console.log(`  node src/agents/george.js --tick              # Execute current scheduled slot`);
                console.log(`  node src/agents/george.js --tick --theme NIGHT # Force specific theme slot`);
                console.log(`  node src/agents/george.js --seed              # Seed baseline stories and bundles`);
                console.log(`  node src/agents/george.js --summary           # View weekly execution summary`);
                console.log(`======================================================\n`);
            }
        } catch (e) {
            console.error(`[George Fatal Error]:`, e.message);
            process.exit(1);
        }
    })();
}

module.exports = GeorgeProducerAgent;
