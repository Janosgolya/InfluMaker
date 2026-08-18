const audienceIntelligence = require('./audience_intelligence');

/**
 * TargetRadar
 * Finds and curates active prospects, trending hashtags, and niche communities for outreach.
 */
class TargetRadar {
    constructor() {
        this.archetypes = audienceIntelligence.getAllArchetypes();
    }

    /**
     * Returns curated search targets for a given platform
     * @param {string} platform - 'instagram' | 'twitter' | 'reddit' | 'pinterest'
     */
    getTargetsForPlatform(platform) {
        const p = platform.toLowerCase();
        
        if (p === 'instagram') {
            return {
                hashtags: audienceIntelligence.getHashtagsForPlatform('instagram'),
                anchorAccounts: [
                    'bridgertonnetflix',
                    'outlander_starz',
                    'aitana.lopez',
                    'emilypellegrini',
                    'historicalromanceclub',
                    'bernadettebanner'
                ],
                targetInteractions: ['view_story', 'like_comment']
            };
        }

        if (p === 'twitter' || p === 'x') {
            return {
                hashtags: audienceIntelligence.getHashtagsForPlatform('twitter'),
                searchQueries: [
                    '#Bridgerton "maid" OR "corset"',
                    '#PeriodDrama "aesthetic"',
                    '#AIArt "photorealistic" "character"',
                    '#HistoricalRomance "secret"'
                ],
                targetInteractions: ['reply_in_character', 'like_tweet']
            };
        }

        if (p === 'reddit') {
            return {
                subreddits: [
                    'aiArt',
                    'AIGirls',
                    'HistoricalCostuming',
                    'HistoricalRomance',
                    'RomanceBooks',
                    'DarkAcademia'
                ],
                targetInteractions: ['submit_art_post', 'post_in_character_comment']
            };
        }

        return {
            hashtags: ['#18thCentury', '#PeriodDrama', '#BettyRyal'],
            targetInteractions: ['view_story']
        };
    }

    /**
     * Checks if a post or comment matches target audience relevance
     * @param {string} text - Content text
     */
    evaluateAudienceMatch(text) {
        if (!text) return { matches: false, score: 0, matchedKeywords: [] };
        
        const lower = text.toLowerCase();
        const matched = [];
        let score = 0;

        for (const arch of this.archetypes) {
            const allKeywords = [...(arch.triggerKeywords || []), ...(arch.interests || [])];
            for (const kw of allKeywords) {
                const kwClean = kw.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
                if (kwClean.length > 2 && lower.includes(kwClean)) {
                    matched.push(kw);
                    score += 20;
                }
            }
        }

        return {
            matches: score >= 20,
            score: Math.min(100, score),
            matchedKeywords: [...new Set(matched)]
        };
    }
}

module.exports = new TargetRadar();
