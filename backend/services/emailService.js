const nodemailer = require('nodemailer');
require('dotenv').config();

// Default notification recipient requested by user
const DEFAULT_NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'merzak.sai@sensus-int.com';

/**
 * Creates and returns a Nodemailer transporter configured for Outlook / Office 365 or custom SMTP
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('⚠️ [EmailService] SMTP_USER or SMTP_PASS is missing in .env. Emails will not be sent until configured.');
    return null;
  }

  // If host is Gmail, use optimized configuration
  if (host.includes('gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: pass
      }
    });
  }

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Generates an elegant HTML template for a submitted purchase request
 */
const generateRequestEmailHtml = (requestData, items = []) => {
  const reqNum = requestData.requestNumber || requestData.RequestNumber || 'N/A';
  const title = requestData.title || requestData.Title || 'Sans titre';
  const requester = requestData.requesterName || requestData.RequesterName || 'Demandeur';
  const dept = requestData.department || requestData.Department || 'Non spécifié';
  const type = requestData.type || requestData.Type || 'Local';
  const dateVal = requestData.requestDate || requestData.RequestDate || new Date().toISOString().split('T')[0];
  const requiredBy = requestData.requiredByDate || requestData.RequiredByDate;
  const desc = requestData.description || requestData.Description || '';
  const appUrl = process.env.APP_URL || 'http://192.168.1.253:3101';

  const itemsRows = (items && items.length > 0)
    ? items.map((item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 10px 12px; font-weight: 600; color: #334155; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; color: #0f172a;">${item.itemDescription || item.ItemDescription || ''}</td>
          <td style="padding: 10px 12px; font-weight: 600; text-align: center; color: #1e293b;">${item.quantity || item.Quantity || 1}</td>
          <td style="padding: 10px 12px; text-align: center; color: #64748b;">${item.unit || item.Unit || 'U'}</td>
          <td style="padding: 10px 12px; color: #64748b; font-size: 13px;">${item.observation || item.Observation || '-'}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="5" style="padding: 14px; text-align: center; color: #94a3b8;">Aucun article renseigné</td></tr>`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Nouvelle Demande d'Achat</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 24px 28px; color: #ffffff;">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; opacity: 0.85; margin-bottom: 4px;">Système de Gestion des Achats • SENSUS</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">📋 Nouvelle Demande d'Achat Soumise</h1>
      </div>

      <!-- Main Body -->
      <div style="padding: 24px 28px;">
        
        <p style="font-size: 15px; line-height: 1.5; color: #334155; margin-top: 0;">
          Une nouvelle demande d'achat vient d'être enregistrée et soumise directement dans le système.
        </p>

        <!-- Summary Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 18px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Numéro Réf :</td>
              <td style="padding: 6px 0; font-weight: 700; color: #1e3a8a; font-size: 15px;">${reqNum}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Objet :</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${title}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Demandeur :</td>
              <td style="padding: 6px 0; color: #0f172a;">👤 ${requester}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Département :</td>
              <td style="padding: 6px 0; color: #0f172a;">🏢 ${dept}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Type d'achat :</td>
              <td style="padding: 6px 0;">
                <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: ${type === 'Étranger' || type === 'Etranger' ? '#fef3c7' : '#e0f2fe'}; color: ${type === 'Étranger' || type === 'Etranger' ? '#92400e' : '#0369a1'};">
                  ${type}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Date Demande :</td>
              <td style="padding: 6px 0; color: #0f172a;">${dateVal}</td>
            </tr>
            ${requiredBy ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Date Souhaitée :</td>
              <td style="padding: 6px 0; color: #b91c1c; font-weight: 600;">📅 ${requiredBy}</td>
            </tr>
            ` : ''}
            ${desc ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Remarques :</td>
              <td style="padding: 6px 0; color: #475569; font-style: italic;">${desc}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Articles Table -->
        <h3 style="font-size: 15px; font-weight: 700; color: #1e293b; margin: 20px 0 10px 0;">📦 Liste des articles (${(items || []).length})</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; border-radius: 6px; overflow: hidden; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; text-align: left;">
              <th style="padding: 10px 12px; width: 30px; text-align: center;">#</th>
              <th style="padding: 10px 12px;">Désignation</th>
              <th style="padding: 10px 12px; width: 50px; text-align: center;">Qté</th>
              <th style="padding: 10px 12px; width: 60px; text-align: center;">Unité</th>
              <th style="padding: 10px 12px;">Observation</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- CTA Button -->
        <div style="margin: 28px 0 12px 0; text-align: center;">
          <a href="${appUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 6px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);">
            Accéder à l'application
          </a>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b; font-style: italic;">
            🔒 Accessible uniquement lorsque vous êtes connecté au réseau Wi-Fi / réseau local SENSUS.
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 28px; font-size: 12px; color: #94a3b8; text-align: center;">
        Ce message est une notification automatique générée par l'application Demande d'Achat SENSUS.<br>
        Merci de ne pas répondre directement à cet email.
      </div>
    </div>
  </body>
  </html>
  `;
};

/**
 * Sends an email notification when a purchase request is submitted
 */
const sendNewRequestNotification = async (requestData, items = []) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.log('ℹ️ [EmailService] Skipping email notification: SMTP credentials not yet configured in .env');
      return { success: false, reason: 'unconfigured' };
    }

    const rawRecipient = process.env.NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL;
    // Support multiple comma-separated or semicolon-separated recipient emails
    const recipient = rawRecipient
      ? rawRecipient.split(/[,;]/).map(e => e.trim()).filter(Boolean).join(', ')
      : DEFAULT_NOTIFICATION_EMAIL;
    const sender = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@sensus-int.com';
    const reqNum = requestData.requestNumber || requestData.RequestNumber || 'Nouvelle';
    const title = requestData.title || requestData.Title || '';

    const subject = `[Demande d'Achat] ${reqNum} - ${title}`;
    const htmlContent = generateRequestEmailHtml(requestData, items);

    console.log(`📧 [EmailService] Sending submission notification for ${reqNum} to ${recipient}...`);

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Demande d\'Achat SENSUS'}" <${sender}>`,
      to: recipient,
      subject: subject,
      html: htmlContent
    });

    console.log(`✅ [EmailService] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [EmailService] Error sending email notification:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a test email to verify Outlook SMTP connectivity
 */
const sendTestEmail = async (targetEmail = DEFAULT_NOTIFICATION_EMAIL) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP_USER ou SMTP_PASS manquant dans .env' };
    }

    const sender = process.env.SMTP_FROM || process.env.SMTP_USER;
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Demande d\'Achat SENSUS'}" <${sender}>`,
      to: targetEmail,
      subject: `🧪 Test de Notification Email - Demande d'Achat SENSUS`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #2563eb;">✅ Connexion Email Outlook Réussie !</h2>
          <p>Ceci est un email de test envoyé par le système <strong>Demande d'Achat SENSUS</strong>.</p>
          <p>Le serveur SMTP Outlook est correctement configuré et opérationnel.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">Horodatage : ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      `
    });

    console.log(`✅ [EmailService] Test email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ [EmailService] Test email failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNewRequestNotification,
  sendTestEmail,
  DEFAULT_NOTIFICATION_EMAIL
};
