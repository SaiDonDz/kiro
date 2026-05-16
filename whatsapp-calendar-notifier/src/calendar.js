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

  /**
   * Initialise la connexion à Google Calendar avec un Service Account
   */
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

  /**
   * Configure le push notification (watch) sur le calendrier
   * Google enverra un POST à votre webhook quand un événement change
   */
  async setupWatch() {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const webhookUrl = process.env.WEBHOOK_URL;
    const channelId = `calendar-watch-${Date.now()}`;

    try {
      const response = await this.calendar.events.watch({
        calendarId: calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          // Le watch expire après 7 jours max, il faudra le renouveler
          params: {
            ttl: '604800', // 7 jours en secondes
          },
        },
      });

      this.channelId = channelId;
      console.log('✅ Watch configuré sur Google Calendar');
      console.log(`   Channel ID: ${channelId}`);
      console.log(`   Expiration: ${new Date(parseInt(response.data.expiration)).toLocaleString()}`);

      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la configuration du watch:', error.message);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un événement récemment créé/modifié
   * Appelé quand le webhook reçoit une notification
   */
  async getRecentEvents(minutes = 5) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const now = new Date();
    const timeMin = new Date(now.getTime() - minutes * 60 * 1000);

    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        updatedMin: timeMin.toISOString(),
        singleEvents: true,
        orderBy: 'updated',
        maxResults: 5,
      });

      const events = response.data.items || [];
      return events.filter(event => event.status !== 'cancelled');
    } catch (error) {
      console.error('❌ Erreur récupération événements:', error.message);
      throw error;
    }
  }

  /**
   * Récupère un événement spécifique par son ID
   */
  async getEvent(eventId) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    try {
      const response = await this.calendar.events.get({
        calendarId: calendarId,
        eventId: eventId,
      });

      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération événement:', error.message);
      throw error;
    }
  }

  /**
   * Formate un événement Google Calendar en objet lisible
   */
  formatEvent(event) {
    const timezone = process.env.TIMEZONE || 'Africa/Algiers';

    const startDate = new Date(event.start.dateTime || event.start.date);
    const endDate = new Date(event.end.dateTime || event.end.date);

    // Formatage de la date en français
    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone,
    };

    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    };

    return {
      id: event.id,
      titre: event.summary || 'Sans titre',
      description: event.description || '',
      date: startDate.toLocaleDateString('fr-FR', dateOptions),
      heureDebut: startDate.toLocaleTimeString('fr-FR', timeOptions),
      heureFin: endDate.toLocaleTimeString('fr-FR', timeOptions),
      lieu: event.location || 'Non spécifié',
      organisateur: event.organizer ? event.organizer.email : '',
      participants: (event.attendees || []).map(a => ({
        email: a.email,
        nom: a.displayName || a.email,
        statut: a.responseStatus,
      })),
      clientNom: this._extractClientName(event),
      clientTelephone: this._extractClientPhone(event),
      status: event.status,
      created: event.created,
      updated: event.updated,
    };
  }

  /**
   * Extrait le nom du client depuis l'événement
   * Cherche dans le titre, la description, ou les participants
   */
  _extractClientName(event) {
    // Chercher dans le titre (format courant : "RDV - Nom Client")
    if (event.summary) {
      const match = event.summary.match(/(?:RDV|Rendez-vous|Réservation)\s*[-:]\s*(.+)/i);
      if (match) return match[1].trim();
    }

    // Sinon, premier participant qui n'est pas l'organisateur
    if (event.attendees && event.attendees.length > 0) {
      const client = event.attendees.find(a => !a.organizer);
      if (client) return client.displayName || client.email;
    }

    return event.summary || 'Client';
  }

  /**
   * Extrait le téléphone du client depuis la description de l'événement
   * Format attendu dans la description : "Tel: 0XXXXXXXXX" ou "Phone: +213XXXXXXXXX"
   */
  _extractClientPhone(event) {
    if (!event.description) return null;

    const phoneMatch = event.description.match(
      /(?:tel|téléphone|phone|mobile|whatsapp)\s*[:=]\s*([+\d\s-]+)/i
    );

    if (phoneMatch) {
      // Nettoyer le numéro
      return phoneMatch[1].replace(/[\s-]/g, '').trim();
    }

    return null;
  }
}

module.exports = GoogleCalendarService;
