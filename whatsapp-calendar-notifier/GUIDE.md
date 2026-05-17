# 📱 Guide - WhatsApp Calendar Notifier

## Résumé

```
Client prend RDV → Google Calendar → Cloud Function (gratuit) → WhatsApp groupe + client
```

## Coût : 0€/mois ✅

---

## Étape 1 : Google Cloud (5 min)

1. Créez un projet sur [Google Cloud Console](https://console.cloud.google.com/)
2. Activez **Google Calendar API** + **Cloud Functions API**
3. Créez un **Service Account** → téléchargez le fichier JSON → renommez en `credentials.json`
4. Partagez votre agenda Google avec l'email du service account (permission : "Afficher les détails")

## Étape 2 : WhatsApp Business API (10 min)

1. Créez une app sur [Meta for Developers](https://developers.facebook.com/)
2. Ajoutez le produit **WhatsApp**
3. Récupérez votre **Token d'accès** et **Phone Number ID**
4. Vérifiez les numéros destinataires (OTP)

## Étape 3 : Configuration

```bash
cd whatsapp-calendar-notifier
npm install
cp .env.example .env
# Éditez .env avec vos vraies valeurs
```

Ajoutez les numéros de votre équipe dans `src/index.js` :
```javascript
const GROUP_MEMBERS = [
  '213555111111', // Vous
  '213555222222', // Collègue
];
```

## Étape 4 : Déploiement (2 min)

```bash
gcloud auth login
gcloud config set project VOTRE_PROJECT_ID
npm run deploy
```

## Étape 5 : Activer le watch

```bash
npm run setup-watch
```

## Format des événements Calendar

**Titre :** `RDV - Nom du Client`

**Description :**
```
Tel: 0555123456
Service: Consultation
```

## Renouvellement (tous les 7 jours)

```bash
npm run setup-watch
```
Ou configurez un Cloud Scheduler pour automatiser.

## Test local

```bash
npm start
# Dans un autre terminal : ngrok http 8080
```

## Dépannage

- Logs : `gcloud functions logs read calendarWebhook --limit 50`
- Erreur 401 WhatsApp → Token expiré, regénérez-le
- Pas de notification → Vérifiez que le watch est actif
