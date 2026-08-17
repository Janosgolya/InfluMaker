# InfluMaker Project Constraints & Decisions

1. **Model Storage:**
   - DO NOT download massive AI models to `I:` drive (limited space).
   - ALWAYS download new models to `D:` drive (or `H:` as a backup).
   - Configure ComfyUI to read models from these external drives.

2. **APIs and Services:**
   - NO Hugging Face API for image generation. Stick to local models in ComfyUI.
   - Use local Ollama for text tasks where possible.

3. **Agent Workflows:**
   - **Steven (Agent 5):** Uses a multi-model rotation. Generates random scene prompts using Gemma Heretic (via ComfyUI TextGenerate). Injects Betty's character reference images into workflows for consistency.
   - **Jones (Agent 6):** Evaluates Steven's raw generations. Respects NSFW tags strictly. Ignores "camera" keywords if they only appear in the reasoning block.
