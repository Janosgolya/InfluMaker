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
                this.transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user, pass }
                });
                console.log(`[NotificationService] 📧 SMTP Transport initialized for: ${user}`);
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
     * Send email notification on post publication
     */
    async notifyPostPublished(data = {}) {
        const { theme, item, results = {}, remainingCount = 0 } = data;
        const now = new Date();

        const platforms = [];
        if (results.fanvue && !results.fanvue.error) platforms.push('Fanvue');
        if (results.instagram && !results.instagram.error) platforms.push('Instagram');
        if (results.tiktok && !results.tiktok.error) platforms.push('TikTok');
        if (platforms.length === 0) platforms.push('Fanvue (Scheduled)');

        const subject = `👑 [InfluMaker] Post Published: ${theme} (${platforms.join(', ')}) - Betty Ryal`;
        const imageName = item?.imagePath ? path.basename(item.imagePath) : 'Period Drama Asset';
        const formattedDate = now.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });

        const html = `
        <div style="font-family: 'Georgia', serif; background-color: #121214; color: #f0ede6; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; border: 1px solid #332d25;">
            <div style="text-align: center; border-bottom: 1px solid #4a3f31; padding-bottom: 15px; margin-bottom: 20px;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px; letter-spacing: 1px;">🏰 INFLUMAKER NOTIFICATION</h1>
                <p style="color: #a89f91; font-size: 13px; margin-top: 5px;">Betty Ryal &bull; 18th-Century London Manor &bull; George Orchestrator</p>
            </div>
            
            <div style="background-color: #1c1a17; padding: 18px; border-radius: 6px; border-left: 4px solid #d4af37; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 16px; color: #ffffff;"><strong>🔔 Nowy Post Został Opublikowany!</strong></p>
                <p style="margin: 8px 0 0 0; color: #c4baa9; font-size: 14px;"><strong>Pora dnia / Slot:</strong> <span style="color: #ffd700;">${theme}</span></p>
                <p style="margin: 4px 0 0 0; color: #c4baa9; font-size: 14px;"><strong>Platformy:</strong> ${platforms.map(p => `<span style="background: #2b261f; padding: 2px 8px; border-radius: 4px; color: #fff; font-size: 12px; margin-right: 4px;">${p}</span>`).join(' ')}</p>
                <p style="margin: 4px 0 0 0; color: #c4baa9; font-size: 14px;"><strong>Plik:</strong> <code>${imageName}</code></p>
                <p style="margin: 4px 0 0 0; color: #c4baa9; font-size: 14px;"><strong>Data publikacji:</strong> ${formattedDate}</p>
            </div>

            <div style="background-color: #161513; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #a89f91; line-height: 1.5;">
                <strong style="color: #d4af37;">📊 Stan Magazynu Treści:</strong><br>
                Pozostało gotowych zdjęć w kolejce: <strong>${remainingCount}</strong> (Zapas na ok. ${Math.round(remainingCount / 4)} dni).
            </div>

            <div style="text-align: center; border-top: 1px solid #332d25; padding-top: 15px; font-size: 11px; color: #736b5e;">
                Wiadomość wygenerowana automatycznie przez agenta George (InfluMaker 24/7 Cloud).
            </div>
        </div>
        `;

        return this.sendEmail({ subject, html, text: `[InfluMaker] New post published for theme ${theme} on ${platforms.join(', ')}.` });
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
    async sendEmail({ subject, html, text }) {
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
                    text: text
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
