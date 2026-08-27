importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyB0daUTnfyhdyWPpkmFoPcyAguyZq63NE0",[cite: 1]
    authDomain: "gestionepedane.firebaseapp.com",[cite: 1]
    projectId: "gestionepedane",[cite: 1]
    storageBucket: "gestionepedane.firebasestorage.app",[cite: 1]
    messagingSenderId: "865581696674",[cite: 1]
    appId: "1:865581696674:web:876ac3f6c5b34e1ccd39fb"[cite: 1]
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = payload.notification.title;
    const options = {
        body: payload.notification.body,
        icon: '/icon.png',
        vibrate: [200, 100, 200],
        data: payload.data
    };

    self.registration.showNotification(title, options);
});