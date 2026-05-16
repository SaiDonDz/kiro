/**
 * Script de configuration du Watch Google Calendar
 * À exécuter une fois pour activer les notifications push
 * Puis à relancer tous les 7 jours (ou configurer un cron)
 * 
 * Usage: node src/setup-watch.js
 */

require('dotenv').config();
const GoogleCalendarService = require('./calendar');

async function main() {
  console.log('🔧 Configuration du Watch Google Calendar...\n');

  // Vérifier les variables d'environnement
  if (!process.env.GOOGLE_CALENDAR_ID) {
    console.error('❌ GOOGLE_CALENDAR_ID manquant dans .env');
    process.exit(1);
  }

  if (!process.env.WEBHOOK_URL) {
    console.error('❌ WEBHOOK_URL manquant dans .env');
    console.error('   Déployez d\'abord la Cloud Function, puis ajoutez l\'URL ici.');
    process.exit(1);
  }

  const calendarService = new GoogleCalendarService();
  await calendarService.init();

  const result = await calendarService.setupWatch();

  console.log('\n📋 Résumé :');
  console.log(`   Resource ID: ${result.resourceId}`);
  console.log(`   Channel ID: ${result.id}`);
  console.log(`   Expiration: ${new Date(parseInt(result.expiration)).toLocaleString('fr-FR')}`);
  console.log('\n⚠️  Le watch expire dans 7 jours. Pensez à le renouveler !');
  console.log('   Vous pouvez configurer un cron job ou Cloud Scheduler pour ça.');
}

main().catch(error => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
