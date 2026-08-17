// check_env.js - diagnostic
const packages = ['@google/generative-ai', '@google/genai'];
for (const pkg of packages) {
    try {
        require(pkg);
        console.log('FOUND:', pkg);
    } catch(e) {
        console.log('NOT FOUND:', pkg, '-', e.code);
    }
}
// Check env vars
const envVars = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENAI_API_KEY'];
for (const v of envVars) {
    const val = process.env[v];
    console.log(v + ':', val ? `SET (${val.substring(0,8)}...)` : 'NOT SET');
}
