GESTIONE PEDANE - NOTIFICHE PUSH FCM

FILE PREPARATI
1) index-notifiche.html
   Versione dell'app con ricezione FCM in primo piano (onMessage).

2) firebase-messaging-sw.js
   Service Worker per FCM. In background/chiusa il payload notification viene mostrato dal browser.

3) functions/index.js
   Cloud Function che ascolta Firestore: eventi/{eventoId}.
   Invia notifiche solo per ENTRATA e USCITA a tutti i token nella raccolta dispositivi.

4) functions/package.json
   Dipendenze Firebase Functions/Admin.

CONFIGURAZIONE DA FARE UNA SOLA VOLTA

A. Copiare firebase-messaging-sw.js nella stessa cartella pubblicata di index.html.

B. Copiare la cartella functions nella root del progetto Firebase.

C. Impostare l'URL reale della web app nella Cloud Function.
   Nel file functions/index.js sostituire:
   https://inventariosarda.github.io/gestione-cella/
   con l'URL reale dell'app.

D. Dalla cartella functions eseguire:
   npm install

E. Dalla root del progetto Firebase:
   firebase login
   firebase use gestionepedane
   firebase deploy --only functions

Se il progetto Firebase non è ancora inizializzato localmente:
   firebase init functions
   scegliere il progetto gestionepedane e JavaScript.

IMPORTANTE
- Il sito deve essere HTTPS per FCM Web.
- Sul telefono bisogna premere Setup > Attiva Notifiche Push e consentire le notifiche.
- Il token verrà salvato in Firestore /dispositivi.
- Ogni nuovo documento in /eventi con tipo ENTRATA o USCITA genera una notifica.
- INVENTARIO e SETUP non generano notifiche.
- La logica di movimentazione dell'app non è stata modificata.
