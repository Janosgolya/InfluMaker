# 🎭 InfluMaker - Virtual Influencer Autonomous Multi-Agent System

> **Project Context & Execution Master Plan**  
> *This file serves as the persistent memory and execution tracking document for InfluMaker. At the start of every session, read this file to restore project context, evaluate completed milestones `[x]`, and continue with pending tasks `[ ]`.*

---

## 👤 Active Character Profile: Betty Ryal

- **Name**: Betty Ryal
- ### Live Verified Profile Footprint
- **Fanvue**: [`https://www.fanvue.com/bettyryal`](https://www.fanvue.com/bettyryal)
  - **12 Live Feed Posts** & **13 Museum-Quality High-Res Photos**.
  - **5 PPV Monetization Posts** ($7.99, $14.99, and VIP Vault Bundle $24.99).
  - Clean English-only descriptions with full diary narrative.
- **Instagram**: [`https://www.instagram.com/secretsofthelondonmansion/`](https://www.instagram.com/secretsofthelondonmansion/)
  - **9 Live Posts (Complete 3x3 Grid)** with 4:5 fine art portraits + 1 video Reel.
  - Complete diary captions, hashtags, and direct link to Fanvue.
- **TikTok**: [`https://www.tiktok.com/@bettyryal`](https://www.tiktok.com/@bettyryal)
  - **5 Live Videos** (1080x1920 9:16 portrait format with Ken Burns cinematic zoom, POV hooks, and Fanvue bio redirect).
- **Tagline**: *"From the cold cobblestones to a warm hearth. Watch my life change."*
- **Lore & Setting**: An orphan from 18th-century London taken in as a maid at a high-class inn / London mansion ("house of joys"). She keeps a private candlelight diary documenting daily duties, cleaning, linen changes, assisting ladies, bathing, midnight secrets behind velvet curtains, and her sensual awakening.
- **Physical Appearance**: Young blonde woman, fine-boned, model-quality face & body, period-accurate loose undergown & light linen dress, messy hair, loose laces, bare shoulder/leg visible tucked into a thin leather belt.
- **Visual Style**:
  - **Aesthetic**: Hyperrealistic fine art photography / historical film frame (Rembrandt, Caravaggio, Vermeer lighting).
  - **Lighting**: 100% natural/period light (candles, tallow lamps, hearth fires, window sunlight).
  - **Camera**: Candid POV, shallow depth of field, natural textures (linen, wood, velvet, flame).
- **SFW / NSFW Boundary**:
  - **TikTok & Instagram**: Strictly SFW, aesthetic, suggestive, character-driven storytelling with link-in-bio CTAs.
  - **Fanvue**: Exclusive, uncensored subscriber haven with locked PPV diary confessions ($14.99) and 10-Photo VIP Vault Bundles ($24.99).

---

## 🤖 Agent Team Status & Capabilities

| Agent Name | Role | Responsibilities | Current Live Status |
| :--- | :--- | :--- | :--- |
| **George** | Executive Producer & Orchestrator | Master coordinator, schedule keeper (4 slots/day), triggers Eve + Ana, manages baseline seeding and weekly summaries. | `[x]` **Upgraded & Ready** (`src/agents/george.js`) |
| **Ana** | Omni-Channel Monetization Manager | Multi-platform publisher (Fanvue MCP, Instagram Browser, TikTok Studio), self-healing engine (`verifyAndHeal`), English-only & deduplication sanitizers, 24/7 AI chat responder. | `[x]` **Live on Fanvue, IG & TikTok** (`src/agents/ana.js`) |
| **Eve** | Screenwriter & Storyteller | Copywriter for 3 formats (TikTok viral hook, IG aesthetic diary, Fanvue PPV confession + dynamic pricing). Enforces Strict English Only, zero repetition, and dynamic multi-character perspective (if woman in photo has dark/curly/red hair, Betty describes her from first-person POV as a fellow maid or lady of the house). | `[x]` **Live & Tested with Vision** (`src/agents/eve.js`) |
| **Jones** | Censor & Quality Critic | 100% Pure Blind Inspector evaluating quality (0-10), sensuality (0-10), and SFW/NSFW boundaries. Enforces STRICT 21+ Age Compliance (Zero Tolerance: any generation appearing under 21 years old is immediately rejected to `Rejected_Slop/underage_appearance`). | `[x]` **100% Blind Audit Verified** (`src/agents/jones.js`) |
| **Roomba** | Storage & Quota Cleaner | Disk cleanup, enforces 10GB limit & 1460 selected images quota. | `[x]` **Active & Tested** (`src/agents/roomba.js`) |
| **Steve** | Stills Generator | Stills generation via ComfyUI (Temporarily ON HOLD for refinement). | `[ ]` On Hold per user directive |
| **Janusz** | Video Generator | Short-form video generation (10-20s, 9:16 portrait). | `[ ]` In Development |

---

## 📂 Content Inventory & Runway (Single Source of Truth)

- **Total Curated Images**: **136 Approved Images** in `BettyRyal_18centuryServant/Selected_Content/` (Standardized Naming):
  - 🌅 `MORNING/`: **56 images**
  - 🧹 `MIDDAY/`: **19 images** (includes user-recovered valid generations)
  - 🕯️ `PREP/`: **14 images**
  - 🌙 `NIGHT/`: **47 images**
- **Story Sidecars (`.story.txt`)**: Eve batch story generation active across all images with strict English rules and multi-character perspective.
- **Runway**: **5 to 6 weeks of continuous daily posting** (136 high-res photos).

---

## 🌐 Live Platform Verification

1. **Instagram (`@secretsofthelondonmansion`)**:
   - Grid: **9 zweryfikowanych postów na siatce (Kompletna siatka 3x3)** (8 fotografii 4:5 + 1 Reel).
   - Bio: *"Maid in an 18th-century London manor 🕯️\nCandlelight diary & whispered secrets 📜\nUncensored room 👇\nfanvue.com/bettyryal"*.
2. **TikTok (`@bettyryal`)**:
   - **5 aktywnych filmów wideo 1080x1920 (9:16)** w TikTok Studio ze statusem `Everyone`.
   - Bio link kierujący ruch na Fanvue.
3. **Fanvue (`@bettyryal`)**:
   - **12 postów i 13 unikalnych zdjęć** na profilu twórcy.
   - **5 postów płatnych PPV** ($7.99, $14.99 oraz VIP Vault Bundle $24.99).
   - Wdrożony i aktywny filtr językowy (100% angielski, brak chińskich znaków, brak powtórzeń).
4. **Ana Self-Healing Loop (`verifyAndHeal`)**:
   - Runs post-publish audit automatically across all 3 platforms.
   - Detects and repairs missing captions on Instagram, purges TikTok duplicates, and ensures Fanvue post quality.

---

## ☁️ 24/7 Cloud Architecture & Deployment Kit

- **Google Cloud Platform (Always Free VM `e2-micro`)**:
  - Turnkey PM2 configuration: [`ecosystem.config.js`](file:///d:/AntigravityProjects/InfluMaker/ecosystem.config.js).
  - 1-command installer script: [`setup_gcp_vm.sh`](file:///d:/AntigravityProjects/InfluMaker/setup_gcp_vm.sh).
  - Step-by-step setup guide: [`GCP_SETUP_GUIDE.md`](file:///d:/AntigravityProjects/InfluMaker/GCP_SETUP_GUIDE.md).
- **GitHub Actions Cloud Runner**:
  - Automated workflow: [`.github/workflows/daily_influencer_cron.yml`](file:///d:/AntigravityProjects/InfluMaker/.github/workflows/daily_influencer_cron.yml).

---

## 📋 Master Execution Roadmap & Expansion Strategy

### Faza 1: Seeding i Uruchomienie Pełnej Autonomii (Bieżący Stan)
- [x] **1.1**: Zbudowanie i przetestowanie wielokanałowego rurociągu wideo u Any (`publishVideoOmniChannel`).
- [x] **1.2**: Wdrożenie pętli samonaprawczej Any (`verifyAndHeal`) dla IG, TikToka i Fanvue.
- [x] **1.3**: Dołączenie kadrów wprowadzających do Fanvue MCP (`custom__create-image-post`).
- [x] **1.4**: Upgrade George'a (`src/agents/george.js`) z modułem `--tick`, `--seed` i `--summary`.
- [x] **1.5**: Przygotowanie workflowu 24/7 dla GitHub Actions.

### Faza 2: Ekspansja Organiczna na Nowe Kanały (Następna Sesja)
- [ ] **2.1 Reddit Traffic Engine**:
  - Profil Reddit Betty Ryal z linkiem do Fanvue.
  - Automatyczne postowanie do dedykowanych subredditów (`r/HistoricalRomance`, `r/AIGirls`, `r/corsets`, `r/victorianfashion`).
- [ ] **2.2 Pinterest Aesthetic Boards**:
  - Tablice tematyczne: *Dark Regency Aesthetics*, *18th Century Manor Secrets*, *Vintage Maid Chronicles*.
  - Piny ze zdjęciami 9:16 kierujące bezpośrednio na Instagram i Fanvue.
- [ ] **2.3 X / Twitter Teaser Bot**:
  - Krótkie wpisy z pamiętnika z dołączonymi zdjęciami i linkami do odblokowania pełnych wpisów na Fanvue.
- [ ] **2.4 Wdrożenie kolejnych wideo**:
  - Ingest nowych materiałów wideo wygenerowanych przez użytkownika (10-20s, 9:16).

---

## 📍 Punkt Wznowienia na Nową Sesję:
1. Rozpoczęcie prac nad modułami promocji zewnętrznej i pozyskiwania ruchu:
   - **Reddit Traffic Engine** (`src/services/reddit_service.js`),
   - **Pinterest Aesthetic Boards** (`src/services/pinterest_service.js`),
   - **X / Twitter Teaser Bot** (`src/services/twitter_service.js`).
2. Podpięcie ewentualnych nowych plików wideo wygenerowanych przez użytkownika.
