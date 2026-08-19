const fs = require('fs');
const path = require('path');

/**
 * Universal Story Parser & Platform Formatter for InfluMaker
 * Enforces first-principles separation of concerns, character immersion, and deterministic platform budgets.
 */
class StoryParser {
    constructor() {
        this.fanvueUrl = 'https://fanvue.com/bettyryal';
    }

    /**
     * Clean text: strip wrapping quotes, meta tags, and excess whitespace
     */
    cleanFieldText(text) {
        if (!text) return '';
        let cleaned = text.trim();
        // Strip wrapping quotes (single, double, smart quotes)
        cleaned = cleaned.replace(/^["'“«]+|["'”»]+$/g, '').trim();
        // Strip markdown bold/italics wrappers around full lines
        cleaned = cleaned.replace(/^\*\*|\*\*$/g, '').trim();
        // Remove Chinese / East Asian characters
        cleaned = cleaned.replace(/[\u3000-\u303f\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\uff00-\uffef]/g, '');
        // Remove meta-commentary in parentheses e.g. (Exclusive tone)
        cleaned = cleaned.replace(/^\s*\([^)]{0,80}\)\s*[""]?/gm, '');
        // Remove tone labels
        cleaned = cleaned.replace(/^(Exclusive,?\s+seductive\s+tone:?\s*|Intimate\s+tone:?\s*|Whispered:?\s*|Note:?\s*|Caption:?\s*|Betty:?\s*)/gim, '');
        // Remove LLM instructions and prompt echoes
        cleaned = cleaned.replace(/^.*(?:Format your response|generate exactly|do not include markdown).*$/gim, '');
        // Strip lines that contain only stray emojis or symbols with no Latin alphanumeric characters
        if (cleaned.length > 0 && !/[a-zA-Z0-9]/.test(cleaned)) {
            return '';
        }
        return cleaned.trim();
    }

    /**
     * Extracts a field under a markdown header within a section block
     */
    extractSubfield(sectionText, headerPattern, nextHeaderPatterns = []) {
        if (!sectionText) return '';
        const regex = new RegExp(`(?:####|\\*\\*|#)\\s*${headerPattern}\\s*[:\\*]*\\s*\\n?([\\s\\S]*?)(?=(?:####|\\*\\*|#)\\s*(?:${nextHeaderPatterns.join('|')})|### SECTION|$|$)`, 'i');
        const match = sectionText.match(regex);
        if (match && match[1]) {
            return this.cleanFieldText(match[1]);
        }
        return '';
    }

    /**
     * Parses a .story.txt file into structured platform objects
     * @param {string|Object} storyInput - File path or raw text content
     */
    parse(storyInput) {
        let raw = '';
        if (typeof storyInput === 'string') {
            if (fs.existsSync(storyInput)) {
                raw = fs.readFileSync(storyInput, 'utf8');
            } else {
                raw = storyInput;
            }
        }

        const result = {
            metadata: this.parseMetadata(raw),
            tiktok: this.parseTikTok(raw),
            instagram: this.parseInstagram(raw),
            fanvue: this.parseFanvue(raw),
            pinterest: this.parsePinterest(raw),
            reddit: this.parseReddit(raw),
            twitter: this.parseTwitter(raw)
        };

        return result;
    }

    /**
     * Parses header metadata
     */
    parseMetadata(raw) {
        const charMatch = raw.match(/Character:\s*([^\n]+)/i);
        const themeMatch = raw.match(/Theme:\s*([^\n]+)/i);
        const sensMatch = raw.match(/Sensuality:\s*([^\n]+)/i);
        const sceneMatch = raw.match(/👁️ VISUAL SCENE SUMMARY:\s*\n([\s\S]*?)(?=\n###|\n==|$)/i);

        return {
            character: charMatch ? charMatch[1].trim() : 'Betty Ryal (18th-Century Maid)',
            theme: themeMatch ? themeMatch[1].trim() : 'MORNING',
            sensuality: sensMatch ? sensMatch[1].trim() : 'Sensual',
            sceneSummary: sceneMatch ? sceneMatch[1].trim() : ''
        };
    }

    /**
     * Parses SECTION 1: TIKTOK FORMAT
     */
    parseTikTok(raw) {
        const secMatch = raw.match(/### SECTION 1:\s*📱 TIKTOK FORMAT[\s\S]*?(?=### SECTION 2:|$)/i);
        const sec = secMatch ? secMatch[0] : '';

        const hook = this.extractSubfield(sec, 'ON-SCREEN TEXT HOOK', ['SPOKEN NARRATIVE', 'VOICEOVER', 'CAPTION', 'HASHTAGS'])
            || "POV: You caught the inn's new maid in the quiet corridor...";
        
        const voiceover = this.extractSubfield(sec, 'SPOKEN NARRATIVE[\\s\\/]*VOICEOVER', ['CAPTION', 'HASHTAGS', 'ON-SCREEN'])
            || "Before the great London manor stirs, I gather my linens by candlelight. Every shadow here has a secret, and I write them all down in my private journal.";

        let caption = this.extractSubfield(sec, 'CAPTION & BIO REDIRECT', ['HASHTAGS', 'ON-SCREEN', 'SPOKEN'])
            || "They never notice the maid at the door... 🕯️ Full diary in bio 🗝️";
        // Clean out any hashtags accidentally put inside the caption
        caption = caption.replace(/#\w+/g, '').trim();

        const hashtags = this.extractSubfield(sec, 'HASHTAGS', [])
            || "#18thCentury #PeriodDrama #HistoricalRomance #BettyRyal #MaidLife #POV";

        const cleanHashtags = hashtags.match(/#\w+/g) || ['#18thCentury', '#PeriodDrama', '#BettyRyal', '#POV'];

        return {
            hook: this.cleanFieldText(hook),
            voiceover: this.cleanFieldText(voiceover),
            caption: `${this.cleanFieldText(caption)}\n\n${cleanHashtags.slice(0, 6).join(' ')}`,
            rawHashtags: cleanHashtags
        };
    }

    /**
     * Parses SECTION 2: INSTAGRAM FORMAT
     */
    parseInstagram(raw) {
        const secMatch = raw.match(/### SECTION 2:\s*📸 INSTAGRAM FORMAT[\s\S]*?(?=### SECTION 3:|$)/i);
        const sec = secMatch ? secMatch[0] : '';

        let hook = this.extractSubfield(sec, 'OPENING HOOK LINE', ['INTIMATE DIARY', 'ENGAGEMENT QUESTION', 'FANVUE', 'HASHTAGS']);
        let excerpt = this.extractSubfield(sec, 'INTIMATE DIARY EXCERPT', ['ENGAGEMENT QUESTION', 'FANVUE', 'HASHTAGS', 'OPENING HOOK']);
        let question = this.extractSubfield(sec, 'ENGAGEMENT QUESTION', ['FANVUE', 'HASHTAGS', 'OPENING HOOK', 'INTIMATE DIARY']);
        let cta = this.extractSubfield(sec, 'FANVUE LINK-IN-BIO CTA', ['HASHTAGS', 'OPENING HOOK', 'INTIMATE DIARY', 'ENGAGEMENT QUESTION']);
        let hashtags = this.extractSubfield(sec, 'HASHTAGS', []);

        // Fallbacks if section was poorly generated
        if (!excerpt && sec) {
            excerpt = sec.replace(/###.+/g, '').replace(/####.+/g, '').replace(/#\w+/g, '').trim();
        }
        if (!hook) hook = "The morning chill in the stone corridors... 🕯️";
        if (!question) question = "Would you have helped me lace my corset, or let it fall?";
        if (!cta) cta = "Discover the rest of my private diary via the link in my bio 🗝️";

        // Clean hashtags from prose
        hook = hook.replace(/#\w+/g, '').trim();
        excerpt = excerpt.replace(/#\w+/g, '').trim();
        question = question.replace(/#\w+/g, '').trim();
        cta = cta.replace(/#\w+/g, '').trim();

        const defaultTags = ['#18thCentury', '#PeriodDrama', '#FineArtPhotography', '#RembrandtLighting', '#BettyRyal', '#HistoricalRomance', '#LondonManor', '#VintageAesthetic'];
        const parsedTags = (hashtags.match(/#\w+/g) || []).filter(t => !t.toLowerCase().includes('fanvue'));
        const finalTags = parsedTags.length >= 5 ? parsedTags : defaultTags;

        const fullCaption = `${this.cleanFieldText(hook)}\n\n${this.cleanFieldText(excerpt)}\n\n${this.cleanFieldText(question)}\n\n${this.cleanFieldText(cta)}\n.\n.\n.\n${finalTags.slice(0, 12).join(' ')}`;

        return {
            hook: this.cleanFieldText(hook),
            excerpt: this.cleanFieldText(excerpt),
            question: this.cleanFieldText(question),
            cta: this.cleanFieldText(cta),
            hashtags: finalTags,
            fullCaption
        };
    }

    /**
     * Parses SECTION 3: FANVUE FORMAT
     */
    parseFanvue(raw) {
        const secMatch = raw.match(/### SECTION 3:\s*💋 FANVUE FORMAT[\s\S]*?(?=### SECTION 4:|$)/i);
        const sec = secMatch ? secMatch[0] : '';

        let confession = this.extractSubfield(sec, 'SUBSCRIBER DIARY CONFESSION', ['PAYWALL', 'PPV TEASER', 'TIP MENU', 'VIP CTA']);
        let teaser = this.extractSubfield(sec, 'PAYWALL & PPV TEASER PITCH', ['TIP MENU', 'VIP CTA', 'SUBSCRIBER DIARY']);
        let vip = this.extractSubfield(sec, 'TIP MENU & VIP CTA', ['SUBSCRIBER DIARY', 'PAYWALL']);

        if (!confession && sec) {
            confession = sec.replace(/###.+/g, '').replace(/####.+/g, '').trim();
        }
        if (!confession) {
            confession = "In the quiet hours before dawn, when the hearth fires burn low and the house is still, I sit in my cold attic with only my tallow candle for company. My hands are still warm from the linen sheets, and my heart races as I write down what I truly felt...";
        }

        confession = confession.replace(/#\w+/g, '').trim();
        teaser = teaser.replace(/#\w+/g, '').trim();
        vip = vip.replace(/#\w+/g, '').trim();

        let fullPost = `${this.cleanFieldText(confession)}`;
        if (teaser) {
            fullPost += `\n\n${this.cleanFieldText(teaser)}`;
        }
        if (vip) {
            fullPost += `\n\n${this.cleanFieldText(vip)}`;
        }
        fullPost += `\n\nWith all my whispered secrets,\nBetty 🕯️💋\n\n#BettyRyal #HistoricalRomance #Fanvue #CandlelightChronicles`;

        return {
            confession: this.cleanFieldText(confession),
            teaser: this.cleanFieldText(teaser),
            vip: this.cleanFieldText(vip),
            fullPost
        };
    }

    /**
     * Parses SECTION 4: PINTEREST FORMAT
     */
    parsePinterest(raw) {
        const secMatch = raw.match(/### SECTION 4:\s*📌 PINTEREST FORMAT[\s\S]*?(?=### SECTION 5:|$)/i);
        const sec = secMatch ? secMatch[0] : '';

        let title = this.extractSubfield(sec, 'TITLE', ['DESCRIPTION', 'BOARD', 'LINK']);
        let description = this.extractSubfield(sec, 'DESCRIPTION', ['BOARD', 'LINK', 'TITLE']);
        let board = this.extractSubfield(sec, 'BOARD', ['LINK', 'TITLE', 'DESCRIPTION']);

        if (!title) title = "18th Century London Maid by Candlelight 🕯️ | Historical Romance Aesthetic";
        if (!description) description = "A delicate moment in the quiet manor corridors. Step into Betty Ryal's 18th-century world of candlelight, corset stays, and whispered London secrets. Discover her full private diary.";
        if (!board) board = "18th Century Aesthetic & Maid Secrets";

        return {
            title: this.cleanFieldText(title).substring(0, 100),
            description: this.cleanFieldText(description).substring(0, 500),
            board: this.cleanFieldText(board),
            link: this.fanvueUrl
        };
    }

    /**
     * Parses SECTION 5: REDDIT FORMAT
     */
    parseReddit(raw) {
        const secMatch = raw.match(/### SECTION 5:\s*🤖 REDDIT FORMAT[\s\S]*?(?=### SECTION 6:|$)/i);
        const sec = secMatch ? secMatch[0] : '';

        let title = this.extractSubfield(sec, 'POST TITLE', ['TARGET SUBREDDITS', 'FIRST COMMENT']);
        let subreddits = this.extractSubfield(sec, 'TARGET SUBREDDITS', ['FIRST COMMENT', 'POST TITLE']);
        let comment = this.extractSubfield(sec, 'FIRST COMMENT', ['POST TITLE', 'TARGET SUBREDDITS']);

        if (!title) title = "Betty's quiet hour before the London manor awakens... [OC] [18th Century Aesthetic]";
        if (!comment) comment = "Studying 18th-century lighting and London servant stays for my character Betty Ryal. What do you think of the linen textures? More of her secret diary is linked on my profile!";

        return {
            title: this.cleanFieldText(title).substring(0, 250),
            subreddits: subreddits || 'r/aiArt, r/HistoricalCostuming, r/AIGirls',
            comment: this.cleanFieldText(comment)
        };
    }

    /**
     * Parses SECTION 6: X (TWITTER) FORMAT
     * Enforces STRICT 280-character budget and 100% Betty character immersion.
     */
    parseTwitter(raw) {
        const secMatch = raw.match(/### SECTION 6:\s*🐦 X\s*\(?TWITTER\)? FORMAT[\s\S]*?(?=$)/i)
            || raw.match(/### SECTION 3:\s*🐦 X\s*\(?TWITTER\)? FORMAT[\s\S]*?(?=$)/i);
        const sec = secMatch ? secMatch[0] : '';

        let tweetBody = '';
        if (sec) {
            tweetBody = this.extractSubfield(sec, 'TWEET TEXT', ['CALLOUT LINK', 'HASHTAGS'])
                || sec.replace(/###.+/g, '').replace(/####.+/g, '').trim();
        }

        // Clean existing text of quotes, links, and hashtags
        tweetBody = this.cleanFieldText(tweetBody);
        tweetBody = tweetBody.replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').trim();

        // If tweet body is empty or too short, generate authentic 18th-century fallback from visual summary or general voice
        if (!tweetBody || tweetBody.length < 15) {
            const meta = this.parseMetadata(raw);
            if (meta.theme === 'MORNING') {
                tweetBody = "Before the London manor stirs, I write my quiet confessions by tallow candlelight in the attic.";
            } else if (meta.theme === 'MIDDAY') {
                tweetBody = "Scrubbing the grand halls taught me that the quietest maids hear the loudest secrets.";
            } else if (meta.theme === 'PREP') {
                tweetBody = "Lacing heavy silk stays for the evening ball while keeping my own desires locked tight.";
            } else {
                tweetBody = "When the candles burn down and the manor sleeps, my diary is the only place I can be truly free.";
            }
        }

        const hashtags = "#BettyRyal #18thCentury #PeriodDrama";
        const link = this.fanvueUrl;

        // Character budget calculation:
        // Max total = 280
        // Link = 23 chars (standard t.co length) + 2 newlines = 25 chars
        // Hashtags = ~37 chars + 2 newlines = 39 chars
        // Max body text length = 280 - 25 - 39 - 5 (safety) = ~210 chars
        const maxBodyLen = 205;
        if (tweetBody.length > maxBodyLen) {
            tweetBody = tweetBody.substring(0, maxBodyLen - 3).trim() + '...';
        }

        const fullTweet = `${tweetBody}\n\n${link}\n\n${hashtags}`;

        return {
            body: tweetBody,
            link,
            hashtags: ['#BettyRyal', '#18thCentury', '#PeriodDrama'],
            fullTweet
        };
    }
}

module.exports = new StoryParser();
