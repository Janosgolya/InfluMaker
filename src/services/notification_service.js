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
     * Determine whether we are in Phase 1 (Instant per-post) or Phase 2 (Weekly summary only)
     */
    isPhase1Active(currentDate = new Date()) {
        const diffTime = currentDate.getTime() - this.projectStartDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= this.phase1DurationDays;
    }

    /**
     * Send email notification on post publication (Active for first 14 days)
     */
    async notifyPostPublished(data = {}) {
        const { theme, item, results = {}, remainingCount = 0 } = data;
        const now = new Date();
        const inPhase1 = this.isPhase1Active(now);

        if (!inPhase1) {
            console.log(`[NotificationService] ℹ️ Phase 1 (14 days) completed. Skipping instant per-post email (switched to weekly summary).`);
            return { skipped: true, reason: 'Phase 1 ended' };
        }

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
                Wiadomość wygenerowana automatycznie przez agenta George (InfluMaker 24/7 Cloud).<br>
                <em>Tryb powiadomień natychmiastowych aktywny przez pierwsze 14 dni (do 01.09.2026).</em>
            </div>
        </div>
        `;

        return this.sendEmail({ subject, html, text: `[InfluMaker] New post published for theme ${theme} on ${platforms.join(', ')}.` });
    }

    /**
     * Send Weekly Executive Producer Summary (Every Sunday / Weekly slot)
     */
    async notifyWeeklySummary(summaryData = {}) {
        const { totalPostsLogged = 0, platforms = {}, remainingRunway = 0, storageQuota = {} } = summaryData;
        const now = new Date();
        const formattedDate = now.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });

        const subject = `📊 [InfluMaker] Cotygodniowy Raport Producenta - Betty Ryal (${formattedDate})`;

        const html = `
        <div style="font-family: 'Georgia', serif; background-color: #121214; color: #f0ede6; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; border: 1px solid #332d25;">
            <div style="text-align: center; border-bottom: 1px solid #4a3f31; padding-bottom: 15px; margin-bottom: 20px;">
                <h1 style="color: #d4af37; margin: 0; font-size: 24px;">📊 COTYGODNIOWE PODSUMOWANIE</h1>
                <p style="color: #a89f91; font-size: 13px; margin-top: 5px;">George Producer &bull; Raport z działalności Betty Ryal</p>
            </div>

            <div style="background-color: #1c1a17; padding: 18px; border-radius: 6px; margin-bottom: 20px;">
                <h3 style="color: #d4af37; margin: 0 0 10px 0; font-size: 16px;">📈 Statystyki Publikacji (Ostatnie 7 Dni):</h3>
                <ul style="margin: 0; padding-left: 20px; color: #c4baa9; font-size: 14px; line-height: 1.8;">
                    <li>Fanvue: <strong>${platforms.fanvue || 0}</strong> postów</li>
                    <li>Instagram: <strong>${platforms.instagram || 0}</strong> postów</li>
                    <li>TikTok Studio: <strong>${platforms.tiktok || 0}</strong> wideo / postów</li>
                    <li>Łącznie opublikowanych: <strong>${totalPostsLogged}</strong></li>
                </ul>
            </div>

            <div style="background-color: #161513; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; color: #a89f91;">
                <strong style="color: #d4af37;">⏳ Stan Kolejki i Runway:</strong><br>
                Dostępnych zatwierdzonych zdjęć w bazie: <strong>${remainingRunway}</strong><br>
                Zapas publikacji: <strong>${Math.round(remainingRunway / 4)} dni (ok. ${(remainingRunway / 28).toFixed(1)} tyg.)</strong>
            </div>

            <div style="text-align: center; border-top: 1px solid #332d25; padding-top: 15px; font-size: 11px; color: #736b5e;">
                InfluMaker Multi-Agent System &bull; 24/7 Autonomous Cloud
            </div>
        </div>
        `;

        return this.sendEmail({ subject, html, text: `[InfluMaker] Weekly Summary: ${totalPostsLogged} total posts logged. Runway: ${remainingRunway} images.` });
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
                fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### 📧 Email Notification Sent\n**To:** ${this.recipient}\n**Subject:** ${subject}\n\n`, 'utf8');
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
                console.log(`[NotificationService] 🚀 Email delivered successfully to ${this.recipient}: MessageID ${info.messageId}`);
                return { success: true, messageId: info.messageId };
            } catch (err) {
                console.error(`[NotificationService] ⚠️ SMTP Send Error:`, err.message);
                return { success: false, error: err.message };
            }
        } else {
            console.log(`[NotificationService] ℹ️ Notification logged for ${this.recipient}: "${subject}" (Add GMAIL_APP_PASSWORD secret on GitHub to enable instant inbox delivery).`);
            return { success: true, logged: true };
        }
    }
}

module.exports = NotificationService;
