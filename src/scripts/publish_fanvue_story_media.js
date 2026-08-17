const fs = require('fs');
const path = require('path');
const FanvueService = require('../services/fanvue_service');

async function publishFanvueWithMedia() {
    console.log(`\n======================================================`);
    console.log(`💎 FANVUE: Publishing Post with Attached Media`);
    console.log(`======================================================`);

    const fanvue = new FanvueService();
    const imagePath = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/NIGHT/Betty_secrets_01_first_frame.jpg');
    const storyPath = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content/NIGHT/Betty_secrets_01.story.txt');

    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    console.log(`[Fanvue] Uploading first-frame media: ${path.basename(imagePath)}...`);
    const uploadSlot = await fanvue.callMcpTool('custom__start-image-upload', {});
    console.log(`[Fanvue] Slot granted: mediaUuid = ${uploadSlot.mediaUuid}`);

    console.log(`[Fanvue] Uploading image bytes to presigned URL...`);
    const etag = await fanvue.uploadImageToUrl(uploadSlot.uploadUrl, imagePath);
    console.log(`[Fanvue] Upload complete! ETag: ${etag}`);

    const storyText = `What I saw behind the velvet curtains last night... 🕯️\n\nMy dearest friends,\n\nI know I shouldn't have lingered by the master bedchamber. My only duty was to gather the evening linens, but the door was left ajar, and the glow of the tallow candles pulled me in.\n\nI stood frozen in the hallway shadows, pulling back the heavy red velvet just an inch. The sounds, the warmth in the air, the way the shadows moved against the linen sheets... my heart was pounding so loudly against my corset that I was terrified they would hear me.\n\nI rushed back to my cold attic room, my hands still trembling, and wrote down every single detail before the candles burned out.\n\nWatch the quiet moments I captured before I had to slip away into the dark... 🕯️💋\n\nWith all my whispered secrets,\nBetty\n\n#BettyRyal #HistoricalRomance #Fanvue #CandlelightChronicles`;

    console.log(`[Fanvue] Creating post with attached image...`);
    const postResult = await fanvue.callMcpTool('custom__create-image-post', {
        audience: 'followers-and-subscribers',
        text: storyText,
        image: {
            mediaUuid: uploadSlot.mediaUuid,
            uploadId: uploadSlot.uploadId,
            etag: etag
        }
    });

    console.log(`\n🎉 [Fanvue Success] Post published with media attached!`);
    console.log(`Post details:`, JSON.stringify(postResult, null, 2));

    // Update Ana's published log
    const logPath = path.join(__dirname, '../../config/published_log.json');
    let log = [];
    if (fs.existsSync(logPath)) {
        try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch (e) { log = []; }
    }
    log.push({
        platform: 'Fanvue',
        type: 'STORY_IMAGE_POST',
        asset: path.basename(imagePath),
        postUuid: postResult.uuid || postResult.id,
        timestamp: new Date().toISOString(),
        status: 'PUBLISHED'
    });
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf8');

    return postResult;
}

if (require.main === module) {
    publishFanvueWithMedia().catch(err => {
        console.error(`[Fanvue Error]:`, err.message);
        process.exit(1);
    });
}

module.exports = publishFanvueWithMedia;
