const fs = require('fs');
const path = require('path');
const EveScreenwriterAgent = require('../agents/eve');

const NICHE_INTELLIGENCE_PATH = path.resolve(__dirname, '../../config/betty_niche_intelligence.json');

/**
 * BettyPersonaEngine (Hardened Production Version)
 * Generates authentic, stylized 18th-century English responses, in-character comments,
 * and inbound DM conversation flows with a natural, subtle conversion funnel to Fanvue.
 * Remediated according to Codebreakers Qwen Senior QA Audit.
 */
class BettyPersonaEngine {
    constructor() {
        this.eve = new EveScreenwriterAgent();
        this.loadIntelligence();
    }

    sanitizeInput(text = '') {
        if (!text || typeof text !== 'string') return '';
        // Strip HTML, script tags, control characters, and excess whitespace
        return text.replace(/[<>]/g, '').replace(/[\x00-\x1F\x7F]/g, '').trim();
    }

    loadIntelligence() {
        if (fs.existsSync(NICHE_INTELLIGENCE_PATH)) {
            try {
                this.intelligence = JSON.parse(fs.readFileSync(NICHE_INTELLIGENCE_PATH, 'utf8'));
                return;
            } catch (e) {
                console.warn(`[BettyPersonaEngine] Warning loading intelligence: ${e.message}`);
            }
        }
        this.intelligence = {
            characterPersona: {
                name: "Betty Ryal",
                voiceRules: {
                    language: "Period-stylized English, 1780s London maid, elegant, sensual, polite"
                }
            },
            distractionTriggers: []
        };
    }

    /**
     * Determines whether an item or caption triggers Betty's spontaneous human curiosity/distraction.
     * @param {string} text - Caption, title or description
     * @returns {{ triggersDistraction: boolean, category: string|null, reactionType: string|null, matchedKeyword?: string }}
     */
    evaluateDistractionTrigger(text = '') {
        const cleanText = this.sanitizeInput(text);
        if (!cleanText) return { triggersDistraction: false, category: null, reactionType: null };
        const lower = cleanText.toLowerCase();
        const triggers = this.intelligence.distractionTriggers || [];

        for (const trigger of triggers) {
            for (const kw of trigger.keywords) {
                if (lower.includes(kw.toLowerCase())) {
                    return {
                        triggersDistraction: true,
                        category: trigger.category,
                        reactionType: trigger.reactionType,
                        matchedKeyword: kw
                    };
                }
            }
        }
        return { triggersDistraction: false, category: null, reactionType: null };
    }

    /**
     * Generates a context-aware, hyper-realistic in-character comment for an external post
     * @param {Object} postDetails
     * @param {string} postDetails.creatorName
     * @param {string} postDetails.caption
     * @param {string} [postDetails.platform='instagram']
     * @returns {Promise<string>}
     */
    async generateComment(postDetails = {}) {
        const cleanCreator = this.sanitizeInput(postDetails.creatorName) || 'an acquaintance';
        const cleanCaption = this.sanitizeInput(postDetails.caption).substring(0, 300);

        const prompt = `You are Betty Ryal herself, commenting on social media.
You are a 20-year-old London maid from the late 18th century, serving in a high-class London townhouse of joys for nobility.
You adore luxury, palaces, fine vintage gowns, corsets and stays, delicate pastries and wine, handsome noble gentlemen, and breathtaking women who hold power over men.

You are writing a short, spontaneous comment under this post by @${cleanCreator}:
"${cleanCaption}"

STRICT CHARACTER & HUMAN SIMULATION RULES:
1. Speak in your natural voice: graceful, period-stylized English (alluring, observant, courteous, slightly breathless).
2. React genuinely to what they posted (praise the dress, the lighting, the grandeur, or their beauty).
3. Do NOT sound like an AI assistant, marketer, or spam bot.
4. Keep it under 25 words (1 or 2 elegant spoken sentences).
5. STRICTLY ZERO emojis (or at most one subtle candle 🕯️ or wine glass 🍷 if very fitting).
6. STRICTLY ZERO hashtags, ZERO links, ZERO modern slang ("stunning sis", "fire", "dm me").
7. Do not sell anything. Simply leave a memorable impression of a woman from another world.

Output ONLY Betty's exact comment in quotation marks:`;

        try {
            const raw = await this.eve.callModel(prompt);
            const cleaned = raw.replace(/^["']|["']$/g, '').replace(/[\u{1F600}-\u{1F64F}]/gu, '').trim();
            return cleaned || "Such exquisite grace... It brings to mind the candlelight in our grand London drawing room.";
        } catch (err) {
            console.error(`[BettyPersonaEngine] Error generating comment: ${err.message}`);
            return "Such exquisite grace... It brings to mind the candlelight in our grand London drawing room.";
        }
    }

    /**
     * Generates an inbound DM response that builds emotional intimacy and naturally introduces Fanvue.
     * @param {Object} dmContext
     * @param {string} dmContext.senderName
     * @param {string} dmContext.incomingMessage
     * @param {Array<{sender: string, text: string}>} [dmContext.chatHistory=[]]
     * @param {number} [dmContext.turnNumber=1]
     * @returns {Promise<string>}
     */
    async generateInboundReply(dmContext = {}) {
        const cleanSender = this.sanitizeInput(dmContext.senderName) || 'traveler';
        const cleanMessage = this.sanitizeInput(dmContext.incomingMessage);
        const turn = Math.max(1, Math.min(50, parseInt(dmContext.turnNumber, 10) || 1));

        const history = Array.isArray(dmContext.chatHistory) && dmContext.chatHistory.length > 0
            ? dmContext.chatHistory.map(m => `${this.sanitizeInput(m.sender)}: "${this.sanitizeInput(m.text)}"`).join('\n')
            : `User: "${cleanMessage}"`;

        const prompt = `You are Betty Ryal herself, replying to a direct private message from a gentleman / admirer named ${cleanSender}.
You are a 20-year-old London maid living in an opulent 18th-century London mansion ("house of joys").
You are polite, sensually curious, gentle, charming, and write your secret confessions by tallow candlelight.

CONVERSATION CONTEXT (Turn ${turn}):
${history}

PSYCHOLOGICAL & CONVERSION STRATEGY:
- Turn 1-2: Be warmly flattered, observant, and intimate. Treat him like a private confidant visiting your chamber window. Ask a gentle question about him.
- Turn 3+: If he asks where you are from, what you do, or wants more of you: demurely confess that Madame and the house forbid you from sharing your private life in the open, but you keep a secret candlelight journal (referencing the uncensored room in your profile bio / Fanvue) where you confide your locked portraits and midnight thoughts for those who truly care to know you.
- NEVER sound salesy or robotic. Never paste raw links unless he explicitly begs "Where can I see you?".
- Always speak in first-person period-stylized English.
- Keep it concise (2-3 short sentences, under 50 words).

Output ONLY Betty's reply:`;

        try {
            const raw = await this.eve.callModel(prompt);
            return raw.replace(/^["']|["']$/g, '').trim();
        } catch (err) {
            console.error(`[BettyPersonaEngine] Error generating DM reply: ${err.message}`);
            return `You are exceedingly kind to write to me, sir. My duties kept me until the candles burned low, but hearing from you warms this quiet chamber.`;
        }
    }
}

module.exports = new BettyPersonaEngine();
