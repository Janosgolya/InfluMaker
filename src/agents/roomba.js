const fs = require('fs');
const path = require('path');

class RoombaAgent {
    constructor(configPath = path.join(__dirname, '../../config/storage_limits.json')) {
        this.name = "Roomba";
        this.role = "Cleaner & Storage Manager";
        this.configPath = configPath;
        this.loadConfig();
    }

    loadConfig() {
        if (fs.existsSync(this.configPath)) {
            this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        } else {
            throw new Error(`Config file not found at ${this.configPath}`);
        }
    }

    getFolderSize(dirPath) {
        let totalSize = 0;
        if (!fs.existsSync(dirPath)) return 0;
        
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                totalSize += this.getFolderSize(fullPath);
            } else if (file.isFile()) {
                totalSize += fs.statSync(fullPath).size;
            }
        }
        return totalSize;
    }

    countFilesInDir(dirPath, recursive = false) {
        if (!fs.existsSync(dirPath)) return 0;
        let count = 0;
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                if (recursive) count += this.countFilesInDir(fullPath, true);
            } else if (item.isFile() && !item.name.startsWith('.')) {
                count++;
            }
        }
        return count;
    }

    isCharacterReferenceFile(filename) {
        const lowerName = filename.toLowerCase();
        const refKeywords = [
            'character_reference',
            'character_referenc',
            'reference_sheet',
            'ref_sheet',
            'model_as_inn_servant',
            'model_in_18th-century_servant',
            'model_in_servant_clothing',
            'char_ref',
            'reference_grid'
        ];
        return refKeywords.some(kw => lowerName.includes(kw));
    }

    sortAndFilterGenerations() {
        const rawGenDir = this.config.paths.raw_generations;
        const rawRefDir = this.config.paths.raw_references;

        if (!fs.existsSync(rawRefDir)) {
            fs.mkdirSync(rawRefDir, { recursive: true });
        }

        let movedToRawRefs = 0;
        let movedToRawScenes = 0;

        // 1. Check inside RawReferences: if there are generated scenes in there, move them back to RawGenerations
        if (fs.existsSync(rawRefDir)) {
            const refFiles = fs.readdirSync(rawRefDir);
            for (const file of refFiles) {
                const srcPath = path.join(rawRefDir, file);
                if (fs.statSync(srcPath).isFile()) {
                    if (!this.isCharacterReferenceFile(file)) {
                        const destPath = path.join(rawGenDir, file);
                        fs.renameSync(srcPath, destPath);
                        movedToRawScenes++;
                    }
                }
            }
        }

        // 2. Check inside RawGenerations top-level: if there are character ref sheets, move them into RawReferences
        if (fs.existsSync(rawGenDir)) {
            const genFiles = fs.readdirSync(rawGenDir);
            for (const file of genFiles) {
                const srcPath = path.join(rawGenDir, file);
                if (fs.statSync(srcPath).isFile()) {
                    if (this.isCharacterReferenceFile(file)) {
                        const destPath = path.join(rawRefDir, file);
                        fs.renameSync(srcPath, destPath);
                        movedToRawRefs++;
                    }
                }
            }
        }

        return {
            character_references_moved_to_refs: movedToRawRefs,
            generated_scenes_restored_to_raw: movedToRawScenes
        };
    }

    inspectStorage() {
        const projectRoot = this.config.paths.project_root;
        const selectedDir = this.config.paths.selected_content;
        const rawGenDir = this.config.paths.raw_generations;
        const rawRefDir = this.config.paths.raw_references;
        const charRefDir = this.config.paths.character_references;

        const totalSizeBytes = this.getFolderSize(projectRoot);
        const totalSizeGB = (totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
        
        const selectedCount = this.countFilesInDir(selectedDir, true);
        const rawScenesCount = this.countFilesInDir(rawGenDir, false);
        const rawRefsCount = this.countFilesInDir(rawRefDir, false);
        const fixedCharRefCount = this.countFilesInDir(charRefDir, false);

        const storageLimitGB = this.config.max_project_storage_gb;
        const selectedLimit = this.config.max_selected_images_count;

        const storageExceeded = totalSizeBytes >= this.config.max_project_storage_bytes;
        const selectedLimitReached = selectedCount >= selectedLimit;

        const report = {
            agent: this.name,
            timestamp: new Date().toISOString(),
            storage: {
                total_bytes: totalSizeBytes,
                total_gb: parseFloat(totalSizeGB),
                limit_gb: storageLimitGB,
                percent_used: ((totalSizeBytes / this.config.max_project_storage_bytes) * 100).toFixed(1) + "%",
                exceeded: storageExceeded
            },
            inventory: {
                selected_images: selectedCount,
                selected_limit: selectedLimit,
                raw_generated_scenes: rawScenesCount,
                raw_wip_character_references: rawRefsCount,
                fixed_character_references: fixedCharRefCount,
                limit_reached: selectedLimitReached
            },
            alerts: []
        };

        if (storageExceeded) {
            report.alerts.push(`🚨 CRITICAL: Storage usage (${totalSizeGB} GB) has reached or exceeded the ${storageLimitGB} GB limit!`);
        } else if (totalSizeBytes >= this.config.max_project_storage_bytes * 0.85) {
            report.alerts.push(`⚠️ WARNING: Storage usage (${totalSizeGB} GB) is above 85% of capacity.`);
        }

        if (selectedLimitReached) {
            report.alerts.push(`🎯 TARGET REACHED: Selected content inventory (${selectedCount}/${selectedLimit}) has reached full 1-year target!`);
        }

        return report;
    }

    cleanTidyUp() {
        const dirs = [
            this.config.paths.character_references,
            this.config.paths.selected_content,
            this.config.paths.raw_generations,
            this.config.paths.raw_references
        ];

        dirs.forEach(d => {
            if (!fs.existsSync(d)) {
                fs.mkdirSync(d, { recursive: true });
            }
        });

        const sortResults = this.sortAndFilterGenerations();
        return `🧹 Roomba filter executed! Sorted: ${sortResults.character_references_moved_to_refs} character reference sheets into RawReferences, and restored ${sortResults.generated_scenes_restored_to_raw} generated scenes to RawGenerations.`;
    }

    clearSelectedContent() {
        const selectedDir = this.config.paths.selected_content;
        let removedFiles = 0;
        if (fs.existsSync(selectedDir)) {
            const themes = ['MORNING', 'MIDDAY', 'PREP', 'NIGHT'];
            themes.forEach(theme => {
                const themeDir = path.join(selectedDir, theme);
                if (fs.existsSync(themeDir)) {
                    const files = fs.readdirSync(themeDir);
                    for (const f of files) {
                        fs.unlinkSync(path.join(themeDir, f));
                        removedFiles++;
                    }
                } else {
                    fs.mkdirSync(themeDir, { recursive: true });
                }
            });
        }
        return `🧹 Roomba cleaned Selected_Content! Removed ${removedFiles} old files.`;
    }
}

if (require.main === module) {
    const roomba = new RoombaAgent();
    console.log(roomba.cleanTidyUp());
    console.log(JSON.stringify(roomba.inspectStorage(), null, 2));
}

module.exports = RoombaAgent;
