importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyB0daUTnfyhdyWPpkmFoPcyAguyZq63NE0",
    authDomain: "gestionepedane.firebaseapp.com",
    projectId: "gestionepedane",
    storageBucket: "gestionepedane.firebasestorage.app",
    messagingSenderId: "865581696674",
    appId: "1:865581696674:web:876ac3f6c5b34e1ccd39fb"
});

const messaging = firebase.messaging();

// I messaggi che contengono un payload "notification" vengono visualizzati
// automaticamente dal browser quando la pagina è in background/chiusa.
// Non chiamiamo showNotification qui per evitare notifiche duplicate.
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Notifica in background:', payload);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification?.data?.click_action ||
        event.notification?.data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    if (targetUrl && 'navigate' in client) {
                        client.navigate(targetUrl).catch(() => {});
                    }
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
