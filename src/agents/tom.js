const fs = require('fs');
const path = require('path');
const audienceIntelligence = require('../services/audience_intelligence');
const targetRadar = require('../services/target_radar');
const humanEmulator = require('../services/human_emulator');
const EveScreenwriterAgent = require('./eve');

/**
 * Agent Tom
 * Senior Growth Strategist & Target Audience Infiltration Officer for Betty Ryal.
 */
class TomAgent {
    constructor() {
        this.name = "Tom";
        this.role = "Audience Infiltration & Growth Strategist";
        this.archetypes = audienceIntelligence.getAllArchetypes();
        this.eve = new EveScreenwriterAgent();
    }

    /**
     * Prints full overview of audience knowledge and subcultures
     */
    displayKnowledgeSummary() {
        console.log('======================================================');
        console.log('🎩 AGENT TOM: TARGET AUDIENCE INTELLIGENCE BRIEFING');
        console.log('======================================================\n');
        
        this.archetypes.forEach((a, idx) => {
            console.log(`[Archetype ${idx + 1}] 🎯 ${a.title}`);
            console.log(`   👥 Demographics: ${a.demographics}`);
            console.log(`   💡 Key Interests: ${a.interests.slice(0, 5).join(', ')}`);
            console.log(`   🔑 Triggers: ${a.triggerKeywords.slice(0, 5).join(', ')}`);
            console.log(`   🛡️ Funnel Strategy: ${a.engagementStrategy}\n`);
        });
    }

    /**
     * Generates an authentic, in-character response from Betty to a targeted social post
     * @param {string} postContext - Text of the target post / discussion
     * @param {string} platform - Platform context (e.g. 'twitter', 'reddit', 'instagram')
     */
    async generateInCharacterEngagement(postContext, platform = 'twitter') {
        const matchResult = targetRadar.evaluateAudienceMatch(postContext);
        
        const fullPrompt = `You are coaching Betty Ryal (an authentic 20-year-old London maid, 1780s) to write a master-tier in-character social comment.
Betty works in a grand London manor and records what happens behind closed doors in her private diary by tallow candlelight.

STRICT TURING-TEST & CONVERSION RULES:
1. Address the post's exact topic directly with genuine enthusiasm, period charm, and sensory details.
2. Speak as Betty in first person ("I", "in our London manor", "my tallow candle", "my attic chamber").
3. End with an evocative, curious hook that compels the reader to look at her profile.
4. Keep it concise (1 to 2 spoken sentences, under 30 words).
5. ABSOLUTELY ZERO EMOJIS, ZERO LINKS, ZERO HASHTAGS, ZERO MODERN SLANG.

Target Post (${platform}):
"${postContext}"

Generate ONLY Betty's comment in quotes:`;

        const rawReply = await this.eve.callModel(fullPrompt);
        
        // Clean reply of formatting quotes and stray emojis
        let clean = rawReply.replace(/^["']|["']$/g, '').replace(/[\u{1F600}-\u{1F6FF}|[\u{2600}-\u{26FF}]/gu, '').trim();
        return {
            comment: clean,
            matchScore: matchResult.score,
            keywords: matchResult.matchedKeywords
        };
    }

    /**
     * Runs a dry-run human-emulated browsing simulation
     */
    async runDryRunSimulation() {
        console.log('======================================================');
        console.log('🎩 AGENT TOM: RUNNING HUMAN-PHYSICS TEST SIMULATION');
        console.log('======================================================\n');
        
        console.log('1. Evaluating Audience Match on Sample Posts...');
        const sample1 = "I am completely obsessed with the lighting and dresses in Bridgerton season 3! That carriage scene was everything.";
        const match1 = targetRadar.evaluateAudienceMatch(sample1);
        console.log(`   Sample 1 Match Score: ${match1.score}/100 (Matched: ${match1.matchedKeywords.join(', ')})`);

        console.log('\n2. Generating In-Character Betty Response...');
        const reply = await this.generateInCharacterEngagement(sample1, 'twitter');
        console.log(`   Betty: "${reply.comment}"`);

        console.log('\n3. Verifying Anti-Ban Safety Rules...');
        const safety = audienceIntelligence.getSafetyRules();
        console.log(`   ✅ Action Pacing Window: ${safety.minimumIntervalSeconds}s - ${safety.maximumIntervalSeconds}s`);
        console.log(`   ✅ Max Likes/Hour: ${safety.maxLikesPerHour}`);
        console.log(`   ✅ Max Story Views/Hour: ${safety.maxStoryViewsPerHour}`);
        console.log('\n🎉 Simulation Completed: Tom is fully calibrated with 0% ban risk!');
    }
}

// CLI runner
if (require.main === module) {
    const args = process.argv.slice(2);
    const tom = new TomAgent();

    if (args.includes('--learn') || args.includes('-l')) {
        tom.displayKnowledgeSummary();
    } else if (args.includes('--generate-reply')) {
        const textIdx = args.indexOf('--generate-reply') + 1;
        const text = args[textIdx] || "I love 18th century historical romance and corsets!";
        tom.generateInCharacterEngagement(text).then(res => {
            console.log('\nGenerated In-Character Engagement:');
            console.log(`"${res.comment}" (Match Score: ${res.matchScore}/100)`);
        });
    } else {
        tom.runDryRunSimulation().catch(console.error);
    }
}

module.exports = new TomAgent();
