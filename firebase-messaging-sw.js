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

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Notifica in background:', payload);
    
    const title = payload.notification?.title || 'Nuova Notifica';
    const options = {
        body: payload.notification?.body || '',
        icon: '/gestione-cella/icon.png',
        vibrate: [200, 100, 200],
        data: payload.data
    };

    self.registration.showNotification(title, options);
});
