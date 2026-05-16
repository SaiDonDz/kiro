/**
 * Point d'entrée principal - Google Cloud Function
 * 
 * Cette fonction reçoit les notifications push de Google Calendar
 * et envoie les notifications WhatsApp au groupe + au client.
 * 
 * Déploiement : gcloud functions deploy calendarWebhook ...
 */

require('dotenv').config();
const GoogleCalendarService = require('./calendar');
const WhatsAppService = require('./whatsapp');

// ===========================================
// CONFIGURATION DES MEMBRES DU GROUPE
// ===========================================
// Ajoutez ici les numéros de téléphone de votre équipe
// Format international sans le + (ex: 213XXXXXXXXX pour l'Algérie)
const GROUP_MEMBERS = [
  // '213XXXXXXXXX', // Vous
  // '213XXXXXXXXX', // Collègue 1
  // '213XXXXXXXXX', // Collègue 2
];

// Cache pour éviter les notifications en double
const processedEvents = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Cloud Function principale - Point d'entrée du webhook
 * Google Calendar envoie un POST ici quand un événement change
 */
async function calendarWebhook(req, res) {
  // ---- Vérification de la requête ----

  // Google envoie d'abord un "sync" pour vérifier que le webhook fonctionne
  if (req.headers['x-goog-resource-state'] === 'sync') {
    console.log('🔄 Sync request reçue de Google Calendar');
    return res.status(200).send('OK');
  }

  // Vérifier que c'est bien une notification de changement
  const resourceState = req.headers['x-goog-resource-state'];
  if (resourceState !== 'exists') {
    console.log(`ℹ️  Notification ignorée (state: ${resourceState})`);
    return res.status(200).send('OK');
  }

  console.log('📬 Notification reçue de Google Calendar');
  console.log(`   Channel ID: ${req.headers['x-goog-channel-id']}`);
  console.log(`   Resource State: ${resourceState}`);

  try {
    // ---- Initialiser les services ----
    const calendarService = new GoogleCalendarService();
    await calendarService.init();

    const whatsappService = new WhatsAppService();
    whatsappService.validateConfig();

    // ---- Récupérer les événements récents ----
    const events = await calendarService.getRecentEvents(5);

    if (events.length === 0) {
      console.log('ℹ️  Aucun nouvel événement trouvé');
      return res.status(200).send('OK');
    }

    console.log(`📋 ${events.length} événement(s) trouvé(s)`);

    // ---- Traiter chaque événement ----
    for (const event of events) {
      // Vérifier si déjà traité (éviter les doublons)
      if (isAlreadyProcessed(event.id, event.updated)) {
        console.log(`⏭️  Événement déjà traité: ${event.summary}`);
        continue;
      }

      // Marquer comme traité
      markAsProcessed(event.id, event.updated);

      // Formater l'événement
      const eventData = calendarService.formatEvent(event);
      console.log(`\n🆕 Nouvel événement: ${eventData.titre}`);
      console.log(`   📆 ${eventData.date} | ${eventData.heureDebut} - ${eventData.heureFin}`);

      // ---- Envoyer notifications au groupe ----
      if (GROUP_MEMBERS.length > 0) {
        await whatsappService.notifyNewAppointment(GROUP_MEMBERS, eventData);
      } else {
        console.log('⚠️  Aucun membre configuré dans GROUP_MEMBERS');
      }

      // ---- Envoyer confirmation au client ----
      if (eventData.clientTelephone) {
        await whatsappService.sendClientConfirmation(eventData.clientTelephone, eventData);
      } else {
        console.log('ℹ️  Pas de téléphone client trouvé dans l\'événement');
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erreur dans le webhook:', error.message);
    console.error(error.stack);
    // On retourne 200 quand même pour que Google ne re-tente pas
    return res.status(200).send('Error processed');
  }
}

// ===========================================
// UTILITAIRES
// ===========================================

/**
 * Vérifie si un événement a déjà été traité récemment
 */
function isAlreadyProcessed(eventId, updatedAt) {
  const key = `${eventId}_${updatedAt}`;
  const cached = processedEvents.get(key);

  if (cached && Date.now() - cached < CACHE_TTL) {
    return true;
  }

  return false;
}

/**
 * Marque un événement comme traité
 */
function markAsProcessed(eventId, updatedAt) {
  const key = `${eventId}_${updatedAt}`;
  processedEvents.set(key, Date.now());

  // Nettoyer les anciennes entrées du cache
  for (const [k, timestamp] of processedEvents.entries()) {
    if (Date.now() - timestamp > CACHE_TTL) {
      processedEvents.delete(k);
    }
  }
}

// ===========================================
// EXPORTS
// ===========================================

// Export pour Google Cloud Functions
exports.calendarWebhook = calendarWebhook;

// Si exécuté directement (pour test local)
if (require.main === module) {
  const http = require('http');
  const PORT = process.env.PORT || 8080;

  const server = http.createServer((req, res) => {
    // Simuler l'objet req/res de Cloud Functions
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      req.body = body ? JSON.parse(body) : {};
      calendarWebhook(req, res);
    });
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 Serveur de test démarré sur http://localhost:${PORT}`);
    console.log('   Utilisez ngrok pour exposer en HTTPS et tester le webhook');
    console.log('   Commande: ngrok http 8080\n');
  });
}
