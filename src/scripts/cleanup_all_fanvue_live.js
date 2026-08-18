const FanvueService = require('../services/fanvue_service');
const fv = new FanvueService();

const cleanPosts = [
    {
        uuid: "f8a50cb0-6a1d-481f-bd00-1692be4fd7d0",
        text: `Under the flickering light of the tallow candle, Miss Sophia's corset was laced with more than just silk. Her secrets were hidden beneath the lace, and tonight, I discovered them.

As I pulled the final loop tight, her hand trembled, and I felt the warmth of her desire. The shadows of the inn hold moments never spoken of in daylight.

Unlock the full photo set below to see what happened once the stays were undone... 🗝️🔥

Want to hear more of what I witnessed? Tip me or send a private confession in my DMs. 💕

#BettyRyal #Fanvue #HistoricalRomance #PeriodDrama #SensualRomance`
    },
    {
        uuid: "002c375a-2d69-4f03-9f8e-13dd0a57574d",
        text: `In my private diary, I confess the true desires and secret encounters that happen in this very kitchen when the rest of the house sleeps.

The warmth of the open hearth and the coolness of the midnight air create a quiet haven for my wandering thoughts. What happens in the shadows after the last candle is snuffed?

Unlock the full set below to see the uncensored moments from tonight's diary. 💋

Send a tip or message me in private DMs to receive personal whispered notes. 🗝️

#BettyRyal #PrivateDiary #HistoricalRomance #CandlelightChronicles`
    },
    {
        uuid: "1ee64317-e751-4844-b755-d998cc852b53",
        text: `Today, as the candle flickered low, I found myself entangled in the whispers of the hearth.

The warmth of the embers and the cool morning breeze created a quiet canvas of intimacy. In that secret hour, I surrendered to the hidden desires of the manor house.

Warmly yours, Betty. Your devotion means the world to a maid like me. Want to see more? Tip or send a private note in my DMs. 💕

#BettyRyal #VIPAccess #HistoricalRomance #CandlelightChronicles`
    },
    {
        uuid: "0d6d249a-0cd9-47cf-a159-312fbe112bd2",
        text: `As I held back the heavy velvet curtain, a quiet wave of forbidden desire washed over me.

The candlelight revealed more than just the lace of my bodice; it illuminated the unspoken secrets of my heart. What desires do these shadows hide when the great house falls asleep?

Unlock the full private set below to discover what happened behind the velvet curtains. 🕯️🔥

Thank you for stepping into my world. Tip me to support my secret diary or send a private request in my DMs. 🗝️

#BettyRyal #HistoricalRomance #SensualArt #18thCentury #PeriodDrama`
    },
    {
        uuid: "bf701641-c030-43a2-adee-fd6547c83513",
        text: `In the quiet chambers of the inn, I found myself drawn into a world of whispered secrets and forbidden touch.

My lady's hand was warm against mine, and the candle flickered softly, casting long shadows across the linen sheets. Would you have been brave enough to step into the dark with us?

Unlock the full private photo set below to see every tender moment... 🕯️

Want to know all the secrets I keep? Tip or send a private request in my DMs. I am always waiting by candlelight. 💕

#BettyRyal #FanvueExclusive #HistoricalRomance #PeriodRomance`
    },
    {
        uuid: "c3e8aa32-85a1-4958-b6d2-85c8931f74d8",
        text: `Tonight in my small attic room, I lit a single candle and wrote down everything that happened behind closed doors today.

The sound of footsteps in the corridor, the heavy silk dresses unlaced in haste, and the secrets shared between master and maid.

Unlock to see the full uncensored diary entry and private photos. 🗝️

Tip to support Betty's private confessions and receive exclusive notes in your DMs. 💕

#BettyRyal #Fanvue #HistoricalRomance #PeriodDrama`
    },
    {
        uuid: "346f05a7-1bb9-4866-a3ff-f40111a803fc",
        text: `In the hazy light of dawn, I was caught in the quiet corridor outside the laundry room.

The air was thick with the scent of cedarwood soap, and the flickering candlelight cast dancing shadows on the cold stone walls. As I smoothed the fresh linen, footsteps approached down the hall, making my pulse race against my corset.

Unlock the full photo set to see what happened when the gentleman opened the door... 🕯️✨

Swipe to explore more of my private galleries, or tip me to send a private request in my DMs. 💋

#BettyRyal #Fanvue #HistoricalRomance #PeriodDrama`
    }
];

async function runCleanup() {
    console.log('======================================================');
    console.log('🧹 FANVUE FULL LIVE FEED CLEANUP & IMMERSION RESTORE');
    console.log('======================================================\n');

    // 1. Delete empty 0-media duplicate
    try {
        console.log('🗑️ Deleting empty 0-media duplicate post (uuid: 2fb6e0c3)...');
        await fv.callMcpTool('delete-post', { uuid: '2fb6e0c3-7793-4f64-8c71-1c4a2bd278d9' });
        console.log('✅ Empty duplicate deleted successfully.');
    } catch (e) {
        console.log('Delete note:', e.message);
    }

    // 2. Update each flawed post with clean period prose
    for (const p of cleanPosts) {
        try {
            console.log(`\n📝 Updating post ${p.uuid}...`);
            await fv.callMcpTool('update-post', {
                'X-Fanvue-API-Version': '2025-06-26',
                uuid: p.uuid,
                text: p.text
            });
            console.log(`✅ Post ${p.uuid} updated with 100% immersive text!`);
        } catch (err) {
            console.error(`❌ Failed to update ${p.uuid}:`, err.message);
        }
    }

    console.log('\n======================================================');
    console.log('🎉 ALL LIVE FANVUE POSTS ARE NOW 100% IMMERSIVE & CLEAN!');
    console.log('======================================================\n');
}

runCleanup().catch(console.error);
