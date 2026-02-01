const nodemailer = require('nodemailer');
const BaseDeliveryStrategy = require('./baseStrategy');

class EmailStrategy extends BaseDeliveryStrategy {
    constructor() {
        super('Email');
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async send(user, deliveryData) {
        const { content_html, content_text, checkInUrl } = deliveryData;
        const recipient = user.contact || user.emergency_contact;

        console.log(`[EmailStrategy] Sending to ${user.name} (${recipient})`);

        const emailHtml = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #d97706;">Amber Ink</h2>
        ${content_html}
        <div style="margin-top: 30px; text-align: center;">
          <a href="${checkInUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">
            今日の輝きを確認する (Check-in)
          </a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 40px; text-align: center;">
          このメールは Amber Ink から自動送信されています。
        </p>
      </div>
    `;

        return await this.transporter.sendMail({
            from: '"Amber Ink" <no-reply@amber-ink.local>',
            to: recipient,
            subject: `琥珀の輝き：今日の ${user.name} さんへ`,
            text: content_text + `\n\nCheck-in here: ${checkInUrl}`,
            html: emailHtml,
        });
    }
}

module.exports = EmailStrategy;
