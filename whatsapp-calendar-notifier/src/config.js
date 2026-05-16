/**
 * Configuration centralisée
 * Importez ce fichier pour accéder à toute la configuration
 */

require('dotenv').config();

const config = {
  // Google Calendar
  google: {
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
  },

  // WhatsApp Business API
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    groupId: process.env.WHATSAPP_GROUP_ID,
  },

  // Webhook
  webhook: {
    url: process.env.WEBHOOK_URL,
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
  },

  // Général
  timezone: process.env.TIMEZONE || 'Africa/Algiers',
  messageLang: process.env.MESSAGE_LANG || 'fr',
};

/**
 * Valide que toutes les variables essentielles sont présentes
 */
function validateConfig() {
  const required = [
    ['GOOGLE_CALENDAR_ID', config.google.calendarId],
    ['WHATSAPP_ACCESS_TOKEN', config.whatsapp.accessToken],
    ['WHATSAPP_PHONE_NUMBER_ID', config.whatsapp.phoneNumberId],
  ];

  const missing = required.filter(([name, value]) => !value);

  if (missing.length > 0) {
    const names = missing.map(([name]) => name).join(', ');
    throw new Error(`Variables d'environnement manquantes: ${names}`);
  }

  return true;
}

module.exports = { config, validateConfig };
