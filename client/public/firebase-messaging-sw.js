// client/public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// 👇 אותם פרטים בדיוק כמו בקובץ הקודם
firebase.initializeApp({
  apiKey: "AIzaSyAbLtkOZBzzXFfok94VpZphrt6DkoFDOZ4",
  authDomain: "opsmanager-app.firebaseapp.com",
  projectId: "opsmanager-app",
  storageBucket: "opsmanager-app.firebasestorage.app",
  messagingSenderId: "148365621148",
  appId: "1:148365621148:web:d44062b67e48df2d0a7a59",
  measurementId: "G-6XXN9E6XZY"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('התקבלה הודעה ברקע:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' // וודאי שיש לך תמונה כזו בתיקיית public, או ששימי שם של תמונה אחרת
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});