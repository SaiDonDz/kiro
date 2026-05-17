/**
 * Module Google Calendar
 * Gère la connexion à Google Calendar et la récupération des événements
 */

const { google } = require('googleapis');
const path = require('path');

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.channelId = null;
  }

  async init() {
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(credentialsPath),
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    const authClient = await auth.getClient();
    this.calendar = google.calendar({ version: 'v3', auth: authClient });
    console.log('✅ Google Calendar connecté');
    return this;
  }

  async setupWatch() {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const webhookUrl = process.env.WEBHOOK_URL;
    const channelId = `calendar-watch-${Date.now()}`;

    const response = await this.calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        params: { ttl: '604800' },
      },
    });

    this.channelId = channelId;
    console.log('✅ Watch configuré sur Google Calendar');
    console.log(`   Channel ID: ${channelId}`);
    console.log(`   Expiration: ${new Date(parseInt(response.data.expiration)).toLocaleString()}`);
    return response.data;
  }

  async getRecentEvents(minutes = 5) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const now = new Date();
    const timeMin = new Date(now.getTime() - minutes * 60 * 1000);

    const response = await this.calendar.events.list({
      calendarId,
      updatedMin: timeMin.toISOString(),
      singleEvents: true,
      orderBy: 'updated',
      maxResults: 5,
    });

    const events = response.data.items || [];
    return events.filter(event => event.status !== 'cancelled');
  }

  async getEvent(eventId) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const response = await this.calendar.events.get({ calendarId, eventId });
    return response.data;
  }

  formatEvent(event) {
    const timezone = process.env.TIMEZONE || 'Africa/Algiers';
    const startDate = new Date(event.start.dateTime || event.start.date);
    const endDate = new Date(event.end.dateTime || event.end.date);

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone };
    const timeOptions = { hour: '2-digit', minute: '2-digit', timeZone: timezone };

    return {
      id: event.id,
      titre: event.summary || 'Sans titre',
      description: event.description || '',
      date: startDate.toLocaleDateString('fr-FR', dateOptions),
      heureDebut: startDate.toLocaleTimeString('fr-FR', timeOptions),
      heureFin: endDate.toLocaleTimeString('fr-FR', timeOptions),
      lieu: event.location || 'Non spécifié',
      clientNom: this._extractClientName(event),
      clientTelephone: this._extractClientPhone(event),
      status: event.status,
    };
  }

  _extractClientName(event) {
    if (event.summary) {
      const match = event.summary.match(/(?:RDV|Rendez-vous|Réservation)\s*[-:]\s*(.+)/i);
      if (match) return match[1].trim();
    }
    if (event.attendees && event.attendees.length > 0) {
      const client = event.attendees.find(a => !a.organizer);
      if (client) return client.displayName || client.email;
    }
    return event.summary || 'Client';
  }

  _extractClientPhone(event) {
    if (!event.description) return null;
    const phoneMatch = event.description.match(
      /(?:tel|téléphone|phone|mobile|whatsapp)\s*[:=]\s*([+\d\s-]+)/i
    );
    if (phoneMatch) return phoneMatch[1].replace(/[\s-]/g, '').trim();
    return null;
  }
}

module.exports = GoogleCalendarService;
