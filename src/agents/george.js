require('dotenv').config();
const fs = require('fs');
const path = require('path');
const EveScreenwriterAgent = require('./eve');
const AnaSocialManager = require('./ana');
const RoombaAgent = require('./roomba');
const JonesCensorAgent = require('./jones');
const BettyAgent = require('./betty');
const NotificationService = require('../services/notification_service');

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
        this.jones = new JonesCensorAgent();
        this.betty = new BettyAgent();
        this.notifier = new NotificationService({ recipient: 'janosgolya@gmail.com' });
        
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
     * Determine current posting theme based on hour of the day (Warsaw Timezone / CEST)
     */
    getCurrentThemeForTime(date = new Date()) {
        // Force calculation in Europe/Warsaw timezone to correctly map GitHub Actions UTC runners
        const warsawHour = parseInt(new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Warsaw',
            hour: 'numeric',
            hour12: false
        }).format(date), 10);

        if (warsawHour >= 6 && warsawHour < 12) return 'MORNING';
        if (warsawHour >= 12 && warsawHour < 17) return 'MIDDAY';
        if (warsawHour >= 17 && warsawHour < 21) return 'PREP';
        return 'NIGHT';
    }

    /**
     * Execute one scheduling cycle tick (Used by Cron / GitHub Actions / GCP)
     */
    async runTick(forcedTheme = null) {
        if (forcedTheme === 'REPORT') {
            const growthAnalytics = require('../services/growth_analytics_service');
            console.log(`[George] 📊 Compiling & Dispatching Executive Growth Report...`);
            const reportData = await growthAnalytics.generateExecutiveReport();
            const result = await this.notifier.sendExecutiveGrowthReport(reportData);
            return { success: true, report: result };
        }

        const theme = forcedTheme || this.getCurrentThemeForTime();
        console.log(`\n======================================================`);
        console.log(`🎬 GEORGE: Running Scheduled Cycle Tick`);
        console.log(`Time: ${new Date().toISOString()} | Target Theme: ${theme}`);
        console.log(`======================================================\n`);

        // 1. Ensure story exists for next unposted item in this theme
        let nextItem = null;
        let rejectedImages = [];

        while (true) {
            nextItem = this.ana.getNextContentForTheme(theme, 'Fanvue');
            
            if (!nextItem) {
                console.log(`[George] 💡 No unposted item with story found for ${theme}. Triggering Eve to create stories...`);
                const themeDir = path.join(this.selectedContentDir, theme);
                if (fs.existsSync(themeDir)) {
                    await this.eve.processFolder(themeDir, { limit: 2 });
                }
                nextItem = this.ana.getNextContentForTheme(theme, 'Fanvue');
            }

            // CROSS-SLOT QUEUE FALLBACK: Prevent empty-run failure if current slot is depleted
            if (!nextItem) {
                console.log(`[George] ⚠️ Slot ${theme} depleted. Searching for unposted content across other themes...`);
                const fallbackThemes = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'].filter(t => t !== theme.toUpperCase());
                for (const fbTheme of fallbackThemes) {
                    const fbDir = path.join(this.selectedContentDir, fbTheme);
                    if (fs.existsSync(fbDir)) {
                        await this.eve.processFolder(fbDir, { limit: 2 });
                    }
                    nextItem = this.ana.getNextContentForTheme(fbTheme, 'Fanvue');
                    if (nextItem) {
                        console.log(`[George] 🔀 Fallback successful! Pulled unposted asset from ${fbTheme} for ${theme} slot.`);
                        break;
                    }
                }
            }

            if (!nextItem) {
                console.log(`[George] ⚠️ All themes are currently depleted across the queue!`);
                return { success: false, reason: `All themes depleted`, rejectedImages };
            }

            console.log(`[George] 🎯 Next asset selected: ${path.basename(nextItem.imagePath)}`);
            
            // JIT Jones Audit
            console.log(`[George] 🕵️‍♂️ Running JIT Jones Quality Audit before publishing...`);
            const audit = await this.jones.inspectImageWithVision(path.basename(nextItem.imagePath), nextItem.imagePath);
            if (audit.rejectionCategory === 'underage_appearance') {
                console.log(`[George] 🚨 ALERT! Jones flagged this image as underage! Rejecting and seeking alternative...`);
                rejectedImages.push(nextItem.imagePath);
                
                // Move the rejected file out of Selected_Content so it isn't picked again
                const rejectedBaseDir = path.join(__dirname, '../../BettyRyal_18centuryServant/Rejected_Content/underage_appearance');
                if (!fs.existsSync(rejectedBaseDir)) fs.mkdirSync(rejectedBaseDir, { recursive: true });
                const destFile = path.join(rejectedBaseDir, path.basename(nextItem.imagePath));
                fs.renameSync(nextItem.imagePath, destFile);
                if (fs.existsSync(nextItem.storyPath)) {
                    fs.renameSync(nextItem.storyPath, path.join(rejectedBaseDir, path.basename(nextItem.storyPath)));
                }
                
                console.log(`[George] 🔄 Re-rolling image selection...`);
                continue; // Loop again to find another image
            }

            console.log(`[George] ✅ Image passed JIT Jones Audit! Proceeds to publication.`);
            break;
        }

        // 2. Clear previous screenshot artifacts so email only receives fresh run results
        const staleScreenshots = [
            'pinterest_published_confirmation.png', 'pinterest_upload_error.png',
            'reddit_published_confirmation.png', 'reddit_upload_error.png',
            'twitter_published_confirmation.png', 'twitter_upload_error.png',
            'instagram_published_confirmation.png', 'instagram_error.png',
            'tiktok_published_confirmation.png', 'tiktok_error.png'
        ];
        staleScreenshots.forEach(f => {
            const p = path.join(__dirname, '../../config', f);
            if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) {}
        });

        // 2. Delegate simultaneous omni-channel publication to Ana (ALL platforms 4x daily)
        const results = {};
        const systemErrors = [];

        // 2.1 Publish to Fanvue (Subscription Feed)
        try {
            console.log(`[George] 💎 Delegating Fanvue publication to Ana...`);
            results.fanvue = await this.ana.publishFanvueItem(nextItem.imagePath, nextItem.storyPath, { theme });
        } catch (e) {
            console.error(`[George] ⚠️ Fanvue publication error:`, e.message);
            results.fanvue = { error: e.message };
            systemErrors.push(`Fanvue: ${e.message}`);
        }

        // 2.2 Publish to Instagram (Grid Feed) - synchronized with nextItem
        try {
            console.log(`[George] 📸 Delegating Instagram Post to Ana...`);
            results.instagram = await this.ana.publishInstagramPost(theme, { item: nextItem });
        } catch (e) {
            console.error(`[George] ⚠️ Instagram publication error:`, e.message);
            results.instagram = { error: e.message };
            systemErrors.push(`Instagram: ${e.message}`);
        }

        // 2.3 Publish to Pinterest (Pin Board) - synchronized with nextItem
        if (this.ana.pinterest.isConfigured()) {
            try {
                console.log(`[George] 📌 Delegating Pinterest Pin to Ana...`);
                results.pinterest = await this.ana.publishPinterestPin(theme, { item: nextItem });
            } catch (e) {
                console.error(`[George] ⚠️ Pinterest publication error:`, e.message);
                results.pinterest = { error: e.message };
                systemErrors.push(`Pinterest: ${e.message}`);
            }
        } else {
            results.pinterest = { error: 'Pinterest session not configured (missing config/pinterest_session.json)' };
        }

        // 2.4 Publish to X / Twitter (High-Res Image Tweet) - synchronized with nextItem
        if (this.ana.twitter.isConfigured()) {
            try {
                console.log(`[George] 🐦 Delegating X / Twitter Post to Ana (Synchronized Image)...`);
                results.twitter = await this.ana.publishTwitterPost(theme, { item: nextItem });
            } catch (e) {
                console.error(`[George] ⚠️ Twitter publication error:`, e.message);
                results.twitter = { error: e.message };
                systemErrors.push(`Twitter: ${e.message}`);
            }
        } else {
            results.twitter = { error: 'Twitter session not configured (missing config/twitter_session.json)' };
        }

        // 2.6 Publish to TikTok (Dedicated 9:16 Video or Post) - synchronized with nextItem
        try {
            console.log(`[George] 📱 Delegating TikTok Video / Post to Ana...`);

            // 2.6.1 Check Platform Quarantine Cooldown
            const quarantinePath = path.join(__dirname, '../../config/quarantine_status.json');
            let isTikTokQuarantined = false;
            let quarantineDetails = null;

            if (fs.existsSync(quarantinePath)) {
                try {
                    const qData = JSON.parse(fs.readFileSync(quarantinePath, 'utf8'));
                    if (qData.TikTok && qData.TikTok.quarantined) {
                        const until = new Date(qData.TikTok.quarantineUntil);
                        if (new Date() < until) {
                            isTikTokQuarantined = true;
                            quarantineDetails = qData.TikTok;
                        } else {
                            qData.TikTok.quarantined = false;
                            fs.writeFileSync(quarantinePath, JSON.stringify(qData, null, 2), 'utf8');
                            console.log(`[George] 🎉 TikTok quarantine cooldown has EXPIRED. Platform unblocked!`);
                        }
                    }
                } catch (qErr) {
                    console.error(`[George] ⚠️ Error checking quarantine status:`, qErr.message);
                }
            }

            if (isTikTokQuarantined) {
                console.log(`[George] 🛑 TikTok is in ACTIVE SAFETY QUARANTINE until ${quarantineDetails.quarantineUntil}. Skipping all publications to protect account trust!`);
                results.tiktok = {
                    status: 'SKIPPED_QUARANTINE_ACTIVE',
                    quarantineUntil: quarantineDetails.quarantineUntil,
                    reason: quarantineDetails.reason
                };
            } else {
                const videoDir = path.join(this.selectedContentDir, 'Videos');
                let targetTikTokAsset = null;
                let targetStoryPath = null;
                let isVideoAsset = false;

            if (fs.existsSync(videoDir)) {
                const videoFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.mp4'));
                for (const vf of videoFiles) {
                    const isPosted = this.ana.log.some(e => e.platform === 'TikTok' && (e.videoFile === vf || e.asset === vf));
                    if (!isPosted) {
                        const vPath = path.join(videoDir, vf);
                        const storyP = path.join(videoDir, vf.replace('.mp4', '.story.txt'));
                        targetTikTokAsset = vPath;
                        targetStoryPath = fs.existsSync(storyP) ? storyP : null;
                        isVideoAsset = true;
                        break;
                    }
                }
            }

            if (!targetTikTokAsset && nextItem) {
                targetTikTokAsset = nextItem.imagePath;
                targetStoryPath = nextItem.storyPath;
                isVideoAsset = false;
            }

            if (targetTikTokAsset) {
                let storyText = '';
                if (targetStoryPath && fs.existsSync(targetStoryPath)) {
                    storyText = fs.readFileSync(targetStoryPath, 'utf8');
                }

                console.log(`[George] 🛡️ Running Jones Platform Compliance Audit for TikTok...`);
                let visualCheckAsset = targetTikTokAsset;
                if (isVideoAsset) {
                    const candidateJpg = targetTikTokAsset.replace('.mp4', '.jpg');
                    visualCheckAsset = fs.existsSync(candidateJpg) ? candidateJpg : (nextItem ? nextItem.imagePath : targetTikTokAsset);
                }

                const ttAudit = await this.jones.auditForPlatform('TikTok', visualCheckAsset, { storyText });

                if (!ttAudit.approved) {
                    console.log(`[George] 🚨 TikTok Upload BLOCKED by Jones Platform Audit:`);
                    ttAudit.reasons.forEach(r => console.log(`   ⛔ ${r}`));
                    results.tiktok = {
                        status: 'BLOCKED_BY_SAFETY_FILTER',
                        reasons: ttAudit.reasons,
                        asset: path.basename(targetTikTokAsset)
                    };
                } else {
                    console.log(`[George] ✅ TikTok Compliance Audit PASSED! Proceeding with upload.`);
                    if (isVideoAsset) {
                        results.tiktok = await this.ana.publishTikTokVideo(targetTikTokAsset, targetStoryPath, { theme });
                    } else {
                        results.tiktok = await this.ana.publishTikTokPost(theme, { item: nextItem });
                    }
                }
            } else {
                results.tiktok = { status: 'NO_CONTENT_AVAILABLE' };
            }
            }
        } catch (e) {
            console.error(`[George] ⚠️ TikTok publication error:`, e.message);
            results.tiktok = { error: e.message };
            systemErrors.push(`TikTok: ${e.message}`);
        }

        // 3. Post-publish health audit & auto-healing
        console.log(`[George] 🛡️ Running Ana's Health Audit & Auto-Correction...`);
        try {
            const audit = await this.ana.verifyAllChannels();
            results.audit = audit;
        } catch (auditErr) {
            console.error(`[George] ⚠️ Health audit error (continuing workflow):`, auditErr.message);
            results.audit = { error: auditErr.message };
            systemErrors.push(`Health Audit: ${auditErr.message}`);
        }

        // 4. Roomba storage inspection
        try {
            const storageReport = this.roomba.inspectStorage();
            results.storage = storageReport;
        } catch (roombaErr) {
            console.error(`[George] ⚠️ Storage inspection error (continuing):`, roombaErr.message);
        }

        // 5. Send executive email with per-platform status, GitHub diagnostics, and screenshot attachments
        const remainingCount = this.getRemainingContentCount();
        console.log(`[George] 📧 Triggering notification dispatch for janosgolya@gmail.com (Remaining: ${remainingCount})...`);
        try {
            await this.notifier.notifyPostPublished({
                theme,
                item: nextItem,
                results,
                remainingCount,
                rejectedImages,
                systemErrors
            });
        } catch (mailErr) {
            console.error(`[George] Notification dispatch note:`, mailErr.message);
        }

        // 6. Send Comprehensive Executive Growth & Revenue Report on NIGHT slot
        if (theme === 'NIGHT' || forcedTheme === 'REPORT') {
            try {
                const growthAnalytics = require('../services/growth_analytics_service');
                console.log(`[George] 📊 Compiling & Dispatching Executive Growth Report...`);
                const reportData = await growthAnalytics.generateExecutiveReport();
                await this.notifier.sendExecutiveGrowthReport(reportData);
            } catch (reportErr) {
                console.error(`[George] Executive report dispatch note:`, reportErr.message);
            }
        }

        // 7. Schedule / Execute Post-Publishing Engagement Session for Betty herself
        try {
            console.log(`[George] 🌹 Initiating Betty's post-publishing engagement session...`);
            const bettySchedule = await this.scheduleBettySession({ immediate: true, sendEmail: true });
            results.bettySession = bettySchedule;
        } catch (bettyErr) {
            console.error(`[George] Betty session scheduling note:`, bettyErr.message);
            results.bettySession = { error: bettyErr.message };
        }

        console.log(`\n======================================================`);
        console.log(`✅ GEORGE: Scheduled Tick Completed Successfully`);
        console.log(`======================================================\n`);

        return results;
    }

    /**
     * Schedules or launches an irregular post-publication human browsing session for Betty
     * @param {Object} [options]
     * @param {number} [options.delayMinMinutes=15]
     * @param {number} [options.delayMaxMinutes=45]
     */
    async scheduleBettySession(options = {}) {
        const minMin = options.delayMinMinutes || 15;
        const maxMin = options.delayMaxMinutes || 45;
        const delayMinutes = Math.floor(Math.random() * (maxMin - minMin + 1)) + minMin;
        console.log(`[George] 🕯️ Irregular human schedule: Betty will visit her profiles in ~${delayMinutes} minutes.`);
        
        if (options.immediate) {
            console.log(`[George] 🌹 Immediate Betty session triggered...`);

            // GITHUB ACTIONS DATACENTER GUARD:
            // Meta / Instagram flags interactive browser sessions originating from datacenter ASNs (Azure / AWS).
            // Cloud CI/CD environments must ONLY run simulated dry-run audits, never live interactive sessions.
            if (process.env.GITHUB_ACTIONS === 'true') {
                console.log(`[George] 🛡️ [GITHUB ACTIONS DATACENTER GUARD ACTIVE]`);
                console.log(`[George] 🛑 Cloud runner environment detected (Azure ASN).`);
                console.log(`[George] 🔒 Live Playwright Instagram browsing is SKIPPED to protect account trust and prevent security checkpoints.`);
                console.log(`[George] 🧪 Running Betty session in safe DRY-RUN audit mode.`);
                return await this.betty.runAutonomousSession({ platform: 'instagram', dryRun: true, sendEmail: options.sendEmail !== false });
            }

            return await this.betty.runAutonomousSession({ platform: 'instagram', dryRun: false, sendEmail: true });
        }
        return { scheduledInMinutes: delayMinutes };
    }

    /**
     * Get total remaining approved images across all theme folders
     */
    getRemainingContentCount() {
        let count = 0;
        const themes = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'];
        for (const t of themes) {
            const dir = path.join(this.selectedContentDir, t);
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                count += files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp') || f.endsWith('.jpeg')).length;
            }
        }
        return count;
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
    async generateWeeklySummary(sendNotification = true) {
        let log = [];
        if (fs.existsSync(this.logPath)) {
            try { log = JSON.parse(fs.readFileSync(this.logPath, 'utf8')); } catch (e) { log = []; }
        }
        const roombaReport = this.roomba.inspectStorage();
        const remainingRunway = this.getRemainingContentCount();

        const summary = {
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
            remainingRunway,
            storageQuota: roombaReport.storage,
            status: "ALL AGENTS OPERATIONAL & AUTONOMOUS"
        };

        if (sendNotification) {
            console.log(`[George] 📧 Sending Weekly Producer Summary to janosgolya@gmail.com...`);
            await this.notifier.notifyWeeklySummary(summary);
        }

        return summary;
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
                console.log(JSON.stringify(await george.generateWeeklySummary(), null, 2));
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
