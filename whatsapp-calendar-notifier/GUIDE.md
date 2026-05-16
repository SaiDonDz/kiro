# 📱 Guide de Configuration - WhatsApp Calendar Notifier

Ce guide vous accompagne étape par étape pour configurer et déployer le système de notification WhatsApp automatique depuis Google Calendar.

---

## 📋 Résumé du fonctionnement

```
Client prend RDV sur votre site
        ↓
Google Calendar (RDV créé automatiquement)
        ↓
Google Cloud Function (webhook gratuit)
        ↓
WhatsApp Business API
        ↓
📱 Message au groupe : "Nouveau RDV : Ahmed - Lundi 19 Mai à 14h00"
📱 Message au client : "Votre RDV est confirmé..."
```

---

## 🛠️ Prérequis

- Un compte Google (Gmail) avec Google Calendar
- Un compte [Google Cloud](https://console.cloud.google.com/) (gratuit)
- Un compte [Meta for Developers](https://developers.facebook.com/) (gratuit)
- Un numéro WhatsApp Business
- Node.js 18+ installé sur votre machine (pour les tests)

---

## Étape 1 : Configuration Google Cloud

### 1.1 Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Cliquez sur "Nouveau projet"
3. Nommez-le (ex: `whatsapp-calendar-notifier`)
4. Cliquez sur "Créer"

### 1.2 Activer les APIs nécessaires

1. Dans le menu, allez à **APIs & Services > Bibliothèque**
2. Recherchez et activez :
   - **Google Calendar API**
   - **Cloud Functions API**
   - **Cloud Build API**

### 1.3 Créer un Service Account

1. Allez à **APIs & Services > Identifiants**
2. Cliquez **"Créer des identifiants" > "Compte de service"**
3. Nommez-le `calendar-reader`
4. Rôle : **Lecteur** (ou aucun rôle nécessaire pour Calendar)
5. Cliquez **"Terminé"**
6. Cliquez sur le compte de service créé
7. Onglet **"Clés" > "Ajouter une clé" > "JSON"**
8. **Téléchargez le fichier JSON** → renommez-le `credentials.json`
9. Placez-le à la racine du projet

### 1.4 Partager votre agenda avec le Service Account

1. Ouvrez [Google Calendar](https://calendar.google.com/)
2. Cliquez sur les 3 points à côté de votre agenda > **"Paramètres et partage"**
3. Section **"Partager avec des personnes spécifiques"**
4. Ajoutez l'email du service account (format: `calendar-reader@votre-projet.iam.gserviceaccount.com`)
5. Permission : **"Afficher tous les détails des événements"**
6. Sauvegardez

### 1.5 Récupérer l'ID de votre calendrier

1. Dans les paramètres de votre agenda
2. Section **"Intégrer l'agenda"**
3. Copiez l'**"ID de l'agenda"** (c'est souvent votre email Gmail)

---

## Étape 2 : Configuration WhatsApp Business API

### 2.1 Créer une application Meta

1. Allez sur [Meta for Developers](https://developers.facebook.com/)
2. Cliquez **"Créer une application"**
3. Type : **"Business"**
4. Ajoutez le produit **"WhatsApp"**

### 2.2 Configurer WhatsApp

1. Dans le dashboard de votre app, section **WhatsApp > Démarrage rapide**
2. Vous verrez :
   - **Token d'accès temporaire** (pour les tests)
   - **Phone Number ID** (identifiant de votre numéro)
3. Pour un **token permanent** :
   - Allez dans **Paramètres de l'app > Paramètres de base**
   - Créez un **token d'accès système** dans [Business Settings](https://business.facebook.com/settings/)
   - Permissions nécessaires : `whatsapp_business_messaging`

### 2.3 Ajouter des numéros de test

1. Section **WhatsApp > Configuration de l'API**
2. Ajoutez les numéros de téléphone qui recevront les messages
3. Chaque numéro doit confirmer par un code OTP la première fois

> ⚠️ **En mode test**, vous ne pouvez envoyer qu'aux numéros vérifiés. Pour la production, vous devez passer la vérification Business de Meta.

### 2.4 Format des numéros

Les numéros doivent être au format international **sans le +** :
- Algérie : `213XXXXXXXXX` (remplacez le 0 initial par 213)
- France : `33XXXXXXXXX`
- Exemple : `0555123456` → `213555123456`

---

## Étape 3 : Configuration du projet

### 3.1 Installer les dépendances

```bash
cd whatsapp-calendar-notifier
npm install
```

### 3.2 Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos vraies valeurs :

```env
GOOGLE_CALENDAR_ID=votre-email@gmail.com
GOOGLE_CREDENTIALS_PATH=./credentials.json
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxx...
WHATSAPP_PHONE_NUMBER_ID=1234567890
WEBHOOK_VERIFY_TOKEN=mon_token_secret_123
TIMEZONE=Africa/Algiers
MESSAGE_LANG=fr
```

### 3.3 Configurer les membres du groupe

Ouvrez `src/index.js` et ajoutez les numéros de votre équipe :

```javascript
const GROUP_MEMBERS = [
  '213555111111', // Vous
  '213555222222', // Collègue 1
  '213555333333', // Collègue 2
];
```

---

## Étape 4 : Déploiement sur Google Cloud Functions

### 4.1 Installer Google Cloud CLI

```bash
# Linux/Mac
curl -sSL https://sdk.cloud.google.com | bash

# Ou téléchargez depuis : https://cloud.google.com/sdk/docs/install
```

### 4.2 Se connecter et configurer

```bash
gcloud auth login
gcloud config set project VOTRE_PROJECT_ID
```

### 4.3 Déployer la fonction

```bash
npm run deploy
```

Ou manuellement :

```bash
gcloud functions deploy calendarWebhook \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point calendarWebhook \
  --source . \
  --set-env-vars GOOGLE_CALENDAR_ID=votre-email@gmail.com,WHATSAPP_ACCESS_TOKEN=votre_token,WHATSAPP_PHONE_NUMBER_ID=votre_id,TIMEZONE=Africa/Algiers,MESSAGE_LANG=fr \
  --region europe-west1
```

### 4.4 Récupérer l'URL du webhook

Après déploiement, Google affiche l'URL :
```
https://europe-west1-votre-projet.cloudfunctions.net/calendarWebhook
```

Ajoutez cette URL dans votre `.env` :
```env
WEBHOOK_URL=https://europe-west1-votre-projet.cloudfunctions.net/calendarWebhook
```

### 4.5 Activer le Watch Google Calendar

```bash
npm run setup-watch
```

Cela dit à Google Calendar d'envoyer des notifications à votre webhook quand un événement est créé/modifié.

---

## Étape 5 : Test local (optionnel)

### 5.1 Tester en local avec ngrok

```bash
# Terminal 1 : Démarrer le serveur
npm start

# Terminal 2 : Exposer avec ngrok (installer depuis https://ngrok.com/)
ngrok http 8080
```

Utilisez l'URL ngrok comme `WEBHOOK_URL` pour tester.

### 5.2 Test rapide de WhatsApp

Vous pouvez tester l'envoi WhatsApp seul en créant un fichier `test.js` :

```javascript
require('dotenv').config();
const WhatsAppService = require('./src/whatsapp');

async function test() {
  const wa = new WhatsAppService();
  wa.validateConfig();

  await wa.sendMessage('213VOTRE_NUMERO', '✅ Test réussi ! Le bot fonctionne.');
}

test();
```

```bash
node test.js
```

---

## 📝 Format des événements dans Google Calendar

Pour que le système détecte le nom et le téléphone du client, utilisez ces formats dans vos événements :

### Titre de l'événement :
```
RDV - Nom du Client
```
ou
```
Réservation - Nom du Client
```

### Description de l'événement :
```
Tel: 0555123456
Service: Consultation
Note: Premier rendez-vous
```

Le système cherche automatiquement le numéro avec les mots-clés : `tel`, `téléphone`, `phone`, `mobile`, `whatsapp`

---

## 🔄 Renouvellement automatique du Watch

Le watch Google Calendar expire après **7 jours**. Pour le renouveler automatiquement :

### Option 1 : Google Cloud Scheduler (recommandé)

```bash
gcloud scheduler jobs create http renew-calendar-watch \
  --schedule="0 0 */6 * *" \
  --uri="https://europe-west1-votre-projet.cloudfunctions.net/calendarWebhook" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"action":"renew-watch"}'
```

### Option 2 : Cron job sur votre serveur

```bash
# Tous les 6 jours
0 0 */6 * * cd /path/to/project && node src/setup-watch.js
```

---

## 💰 Coûts estimés

| Service | Coût | Votre usage estimé |
|---------|------|--------------------|
| Google Cloud Functions | 2M appels/mois gratuits | ~100 appels/mois |
| Google Calendar API | Gratuit | Gratuit |
| WhatsApp Business API | 1000 messages/mois gratuits | ~200 messages/mois |
| **Total** | **0 €/mois** | ✅ Gratuit |

---

## 🐛 Dépannage

### Le webhook ne reçoit rien
- Vérifiez que l'URL est en HTTPS
- Vérifiez les logs : `gcloud functions logs read calendarWebhook`
- Assurez-vous que le watch est actif : `npm run setup-watch`

### WhatsApp retourne une erreur 401
- Votre token a expiré → Regénérez un token permanent
- Vérifiez que le numéro destinataire est vérifié en mode test

### Les messages ne sont pas envoyés au groupe
- Vérifiez que les numéros sont au bon format (sans +, sans espaces)
- Vérifiez que chaque numéro a accepté la vérification OTP

### Notifications en double
- Le système inclut un cache de 10 minutes pour éviter les doublons
- Si le problème persiste, vérifiez qu'un seul watch est actif

---

## 📁 Structure du projet

```
whatsapp-calendar-notifier/
├── src/
│   ├── index.js          # Point d'entrée (Cloud Function)
│   ├── calendar.js       # Module Google Calendar
│   ├── whatsapp.js       # Module WhatsApp Business API
│   ├── config.js         # Configuration centralisée
│   └── setup-watch.js    # Script de configuration du watch
├── .env.example          # Template des variables d'environnement
├── .env                  # Vos vraies variables (NON commité)
├── credentials.json      # Clé du Service Account (NON commité)
├── package.json          # Dépendances Node.js
├── .gitignore            # Fichiers exclus de git
└── GUIDE.md              # Ce guide
```

---

## 🚀 Résumé des commandes

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Éditez .env avec vos valeurs

# Test local
npm start

# Déploiement
npm run deploy

# Activer les notifications Calendar
npm run setup-watch

# Voir les logs en production
gcloud functions logs read calendarWebhook --limit 50
```

---

**Besoin d'aide ?** N'hésitez pas à ouvrir une issue sur le repo ! 🙌
