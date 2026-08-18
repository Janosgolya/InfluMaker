require('dotenv').config();
const GeorgeProducerAgent = require('../agents/george');
const EveScreenwriterAgent = require('../agents/eve');

console.log('======================================================');
console.log('🧪 TESTING GEORGE TIMEZONE & THEME RESOLUTION:');
console.log('======================================================');

const g = new GeorgeProducerAgent();

const testCases = [
    { label: '06:00 UTC (08:00 Warsaw)', date: new Date('2026-08-18T06:00:00Z'), expected: 'MORNING' },
    { label: '11:00 UTC (13:00 Warsaw)', date: new Date('2026-08-18T11:00:00Z'), expected: 'MIDDAY' },
    { label: '16:00 UTC (18:00 Warsaw)', date: new Date('2026-08-18T16:00:00Z'), expected: 'PREP' },
    { label: '20:00 UTC (22:00 Warsaw)', date: new Date('2026-08-18T20:00:00Z'), expected: 'NIGHT' },
];

for (const tc of testCases) {
    const actual = g.getCurrentThemeForTime(tc.date);
    const pass = actual === tc.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${pass} | ${tc.label} -> Got: ${actual} (Expected: ${tc.expected})`);
}

console.log('\n======================================================');
console.log('🧪 TESTING EVE FALLBACK MECHANISM:');
console.log('======================================================');
const eve = new EveScreenwriterAgent();
console.log('Eve model caller ready. Testing Gemini Flash connection...');

eve.callGemini('Write 1 sentence of 18th century maid dialogue for Betty Ryal.')
    .then(res => {
        console.log('✅ Gemini Flash API response received:');
        console.log(res.trim());
    })
    .catch(err => {
        console.log('⚠️ Gemini note (expected if local GEMINI_API_KEY is not configured):', err.message);
    });
