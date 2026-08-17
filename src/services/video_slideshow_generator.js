const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class VideoSlideshowGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, '../../BettyRyal_18centuryServant/TikTok_Ready_Content');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Create a 9:16 portrait video from an image with slow Ken Burns zoom
     * @param {string} imagePath 
     * @param {string} outputFilename 
     * @param {object} options 
     * @returns {string} Path to generated MP4
     */
    createKenBurnsClip(imagePath, outputFilename, options = {}) {
        const duration = options.duration || 10;
        const outputPath = path.join(this.outputDir, outputFilename);

        console.log(`[Video Generator] 🎬 Creating 9:16 video clip from ${path.basename(imagePath)} (Duration: ${duration}s)...`);

        // ffmpeg command with 1080x1920 crop, Ken Burns zoom, and silent stereo audio track
        const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -f lavfi -i anullsrc=r=44100:cl=stereo -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.001,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${duration * 25}:s=1080x1920:fps=25" -c:v libx264 -preset fast -crf 20 -t ${duration} -pix_fmt yuv420p -c:a aac -b:a 128k -shortest "${outputPath}"`;

        try {
            execSync(cmd, { stdio: 'pipe' });
            console.log(`[Video Generator] ✅ Successfully generated: ${outputPath}`);
            return outputPath;
        } catch (err) {
            console.error(`[Video Generator] ❌ FFmpeg error:`, err.message);
            throw err;
        }
    }

    /**
     * Generate a batch of theme-based TikTok videos from available photos
     */
    generateBatchTikTokVideos() {
        const baseContent = path.join(__dirname, '../../BettyRyal_18centuryServant/Selected_Content');
        const generated = [];

        const targets = [
            { theme: 'MORNING', file: 'MORNING_SFW_Q8_S1_hf_20260816_174906_a5d906ce-3cbb-4c24-a2a9-7a81423023ca.png', out: 'Betty_TikTok_Morning_Chore.mp4' },
            { theme: 'PREP', file: 'PREP_SFW_Q9_S1_hf_20260816_171641_174cd1a3-b3be-4e24-a2ba-276c2c15c989.png', out: 'Betty_TikTok_Prep_Corset.mp4' },
            { theme: 'NIGHT', file: 'NIGHT_SFW_Q8_S1_hf_20260816_175211_7e69b1ae-f74c-48a7-8391-d0309f3b0cf7.png', out: 'Betty_TikTok_Night_Tavern.mp4' }
        ];

        for (const item of targets) {
            const imgPath = path.join(baseContent, item.theme, item.file);
            if (fs.existsSync(imgPath)) {
                const mp4Path = this.createKenBurnsClip(imgPath, item.out, { duration: 10 });
                const storyPath = imgPath.replace(/\.(png|jpg|webp)$/i, '.story.txt');
                generated.push({
                    mp4Path,
                    theme: item.theme,
                    storyPath: fs.existsSync(storyPath) ? storyPath : null
                });
            }
        }

        return generated;
    }
}

module.exports = VideoSlideshowGenerator;
