/**
 * Module WhatsApp Business API
 * Gère l'envoi de messages via l'API Meta (WhatsApp Cloud API)
 */

const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.apiUrl = 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.groupId = process.env.WHATSAPP_GROUP_ID;
  }

  /**
   * Vérifie que la configuration WhatsApp est correcte
   */
  validateConfig() {
    if (!this.accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN manquant dans .env');
    }
    if (!this.phoneNumberId) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID manquant dans .env');
    }
    console.log('✅ WhatsApp Business API configuré');
  }

  /**
   * Envoie un message texte à un numéro WhatsApp
   * @param {string} to - Numéro de téléphone (format international sans +, ex: 213XXXXXXXXX)
   * @param {string} message - Le message à envoyer
   */
  async sendMessage(to, message) {
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ Message envoyé à ${to}`);
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message;
      console.error(`❌ Erreur envoi WhatsApp à ${to}:`, errMsg);
      throw error;
    }
  }

  /**
   * Envoie une notification au groupe WhatsApp (via liste de numéros)
   * Note: L'API WhatsApp Business ne supporte pas directement les groupes.
   * On envoie à chaque membre du groupe individuellement.
   * 
   * Alternative : utiliser un numéro dédié au groupe et envoyer le message
   * à tous les membres configurés.
   * 
   * @param {string[]} groupMembers - Liste des numéros du groupe
   * @param {string} message - Le message à envoyer
   */
  async sendToGroup(groupMembers, message) {
    const results = [];

    for (const member of groupMembers) {
      try {
        const result = await this.sendMessage(member, message);
        results.push({ number: member, success: true, data: result });
      } catch (error) {
        results.push({ number: member, success: false, error: error.message });
      }

      // Petit délai entre les envois pour respecter les limites de l'API
      await this._delay(500);
    }

    const successful = results.filter(r => r.success).length;
    console.log(`📊 Groupe notifié: ${successful}/${groupMembers.length} messages envoyés`);

    return results;
  }

  /**
   * Envoie une notification de nouveau RDV au groupe
   * @param {string[]} groupMembers - Numéros des membres du groupe
   * @param {object} eventData - Données formatées de l'événement
   */
  async notifyNewAppointment(groupMembers, eventData) {
    const message = this._buildAppointmentMessage(eventData);

    console.log(`📱 Envoi notification RDV au groupe (${groupMembers.length} membres)...`);
    return await this.sendToGroup(groupMembers, message);
  }

  /**
   * Envoie une confirmation de RDV directement au client
   * @param {string} clientPhone - Numéro du client
   * @param {object} eventData - Données formatées de l'événement
   */
  async sendClientConfirmation(clientPhone, eventData) {
    if (!clientPhone) {
      console.log('⚠️  Pas de numéro client trouvé, confirmation non envoyée');
      return null;
    }

    const message = this._buildClientConfirmationMessage(eventData);

    console.log(`📱 Envoi confirmation au client: ${clientPhone}`);
    return await this.sendMessage(clientPhone, message);
  }

  /**
   * Construit le message de notification pour le groupe
   */
  _buildAppointmentMessage(eventData) {
    const lang = process.env.MESSAGE_LANG || 'fr';

    if (lang === 'fr') {
      return [
        '📅 *Nouveau rendez-vous confirmé !*',
        '',
        `👤 Client : ${eventData.clientNom}`,
        `📆 Date : ${eventData.date}`,
        `🕐 Heure : ${eventData.heureDebut} - ${eventData.heureFin}`,
        eventData.lieu !== 'Non spécifié' ? `📍 Lieu : ${eventData.lieu}` : '',
        eventData.description ? `📝 Note : ${eventData.description}` : '',
        '',
        '✅ Ce créneau est maintenant réservé.',
      ].filter(line => line !== '').join('\n');
    }

    if (lang === 'ar') {
      return [
        '📅 *موعد جديد مؤكد!*',
        '',
        `👤 الزبون : ${eventData.clientNom}`,
        `📆 التاريخ : ${eventData.date}`,
        `🕐 الوقت : ${eventData.heureDebut} - ${eventData.heureFin}`,
        eventData.lieu !== 'Non spécifié' ? `📍 المكان : ${eventData.lieu}` : '',
        '',
        '✅ هذا الوقت محجوز الآن.',
      ].filter(line => line !== '').join('\n');
    }

    // English
    return [
      '📅 *New appointment confirmed!*',
      '',
      `👤 Client: ${eventData.clientNom}`,
      `📆 Date: ${eventData.date}`,
      `🕐 Time: ${eventData.heureDebut} - ${eventData.heureFin}`,
      eventData.lieu !== 'Non spécifié' ? `📍 Location: ${eventData.lieu}` : '',
      '',
      '✅ This slot is now booked.',
    ].filter(line => line !== '').join('\n');
  }

  /**
   * Construit le message de confirmation pour le client
   */
  _buildClientConfirmationMessage(eventData) {
    const lang = process.env.MESSAGE_LANG || 'fr';

    if (lang === 'fr') {
      return [
        `Bonjour ${eventData.clientNom} 👋`,
        '',
        'Votre rendez-vous est confirmé :',
        '',
        `📆 ${eventData.date}`,
        `🕐 ${eventData.heureDebut} - ${eventData.heureFin}`,
        eventData.lieu !== 'Non spécifié' ? `📍 ${eventData.lieu}` : '',
        '',
        'À bientôt ! 😊',
        '',
        '---',
        '_Si vous souhaitez annuler ou modifier, merci de nous contacter._',
      ].filter(line => line !== '').join('\n');
    }

    if (lang === 'ar') {
      return [
        `مرحبا ${eventData.clientNom} 👋`,
        '',
        'تم تأكيد موعدك:',
        '',
        `📆 ${eventData.date}`,
        `🕐 ${eventData.heureDebut} - ${eventData.heureFin}`,
        eventData.lieu !== 'Non spécifié' ? `📍 ${eventData.lieu}` : '',
        '',
        '!نراك قريبا 😊',
        '',
        '---',
        '_إذا كنت ترغب في الإلغاء أو التعديل، يرجى الاتصال بنا._',
      ].filter(line => line !== '').join('\n');
    }

    return [
      `Hello ${eventData.clientNom} 👋`,
      '',
      'Your appointment is confirmed:',
      '',
      `📆 ${eventData.date}`,
      `🕐 ${eventData.heureDebut} - ${eventData.heureFin}`,
      eventData.lieu !== 'Non spécifié' ? `📍 ${eventData.lieu}` : '',
      '',
      'See you soon! 😊',
      '',
      '---',
      '_If you wish to cancel or reschedule, please contact us._',
    ].filter(line => line !== '').join('\n');
  }

  /**
   * Délai utilitaire
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WhatsAppService;
