const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

// URL della web app. Impostala con:
// firebase functions:config:set app.url="https://TUO-SITO"
// oppure, per Functions v2, usa l'env APP_URL durante il deploy.
const APP_URL = process.env.APP_URL || 'https://inventariosarda.github.io/gestione-cella/';

exports.inviaNotificaMovimento = onDocumentCreated('eventi/{eventoId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  // Notifichiamo soltanto entrate e uscite.
  if (data.tipo !== 'ENTRATA' && data.tipo !== 'USCITA') return;

  const tipo = data.tipo === 'ENTRATA' ? '📥 ENTRATA' : '📤 USCITA';
  const operatore = data.operatore ? ` — ${data.operatore}` : '';
  const prodotto = data.nomeProdotto || 'Prodotto';
  const lotto = data.lotto ? ` — Lotto ${data.lotto}` : '';
  const quantita = Number(data.quantita || 0);

  const title = `${tipo}: ${prodotto}`;
  const body = `${quantita} pedan${quantita === 1 ? 'a' : 'e'}${lotto}${operatore}`;

  const snapshot = await admin.firestore().collection('dispositivi').get();
  if (snapshot.empty) {
    logger.info('Nessun dispositivo registrato per le notifiche.');
    return;
  }

  const tokens = [];
  snapshot.forEach((doc) => {
    const token = doc.data()?.token || doc.id;
    if (token) tokens.push({ token, ref: doc.ref });
  });

  // FCM multicast supporta max 500 token per chiamata.
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: chunk.map(x => x.token),
      notification: {
        title,
        body
      },
      data: {
        eventoId: event.params.eventoId,
        tipo: String(data.tipo),
        nomeProdotto: String(prodotto),
        quantita: String(quantita),
        lotto: String(data.lotto || ''),
        operatore: String(data.operatore || ''),
        link: APP_URL
      },
      webpush: {
        fcmOptions: {
          link: APP_URL
        },
        notification: {
          title,
          body,
          icon: `${APP_URL.replace(/\/$/, '')}/icon.png`,
          tag: `movimento-${event.params.eventoId}`
        }
      }
    });

    sent += response.successCount;
    failed += response.failureCount;

    // Elimina token non più validi, così la lista resta pulita.
    for (let i = 0; i < response.responses.length; i++) {
      const result = response.responses[i];
      if (!result.success) {
        const code = result.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
          await chunk[i].ref.delete().catch(() => {});
        }
      }
    }
  }

  logger.info('Notifica movimento inviata', {
    eventoId: event.params.eventoId,
    tipo: data.tipo,
    prodotto,
    sent,
    failed
  });
});
