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
        // Check if entire text is a prompt placeholder e.g. [A punchy, breathless...] or [Teasing 1-sentence...]
        if (/^\[.*\]$/s.test(cleaned) ||
            /micro-confession|strictly under|1-sentence caption|teasing 1-sentence|zero hashtags|punchy, breathless/i.test(cleaned)) {
            return '';
        }
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

        const metadata = this.parseMetadata(raw);
        const result = {
            metadata,
            tiktok: this.parseTikTok(raw, metadata),
            instagram: this.parseInstagram(raw, metadata),
            fanvue: this.parseFanvue(raw, metadata),
            pinterest: this.parsePinterest(raw, metadata),
            reddit: this.parseReddit(raw, metadata),
            twitter: this.parseTwitter(raw, metadata)
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
     * Extracts visual context indicators from scene description and theme
     */
    detectVisualContext(sceneSummary = '', theme = 'MORNING') {
        const text = (sceneSummary || '').toLowerCase();
        
        const isBedOrSleepwear = /\b(bed|nightgown|sleep|sleeping|waking|wake|sheets|mattress|pillow|blanket|chemise|lying|bare feet|stretched|stretching|attic bed)\b/i.test(text);
        const isWashingOrWater = /\b(washing|wash|laundry|trough|basin|water|soapy|soap|rinse|hands in basin|face with water)\b/i.test(text);
        const isCleaningOrChores = /\b(scrubbing|scrub|floor|flagstone|sweeping|sweep|dusting|dust|polishing|polish|silver|hearth|fire|wood carvings|smoothing linen)\b/i.test(text);
        const isKitchenOrCooking = /\b(soup|pot|cooking|kitchen|hearth|feast|eating|pouring|tavern|bread|copper)\b/i.test(text);
        const isCraftsOrKnitting = /\b(knitting|knit|needle|mending|mend|sewing|sew|spinning|yarn)\b/i.test(text);
        const isWindowOrNight = /\b(window|diamond panes|reflection|mirror|candle|candlelight|tallow|shadows|lantern|dark|night sky|corridor)\b/i.test(text);
        const isCorsetOrDressing = /\b(corset|stays|lacing|unlaced|unlacing|bodice|undressing|dressing gown|silk gown|evening ball|fine gown)\b/i.test(text);

        return {
            isBedOrSleepwear,
            isWashingOrWater,
            isCleaningOrChores,
            isKitchenOrCooking,
            isCraftsOrKnitting,
            isWindowOrNight,
            isCorsetOrDressing
        };
    }

    /**
     * Simple deterministic seed from string (hardened against unbounded input)
     */
    getSeed(str = '') {
        const s = typeof str === 'string' ? str.slice(0, 500) : '';
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            hash = (hash << 5) - hash + s.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    /**
     * Generates a contextually accurate Instagram engagement question matching the scene
     */
    generateContextualQuestion(sceneSummary = '', theme = 'MORNING', currentQuestion = '') {
        const context = this.detectVisualContext(sceneSummary, theme);
        const cleanCurrent = this.cleanFieldText(currentQuestion);

        // If question already exists and is appropriate (doesn't mention corset when not dressed in corset), keep it
        const hasCorsetMention = /\b(corset|stays|lace my|lace her)\b/i.test(cleanCurrent);
        if (cleanCurrent && cleanCurrent.length >= 15 && (!hasCorsetMention || context.isCorsetOrDressing)) {
            return cleanCurrent;
        }

        const seed = this.getSeed(sceneSummary || theme);

        if (context.isBedOrSleepwear) {
            const pool = [
                "Do you ever find yourself waking in the quiet hours before dawn, lost in thought?",
                "What dreams keep you awake when the morning chill touches the linen sheets?",
                "Would you linger with me in the attic stillness, or hurry to meet the morning bell?",
                "Do the quiet moments before the house stirs bring you peace, or restless longing?"
            ];
            return pool[seed % pool.length];
        }

        if (context.isWashingOrWater) {
            const pool = [
                "Have you ever found quiet peace in the steady rhythm of cold water and chores?",
                "What whispered secrets would you share while the rest of the manor sleeps?",
                "Do the simplest tasks give your mind space to wander into forbidden thoughts?",
                "Would you keep me company by the washbasin, or leave me to the morning cold?"
            ];
            return pool[seed % pool.length];
        }

        if (context.isCleaningOrChores) {
            const pool = [
                "Do you find that the quietest chores often carry the heaviest thoughts?",
                "If you walked down this corridor while I worked, would you stop to speak with me?",
                "Have you ever longed for someone to break the silence of a long day's duty?",
                "What secrets would you look for in the grand halls of an 18th-century manor?"
            ];
            return pool[seed % pool.length];
        }

        if (context.isKitchenOrCooking) {
            const pool = [
                "Do you prefer the warmth of the roaring hearth, or the cool shadows of the evening?",
                "What comforting memories remind you most of home on a cold London night?",
                "If you sat by the kitchen fire tonight, what story would you ask me to tell?",
                "Would you steal a quiet moment with me by the hearth before the masters call?"
            ];
            return pool[seed % pool.length];
        }

        if (context.isCraftsOrKnitting) {
            const pool = [
                "Have you ever found solace in counting quiet stitches while the world rushes past?",
                "What thoughts keep your hands busy when the night grows long and cold?",
                "Would you keep me company in the attic while the tallow candle burns down?",
                "Do you ever pour your deepest secrets into quiet, patient work?"
            ];
            return pool[seed % pool.length];
        }

        if (context.isWindowOrNight) {
            const pool = [
                "What secrets would you whisper if you found me gazing out into the London fog?",
                "Do the quiet shadows comfort you, or do they make your heart race?",
                "Would you keep watch with me through the dark, or blow out the tallow flame?",
                "If you looked up at my attic window from the cobblestones, would you wonder who waits inside?"
            ];
            return pool[seed % pool.length];
        }

        if (context.isCorsetOrDressing) {
            const pool = [
                "Would you have helped me lace my stays, or let them fall?",
                "Do you think the grand ladies' gowns hide heavier secrets than a maid's simple apron?",
                "How long would you linger in the dressing chamber before slipping away?"
            ];
            return pool[seed % pool.length];
        }

        const fallbackPool = [
            "If our paths crossed in the quiet corridors tonight, would you call my name or keep silent?",
            "What unspoken thoughts do you hold closest when the rest of the world is asleep?",
            "Do you believe a servant girl sees more of the truth than the lords and ladies?"
        ];
        return fallbackPool[seed % fallbackPool.length];
    }

    /**
     * Sanitizes narrative excerpt to prevent contradictory clothing/actions
     */
    sanitizeNarrativeExcerpt(excerpt = '', sceneSummary = '', theme = 'MORNING') {
        if (!excerpt) return '';
        let cleaned = this.cleanFieldText(excerpt);
        const context = this.detectVisualContext(sceneSummary, theme);

        if (!context.isCorsetOrDressing) {
            // Remove misplaced engagement questions that leaked into excerpt prose
            cleaned = cleaned.replace(/Would you have helped (me|her) lace (my|her) (corset|stays)[^?.\n]*\??/gi, '');
            // Replace incongruous stays/corset physical references
            cleaned = cleaned.replace(/made my stays feel heavy/gi, 'made my heart feel heavy');
            cleaned = cleaned.replace(/my corset was laced with/gi, 'my diary was filled with');
            cleaned = cleaned.replace(/pulse race against my corset/gi, 'pulse race in my chest');
            cleaned = cleaned.replace(/pounding so loudly against my corset/gi, 'pounding so loudly in my chest');
            cleaned = cleaned.replace(/longed to lace (her|my) corset/gi, 'longed to speak my secret thoughts');
            cleaned = cleaned.replace(/let my corset fall/gi, 'let my guard fall');
            cleaned = cleaned.replace(/as I try to lace my stays/gi, 'as I smooth my cold linen');
            cleaned = cleaned.replace(/helped lace (her|my) (stays|corset)/gi, 'shared that quiet glance');
            cleaned = cleaned.replace(/help me lace my (corset|stays)/gi, 'keep me company in this quiet chamber');
            cleaned = cleaned.replace(/loosened my stays/gi, 'paused my breath');
            cleaned = cleaned.replace(/secret lace-up( moment)?/gi, 'secret quiet moment');
            cleaned = cleaned.replace(/corset falling slightly/gi, 'gown catching the candlelight');
            cleaned = cleaned.replace(/lace (her|my) (stays|corset)/gi, 'fasten her simple gown');
            cleaned = cleaned.replace(/\bcorset\b/gi, 'linen gown');
            cleaned = cleaned.replace(/\bstays\b/gi, 'linens');
        }

        // Clean double spaces and empty lines
        return cleaned.replace(/[ \t]{2,}/g, ' ').trim();
    }

    /**
     * Parses SECTION 2: INSTAGRAM FORMAT with Visual Scene Consistency
     */
    parseInstagram(raw, metadata = null) {
        const secMatch = raw.match(/### SECTION 2:\s*📸 INSTAGRAM FORMAT[\s\S]*?(?=### SECTION 3:|$)/i);
        const sec = secMatch ? secMatch[0] : '';

        const meta = metadata || this.parseMetadata(raw);
        const sceneSummary = meta.sceneSummary || '';
        const theme = meta.theme || 'MORNING';

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
        if (!cta) cta = "Discover the rest of my private diary via the link in my bio 🗝️";

        // Clean hashtags from prose
        hook = hook.replace(/#\w+/g, '').trim();
        excerpt = excerpt.replace(/#\w+/g, '').trim();
        question = question.replace(/#\w+/g, '').trim();
        cta = cta.replace(/#\w+/g, '').trim();

        // Visual Context Consistency & Grounding
        excerpt = this.sanitizeNarrativeExcerpt(excerpt, sceneSummary, theme);
        question = this.generateContextualQuestion(sceneSummary, theme, question);

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
     * Generates a contextually accurate, non-repeating 18th-century tweet grounded in the image
     */
    generateContextualTweet(sceneSummary = '', theme = 'MORNING', existingBody = '', extraSalt = 0) {
        const context = this.detectVisualContext(sceneSummary, theme);
        let body = this.cleanFieldText(existingBody);
        body = body.replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').trim();

        const isStockCanned = [
            /When the candles burn down and the manor sleeps/i,
            /Before the London manor stirs, I write my quiet confessions/i,
            /Scrubbing the grand halls taught me/i,
            /Lacing heavy silk stays for the evening ball/i,
            /Caught in the quiet corridor of the manor/i,
            /Swipe up to read/i
        ].some(p => p.test(body));

        const hasCorsetConflict = !context.isCorsetOrDressing && /\b(corset|stays)\b/i.test(body);

        // If body is valid, unique, and not conflicting, keep it
        if (body && body.length >= 20 && !isStockCanned && !hasCorsetConflict) {
            return body;
        }

        const seed = (this.getSeed(sceneSummary || theme) + extraSalt);

        if (context.isBedOrSleepwear) {
            const pool = [
                "Linen sheets still warm from restless dreams before the morning bell strikes in the manor.",
                "Waking in the drafty attic chamber while London still sleeps under a veil of autumn mist.",
                "The tallow candle burns low as I lie in the quiet dawn, thinking of what cannot be spoken aloud.",
                "A moment of stillness on the cold linen before the long day of service claims my hours.",
                "Listening to the quiet rain against the roof before anyone in the grand house awakens."
            ];
            return pool[seed % pool.length];
        }

        if (context.isWashingOrWater) {
            const pool = [
                "Cold well-water and coarse lavender soap numbing my fingers. Even simple chores hold whispered secrets.",
                "Washing linens by candlelight before the house stirs. My thoughts drift further than the Thames.",
                "The steam from the washbasin rises into the cold air. Another quiet morning keeping secrets.",
                "Scrubbing fine lace in cold water, wondering about the ladies who wear it into grand ballrooms."
            ];
            return pool[seed % pool.length];
        }

        if (context.isCleaningOrChores) {
            const pool = [
                "Scrubbing stone flagstones in the corridor, learning which doors to pass and which to watch.",
                "Polishing brass and wood by candlelight. The quietest maids always hear the loudest secrets.",
                "Duty begins long before the ladies awake. In this quiet labor, my heart wanders freely.",
                "Gathering fresh linens in the stone gallery while the morning fog clings to the courtyard."
            ];
            return pool[seed % pool.length];
        }

        if (context.isKitchenOrCooking) {
            const pool = [
                "Tending the great hearth in the early hour, watching embers glow like whispered confidences.",
                "The kitchen warms slowly while London sleeps outside. My diary holds what my lips dare not say.",
                "Stirring the copper pot by firelight, wondering what tomorrow's banquet will bring to our manor.",
                "Bread baking in the hearth while I steal a quiet moment to write by candlelight."
            ];
            return pool[seed % pool.length];
        }

        if (context.isCraftsOrKnitting) {
            const pool = [
                "Counting quiet stitches in the attic while the grand house sleeps below. My diary knows my heart.",
                "The rhythmic click of needles by candlelight—the only sound in a house full of hidden lives.",
                "Mending linen in the quiet afternoon. A maid's hands are never idle, nor are her thoughts.",
                "Knitting warm wool by the attic window while evening settles over the London chimneys."
            ];
            return pool[seed % pool.length];
        }

        if (context.isWindowOrNight) {
            const pool = [
                "Staring through diamond panes into the London fog, wondering if anyone out there shares my longing.",
                "A single tallow flame between me and the grand manor's darkness. My journal is my only confidante.",
                "Watching the street lanterns flicker through London's mist while keeping my quiet watch.",
                "When the manor falls silent, I look out over the cobblestones and write my true thoughts."
            ];
            return pool[seed % pool.length];
        }

        if (context.isCorsetOrDressing) {
            const pool = [
                "Lacing silk stays in the dressing room while listening to low laughter echo down the gallery.",
                "Silk and ribbons for the ladies, coarse linen for me—yet our secret desires are not so different.",
                "Fastening silk buttons in the golden afternoon light before the carriage arrives."
            ];
            return pool[seed % pool.length];
        }

        const fallbackPool = [
            "In the quiet corners of this 18th-century manor, every candle flame reveals a secret.",
            "Walking softly so the floorboards never tell where Betty has been.",
            "My hands belong to the house, but my thoughts by candlelight belong only to my diary."
        ];
        return fallbackPool[seed % fallbackPool.length];
    }

    /**
     * Parses SECTION 6: X (TWITTER) FORMAT
     * Enforces STRICT 280-character budget, scene grounding, and zero duplicate stock phrases.
     */
    parseTwitter(raw, metadata = null) {
        const secMatch = raw.match(/### SECTION 6:\s*🐦 X\s*\(?TWITTER\)? FORMAT[\s\S]*?(?=$)/i)
            || raw.match(/### SECTION 3:\s*🐦 X\s*\(?TWITTER\)? FORMAT[\s\S]*?(?=$)/i);
        const sec = secMatch ? secMatch[0] : '';

        const meta = metadata || this.parseMetadata(raw);
        const sceneSummary = meta.sceneSummary || '';
        const theme = meta.theme || 'MORNING';

        let tweetBody = '';
        if (sec) {
            tweetBody = this.extractSubfield(sec, 'TWEET TEXT', ['CALLOUT LINK', 'HASHTAGS'])
                || sec.replace(/###.+/g, '').replace(/####.+/g, '').trim();
        }

        // Clean existing text of quotes, links, and hashtags
        tweetBody = this.cleanFieldText(tweetBody);
        tweetBody = tweetBody.replace(/https?:\/\/\S+/g, '').replace(/#\w+/g, '').trim();

        // Enforce scene grounding and deduplication
        tweetBody = this.generateContextualTweet(sceneSummary, theme, tweetBody);

        const hashtags = "#BettyRyal #18thCentury #PeriodDrama";
        const link = this.fanvueUrl;

        // Character budget calculation:
        // Max total = 280
        // Link = 23 chars (standard t.co length) + 2 newlines = 25 chars
        // Hashtags = ~37 chars + 2 newlines = 39 chars
        // Max body text length = 280 - 25 - 39 - 5 (safety) = ~210 chars
        const maxBodyLen = 205;
        let fullTweet = `${tweetBody}\n\n${link}\n\n${hashtags}`.trim();
        if (fullTweet.length > 280) {
            const overflow = fullTweet.length - 280;
            tweetBody = tweetBody.substring(0, Math.max(0, tweetBody.length - overflow - 3)).trim() + '...';
            fullTweet = `${tweetBody}\n\n${link}\n\n${hashtags}`.trim();
        }

        return {
            body: tweetBody,
            link,
            hashtags: ['#BettyRyal', '#18thCentury', '#PeriodDrama'],
            fullTweet
        };
    }
}

module.exports = new StoryParser();
