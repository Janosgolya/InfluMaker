const fs = require('fs');
const path = require('path');
const JonesCensorAgent = require('./agents/jones');

const targetImages = [
    'IMG_AE726655.jpeg',
    'IMG_E8C5EDB6.png',
    'IMG_9EC3E105.png',
    'IMG_8D173DFE.png',
    'IMG_02B697D7.png',
    'IMG_7315FF9F.png',
    'IMG_54787AEB.png',
    'IMG_0ED47A52.png',
    'IMG_424A2208.png',
    'IMG_4231C026.png',
    'IMG_D277B5EA.png'
];

async function main() {
    const jones = new JonesCensorAgent();
    
    // Override the prompt for fine-tuning with Chain-of-Thought
    jones.inspectImageWithVision = async function(filename, filepath) {
        const ext = path.extname(filename).toLowerCase();
        const baseName = path.basename(filename, ext);

        const visionPrompt = `You are a strict image quality auditor and content classifier for a historical period drama project set in 18th-century London.

Before scoring the image, you MUST answer the following questions to analyze the image step-by-step:

QUESTION 1 (Historical Accuracy): Are there specific historical indicators (lit candles, fireplaces, historical clothing/props) present? List them. 
QUESTION 2 (Modern Elements): Carefully scan the background and foreground. Are there any modern elements like modern tuxedos, bowties, camera stabilizers, smartphones, or electricity? Note: "Studio lighting" is acceptable IF the setting is heavily historical.
QUESTION 3 (Anatomy Check): Count the limbs and fingers. Are there extra limbs, missing heads, morphed bodies, or messed up/melted anatomy? 
QUESTION 4 (Quality & AI Artifacts): Is the image blurry, low quality, or showing clear AI artifacts (misaligned inpaint masking, plastic skin, scene inconsistencies)?

After answering the questions, respond with EXACTLY this format:

DESCRIPTION: [2-3 sentences describing exactly what you see]

QUALITY: [number 1-10 where 1=terrible/blurry/distorted/AI slop, 10=museum fine art photography]
QUALITY_REASON: [1 sentence explaining the quality score]

SENSUALITY: [number 1-10. STRICT RULE: If the image contains naked, exposed breasts or genitalia, score 6+. If NO exposed breasts/genitalia, score 1-5. Bare legs/cleavage = 1-5.]
SENSUALITY_REASON: [1 sentence explaining sensuality]

CATEGORY: [SFW if SENSUALITY is 1-5, NSFW if SENSUALITY is 6-10]

THEME: [MORNING or MIDDAY or PREP or NIGHT]

ISSUES: [Based on the questions, list any FATAL problems: "Modern Elements", "AI Slop", "Bad Anatomy", or write "NONE". Studio lighting is NOT fatal if historical elements are present.]`;

        let visionResponse = '';
        try {
            visionResponse = await this.callOllamaVision(filepath, visionPrompt);
        } catch (err) {
            console.error(`  ⚠️  Vision failed for ${filename}: ${err.message}`);
            return;
        }

        // Custom parser for the test
        const qualityMatch = visionResponse.match(/QUALITY:\s*(\d+)/i);
        const sensualityMatch = visionResponse.match(/SENSUALITY:\s*(\d+)/i);
        const categoryMatch = visionResponse.match(/CATEGORY:\s*(SFW|NSFW)/i);
        const issuesMatch = visionResponse.match(/ISSUES:\s*(.+?)(?=\n|$)/is);

        const qualityScore = qualityMatch ? parseInt(qualityMatch[1]) : 0;
        const sensualityScore = sensualityMatch ? parseInt(sensualityMatch[1]) : 0;
        const category = categoryMatch ? categoryMatch[1].toUpperCase() : 'UNKNOWN';
        const issuesText = issuesMatch ? issuesMatch[1].trim() : 'NONE';
        
        let rejectionCategory = 'NONE';
        const lowerIssues = issuesText.toLowerCase();
        if (lowerIssues !== 'none') {
            if (lowerIssues.includes('modern')) rejectionCategory = 'not_following_world_rules';
            else if (lowerIssues.includes('slop') || lowerIssues.includes('anatomy') || lowerIssues.includes('artifact')) rejectionCategory = 'AI_slop';
            else rejectionCategory = 'REJECTED_OTHER';
        }
        
        console.log(`\n--- ${filename} ---`);
        console.log(`Quality: ${qualityScore}, Sensuality: ${sensualityScore}, Category: ${category}`);
        console.log(`Rejection: ${rejectionCategory}`);
        console.log(`Issues Text: ${issuesText}`);
        
        // Print the CoT part briefly if we want
        const q3Match = visionResponse.match(/QUESTION 3.+?(?=QUESTION 4)/is);
        if (q3Match) {
            console.log(`CoT Anatomy: ${q3Match[0].trim().replace(/\n/g, ' ')}`);
        }
    };

    console.log('Testing specific images with fine-tuned prompt...\n');
    for (const file of targetImages) {
        const srcPath = path.join(jones.config.paths.raw_generations, file);
        if (fs.existsSync(srcPath)) {
            await jones.inspectImageWithVision(file, srcPath);
        } else {
            console.log(`File not found: ${srcPath}`);
        }
    }
}

main();
