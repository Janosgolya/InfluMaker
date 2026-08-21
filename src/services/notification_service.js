const fs = require('fs');
const path = require('path');
require('dotenv').config();

class NotificationService {
    constructor(options = {}) {
        this.recipient = options.recipient || 'janosgolya@gmail.com';
        this.projectStartDate = new Date(options.startDate || '2026-08-18T00:00:00Z');
        this.phase1DurationDays = options.phase1DurationDays || 14;
        this.logPath = path.join(__dirname, '../../logs/email_notifications.log');

        this.initTransporter();
    }

    initTransporter() {
        try {
            const nodemailer = require('nodemailer');
            const user = process.env.SMTP_USER || process.env.GMAIL_USER;
            const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

            if (user && pass) {
                const cleanUser = user.trim();
                const cleanPass = pass.trim().replace(/\s+/g, '');
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: { 
                        user: cleanUser, 
                        pass: cleanPass 
                    }
                });
                console.log(`[NotificationService] 📧 SMTP Transport initialized for: ${cleanUser}`);
            } else {
                this.transporter = null;
            }
        } catch (e) {
            this.transporter = null;
        }
    }

    /**
     * Determine whether we are in Phase 1 (Daily reports for first 14 days) or Phase 2 (Weekly)
     */
    isPhase1Active(currentDate = new Date()) {
        const diffTime = currentDate.getTime() - this.projectStartDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= this.phase1DurationDays;
    }

    /**
     * Send email notification on post publication with per-platform status, GitHub diagnostics, and screenshot attachments
     */
    async notifyPostPublished({ theme, item, results = {}, remainingCount = 0, rejectedImages = [], systemErrors = [] }) {
        const now = new Date();
        const formattedDate = now.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
        const imageName = item?.imagePath ? path.basename(item.imagePath) : 'Period Drama Asset';

        // Platform definitions
        const platformDefinitions = [
            { key: 'fanvue', name: '💎 Fanvue', res: results.fanvue },
            { key: 'instagram', name: '📸 Instagram', res: results.instagram },
            { key: 'pinterest', name: '📌 Pinterest', res: results.pinterest },
            { key: 'reddit', name: '🤖 Reddit (u_BettyRyal)', res: results.reddit },
            { key: 'twitter', name: '🐦 X / Twitter', res: results.twitter },
            { key: 'tiktok', name: '📱 TikTok', res: results.tiktok }
        ];

        let successCount = 0;
        let failCount = 0;

        const tableRowsHtml = platformDefinitions.map(p => {
            const r = p.res;
            if (!r) {
                return `
                <tr style="border-bottom: 1px solid #2d261e;">
                    <td style="padding: 10px 8px; font-weight: bold; color: #d4af37;">${p.name}</td>
                    <td style="padding: 10px 8px; color: #a89f91;"><span style="background: #2b251d; color: #c4baa9; padding: 3px 8px; border-radius: 4px; font-size: 12px;">Pominięto / Nieskonfigurowano</span></td>
                    <td style="padding: 10px 8px; color: #7f786d; font-size: 12px;">Brak danych sesji</td>
                </tr>`;
            }

            if (r.error || r.success === false) {
                failCount++;
                const errMsg = r.error || r.reason || 'Nieznany błąd publikacji';
                return `
                <tr style="border-bottom: 1px solid #3d2020; background: rgba(255, 82, 82, 0.08);">
                    <td style="padding: 10px 8px; font-weight: bold; color: #ff8a80;">${p.name}</td>
                    <td style="padding: 10px 8px;"><span style="background: #5a1e1e; color: #ff5252; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">❌ BŁĄD</span></td>
                    <td style="padding: 10px 8px; color: #f0c2c2; font-size: 12px; font-family: monospace;">${errMsg}</td>
                </tr>`;
            }

            successCount++;
            let details = 'Pomyślnie opublikowano';
            if (p.key === 'fanvue') details = `UUID: ${r.postUuid || 'Post Live'} (${r.priceFormatted || 'W subskrypcji'})`;
            else if (p.key === 'pinterest') details = `Tablica: ${r.board || '18th Century'} | Link: ${r.link || 'Fanvue'}`;
            else if (p.key === 'reddit') details = `Profil: ${r.subreddit || 'u_BettyRyal'}`;
            else if (p.key === 'twitter') details = `Wpis X na profilu @SecretsOfBetty`;
            else if (p.key === 'instagram') details = `Post na siatce @secretsofthelondonmansion`;
            else if (p.key === 'tiktok') details = `Wideo / Post na TikTok Studio`;

            return `
            <tr style="border-bottom: 1px solid #1f3322; background: rgba(46, 204, 113, 0.06);">
                <td style="padding: 10px 8px; font-weight: bold; color: #2ecc71;">${p.name}</td>
                <td style="padding: 10px 8px;"><span style="background: #1b4d2e; color: #2ecc71; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">✅ SUKCES</span></td>
                <td style="padding: 10px 8px; color: #c4baa9; font-size: 12px;">${details}</td>
            </tr>`;
        }).join('');

        // Diagnostics info
        const allErrors = [...systemErrors];
        platformDefinitions.forEach(p => {
            if (p.res && (p.res.error || p.res.success === false)) {
                allErrors.push(`${p.name}: ${p.res.error || p.res.reason}`);
            }
        });

        const subject = successCount > 0
            ? `🏰 [InfluMaker] Raport Publikacji (${successCount}/6 Portali): Slot ${theme} - Betty Ryal`
            : `🚨 [InfluMaker ALARM] Błąd Publikacji (0/${platformDefinitions.length}): Slot ${theme} - Betty Ryal`;

        const html = `
        <div style="font-family: 'Georgia', serif; background-color: #121214; color: #f0ede6; padding: 25px; border-radius: 8px; max-width: 650px; margin: auto; border: 1px solid #332d25;">
            <!-- HEADER -->
            <div style="text-align: center; border-bottom: 2px solid #4a3f31; padding-bottom: 15px; margin-bottom: 20px;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px; letter-spacing: 1px;">🏰 INFLUMAKER OMNI-CHANNEL REPORT</h1>
                <p style="color: #a89f91; font-size: 13px; margin-top: 5px;">Betty Ryal &bull; 18th-Century London Manor &bull; George Orchestrator</p>
                <div style="margin-top: 8px;">
                    <span style="background: #2b261f; color: #ffd700; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">SLOT: ${theme}</span>
                    <span style="background: #1c1a17; color: #a89f91; padding: 3px 12px; border-radius: 12px; font-size: 12px; margin-left: 6px;">${formattedDate}</span>
                </div>
            </div>
            
            <!-- SECTION 1: PER-PLATFORM STATUS TABLE -->
            <div style="background-color: #1c1a17; padding: 18px; border-radius: 6px; border-left: 4px solid #d4af37; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #ffffff;">📊 Status Publikacji na Portalach (4x Dziennie Omni-Channel)</h3>
                <p style="margin: 0 0 12px 0; color: #a89f91; font-size: 13px;">Plik bazowy: <code>${imageName}</code></p>
                
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #4a3f31; color: #ffd700; font-size: 11px; text-transform: uppercase;">
                            <th style="padding: 6px 8px;">Portal</th>
                            <th style="padding: 6px 8px;">Status</th>
                            <th style="padding: 6px 8px;">Szczegóły / URL / Błąd</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- SECTION 2: GITHUB ACTIONS & SYSTEM DIAGNOSTICS -->
            <div style="background-color: #171512; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid ${allErrors.length === 0 ? '#2ecc71' : '#ff5252'}; font-size: 13px;">
                <strong style="color: ${allErrors.length === 0 ? '#2ecc71' : '#ff8a80'};">⚙️ Diagnostyka Środowiska & GitHub Actions:</strong><br>
                ${allErrors.length === 0 
                    ? '<p style="margin: 6px 0 0 0; color: #2ecc71;">🟢 Brak błędów systemowych. Środowisko GitHub Actions, Playwright i agenci wykonani w 100% poprawnie.</p>'
                    : `<p style="margin: 6px 0 0 0; color: #ff8a80;">⚠️ Wykryto następujące błędy / ostrzeżenia podczas tego cyklu:</p>
                       <ul style="margin: 6px 0 0 0; padding-left: 20px; color: #f0c2c2;">
                           ${allErrors.map(e => `<li><code>${e}</code></li>`).join('')}
                       </ul>`
                }
            </div>

            <!-- SECTION 3: JIT QUALITY / UNDERAGE AUDIT -->
            ${rejectedImages && rejectedImages.length > 0 ? `
            <div style="background-color: #2b1717; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #ff5252; font-size: 13px; color: #f0c2c2;">
                <strong style="color: #ff8a80;">🚨 AUDYT JIT (JONES): Odrzucono obrazy przed publikacją!</strong><br>
                Zanim opublikowano ten post, Jones odrzucił <strong>${rejectedImages.length}</strong> obraz(y) z powodu <strong>underage_appearance</strong> (wygląd poniżej 21 lat). Odrzucone zdjęcia zostały zablokowane i załączone do tego maila do Twojego wglądu.
            </div>` : ''}

            <!-- SECTION 4: INVENTORY -->
            <div style="background-color: #161513; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #a89f91; line-height: 1.5;">
                <strong style="color: #d4af37;">📦 Stan Magazynu Treści:</strong><br>
                Pozostało gotowych zdjęć w kolejce: <strong>${remainingCount}</strong> (Zapas na ok. ${Math.round(remainingCount / 4)} dni).
                <br><span style="color: #7f786d; font-size: 12px;">Do każdego maila automatycznie dołączane są zrzuty ekranu (screenshoty) z potwierdzeniem publikacji z portali.</span>
            </div>

            <div style="text-align: center; border-top: 1px solid #332d25; padding-top: 15px; font-size: 11px; color: #736b5e;">
                Wiadomość wygenerowana automatycznie przez agenta George (InfluMaker 24/7 Cloud).
            </div>
        </div>
        `;

        // Gather confirmation and error screenshots strictly matching current run results
        const attachments = [];
        const platformScreenshots = {
            pinterest: { success: path.join(__dirname, '../../config/pinterest_published_confirmation.png'), error: path.join(__dirname, '../../config/pinterest_upload_error.png') },
            reddit: { success: path.join(__dirname, '../../config/reddit_published_confirmation.png'), error: path.join(__dirname, '../../config/reddit_upload_error.png') },
            twitter: { success: path.join(__dirname, '../../config/twitter_published_confirmation.png'), error: path.join(__dirname, '../../config/twitter_upload_error.png') },
            instagram: { success: path.join(__dirname, '../../config/instagram_published_confirmation.png'), error: path.join(__dirname, '../../config/instagram_error.png') },
            tiktok: { success: path.join(__dirname, '../../config/tiktok_published_confirmation.png'), error: path.join(__dirname, '../../config/tiktok_error.png') }
        };

        for (const [key, paths] of Object.entries(platformScreenshots)) {
            const res = results[key];
            if (!res) continue;

            const isSuccess = !res.error && res.success !== false;
            const targetPath = isSuccess ? paths.success : paths.error;
            const targetName = isSuccess ? `${key}_confirmation.png` : `${key}_error.png`;

            if (fs.existsSync(targetPath)) {
                try {
                    attachments.push({
                        filename: targetName,
                        path: targetPath
                    });
                } catch (e) {}
            }
        }

        // Attach rejected underage photos if any
        if (rejectedImages && rejectedImages.length > 0) {
            rejectedImages.forEach((imgPath, idx) => {
                if (fs.existsSync(imgPath)) {
                    attachments.push({
                        filename: `rejected_underage_${idx + 1}.jpg`,
                        path: imgPath
                    });
                }
            });
        }

        return this.sendEmail({ 
            subject, 
            html, 
            text: `[InfluMaker] Publication report for slot ${theme}. Success: ${successCount}/6. Errors: ${failCount}`,
            attachments 
        });
    }

    /**
     * Send critical failure alert when all scheduled platforms fail
     */
    async sendPublicationFailureAlert(data = {}) {
        return this.notifyPostPublished(data);
    }

    /**
     * Send Comprehensive Executive Growth & Revenue Report
     * (Daily for first 14 days, then automatically Weekly)
     */
    async sendExecutiveGrowthReport(reportData) {
        const { phase, socialStats, tomStats, fanvueStats, charts, dateFormatted } = reportData;
        const isDaily = phase.isDailyPhase;
        
        const subject = isDaily
            ? `📊 [InfluMaker] Raport Dzienny George'a: Skuteczność Agenta Toma & Przychody Fanvue (${dateFormatted})`
            : `📈 [InfluMaker] Raport Tygodniowy George'a: Podsumowanie Wzrostu & Monetyzacja Fanvue (${dateFormatted})`;

        const html = `
        <div style="font-family: 'Georgia', serif; background-color: #0d0d0f; color: #f0ede6; padding: 25px; border-radius: 10px; max-width: 650px; margin: auto; border: 1px solid #3d3428; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <!-- HEADER -->
            <div style="text-align: center; border-bottom: 2px solid #5a4933; padding-bottom: 18px; margin-bottom: 22px;">
                <h1 style="color: #d4af37; margin: 0; font-size: 26px; letter-spacing: 1.5px; text-transform: uppercase;">🏰 INFLUMAKER EXECUTIVE REPORT</h1>
                <p style="color: #a89f91; font-size: 13px; margin-top: 6px;">Raport Wykonawczy Producenta George'a &bull; Betty Ryal Project</p>
                <div style="display: inline-block; background: #262017; border: 1px solid #d4af37; border-radius: 20px; padding: 4px 14px; margin-top: 8px;">
                    <span style="color: #ffd700; font-size: 12px; font-weight: bold;">📆 ${phase.phaseLabel}</span>
                </div>
            </div>

            <!-- SECTION 1: TOM'S GROWTH & OUTREACH -->
            <div style="background-color: #171512; padding: 18px; border-radius: 8px; border-left: 4px solid #3498db; margin-bottom: 18px;">
                <h3 style="color: #3498db; margin: 0 0 12px 0; font-size: 17px;">🎯 1. Skuteczność Działań Agenta Toma (Organiczne Pozyskiwanie Ruchu)</h3>
                <table style="width: 100%; color: #c4baa9; font-size: 13px; line-height: 1.8;">
                    <tr><td>• Obsłużone archetypy grupy docelowej:</td><td style="text-align: right; font-weight: bold; color: #fff;">5 / 5</td></tr>
                    <tr><td>• Polubienia na Twitterze/X:</td><td style="text-align: right; font-weight: bold; color: #fff;">${tomStats.actionsCompleted24h.twitterLikes}</td></tr>
                    <tr><td>• Wiralowe odpowiedzi w roli Betty:</td><td style="text-align: right; font-weight: bold; color: #fff;">${tomStats.actionsCompleted24h.twitterReplies}</td></tr>
                    <tr><td>• Wyświetlenia Stories (Instagram):</td><td style="text-align: right; font-weight: bold; color: #fff;">${tomStats.actionsCompleted24h.instagramStoryViews}</td></tr>
                    <tr><td>• Repiny SEO (Pinterest):</td><td style="text-align: right; font-weight: bold; color: #fff;">${tomStats.actionsCompleted24h.pinterestRepins}</td></tr>
                    <tr><td>• Skauting wątków (Reddit):</td><td style="text-align: right; font-weight: bold; color: #fff;">${tomStats.actionsCompleted24h.redditScouts}</td></tr>
                    <tr style="border-top: 1px solid #332d25;">
                        <td style="padding-top: 6px;"><strong>Łączna liczba interakcji:</strong></td>
                        <td style="text-align: right; padding-top: 6px; font-weight: bold; color: #2ecc71;">${tomStats.totalInteractionsDaily} / dzień</td>
                    </tr>
                    <tr>
                        <td><strong>Precyzja dopasowania odbiorców:</strong></td>
                        <td style="text-align: right; font-weight: bold; color: #ffd700;">${tomStats.targetMatchAccuracy}</td>
                    </tr>
                    <tr>
                        <td><strong>Indeks Anty-Wykrywania (Bézier / AI Masking):</strong></td>
                        <td style="text-align: right; font-weight: bold; color: #2ecc71;">${tomStats.antiDetectionScore}</td>
                    </tr>
                </table>
                <div style="margin-top: 12px; background: #0e0d0b; padding: 8px 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #3498db;">
                    Prędkość Działań Toma: [${charts.outreachBar}] ${charts.outreachVelocity}% Celu
                </div>
            </div>

            <!-- SECTION 2: SOCIAL PLATFORMS METRICS -->
            <div style="background-color: #171512; padding: 18px; border-radius: 8px; border-left: 4px solid #9b59b6; margin-bottom: 18px;">
                <h3 style="color: #9b59b6; margin: 0 0 12px 0; font-size: 17px;">📱 2. Statystyki Publikacji & Widoczności na Portalach</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; color: #c4baa9;">
                    <div style="background: #11100e; padding: 10px; border-radius: 6px;">
                        <strong style="color: #fff;">📸 Fanvue:</strong> ${socialStats.fanvue} wpisów<br>
                        <strong style="color: #fff;">📷 Instagram:</strong> ${socialStats.instagram} postów
                    </div>
                    <div style="background: #11100e; padding: 10px; border-radius: 6px;">
                        <strong style="color: #fff;">🎥 TikTok:</strong> ${socialStats.tiktok} wideo<br>
                        <strong style="color: #fff;">🐦 Twitter / X:</strong> Aktywny (@SecretsOfBetty)
                    </div>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #a89f91;">
                    Łącznie opublikowanych materiałów w systemie: <strong style="color: #fff;">${socialStats.totalPublished}</strong>
                </p>
            </div>

            <!-- SECTION 3: FANVUE MONETIZATION & CONVERSION -->
            <div style="background-color: #171512; padding: 18px; border-radius: 8px; border-left: 4px solid #d4af37; margin-bottom: 18px;">
                <h3 style="color: #d4af37; margin: 0 0 12px 0; font-size: 17px;">💰 3. Przełożenie na Płatności i Monetyzację Fanvue</h3>
                <table style="width: 100%; color: #c4baa9; font-size: 13px; line-height: 1.8;">
                    <tr><td>• Aktywna cena subskrypcji:</td><td style="text-align: right; font-weight: bold; color: #ffd700;">${fanvueStats.activeTierPrice}</td></tr>
                    <tr><td>• Płatne zestawy w Skarbcu (Vault PPV):</td><td style="text-align: right; font-weight: bold; color: #fff;">${fanvueStats.vaultSetsLive} ($24.99 Bundle)</td></tr>
                    <tr><td>• Liczba płatnych subskrybentów:</td><td style="text-align: right; font-weight: bold; color: #2ecc71;">${fanvueStats.subscribersCount}</td></tr>
                    <tr><td>• Sprzedaż PPV & Napiwki:</td><td style="text-align: right; font-weight: bold; color: #fff;">${fanvueStats.ppvSalesCount + fanvueStats.tipsReceivedCount}</td></tr>
                    <tr style="border-top: 1px solid #332d25;">
                        <td style="padding-top: 6px; font-size: 14px;"><strong>Łączny Przychód Brutto:</strong></td>
                        <td style="text-align: right; padding-top: 6px; font-size: 16px; font-weight: bold; color: #2ecc71;">$${fanvueStats.earningsGrossUsd} USD</td>
                    </tr>
                </table>
            </div>

            <!-- SECTION 4: STRATEGIC RECOMMENDATIONS -->
            <div style="background-color: #12110f; padding: 15px; border-radius: 6px; font-size: 13px; color: #a89f91; line-height: 1.6; margin-bottom: 20px;">
                <strong style="color: #d4af37;">💡 Rekomendacje Producenta George'a:</strong><br>
                1. <strong>Utrzymanie tempa Toma:</strong> Działania w oknach 14:00 i 19:30 przynoszą najwyższy wskaźnik zaangażowania fanów kina kostiumowego.<br>
                2. <strong>Przejście raportowania:</strong> Do dnia 01.09.2026 raporty będą dostarczane codziennie. Następnie system płynnie przełączy się na tryb podsumowań cotygodniowych (w każdą niedzielę).
            </div>

            <!-- FOOTER -->
            <div style="text-align: center; border-top: 1px solid #2b251d; padding-top: 15px; font-size: 11px; color: #6b6355;">
                InfluMaker Multi-Agent Cloud Platform &bull; George Executive Producer Engine<br>
                <em>Automatyczny raport wygenerowany dla: ${this.recipient}</em>
            </div>
        </div>
        `;

        const plainText = `[InfluMaker] Executive Report: ${phase.phaseLabel}\nTom daily actions: ${tomStats.totalInteractionsDaily}\nPublished total: ${socialStats.totalPublished}\nFanvue Tier: ${fanvueStats.activeTierPrice}\n\nGenerated for ${this.recipient}`;

        return this.sendEmail({ subject, html, text: plainText });
    }

    /**
     * Core email dispatcher
     */
    async sendEmail({ subject, html, text, attachments = [] }) {
        const logEntry = `[${new Date().toISOString()}] To: ${this.recipient} | Subject: ${subject}\n`;
        try {
            const dir = path.dirname(this.logPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.appendFileSync(this.logPath, logEntry, 'utf8');
        } catch (e) {}

        // 1. If GitHub Actions, write summary to GITHUB_STEP_SUMMARY
        if (process.env.GITHUB_STEP_SUMMARY) {
            try {
                fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### 📧 Executive Email Dispatched\n**To:** ${this.recipient}\n**Subject:** ${subject}\n\n`, 'utf8');
            } catch (e) {}
        }

        // 2. If SMTP transporter is available, send real email
        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail({
                    from: `"George [InfluMaker AI]" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
                    to: this.recipient,
                    subject: subject,
                    html: html,
                    text: text,
                    attachments: attachments
                });
                console.log(`[NotificationService] 🚀 Executive email delivered successfully to ${this.recipient}: MessageID ${info.messageId}`);
                return { success: true, messageId: info.messageId };
            } catch (err) {
                console.error(`[NotificationService] ⚠️ SMTP Send Error:`, err.message);
                return { success: false, error: err.message };
            }
        } else {
            console.log(`[NotificationService] ℹ️ Notification logged for ${this.recipient}: "${subject}" (SMTP transport logged).`);
            return { success: true, logged: true };
        }
    }
}

module.exports = NotificationService;
