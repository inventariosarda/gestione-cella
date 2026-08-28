const { setGlobalOptions } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { logger } = require("firebase-functions");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

setGlobalOptions({
  maxInstances: 10,
  region: "europe-west1"
});

exports.inviaNotificaMovimento = onDocumentCreated(
  "eventi/{eventoId}",
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      logger.warn("Evento senza dati");
      return;
    }

    const evento = snapshot.data();

    // Invia notifiche SOLO per ENTRATA e USCITA
    if (evento.tipo !== "ENTRATA" && evento.tipo !== "USCITA") {
      logger.info(`Evento ignorato: ${evento.tipo}`);
      return;
    }

    logger.info("Nuovo movimento", evento);

    // Recupera tutti i dispositivi registrati
    const dispositiviSnapshot = await db.collection("dispositivi").get();

    if (dispositiviSnapshot.empty) {
      logger.info("Nessun dispositivo registrato per le notifiche");
      return;
    }

    const tokens = [];

    dispositiviSnapshot.forEach((doc) => {
      const dati = doc.data();

      if (dati.token) {
        tokens.push(dati.token);
      }
    });

    if (tokens.length === 0) {
      logger.info("Nessun token FCM disponibile");
      return;
    }

    const emoji = evento.tipo === "ENTRATA" ? "📥" : "📤";
    const tipoTesto = evento.tipo === "ENTRATA" ? "ENTRATA" : "USCITA";

    const title = `${emoji} ${tipoTesto} - Gestione Pedane`;

    const body =
      `${evento.nomeProdotto || "Prodotto"} · ` +
      `${evento.quantita || 0} pedane · ` +
      `Lotto ${evento.lotto || "-"}`;

    const message = {
      notification: {
        title,
        body
      },
      data: {
        tipo: String(evento.tipo || ""),
        idProdotto: String(evento.idProdotto || ""),
        nomeProdotto: String(evento.nomeProdotto || ""),
        lotto: String(evento.lotto || ""),
        quantita: String(evento.quantita || ""),
        eventoId: String(event.params.eventoId || "")
      },
      webpush: {
        fcmOptions: {
          link: "https://inventariosarda.github.io/gestione-cella/"
        }
      },
      tokens
    };

    const response = await messaging.sendEachForMulticast(message);

    logger.info(
      `Notifiche inviate: ${response.successCount}, ` +
      `fallite: ${response.failureCount}`
    );

    // Rimuove automaticamente i token non più validi
    if (response.failureCount > 0) {
      const eliminazioni = [];

      response.responses.forEach((result, index) => {
        if (!result.success) {
          const errorCode = result.error?.code || "";

          if (
            errorCode.includes("registration-token-not-registered") ||
            errorCode.includes("invalid-registration-token")
          ) {
            const token = tokens[index];

            eliminazioni.push(
              db.collection("dispositivi").doc(token).delete()
            );
          }
        }
      });

      await Promise.all(eliminazioni);
    }
  }
);