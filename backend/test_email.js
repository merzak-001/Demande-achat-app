require('dotenv').config();
const { sendTestEmail, DEFAULT_NOTIFICATION_EMAIL } = require('./services/emailService');

async function main() {
  console.log('----------------------------------------------------');
  console.log('🧪 Testing Outlook SMTP Email Configuration...');
  console.log(`📡 SMTP Host: ${process.env.SMTP_HOST || 'smtp.office365.com'}`);
  console.log(`🔌 SMTP Port: ${process.env.SMTP_PORT || '587'}`);
  console.log(`👤 SMTP User: ${process.env.SMTP_USER || '(NOT SET)'}`);
  console.log(`🎯 Recipient : ${process.env.NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL}`);
  console.log('----------------------------------------------------');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('\n❌ SMTP_USER or SMTP_PASS is missing in backend/.env.');
    console.error('Please configure your Outlook email credentials in backend/.env:');
    console.error('  SMTP_HOST=smtp.office365.com');
    console.error('  SMTP_PORT=587');
    console.error('  SMTP_SECURE=false');
    console.error('  SMTP_USER=your-email@sensus-int.com');
    console.error('  SMTP_PASS=your-password-or-app-password');
    console.error('  NOTIFICATION_EMAIL=merzak.sai@sensus-int.com\n');
    process.exit(1);
  }

  const result = await sendTestEmail();
  if (result.success) {
    console.log('\n🎉 SUCCESS! Test email was sent successfully to ' + (process.env.NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL));
  } else {
    console.error('\n❌ FAILED to send test email:');
    console.error(result.error);
  }
}

main();
