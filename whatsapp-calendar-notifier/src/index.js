/**
 * Point d'entrée principal - Google Cloud Function
 * Reçoit les notifications push de Google Calendar
 * et envoie les notifications WhatsApp au groupe + au client.
 */

require('dotenv').config();
const GoogleCalendarService = require('./calendar');
const WhatsAppService = require('./whatsapp');

// ===========================================
// MEMBRES DU GROUPE - Ajoutez vos numéros ici
// Format : 213XXXXXXXXX (Algérie) ou 33XXXXXXXXX (France)
// ===========================================
const GROUP_MEMBERS = [
  // '213555111111', // Vous
  // '213555222222', // Collègue 1
  // '213555333333', // Collègue 2
];

// Cache anti-doublons (10 min)
const processedEvents = new Map();
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Cloud Function - Webhook principal
 */
async function calendarWebhook(req, res) {
  // Sync request de Google
  if (req.headers['x-goog-resource-state'] === 'sync') {
    console.log('🔄 Sync request reçue');
    return res.status(200).send('OK');
  }

  const resourceState = req.headers['x-goog-resource-state'];
  if (resourceState !== 'exists') {
    return res.status(200).send('OK');
  }

  console.log('📬 Notification reçue de Google Calendar');

  try {
    const calendarService = new GoogleCalendarService();
    await calendarService.init();

    const whatsappService = new WhatsAppService();
    whatsappService.validateConfig();

    const events = await calendarService.getRecentEvents(5);

    if (events.length === 0) {
      console.log('ℹ️  Aucun nouvel événement');
      return res.status(200).send('OK');
    }

    console.log(`📋 ${events.length} événement(s) trouvé(s)`);

    for (const event of events) {
      if (isAlreadyProcessed(event.id, event.updated)) {
        console.log(`⏭️  Déjà traité: ${event.summary}`);
        continue;
      }

      markAsProcessed(event.id, event.updated);
      const eventData = calendarService.formatEvent(event);

      console.log(`🆕 Nouveau RDV: ${eventData.titre}`);
      console.log(`   📆 ${eventData.date} | ${eventData.heureDebut} - ${eventData.heureFin}`);

      // Notification groupe
      if (GROUP_MEMBERS.length > 0) {
        await whatsappService.notifyNewAppointment(GROUP_MEMBERS, eventData);
      }

      // Confirmation client
      if (eventData.clientTelephone) {
        await whatsappService.sendClientConfirmation(eventData.clientTelephone, eventData);
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return res.status(200).send('Error processed');
  }
}

function isAlreadyProcessed(eventId, updatedAt) {
  const key = `${eventId}_${updatedAt}`;
  const cached = processedEvents.get(key);
  return cached && Date.now() - cached < CACHE_TTL;
}

function markAsProcessed(eventId, updatedAt) {
  const key = `${eventId}_${updatedAt}`;
  processedEvents.set(key, Date.now());
  for (const [k, timestamp] of processedEvents.entries()) {
    if (Date.now() - timestamp > CACHE_TTL) processedEvents.delete(k);
  }
}

// Export pour Google Cloud Functions
exports.calendarWebhook = calendarWebhook;

// Serveur local pour tests
if (require.main === module) {
  const http = require('http');
  const PORT = process.env.PORT || 8080;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      req.body = body ? JSON.parse(body) : {};
      calendarWebhook(req, res);
    });
  });
  server.listen(PORT, () => {
    console.log(`🚀 Serveur local sur http://localhost:${PORT}`);
    console.log('   Utilisez ngrok pour tester le webhook');
  });
}
