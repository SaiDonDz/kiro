/**
 * Script de configuration du Watch Google Calendar
 * Usage: node src/setup-watch.js
 * À relancer tous les 7 jours
 */

require('dotenv').config();
const GoogleCalendarService = require('./calendar');

async function main() {
  console.log('🔧 Configuration du Watch Google Calendar...\n');

  if (!process.env.GOOGLE_CALENDAR_ID) {
    console.error('❌ GOOGLE_CALENDAR_ID manquant dans .env');
    process.exit(1);
  }
  if (!process.env.WEBHOOK_URL) {
    console.error('❌ WEBHOOK_URL manquant dans .env');
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
}

main().catch(error => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
