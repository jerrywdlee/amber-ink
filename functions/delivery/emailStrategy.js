const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
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
    const { targetOverride, type = 'daily' } = deliveryData;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const checkInUrl = `${process.env.BASE_FUNCTION_URL || 'http://localhost:8080'}/checkIn?uid=${user.userId}`;

    let recipient = user.contact;
    let templateDir = 'daily';
    let templateData = {
      name: user.name,
      checkInUrl: checkInUrl,
      familySupportUrl: `${baseUrl}/?view=emergency&uid=${user.userId}`
    };

    // Determine recipient and template based on type and override
    if (targetOverride === 'emergency' || type === 'emergency') {
      recipient = user.emergency_contact;
      templateDir = 'emergency';
      const lastSeen = user.last_seen ? new Date(user.last_seen) : new Date(user.created_at);
      const daysMissing = Math.floor((new Date() - lastSeen) / (1000 * 60 * 60 * 24));
      templateData.days_missing = daysMissing || 1;
    }

    if (targetOverride) {
      // It's a test delivery
      templateDir = 'test';
      templateData.target_label = targetOverride === 'self' ? '自分' : '見守りサポーター';
      if (targetOverride === 'self') recipient = user.contact;
    } else if (type === 'daily') {
      templateData.snippets = user.scheduled_delivery?.snippets || [];
    }

    console.log(`[EmailStrategy] Sending ${type} to ${user.name} (${recipient}) via ${templateDir} template`);

    const htmlPath = path.join(__dirname, '..', 'templates', templateDir, templateDir === 'daily' ? 'message.html.ejs' : templateDir === 'emergency' ? 'alert.html.ejs' : 'test.html.ejs');
    const txtPath = path.join(__dirname, '..', 'templates', templateDir, templateDir === 'daily' ? 'message.txt.ejs' : templateDir === 'emergency' ? 'alert.txt.ejs' : 'test.txt.ejs');

    const html = await ejs.renderFile(htmlPath, templateData);
    const text = await ejs.renderFile(txtPath, templateData);

    const subject = type === 'emergency' ? `【重要/緊急】Amber Ink から「見守りサポーター」様へお知らせ` :
      targetOverride ? `【テスト配信】Amber Ink 動作確認` :
        `琥珀の輝き：今日の ${user.name} さんへ`;

    return await this.transporter.sendMail({
      from: '"Amber Ink" <no-reply@amber-ink.local>',
      to: recipient,
      subject: subject,
      text: text,
      html: html,
    });
  }
}

module.exports = EmailStrategy;
