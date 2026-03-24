// client/src/firebase.js

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// 👇 כאן תדביקי את הנתונים שהעתקת בשלב 6 למעלה (מהריבוע השחור ב-Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyAbLtkOZBzzXFfok94VpZphrt6DkoFDOZ4",
  authDomain: "opsmanager-app.firebaseapp.com",
  projectId: "opsmanager-app",
  storageBucket: "opsmanager-app.firebasestorage.app",
  messagingSenderId: "148365621148",
  appId: "1:148365621148:web:d44062b67e48df2d0a7a59",
  measurementId: "G-6XXN9E6XZY"
};

// אתחול Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// פונקציה שמבקשת אישור מהמשתמש ומחזירה טוקן
export const requestForToken = async (userId, token) => {
  try {
    // 1. בקשת אישור מהדפדפן לקפוץ התראות
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // 2. אם המשתמש אישר, אנחנו מבקשים את הטוקן מגוגל
      const currentToken = await getToken(messaging, {
        // 👇 כאן תדביקי את המפתח הארוך (Vapid Key) שהעתקת בשלב 8
        vapidKey: 'BEz0n_8xxy4RYpfG7p2mZaG2p1ejBVVEbsb9UroZN9w-XyXWpVdmN9eAs0iIsFv4TNAQt62emV4h2ZsplHtuNDw'
      });
      
      if (currentToken) {
        console.log('Got Device Token:', currentToken);
        
        // 3. שליחת הטוקן לשרת שלך כדי לשמור אותו במסד הנתונים
        await fetch('https://maintenance-app-staging.onrender.com/users/device-token', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` // הטוקן של המשתמש הרגיל (לא של גוגל)
            },
            body: JSON.stringify({ device_token: currentToken })
        });
      } else {
        console.log('No registration token available.');
      }
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
  }
};

// פונקציה שמקשיבה להודעות כשהאתר פתוח
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });