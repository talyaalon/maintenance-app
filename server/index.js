const admin = require("firebase-admin");

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // שולפים את המפתח
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        // 👇 זו השורת קסם שמתקנת את הבעיה של גוגל ורנדר!
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("✅ Firebase initialized successfully (Render)");
    } else {
        const serviceAccount = require("./firebase-service-account.json");
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log("✅ Firebase initialized successfully (Local)");
    }
} catch (error) {
    console.log("⚠️ Firebase warning (Server is still running!):", error.message);
}

// Firestore reference for multi-tenant Company documents
let db = null;
try { db = admin.firestore(); } catch (e) { console.log("⚠️ Firestore unavailable:", e.message); }

const bcrypt = require('bcrypt');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const xlsx = require('xlsx');
const fs = require('fs');

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3001;
const SECRET_KEY = 'my_super_secret_key';
const APP_LINK = "https://air-manage-app.netlify.app/";

cloudinary.config({
  cloud_name: 'dojnc3j0r',
  api_key: '133411631835124',
  api_secret: '-7M6Z0dvS0fPFkQiEuWj66FWPXM'
});


// הגדרות העלאת קבצים
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'maintenance_app_files',
        resource_type: 'auto' // 🚀 חשוב! מאפשר גם תמונות, גם PDF, וגם ODF/אקסל
    }
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


// 🚀 הסרנו את החסימה הנוקשה (fileFilter) כדי שתוכלי להעלות ODF, אקסל, ומסמכים מכל סוג בחופשיות!
const upload = multer({ storage: storage });
// 👆 התיקון הגדול מסתיים כאן 👆

console.log("📧 Configuring Email using Brevo SMTP...");
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525, 
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('🔴 Still failing to connect:', error);
  } else {
    console.log('🟢 SUCCESS! Email server connected successfully.');
  }
});

// ==========================================
// 📱 LINE Messaging API Helper
// ==========================================
const sendLineMessage = async (lineUserId, text) => {
    if (!lineUserId || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return;
    const https = require('https');
    const textWithLink = `${text}\n\nView in App: ${APP_LINK}?openExternalBrowser=1`;
    const body = JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text: textWithLink }]
    });
    try {
        await new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.line.me',
                path: '/v2/bot/message/push',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN.trim()}`,
                    'Content-Length': Buffer.byteLength(body)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`📱 LINE message sent to ${lineUserId}`);
                    } else {
                        console.error(`⚠️ LINE API error (${res.statusCode}):`, data);
                    }
                    resolve();
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    } catch (err) {
        console.error('⚠️ LINE sendMessage failed:', err.message);
    }
};

// ==========================================
// 🔔 NotificationService — Core dispatcher
//    sendNotification(userId, channels[], type, data)
//    channels: ['email','line','push']
//    types: 'user_created' | 'user_updated' | 'tasks_assigned' | 'morning_briefing'
// ==========================================

const sendFcmPush = async (token, title, body, link = '/') => {
    if (!token) return;
    try {
        await admin.messaging().send({
            token,
            notification: { title, body },
            webpush: { fcmOptions: { link } }
        });
        console.log(`🔔 FCM push sent`);
    } catch (err) {
        console.error('⚠️ FCM send failed:', err.message);
    }
};

const buildTaskListLine = (tasks, lang) => {
    const urgL = { low: { he: 'נמוכה', en: 'Low', th: 'ต่ำ' }, medium: { he: 'בינונית', en: 'Medium', th: 'ปานกลาง' }, high: { he: 'גבוהה', en: 'High', th: 'สูง' } };
    return tasks.map((t, i) => {
        const urg = urgL[t.urgency]?.[lang] || t.urgency || '';
        const date = t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB') : '';
        return `${i + 1}. ${t.title}\n   📅 ${date}  ⚡ ${urg}`;
    }).join('\n');
};

const buildTaskTableHtml = (tasks, lang) => {
    const hdr = { he: ['#', 'משימה', 'תאריך', 'עדיפות'], en: ['#', 'Task', 'Date', 'Priority'], th: ['#', 'งาน', 'วันที่', 'ลำดับความสำคัญ'] };
    const urgL = { low: { he: 'נמוכה', en: 'Low', th: 'ต่ำ' }, medium: { he: 'בינונית', en: 'Medium', th: 'ปานกลาง' }, high: { he: 'גבוהה', en: 'High', th: 'สูง' } };
    const [h0, h1, h2, h3] = hdr[lang] || hdr.en;
    const rows = tasks.map((t, i) => {
        const date = t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB') : '';
        const urg = urgL[t.urgency]?.[lang] || t.urgency || '';
        const urgColor = t.urgency === 'high' ? '#991b1b' : (t.urgency === 'medium' ? '#92400e' : '#166534');
        const urgBg   = t.urgency === 'high' ? '#fee2e2' : (t.urgency === 'medium' ? '#fef3c7' : '#dcfce7');
        return `<tr>
            <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${i + 1}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:500;">${t.title}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${date}</td>
            <td style="padding:7px 8px;border-bottom:1px solid #e5e7eb;">
                <span style="background:${urgBg};color:${urgColor};padding:2px 8px;border-radius:10px;font-size:11px;">${urg}</span>
            </td></tr>`;
    }).join('');
    return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
        <tr style="background:#f3f4f6;">
            <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;">${h0}</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;">${h1}</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;">${h2}</th>
            <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;">${h3}</th>
        </tr>${rows}</table>`;
};

const NOTIF_T = {
    user_created: {
        he: {
            subj: '👋 פרטי חשבון - OpsManager',
            mgr_subj: '💼 חשבון מנהל נוצר - OpsManager',
            push_t: 'ברוך הבא! 👋',
            push_b: n => `שלום ${n}! חשבונך נוצר בהצלחה.`,
            line: (n, e, p) => `👋 שלום ${n}!\nחשבונך נוצר במערכת OpsManager.\n\n📧 אימייל: ${e}\n🔑 סיסמה: ${p}`,
        },
        en: {
            subj: '👋 Account Created - OpsManager',
            mgr_subj: '💼 Manager Account Created - OpsManager',
            push_t: 'Welcome! 👋',
            push_b: n => `Hello ${n}! Your account has been created.`,
            line: (n, e, p) => `👋 Hello ${n}!\nYour OpsManager account is ready.\n\n📧 Email: ${e}\n🔑 Password: ${p}`,
        },
        th: {
            subj: '👋 สร้างบัญชีแล้ว - OpsManager',
            mgr_subj: '💼 สร้างบัญชีผู้จัดการแล้ว - OpsManager',
            push_t: 'ยินดีต้อนรับ! 👋',
            push_b: n => `สวัสดี ${n}! บัญชีของคุณถูกสร้างเรียบร้อยแล้ว`,
            line: (n, e, p) => `👋 สวัสดี ${n}!\nบัญชี OpsManager ของคุณพร้อมแล้ว\n\n📧 อีเมล: ${e}\n🔑 รหัสผ่าน: ${p}`,
        },
    },
    user_updated: {
        he: { subj: '📝 פרטי חשבונך עודכנו - OpsManager', push_t: 'חשבון עודכן 📝', push_b: () => 'פרטי חשבונך עודכנו על ידי מנהל.', line: (n, c) => `📝 שלום ${n}!\nהפרטים הבאים עודכנו:\n${c}` },
        en: { subj: '📝 Your account has been updated - OpsManager', push_t: 'Account Updated 📝', push_b: () => 'Your account details were updated by an admin.', line: (n, c) => `📝 Hello ${n}!\nThe following was updated:\n${c}` },
        th: { subj: '📝 บัญชีของคุณได้รับการอัปเดต - OpsManager', push_t: 'อัปเดตบัญชี 📝', push_b: () => 'ข้อมูลบัญชีของคุณได้รับการอัปเดตโดยผู้ดูแลระบบ', line: (n, c) => `📝 สวัสดี ${n}!\nข้อมูลต่อไปนี้ได้รับการอัปเดต:\n${c}` },
    },
    tasks_assigned: {
        he: { subj: c => `📋 הוקצו לך ${c} משימות חדשות`, push_t: c => `${c} משימות חדשות! 📋`, push_b: c => `הוקצו לך ${c} משימות חדשות. היכנס לצפות.`, line: (n, c, list) => `📋 שלום ${n}!\nהוקצו לך ${c} משימות חדשות:\n\n${list}` },
        en: { subj: c => `📋 ${c} New Task(s) Assigned to You`, push_t: c => `${c} New Task(s)! 📋`, push_b: c => `You've been assigned ${c} new task(s). Tap to view.`, line: (n, c, list) => `📋 Hello ${n}!\nYou have ${c} new task(s) assigned:\n\n${list}` },
        th: { subj: c => `📋 คุณได้รับมอบหมาย ${c} งานใหม่`, push_t: c => `${c} งานใหม่! 📋`, push_b: c => `คุณได้รับมอบหมาย ${c} งานใหม่ แตะเพื่อดู`, line: (n, c, list) => `📋 สวัสดี ${n}!\nคุณได้รับมอบหมาย ${c} งานใหม่:\n\n${list}` },
    },
    morning_briefing: {
        he: { push_t: '☀️ בוקר טוב!', push_b: c => `יש לך ${c} משימות להיום.`, line: (n, c, list) => `☀️ בוקר טוב ${n}!\nיש לך ${c} משימות להיום:\n\n${list}`, none_push_t: '☀️ בוקר טוב!', none_push_b: () => 'אין לך משימות להיום 🏖️', none_line: n => `☀️ בוקר טוב ${n}! 🏖️\nאין לך משימות מתוכננות להיום.` },
        en: { push_t: '☀️ Good Morning!', push_b: c => `You have ${c} task(s) today.`, line: (n, c, list) => `☀️ Good morning ${n}!\nYou have ${c} task(s) today:\n\n${list}`, none_push_t: '☀️ Good Morning!', none_push_b: () => 'No tasks for today 🏖️', none_line: n => `☀️ Good morning ${n}! 🏖️\nNo tasks scheduled for today.` },
        th: { push_t: '☀️ อรุณสวัสดิ์!', push_b: c => `คุณมี ${c} งานวันนี้`, line: (n, c, list) => `☀️ อรุณสวัสดิ์ ${n}!\nคุณมี ${c} งานวันนี้:\n\n${list}`, none_push_t: '☀️ อรุณสวัสดิ์!', none_push_b: () => 'ไม่มีงานสำหรับวันนี้ 🏖️', none_line: n => `☀️ อรุณสวัสดิ์ ${n}! 🏖️\nไม่มีงานที่วางแผนไว้สำหรับวันนี้` },
    },
};

const notifEmailWrap = (dir, align, content) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:10px;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,.05);direction:${dir};text-align:${align};">
<div style="background:#714B67;padding:16px 20px;"><h2 style="margin:0;color:#fff;font-size:18px;">OpsManager</h2></div>
<div style="padding:20px;">${content}</div>
<div style="background:#f9fafb;padding:14px 20px;text-align:center;border-top:1px solid #e5e7eb;">
<a href="${APP_LINK}" style="background:#714B67;color:#fff;padding:10px 24px;text-decoration:none;border-radius:20px;font-size:13px;font-weight:bold;">
${dir === 'rtl' ? 'כניסה לאפליקציה' : (align === 'left' && dir !== 'rtl' ? 'Open App' : 'เปิดแอป')}</a></div>
</div></body></html>`;

const sendNotification = async (userId, channels, type, data = {}) => {
    try {
        const uRes = await pool.query(
            'SELECT id, full_name, email, line_user_id, device_token, preferred_language, role FROM users WHERE id = $1',
            [userId]
        );
        if (!uRes.rows.length) return;
        const u = uRes.rows[0];
        const lang = u.preferred_language || 'en';
        const T = NOTIF_T[type]?.[lang] || NOTIF_T[type]?.en;
        if (!T) return;
        const n = u.full_name;
        const dir = lang === 'he' ? 'rtl' : 'ltr';
        const align = lang === 'he' ? 'right' : 'left';
        const tasks = data.tasks || [];
        const taskCount = data.taskCount || tasks.length;
        const changes = data.changes || '';

        const sends = [];

        // ── EMAIL ──────────────────────────────────────────────────────────
        if (channels.includes('email') && u.email) {
            let subject = '', html = '';
            if (type === 'user_updated' && changes) {
                subject = T.subj;
                html = notifEmailWrap(dir, align, `<h3 style="color:#714B67;margin-top:0;">${T.push_t}</h3><p style="color:#374151;">${lang === 'he' ? `שלום ${n},` : (lang === 'th' ? `สวัสดี ${n},` : `Hello ${n},`)}</p><div style="background:#f3f4f6;padding:14px;border-radius:6px;border-${align === 'right' ? 'right' : 'left'}:4px solid #714B67;">${changes.replace(/\n/g, '<br>')}</div>`);
            } else if (type === 'tasks_assigned' && tasks.length > 0) {
                subject = T.subj(taskCount);
                html = notifEmailWrap(dir, align, `<h3 style="color:#714B67;margin-top:0;">${T.push_t(taskCount)}</h3><p style="color:#374151;">${lang === 'he' ? `שלום ${n},` : (lang === 'th' ? `สวัสดี ${n},` : `Hello ${n},`)}</p>${buildTaskTableHtml(tasks, lang)}`);
            }
            if (html && subject) {
                sends.push(
                    transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: u.email, subject, html })
                        .then(() => console.log(`📧 ${type} email → ${u.email}`))
                        .catch(e => console.error(`⚠️ Email (${type}) → ${u.email}:`, e.message))
                );
            }
        }

        // ── LINE ───────────────────────────────────────────────────────────
        if (channels.includes('line') && u.line_user_id) {
            let msg = '';
            if (type === 'user_created') {
                msg = T.line(n, data.email || u.email, data.password || '');
            } else if (type === 'user_updated' && changes) {
                msg = T.line(n, changes);
            } else if (type === 'tasks_assigned' && tasks.length > 0) {
                msg = T.line(n, taskCount, buildTaskListLine(tasks, lang));
            } else if (type === 'morning_briefing') {
                msg = tasks.length === 0 ? T.none_line(n) : T.line(n, tasks.length, buildTaskListLine(tasks, lang));
            }
            if (msg) sends.push(sendLineMessage(u.line_user_id, msg).catch(e => console.error(`⚠️ LINE (${type}):`, e.message)));
        }

        // ── FCM PUSH ───────────────────────────────────────────────────────
        if (channels.includes('push') && u.device_token) {
            let title = '', body = '';
            if (type === 'user_created') {
                title = T.push_t; body = T.push_b(n);
            } else if (type === 'user_updated') {
                title = T.push_t; body = T.push_b();
            } else if (type === 'tasks_assigned') {
                title = T.push_t(taskCount); body = T.push_b(taskCount);
            } else if (type === 'morning_briefing') {
                if (tasks.length === 0) { title = T.none_push_t; body = T.none_push_b(); }
                else { title = T.push_t; body = T.push_b(tasks.length); }
            }
            if (title) sends.push(sendFcmPush(u.device_token, title, body, APP_LINK));
        }

        await Promise.all(sends);
    } catch (err) {
        console.error(`⚠️ sendNotification (${type}) for userId ${userId}:`, err.message);
    }
};


// ==========================================
// 📧 שליחת מייל למשתמש חדש (מותאם לשפות ולתפקידים)
// ==========================================
const sendWelcomeEmail = async (email, fullName, password, role, lang = 'he') => {
    const appLink = "https://air-manage-app.netlify.app/";

    const dict = {
        en: {
            dir: 'ltr', align: 'left',
            subject: 'Login Details - OpsManager App',
            app_name: 'Maintenance Management',
            hello: 'Hello',
            title_emp: 'Welcome to the team! 🛠️',
            desc_emp: 'Your account has been created.',
            title_mgr: 'Welcome to the Management Team! 💼',
            desc_mgr: 'A manager account has been created for you with extended permissions.',
            email_label: 'Email:',
            pass_label: 'Password:',
            btn: 'Login to App'
        },
        he: {
            dir: 'rtl', align: 'right',
            subject: 'פרטי התחברות - אפליקציית מנהל התפעול',
            app_name: 'מערכת ניהול משימות',
            hello: 'שלום',
            title_emp: 'ברוכים הבאים לצוות! 🛠️',
            desc_emp: 'החשבון שלך נוצר בהצלחה.',
            title_mgr: 'ברוכים הבאים לצוות ההנהלה! 💼',
            desc_mgr: 'נוצר עבורך חשבון מנהל עם הרשאות מורחבות במערכת.',
            email_label: 'אימייל:',
            pass_label: 'סיסמה:',
            btn: 'לכניסה לאפליקציה לחץ כאן'
        },
        th: {
            dir: 'ltr', align: 'left',
            subject: 'รายละเอียดการเข้าสู่ระบบ - แอป OpsManager',
            app_name: 'ระบบการจัดการงาน',
            hello: 'สวัสดี',
            title_emp: 'ยินดีต้อนรับสู่ทีม! 🛠️',
            desc_emp: 'บัญชีของคุณถูกสร้างขึ้นแล้ว',
            title_mgr: 'ยินดีต้อนรับสู่ทีมผู้บริหาร! 💼',
            desc_mgr: 'บัญชีผู้จัดการของคุณถูกสร้างขึ้นพร้อมสิทธิ์เพิ่มเติม',
            email_label: 'อีเมล:',
            pass_label: 'รหัสผ่าน:',
            btn: 'เข้าสู่ระบบแอป'
        }
    };

    const l = dict[lang] || dict['en'];

    let titleText = l.title_emp;
    let descriptionText = l.desc_emp;
    
    if (role === 'MANAGER' || role === 'BIG_BOSS') {
        titleText = l.title_mgr;
        descriptionText = l.desc_mgr;
    }

    const mailOptions = {
      from: '"OpsManager App" <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: l.subject,
      html: `
        <div dir="${l.dir}" style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;text-align:${l.align};">
          <h1 style="color:#714B67;text-align:center;">${l.app_name}</h1>
          <div style="background:white;padding:20px;border-radius:8px;">
            <h2>${l.hello} ${fullName},</h2>
            <h3 style="color:#714B67;">${titleText}</h3>
            <p>${descriptionText}</p>
            <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:20px 0;border-${l.align === 'right' ? 'right' : 'left'}:4px solid #714B67;">
              <p><strong>📧 ${l.email_label}</strong> <span dir="ltr">${email}</span></p>
              <p><strong>🔑 ${l.pass_label}</strong> <span dir="ltr">${password}</span></p>
            </div>
            <div style="text-align:center;margin-top:30px;">
              <a href="${appLink}" style="background:#714B67;color:white;padding:12px 25px;text-decoration:none;border-radius:25px;font-weight:bold;display:inline-block;">${l.btn}</a>
            </div>
          </div>
        </div>
      `
    };

    try { 
        await transporter.sendMail(mailOptions); 
        console.log(`📧 Welcome email sent to ${email} in ${lang}`);
    } catch (error) { 
        console.error("❌ Error sending welcome email:", error); 
    }
};

// ==========================================
// 📧 Password Reset Email (localized)
// ==========================================
const sendResetPasswordEmail = async (email, fullName, token, lang = 'en') => {
    const appLink = "https://air-manage-app.netlify.app/";

    const dict = {
        en: {
            dir: 'ltr', align: 'left',
            subject: '🔑 Password Reset - OpsManager App',
            title: 'Password Reset Request',
            hello: 'Hello',
            body: 'We received a request to reset your password. Use the code below — it expires in 1 hour.',
            code_label: 'Your Reset Code:',
            note: 'If you did not request this, please ignore this email.',
            btn: 'Open App'
        },
        he: {
            dir: 'rtl', align: 'right',
            subject: '🔑 איפוס סיסמה - אפליקציית OpsManager',
            title: 'בקשה לאיפוס סיסמה',
            hello: 'שלום',
            body: 'קיבלנו בקשה לאיפוס הסיסמה שלך. השתמש בקוד הבא — תוקפו פג תוך שעה.',
            code_label: 'קוד האיפוס שלך:',
            note: 'אם לא ביקשת זאת, התעלם מהמייל הזה.',
            btn: 'כניסה לאפליקציה'
        },
        th: {
            dir: 'ltr', align: 'left',
            subject: '🔑 รีเซ็ตรหัสผ่าน - แอป OpsManager',
            title: 'คำขอรีเซ็ตรหัสผ่าน',
            hello: 'สวัสดี',
            body: 'เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ ใช้รหัสด้านล่าง — หมดอายุใน 1 ชั่วโมง',
            code_label: 'รหัสรีเซ็ตของคุณ:',
            note: 'หากคุณไม่ได้ขอ โปรดเพิกเฉยต่ออีเมลนี้',
            btn: 'เปิดแอป'
        }
    };
    const l = dict[lang] || dict['en'];

    const mailOptions = {
        from: '"OpsManager App" <maintenance.app.tkp@gmail.com>',
        to: email,
        subject: l.subject,
        html: `
        <div dir="${l.dir}" style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;text-align:${l.align};">
          <h1 style="color:#714B67;text-align:center;">OpsManager APP</h1>
          <div style="background:white;padding:20px;border-radius:8px;">
            <h2 style="color:#374151;">${l.title}</h2>
            <p>${l.hello} <strong>${fullName}</strong>,</p>
            <p>${l.body}</p>
            <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;text-align:center;border:2px dashed #714B67;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">${l.code_label}</p>
              <span style="font-size:28px;font-weight:bold;letter-spacing:4px;color:#714B67;font-family:monospace;">${token}</span>
            </div>
            <p style="font-size:13px;color:#9ca3af;">${l.note}</p>
            <div style="text-align:center;margin-top:20px;">
              <a href="${appLink}" style="background:#714B67;color:white;padding:10px 25px;text-decoration:none;border-radius:25px;font-weight:bold;display:inline-block;">${l.btn}</a>
            </div>
          </div>
        </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Password reset email sent to ${email}`);
    } catch (error) {
        console.error("❌ Error sending reset email:", error);
    }
};

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL 
  : `postgresql://postgres:1234@127.0.0.1:5432/maintenance_management_app`;

const pool = new Pool({
  connectionString: connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// BIG_BOSS, MANAGER (AreaManager), or COMPANY_MANAGER may mutate locations, categories, assets, and location fields
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'BIG_BOSS' && req.user.role !== 'MANAGER' && req.user.role !== 'COMPANY_MANAGER') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Derive effective area_id for a user: MANAGER uses own id, others use their stored area_id
const getEffectiveAreaId = (reqUser) => {
  if (reqUser.role === 'MANAGER') return reqUser.id;
  return reqUser.area_id || null;
};

app.get('/fix-db', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            console.log("🔧 Starting DB Fix...");
            
            await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS images TEXT[]');
            await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_images TEXT[]'); 
            await client.query('ALTER TABLE tasks ALTER COLUMN due_date TYPE TIMESTAMP WITHOUT TIME ZONE');
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS device_token TEXT');
            
            await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)');
            await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)');

            await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS code VARCHAR(10)');
            // Widen category code limit from 3→5 letters (idempotent via DO $$ block)
            await client.query(`
                DO $$ BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='categories' AND column_name='code'
                          AND character_maximum_length < 5
                    ) THEN
                        ALTER TABLE categories ALTER COLUMN code TYPE VARCHAR(5);
                    END IF;
                END $$
            `);
            await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS code VARCHAR(50)');
            await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS image_url TEXT');
            await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS coordinates TEXT');
            await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS dynamic_fields TEXT');

            await client.query(`
                CREATE TABLE IF NOT EXISTS location_fields (
                    id SERIAL PRIMARY KEY,
                    created_by INTEGER REFERENCES users(id),
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL
                )
            `);

            await client.query('ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key');
            await client.query('ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_name_key');
            await client.query('ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_code_key');
            
            // Field permissions for managers (default: allowed)
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_fields BOOLEAN DEFAULT TRUE');
            // Auto-approve tasks flag — when TRUE, task completion skips WAITING_APPROVAL
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_approve_tasks BOOLEAN DEFAULT FALSE');

            // Language permissions — Big Boss controls which languages each Manager (and their employees) may use
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_lang_he BOOLEAN DEFAULT TRUE');
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_lang_en BOOLEAN DEFAULT TRUE');
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_lang_th BOOLEAN DEFAULT TRUE');

            // Stuck-task permission — when TRUE, stuck tasks skip WAITING_APPROVAL and go directly to COMPLETED
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS stuck_skip_approval BOOLEAN DEFAULT FALSE');

            // Stuck-task fields on tasks
            await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_stuck BOOLEAN DEFAULT FALSE');
            await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stuck_description TEXT');
            await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stuck_file_url TEXT');
            await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL');

            // ── 4-Tier RBAC: area_id grouping ──
            // Add area_id columns (idempotent)
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS area_id INTEGER');
            await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS area_id INTEGER');
            await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS area_id INTEGER');
            await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS area_id INTEGER');

            // Backfill: MANAGER (AreaManager) → area_id = their own id (they define the area)
            await client.query("UPDATE users SET area_id = id WHERE role = 'MANAGER' AND area_id IS NULL");

            // Backfill: COMPANY_MANAGER (DeptManager) → area_id = parent MANAGER's area_id
            await client.query(`
                UPDATE users SET area_id = (
                    SELECT u2.area_id FROM users u2 WHERE u2.id = users.parent_manager_id
                )
                WHERE role = 'COMPANY_MANAGER' AND parent_manager_id IS NOT NULL AND area_id IS NULL
            `);

            // Backfill: EMPLOYEE → area_id from parent (COMPANY_MANAGER or MANAGER)
            await client.query(`
                UPDATE users SET area_id = (
                    SELECT COALESCE(u2.area_id, CASE WHEN u2.role = 'MANAGER' THEN u2.id ELSE NULL END)
                    FROM users u2 WHERE u2.id = users.parent_manager_id
                )
                WHERE role = 'EMPLOYEE' AND parent_manager_id IS NOT NULL AND area_id IS NULL
            `);

            // Backfill: locations/categories/assets → area_id from their creator's area
            await client.query(`
                UPDATE locations SET area_id = (
                    SELECT COALESCE(u.area_id, CASE WHEN u.role = 'MANAGER' THEN u.id ELSE NULL END)
                    FROM users u WHERE u.id = locations.created_by
                )
                WHERE created_by IS NOT NULL AND area_id IS NULL
            `);
            await client.query(`
                UPDATE categories SET area_id = (
                    SELECT COALESCE(u.area_id, CASE WHEN u.role = 'MANAGER' THEN u.id ELSE NULL END)
                    FROM users u WHERE u.id = categories.created_by
                )
                WHERE created_by IS NOT NULL AND area_id IS NULL
            `);
            await client.query(`
                UPDATE assets SET area_id = (
                    SELECT COALESCE(u.area_id, CASE WHEN u.role = 'MANAGER' THEN u.id ELSE NULL END)
                    FROM users u WHERE u.id = assets.created_by
                )
                WHERE created_by IS NOT NULL AND area_id IS NULL
            `);

            // ── Multilingual name columns ──
            await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS name_he TEXT');
            await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS name_en TEXT');
            await client.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS name_th TEXT');
            await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_he TEXT');
            await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en TEXT');
            await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_th TEXT');
            await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS name_he TEXT');
            await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS name_en TEXT');
            await client.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS name_th TEXT');
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_he TEXT');
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_en TEXT');
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_th TEXT');
            // Migrate existing single-name data into the English column
            await client.query("UPDATE locations SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL");
            await client.query("UPDATE categories SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL");
            await client.query("UPDATE assets SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL");
            await client.query("UPDATE users SET full_name_en = full_name WHERE full_name_en IS NULL AND full_name IS NOT NULL");

            // ── Multi-Tenant SaaS: companies table ──
            await client.query(`
                CREATE TABLE IF NOT EXISTS companies (
                    id                SERIAL PRIMARY KEY,
                    name              VARCHAR(255) NOT NULL,
                    profile_image_url TEXT,
                    created_at        TIMESTAMPTZ DEFAULT NOW(),
                    updated_at        TIMESTAMPTZ DEFAULT NOW()
                )
            `);
            await client.query('ALTER TABLE users      ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');
            await client.query('ALTER TABLE tasks      ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');
            await client.query('ALTER TABLE locations  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');
            await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');
            await client.query('ALTER TABLE assets     ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');

            // ── M:M: employee ↔ manager junction table ──
            await client.query(`
                CREATE TABLE IF NOT EXISTS employee_managers (
                    id          SERIAL PRIMARY KEY,
                    employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    manager_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at  TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(employee_id, manager_id)
                )
            `);

            // ── Smart Migration: one Company per AreaManager without one ──
            const unassignedMgrsResult = await client.query(
                "SELECT id, area_id FROM users WHERE role = 'MANAGER' AND company_id IS NULL ORDER BY id"
            );
            let fixCoCounter = 1;
            for (const mgr of unassignedMgrsResult.rows) {
                const newCo = await client.query(
                    'INSERT INTO companies (name) VALUES ($1) RETURNING id',
                    [`Company ${fixCoCounter}`]
                );
                const coId = newCo.rows[0].id;
                fixCoCounter++;

                await client.query('UPDATE users SET company_id = $1 WHERE id = $2', [coId, mgr.id]);
                await client.query(
                    "UPDATE users SET company_id = $1 WHERE area_id = $2 AND role IN ('SUPERVISOR','EMPLOYEE') AND company_id IS NULL",
                    [coId, mgr.area_id]
                );
                await client.query('UPDATE locations  SET company_id = $1 WHERE area_id = $2 AND company_id IS NULL', [coId, mgr.area_id]);
                await client.query('UPDATE categories SET company_id = $1 WHERE area_id = $2 AND company_id IS NULL', [coId, mgr.area_id]);
                await client.query('UPDATE assets     SET company_id = $1 WHERE area_id = $2 AND company_id IS NULL', [coId, mgr.area_id]);
                await client.query(
                    'UPDATE tasks SET company_id = $1 WHERE worker_id IN (SELECT id FROM users WHERE area_id = $2) AND company_id IS NULL',
                    [coId, mgr.area_id]
                );
            }

            // ── Migrate existing parent_manager_id → M:M junction table (idempotent) ──
            await client.query(`
                INSERT INTO employee_managers (employee_id, manager_id)
                SELECT id, parent_manager_id
                FROM users
                WHERE parent_manager_id IS NOT NULL
                  AND role IN ('EMPLOYEE', 'SUPERVISOR')
                ON CONFLICT DO NOTHING
            `);

            // ── Multi-Tenant: company multilingual names + notification language ──
            await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS name_en TEXT');
            await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS name_he TEXT');
            await client.query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS name_th TEXT');
            await client.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_notification_lang VARCHAR(10) DEFAULT 'en'");
            // Backfill existing single-name into the English column
            await client.query("UPDATE companies SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL");

            console.log("✅ DB Fix Completed!");
            res.send(`
                <div style="font-family: Arial; text-align: center; margin-top: 50px; direction: rtl;">
                    <h1 style="color: #166534;">✅ מסד הנתונים תוקן בהצלחה!</h1>
                    <p>נוצרה טבלת חברות (companies), עמודות company_id, וטבלת M:M לקישור עובדים-מנהלים. חברה נוצרה אוטומטית לכל AreaManager קיים.</p>
                    <p>את יכולה לחזור לאפליקציה!</p>
                </div>
            `);
        } catch (dbError) {
            console.error("❌ DB Fix Failed:", dbError);
            res.status(500).send("DB Error: " + dbError.message);
        } finally {
            client.release();
        }
    } catch (e) {
        res.status(500).send("Connection Error: " + e.message);
    }
});

app.post('/users/device-token', authenticateToken, async (req, res) => {
    try {
        const { device_token } = req.body;
        if (!device_token) {
            return res.status(400).json({ error: "Token is required" });
        }
        await pool.query('UPDATE users SET device_token = $1 WHERE id = $2', [device_token, req.user.id]);
        console.log(`✅ Saved device token for user ${req.user.id}`); 
        res.json({ success: true, message: "Token saved" });
    } catch (e) { 
        console.error("❌ Error saving device token:", e);
        res.status(500).send('Error saving token'); 
    }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const email = req.body.email ? req.body.email.toLowerCase() : '';
    const { password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "נא להזין אימייל וסיסמה" });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "משתמש לא נמצא" });

    // Multiple accounts may share the same email across different companies —
    // find the one whose password matches.
    let user = null;
    for (const row of result.rows) {
        const valid = await bcrypt.compare(password, row.password).catch(() => false);
        if (valid || password === row.password) { user = row; break; }
    }
    if (!user) return res.status(400).json({ error: "סיסמה שגויה" });

    // For MANAGER (AreaManager), effective area_id = their own id
    const effectiveAreaId = user.role === 'MANAGER' ? user.id : (user.area_id || null);
    const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name, area_id: effectiveAreaId, company_id: user.company_id ?? null }, SECRET_KEY, { expiresIn: '24h' });

    // For employees, fetch the manager's settings so the UI can apply them
    let managerAutoApprove = false;
    let managerAllowedLangHe = true;
    let managerAllowedLangEn = true;
    let managerAllowedLangTh = true;
    let managerStuckSkipApproval = false;
    if (user.role === 'EMPLOYEE' && user.parent_manager_id) {
        try {
            const mgr = await pool.query('SELECT auto_approve_tasks, allowed_lang_he, allowed_lang_en, allowed_lang_th, stuck_skip_approval FROM users WHERE id = $1', [user.parent_manager_id]);
            managerAutoApprove       = mgr.rows[0]?.auto_approve_tasks   || false;
            managerAllowedLangHe     = mgr.rows[0]?.allowed_lang_he   !== false;
            managerAllowedLangEn     = mgr.rows[0]?.allowed_lang_en   !== false;
            managerAllowedLangTh     = mgr.rows[0]?.allowed_lang_th   !== false;
            managerStuckSkipApproval = mgr.rows[0]?.stuck_skip_approval || false;
        } catch (e) { /* non-critical, leave defaults */ }
    }

    res.json({
        token,
        user: {
            id: user.id,
            name: user.full_name,
            full_name: user.full_name,
            full_name_he: user.full_name_he || null,
            full_name_en: user.full_name_en || null,
            full_name_th: user.full_name_th || null,
            role: user.role,
            email: user.email,
            phone: user.phone,
            profile_picture_url: user.profile_picture_url,
            preferred_language: user.preferred_language,
            can_manage_fields: user.can_manage_fields,
            auto_approve_tasks: user.auto_approve_tasks,
            // Own language permissions (managers/bigboss use their own; employees use manager's below)
            allowed_lang_he: user.allowed_lang_he !== false,
            allowed_lang_en: user.allowed_lang_en !== false,
            allowed_lang_th: user.allowed_lang_th !== false,
            // Employee sees their manager's settings to apply restrictions
            manager_auto_approve_tasks: managerAutoApprove,
            manager_allowed_lang_he: managerAllowedLangHe,
            manager_allowed_lang_en: managerAllowedLangEn,
            manager_allowed_lang_th: managerAllowedLangTh,
            manager_stuck_skip_approval: managerStuckSkipApproval,
            parent_manager_id: user.parent_manager_id,
            area_id: effectiveAreaId,
            company_id: user.company_id ?? null
        }
    });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "שגיאת שרת" }); 
  }
});

app.put('/users/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const id = req.user.id;
        const { full_name, full_name_he, full_name_en, full_name_th, email, phone, password, preferred_language, line_user_id } = req.body;

        // Capture old lineUserId BEFORE the update to detect first-time connection
        const oldProfileRes = await pool.query('SELECT line_user_id FROM users WHERE id = $1', [id]);
        const oldLineUserId = oldProfileRes.rows[0]?.line_user_id || null;

        let profile_picture_url = req.body.existing_picture || null;
        if (req.file) {
            // Use the Cloudinary URL (req.file.path) — NOT a local /uploads/ path
            profile_picture_url = req.file.path || req.file.secure_url || null;
        }

        const lang = preferred_language || 'en';

        const firebaseUpdateData = { displayName: full_name, email: email };
        if (password && password.trim() !== '') {
            if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
            firebaseUpdateData.password = password;
        }

        try {
            await admin.auth().updateUser(id, firebaseUpdateData);
        } catch (firebaseErr) {
            console.error("Firebase error in profile update:", firebaseErr);
            if (firebaseErr.code === 'auth/email-already-exists') {
                return res.status(400).json({ error: "Email already taken" });
            }
        }

        let query = 'UPDATE users SET full_name=$1, email=$2, phone=$3, profile_picture_url=$4, preferred_language=$5, full_name_he=$6, full_name_en=$7, full_name_th=$8, line_user_id=$9';
        let params = [full_name, email, phone, profile_picture_url, lang, full_name_he || null, full_name_en || null, full_name_th || null, line_user_id || null];
        let paramCount = 10;

        if (password && password.trim() !== '') {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `, password=$${paramCount}`; 
            params.push(hashedPassword);
            paramCount++;
        }

        query += ` WHERE id=$${paramCount} RETURNING *`;
        params.push(id);

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found in database" });
        }

        const updatedUser = result.rows[0];

        // Send welcome LINE message when lineUserId is connected for the first time
        if (updatedUser.line_user_id && !oldLineUserId) {
            const userLang = updatedUser.preferred_language || 'en';
            const welcomeDict = {
                he: `שלום ${updatedUser.full_name}! 👋 ברוך הבא למערכת OpsManager. חשבונך מחובר בהצלחה.`,
                en: `Hello ${updatedUser.full_name}! 👋 Welcome to the team! Your LINE account is now connected to OpsManager.`,
                th: `สวัสดี ${updatedUser.full_name}! 👋 ยินดีต้อนรับสู่ทีม! LINE ของคุณเชื่อมต่อกับ OpsManager แล้ว`
            };
            sendLineMessage(updatedUser.line_user_id, welcomeDict[userLang] || welcomeDict['en']).catch(err => console.error("❌ LINE welcome error:", err));
        }

        res.json({ message: "Profile updated successfully", user: updatedUser });

    } catch (err) {
        console.error("❌ Error updating profile:", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: "Email already exists" });
        }
        res.status(500).json({ error: 'Server Error: ' + err.message }); 
    }
});

app.get('/users', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT u.id, u.full_name, u.full_name_he, u.full_name_en, u.full_name_th,
                   u.email, u.phone, u.role, u.parent_manager_id,
                   COALESCE(u.area_id, NULL) AS area_id,
                   u.company_id,
                   u.profile_picture_url, u.preferred_language,
                   COALESCE(u.can_manage_fields, TRUE)  AS can_manage_fields,
                   COALESCE(u.auto_approve_tasks, FALSE) AS auto_approve_tasks,
                   COALESCE(u.allowed_lang_he, TRUE)    AS allowed_lang_he,
                   COALESCE(u.allowed_lang_en, TRUE)    AS allowed_lang_en,
                   COALESCE(u.allowed_lang_th, TRUE)    AS allowed_lang_th,
                   COALESCE(u.stuck_skip_approval, FALSE) AS stuck_skip_approval,
                   u.line_user_id,
                   m.full_name AS manager_name,
                   COALESCE(m.auto_approve_tasks, FALSE) AS manager_auto_approve_tasks
            FROM users u
            LEFT JOIN users m ON u.parent_manager_id = m.id
        `;
        let params = [];

        // BIG_BOSS: full access, optional company_id / manager_id filter for scoped views
        if (req.user.role === 'BIG_BOSS') {
            if (req.query.manager_id) {
                // Return employees assigned to this manager via M:M junction
                query += ` WHERE u.id IN (SELECT employee_id FROM employee_managers WHERE manager_id = $1) AND u.role = 'EMPLOYEE'`;
                params.push(req.query.manager_id);
            } else if (req.query.company_id) {
                query += ` WHERE u.company_id = $1`;
                params.push(req.query.company_id);
            }
            // else: no WHERE clause — intentional full access
        } else if (req.user.role === 'COMPANY_MANAGER' && req.query.manager_id) {
            // COMPANY_MANAGER can fetch employees for a specific manager via M:M
            query += ` WHERE u.id IN (SELECT employee_id FROM employee_managers WHERE manager_id = $1) AND u.role = 'EMPLOYEE'`;
            params.push(req.query.manager_id);
        } else if (req.user.role === 'MANAGER') {
            // Always strict M:M — no area_id fallback. A MANAGER sees only employees
            // explicitly linked to them in the employee_managers junction table.
            query += ` WHERE u.id IN (SELECT employee_id FROM employee_managers WHERE manager_id = $1) AND u.role = 'EMPLOYEE'`;
            params.push(req.user.id); // always the authenticated user's ID, never the query param
        } else if (req.user.role === 'COMPANY_MANAGER') {
            // Prefer company_id scoping (multi-tenant safe); fall back to area_id for legacy data
            // COMPANY_MANAGER has full admin access to ALL users (MANAGER, COMPANY_MANAGER, EMPLOYEE)
            // within their company — no role filter applied.
            const companyId = req.user.company_id ?? null;
            const areaId    = req.user.area_id    ?? null;
            if (companyId) {
                query += ` WHERE u.company_id = $1 AND u.role IN ('MANAGER', 'COMPANY_MANAGER', 'EMPLOYEE')`;
                params.push(companyId);
            } else if (areaId) {
                query += ` WHERE u.area_id = $1 AND u.role IN ('MANAGER', 'COMPANY_MANAGER', 'EMPLOYEE')`;
                params.push(areaId);
            } else {
                query += ` WHERE u.id = $1`;
                params.push(req.user.id);
            }
        } else if (req.user.role === 'EMPLOYEE') {
            query += ` WHERE u.id = $1`;
            params.push(req.user.id);
        }

        query += ` ORDER BY u.role, u.full_name`;
        const result = await pool.query(query, params);
        res.json(result.rows ?? []);
    } catch (err) {
        console.error("❌ GET /users error:", err.message);
        // Return safe empty state so the UI never shows a blank screen from a backend crash
        res.json([]);
    }
});

app.post('/users', authenticateToken, async (req, res) => {
  try {
    const { full_name, full_name_he, full_name_en, full_name_th, password, role, parent_manager_id, preferred_language, line_user_id } = req.body;
    const effectiveFullName = full_name || full_name_en || '';
    let { email, phone } = req.body;
    
    email = email ? email.toLowerCase() : '';

    if (!effectiveFullName || !email || !password || !role) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    if (phone) {
        const phoneRegex = /^[0-9]{9,15}$/; 
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: "מספר הטלפון לא תקין. נא להזין ספרות בלבד (לפחות 9 ספרות)." });
        }
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let assignedManager = parent_manager_id;
    if (!assignedManager && (req.user.role === 'MANAGER' || req.user.role === 'COMPANY_MANAGER')) {
        assignedManager = req.user.id;
    }

    const lang = preferred_language || 'he';

    // Determine area_id for the new user
    let newUserAreaId = null;
    if (role === 'COMPANY_MANAGER' || role === 'EMPLOYEE') {
        const parentId = assignedManager;
        if (parentId) {
            const parentRes = await pool.query('SELECT role, area_id FROM users WHERE id = $1', [parentId]);
            const parent = parentRes.rows[0];
            // MANAGER's area_id = their own id (may not be set yet if freshly created)
            newUserAreaId = parent?.area_id || (parent?.role === 'MANAGER' ? parseInt(parentId) : null);
        }
    }
    // For MANAGER (AreaManager): area_id = their own id — set after insert

    // Determine company_id for the new user
    let newUserCompanyId = null;
    if (role === 'SUPERVISOR' || role === 'EMPLOYEE' || role === 'COMPANY_MANAGER') {
        // BIG_BOSS can directly assign company_id when provisioning a COMPANY_MANAGER
        if (role === 'COMPANY_MANAGER' && req.user.role === 'BIG_BOSS' && req.body.company_id) {
            newUserCompanyId = parseInt(req.body.company_id, 10);
        } else if (assignedManager) {
            // Inherit company from parent manager
            const parentCoRes = await pool.query('SELECT company_id FROM users WHERE id = $1', [assignedManager]);
            newUserCompanyId = parentCoRes.rows[0]?.company_id || null;
        }
    }
    // For MANAGER created by BIG_BOSS with an explicit company_id (e.g. from CompaniesTab):
    // use the provided company_id instead of auto-creating a new one.
    if (role === 'MANAGER' && req.user.role === 'BIG_BOSS' && req.body.company_id) {
        newUserCompanyId = parseInt(req.body.company_id, 10);
    }
    // For MANAGER created by COMPANY_MANAGER: inherit the caller's company_id.
    if (role === 'MANAGER' && req.user.role === 'COMPANY_MANAGER') {
        newUserCompanyId = req.user.company_id || null;
    }
    // For MANAGER with no company determined yet: company is auto-created after insert

    // Email uniqueness check scoped to the same company (or globally for company-less users)
    {
        const emailDupQuery = newUserCompanyId
            ? 'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id = $2'
            : 'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id IS NULL';
        const emailDupParams = newUserCompanyId ? [email, newUserCompanyId] : [email];
        const emailDup = await pool.query(emailDupQuery, emailDupParams);
        if (emailDup.rows.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }
    }

    const newUser = await pool.query(
      `INSERT INTO users (full_name, full_name_he, full_name_en, full_name_th, email, password, role, phone, parent_manager_id, preferred_language, line_user_id, area_id, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, full_name, email, role, phone, preferred_language, line_user_id`,
      [effectiveFullName, full_name_he || null, full_name_en || null, full_name_th || null, email, hashedPassword, role, phone, assignedManager, lang, line_user_id || null, newUserAreaId, newUserCompanyId]
    );

    // For MANAGER (AreaManager), area_id = their own id.
    // Auto-create a Company only when no company_id was already determined (BIG_BOSS standalone creation).
    if (role === 'MANAGER') {
        await pool.query('UPDATE users SET area_id = id WHERE id = $1', [newUser.rows[0].id]);
        if (!newUserCompanyId) {
            const newCo = await pool.query(
                'INSERT INTO companies (name) VALUES ($1) RETURNING id',
                [`Company (${effectiveFullName})`]
            );
            await pool.query('UPDATE users SET company_id = $1 WHERE id = $2', [newCo.rows[0].id, newUser.rows[0].id]);
        }
    }

    // For COMPANY_MANAGER created directly by BIG_BOSS (no parent MANAGER):
    // set area_id = their own id so they can scope their own team
    if (role === 'COMPANY_MANAGER' && !assignedManager) {
        await pool.query('UPDATE users SET area_id = id WHERE id = $1', [newUser.rows[0].id]);
    }

    // Populate M:M junction table for SUPERVISOR/EMPLOYEE
    if ((role === 'SUPERVISOR' || role === 'EMPLOYEE') && assignedManager) {
        await pool.query(
            'INSERT INTO employee_managers (employee_id, manager_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [newUser.rows[0].id, assignedManager]
        );
    }

    try {
        await sendWelcomeEmail(email, full_name, password, role, lang);
    } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
    }

    // LINE: include credentials in welcome message
    if (line_user_id) {
        const T = NOTIF_T.user_created[lang] || NOTIF_T.user_created.en;
        sendLineMessage(line_user_id, T.line(effectiveFullName, email, password) )
            .catch(err => console.error("LINE welcome error:", err));
    }

    // FCM Push: welcome push (no-op if device_token not yet registered)
    sendNotification(newUser.rows[0].id, ['push'], 'user_created', { email, password })
        .catch(err => console.error("FCM welcome push error:", err));

    res.json(newUser.rows[0]);

  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
        return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).send('Server Error');
  }
});
 
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, full_name_he, full_name_en, full_name_th, email, phone, role, password, preferred_language, can_manage_fields, auto_approve_tasks, allowed_lang_he, allowed_lang_en, allowed_lang_th, line_user_id, stuck_skip_approval } = req.body;

    const oldUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (oldUserRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const oldUser = oldUserRes.rows[0];

    // Only BIG_BOSS can change a user's role
    const effectiveRole = (role !== undefined && req.user.role === 'BIG_BOSS') ? role : oldUser.role;

    // Compute effective values BEFORE the Firebase call so displayName/email are never undefined
    const effectiveName  = full_name || full_name_en || oldUser.full_name;
    const effectiveEmail = email !== undefined ? email : oldUser.email;
    const effectivePhone = phone !== undefined ? phone : (oldUser.phone || null);
    const lang           = preferred_language !== undefined ? preferred_language : (oldUser.preferred_language || 'he');

    const firebaseUpdateData = { displayName: effectiveName, email: effectiveEmail };
    if (password && password.trim() !== '') {
        if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
        firebaseUpdateData.password = password;
    }

    try {
        await admin.auth().updateUser(id, firebaseUpdateData);
    } catch (firebaseErr) {
        console.error("Firebase update failed (non-critical, continuing DB update):", firebaseErr.code);
        if (firebaseErr.code === 'auth/email-already-exists') return res.status(400).json({ error: "האימייל הזה כבר תפוס על ידי משתמש אחר." });
        // For non-Firebase users (bcrypt/DB auth), user-not-found is expected — continue to DB update
    }

    const setClauses = [
        'full_name=$1', 'full_name_he=$2', 'full_name_en=$3', 'full_name_th=$4',
        'email=$5', 'phone=$6', 'role=$7', 'preferred_language=$8', 'line_user_id=$9'
    ];
    const params = [
        effectiveName,
        full_name_he !== undefined ? full_name_he : (oldUser.full_name_he || null),
        full_name_en !== undefined ? full_name_en : (oldUser.full_name_en || null),
        full_name_th !== undefined ? full_name_th : (oldUser.full_name_th || null),
        effectiveEmail,
        effectivePhone,
        effectiveRole,
        lang,
        line_user_id !== undefined ? (line_user_id || null) : (oldUser.line_user_id || null)
    ];
    let paramCount = 10;

    // Only include permission columns if they exist in the DB schema (detected via oldUser keys)
    if ('can_manage_fields' in oldUser || can_manage_fields !== undefined) {
        const canManage = can_manage_fields !== undefined ? can_manage_fields : oldUser.can_manage_fields;
        setClauses.push(`can_manage_fields=$${paramCount}`);
        params.push(canManage);
        paramCount++;
    }
    if ('auto_approve_tasks' in oldUser || auto_approve_tasks !== undefined) {
        const autoApprove = auto_approve_tasks !== undefined ? auto_approve_tasks : oldUser.auto_approve_tasks;
        setClauses.push(`auto_approve_tasks=$${paramCount}`);
        params.push(autoApprove);
        paramCount++;
    }
    if ('allowed_lang_he' in oldUser) {
        setClauses.push(`allowed_lang_he=$${paramCount}`);
        params.push(allowed_lang_he !== undefined ? allowed_lang_he : oldUser.allowed_lang_he);
        paramCount++;
    }
    if ('allowed_lang_en' in oldUser) {
        setClauses.push(`allowed_lang_en=$${paramCount}`);
        params.push(allowed_lang_en !== undefined ? allowed_lang_en : oldUser.allowed_lang_en);
        paramCount++;
    }
    if ('allowed_lang_th' in oldUser) {
        setClauses.push(`allowed_lang_th=$${paramCount}`);
        params.push(allowed_lang_th !== undefined ? allowed_lang_th : oldUser.allowed_lang_th);
        paramCount++;
    }
    if ('stuck_skip_approval' in oldUser || stuck_skip_approval !== undefined) {
        setClauses.push(`stuck_skip_approval=$${paramCount}`);
        params.push(stuck_skip_approval !== undefined ? stuck_skip_approval : oldUser.stuck_skip_approval);
        paramCount++;
    }

    // Only hash and update if the password is genuinely new (not the existing hash sent back unchanged)
    let isPasswordChanged = false;
    if (password && password.trim() !== '') {
        const bcrypt = require('bcrypt');
        const matchesExisting = oldUser.password
            ? await bcrypt.compare(password, oldUser.password).catch(() => false)
            : false;
        if (!matchesExisting) {
            isPasswordChanged = true;
            const hashedPassword = await bcrypt.hash(password, 10);
            setClauses.push(`password=$${paramCount}`);
            params.push(hashedPassword);
            paramCount++;
        }
    }

    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id=$${paramCount} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);
    const updatedUser = result.rows[0];

    // Build plain-text change list for notifications
    const changeLinesEn = [];
    const changeLinesHe = [];
    const changeLinesth = [];
    if (oldUser.full_name !== updatedUser.full_name) {
        changeLinesEn.push(`• Name → ${updatedUser.full_name}`);
        changeLinesHe.push(`• שם → ${updatedUser.full_name}`);
        changeLinesth.push(`• ชื่อ → ${updatedUser.full_name}`);
    }
    if (oldUser.email !== updatedUser.email) {
        changeLinesEn.push(`• Email → ${updatedUser.email}`);
        changeLinesHe.push(`• אימייל → ${updatedUser.email}`);
        changeLinesth.push(`• อีเมล → ${updatedUser.email}`);
    }
    if (oldUser.phone !== updatedUser.phone) {
        changeLinesEn.push(`• Phone updated`);
        changeLinesHe.push(`• טלפון עודכן`);
        changeLinesth.push(`• อัปเดตเบอร์โทร`);
    }
    if (oldUser.preferred_language !== updatedUser.preferred_language) {
        changeLinesEn.push(`• Language → ${updatedUser.preferred_language}`);
        changeLinesHe.push(`• שפה → ${updatedUser.preferred_language}`);
        changeLinesth.push(`• ภาษา → ${updatedUser.preferred_language}`);
    }
    if (isPasswordChanged) {
        changeLinesEn.push(`• Password changed 🔑`);
        changeLinesHe.push(`• סיסמה שונתה 🔑`);
        changeLinesth.push(`• เปลี่ยนรหัสผ่าน 🔑`);
    }
    if (oldUser.role !== updatedUser.role) {
        changeLinesEn.push(`• Role → ${updatedUser.role}`);
        changeLinesHe.push(`• תפקיד → ${updatedUser.role}`);
        changeLinesth.push(`• บทบาท → ${updatedUser.role}`);
    }

    const changeLangMap = { he: changeLinesHe, en: changeLinesEn, th: changeLinesth };
    const userLang = updatedUser.preferred_language || 'en';
    const changeText = (changeLangMap[userLang] || changeLinesEn).join('\n');

    // Welcome LINE message when LINE ID is set for the first time
    const oldLineId = oldUser.line_user_id;
    const newLineId = updatedUser.line_user_id;
    if (newLineId && !oldLineId) {
        const welcomeMsg = {
            he: `שלום ${updatedUser.full_name}! 👋 חשבונך מחובר בהצלחה ל-OpsManager.`,
            en: `Hello ${updatedUser.full_name}! 👋 Your account is now connected to OpsManager.`,
            th: `สวัสดี ${updatedUser.full_name}! 👋 บัญชีของคุณเชื่อมต่อกับ OpsManager แล้ว`
        };
        sendLineMessage(newLineId, welcomeMsg[userLang] || welcomeMsg.en).catch(err => console.error("❌ LINE welcome error:", err));
    }

    // Notify user via all 3 channels if any material change occurred
    if (changeText) {
        sendNotification(updatedUser.id, ['email', 'line', 'push'], 'user_updated', { changes: changeText })
            .catch(err => console.error("❌ user_updated notification error:", err));
    }

    res.json({ message: "User updated successfully", user: updatedUser });

  } catch (err) {
    console.error("❌ Error updating user:", err); 
    if (err.code === '23505') return res.status(400).json({ error: "Email already exists in Database" });
    res.status(500).send('Server Error');
  }
});

// PUT /users/:id/assign-employees
// Assigns a set of Employees (by ID) to report to a DeptManager (COMPANY_MANAGER).
// • Only employees with the SAME area_id as the DeptManager are eligible.
// • Employees previously assigned to this DeptManager but omitted from the new
//   list are moved back to the parent AreaManager (area_id = MANAGER's id). COMPANY_MANAGER replaces SUPERVISOR.
app.put('/users/:id/assign-employees', authenticateToken, async (req, res) => {
    try {
        const deptMgrId = parseInt(req.params.id);
        if (isNaN(deptMgrId)) return res.status(400).json({ error: 'Invalid ID' });

        if (req.user.role === 'EMPLOYEE') return res.status(403).json({ error: 'Unauthorized' });

        const deptMgrRes = await pool.query(
            `SELECT id, area_id FROM users WHERE id = $1 AND role = 'COMPANY_MANAGER'`,
            [deptMgrId]
        );
        if (deptMgrRes.rows.length === 0) return res.status(404).json({ error: 'Dept Manager not found' });
        const deptMgr = deptMgrRes.rows[0];

        // MANAGER can only manage within their own area
        if (req.user.role === 'MANAGER' && deptMgr.area_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: outside your area' });
        }
        // COMPANY_MANAGER can only manage their own assignment
        if (req.user.role === 'COMPANY_MANAGER' && deptMgr.id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const rawIds = req.body.employeeIds;
        const employeeIds = Array.isArray(rawIds)
            ? rawIds.map(Number).filter(n => Number.isInteger(n) && n > 0)
            : [];

        // MANAGER's area_id === their own id — use it as the fallback parent
        const areaManagerId = deptMgr.area_id;

        if (employeeIds.length > 0) {
            // Assign selected employees — must be EMPLOYEE role in the same area
            await pool.query(
                `UPDATE users SET parent_manager_id = $1
                 WHERE id = ANY($2::int[]) AND role = 'EMPLOYEE' AND area_id = $3`,
                [deptMgrId, employeeIds, deptMgr.area_id]
            );
            // Sync M:M junction: add new assignments
            for (const empId of employeeIds) {
                await pool.query(
                    'INSERT INTO employee_managers (employee_id, manager_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [empId, deptMgrId]
                );
            }
            // Unassign removed employees → back to AreaManager
            if (areaManagerId) {
                // Get employees being removed from this DeptManager
                const removedRes = await pool.query(
                    `SELECT id FROM users WHERE parent_manager_id = $1 AND role = 'EMPLOYEE'
                       AND NOT (id = ANY($2::int[]))`,
                    [deptMgrId, employeeIds]
                );
                await pool.query(
                    `UPDATE users SET parent_manager_id = $1
                     WHERE parent_manager_id = $2 AND role = 'EMPLOYEE'
                       AND NOT (id = ANY($3::int[]))`,
                    [areaManagerId, deptMgrId, employeeIds]
                );
                // Remove from M:M junction for unassigned employees
                for (const row of removedRes.rows) {
                    await pool.query(
                        'DELETE FROM employee_managers WHERE employee_id = $1 AND manager_id = $2',
                        [row.id, deptMgrId]
                    );
                    // Re-link to AreaManager in junction table
                    await pool.query(
                        'INSERT INTO employee_managers (employee_id, manager_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [row.id, areaManagerId]
                    );
                }
            }
        } else {
            // No employees selected → unassign everyone from this DeptManager
            if (areaManagerId) {
                const removedAllRes = await pool.query(
                    `SELECT id FROM users WHERE parent_manager_id = $1 AND role = 'EMPLOYEE'`,
                    [deptMgrId]
                );
                await pool.query(
                    `UPDATE users SET parent_manager_id = $1
                     WHERE parent_manager_id = $2 AND role = 'EMPLOYEE'`,
                    [areaManagerId, deptMgrId]
                );
                // Update M:M junction: remove from DeptMgr, re-link to AreaManager
                for (const row of removedAllRes.rows) {
                    await pool.query(
                        'DELETE FROM employee_managers WHERE employee_id = $1 AND manager_id = $2',
                        [row.id, deptMgrId]
                    );
                    await pool.query(
                        'INSERT INTO employee_managers (employee_id, manager_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [row.id, areaManagerId]
                    );
                }
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('❌ PUT /users/:id/assign-employees error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /users/:id/assign-employees-to-manager
// BIG_BOSS assigns employees (by ID) to a MANAGER or SUPERVISOR within the same company.
app.put('/users/:id/assign-employees-to-manager', authenticateToken, async (req, res) => {
    try {
        const isBigBoss = req.user.role === 'BIG_BOSS';
        const isCompanyManager = req.user.role === 'COMPANY_MANAGER';
        if (!isBigBoss && !isCompanyManager) return res.status(403).json({ error: 'Unauthorized' });

        const managerId = parseInt(req.params.id);
        if (isNaN(managerId)) return res.status(400).json({ error: 'Invalid ID' });

        let mgrRes;
        if (isCompanyManager) {
            // COMPANY_MANAGER: only validate that target belongs to the same company — no role restriction.
            const callerCompRes = await pool.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
            const callerCompanyId = callerCompRes.rows[0]?.company_id;
            if (!callerCompanyId) return res.status(403).json({ error: 'Unauthorized: no company assigned' });
            mgrRes = await pool.query(
                `SELECT id, company_id FROM users WHERE id = $1 AND company_id = $2`,
                [managerId, callerCompanyId]
            );
        } else {
            // BIG_BOSS: original role-scoped lookup
            mgrRes = await pool.query(
                `SELECT id, company_id FROM users WHERE id = $1 AND role IN ('MANAGER', 'SUPERVISOR')`,
                [managerId]
            );
        }
        if (mgrRes.rows.length === 0) return res.status(404).json({ error: 'Manager not found' });
        const mgr = mgrRes.rows[0];

        const rawIds = req.body.employeeIds;
        const employeeIds = Array.isArray(rawIds)
            ? rawIds.map(Number).filter(n => Number.isInteger(n) && n > 0)
            : [];

        // M:M diff: only manage the junction table rows for this manager —
        // never wipe parent_manager_id (an employee can be assigned to multiple managers).
        const currentAssignRes = await pool.query(
            `SELECT employee_id FROM employee_managers WHERE manager_id = $1`,
            [managerId]
        );
        const currentAssignIds = currentAssignRes.rows.map(r => r.employee_id);

        // Remove employees NOT in the new list from this manager's junction rows only
        const toRemove = currentAssignIds.filter(id => !employeeIds.includes(id));
        if (toRemove.length > 0) {
            await pool.query(
                `DELETE FROM employee_managers WHERE manager_id = $1 AND employee_id = ANY($2::int[])`,
                [managerId, toRemove]
            );
        }

        // Add new assignments to junction table
        for (const empId of employeeIds) {
            await pool.query(
                'INSERT INTO employee_managers (employee_id, manager_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [empId, managerId]
            );
        }

        // Set parent_manager_id only for employees who have no primary manager yet —
        // preserves existing M:M relationships for employees shared across managers.
        if (employeeIds.length > 0) {
            await pool.query(
                `UPDATE users SET parent_manager_id = $1
                 WHERE id = ANY($2::int[]) AND role = 'EMPLOYEE' AND company_id = $3
                   AND parent_manager_id IS NULL`,
                [managerId, employeeIds, mgr.company_id]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error('❌ PUT /users/:id/assign-employees-to-manager error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// 🏢 Company CRUD Endpoints (Multi-Tenant)
// ==========================================

// GET /companies — BIG_BOSS sees all; others see only their own company
app.get('/companies', authenticateToken, async (req, res) => {
    try {
        let result;
        if (req.user.role === 'BIG_BOSS') {
            result = await pool.query('SELECT * FROM companies ORDER BY id ASC');
        } else {
            // Any other role: return the company linked to the calling user
            const userRes = await pool.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
            const companyId = userRes.rows[0]?.company_id;
            if (!companyId) return res.json([]);
            result = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        }
        res.json(result.rows ?? []);
    } catch (err) {
        console.error('GET /companies error:', err.message);
        res.json([]);
    }
});

// POST /companies — BIG_BOSS only; optionally attach profile image + optional COMPANY_MANAGER creation
app.post('/companies', authenticateToken, upload.single('profile_image'), async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'BIG_BOSS only' });
    try {
        const {
            name, name_en, name_he, name_th, default_notification_lang,
            // Optional COMPANY_MANAGER fields
            manager_name_en, manager_name_he, manager_name_th,
            manager_email, manager_password, manager_phone, manager_line_id,
        } = req.body;
        const primaryName = name_en || name_he || name || '';
        if (!primaryName) return res.status(400).json({ error: 'Company name is required' });
        const imageUrl = req.file ? (req.file.path || req.file.secure_url || null) : null;
        const notifLang = default_notification_lang || 'en';
        const result = await pool.query(
            'INSERT INTO companies (name, name_en, name_he, name_th, profile_image_url, default_notification_lang) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [primaryName, name_en || null, name_he || null, name_th || null, imageUrl, notifLang]
        );
        const company = result.rows[0];

        // Optionally create the initial COMPANY_MANAGER for this company
        if (manager_email && manager_password && manager_name_en) {
            try {
                const bcrypt = require('bcrypt');
                const hashedPw = await bcrypt.hash(manager_password, 10);
                const newMgr = await pool.query(
                    `INSERT INTO users
                        (full_name, full_name_en, full_name_he, full_name_th, email, password, role, phone, line_user_id, company_id, preferred_language)
                     VALUES ($1, $2, $3, $4, $5, $6, 'COMPANY_MANAGER', $7, $8, $9, $10) RETURNING id`,
                    [manager_name_en, manager_name_en, manager_name_he || null, manager_name_th || null,
                     manager_email.toLowerCase(), hashedPw,
                     manager_phone || null, manager_line_id || null, company.id, notifLang]
                );
                // Set area_id = own id so this manager can scope their own team
                await pool.query('UPDATE users SET area_id = id WHERE id = $1', [newMgr.rows[0].id]);
                // Send welcome email (best-effort)
                try { await sendWelcomeEmail(manager_email, manager_name_en, manager_password, 'COMPANY_MANAGER', notifLang); } catch (_) {}
            } catch (mgrErr) {
                console.error('POST /companies — manager creation failed:', mgrErr.message);
                // Return company even if manager creation failed; client can create manager separately
            }
        }

        res.json(company);
    } catch (err) {
        console.error('POST /companies error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /companies/:id — BIG_BOSS only; update name and/or profile image
app.put('/companies/:id', authenticateToken, upload.single('profile_image'), async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'BIG_BOSS only' });
    try {
        const { id } = req.params;
        const { name, name_en, name_he, name_th, default_notification_lang } = req.body;
        const existing = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Company not found' });

        const ex = existing.rows[0];
        const newNameEn = name_en !== undefined ? (name_en || null) : ex.name_en;
        const newNameHe = name_he !== undefined ? (name_he || null) : ex.name_he;
        const newNameTh = name_th !== undefined ? (name_th || null) : ex.name_th;
        const newName   = name_en || name_he || name || ex.name;
        const newNotifLang = default_notification_lang || ex.default_notification_lang || 'en';
        const newImage = req.file
            ? (req.file.path || req.file.secure_url || null)
            : (req.body.existing_image || ex.profile_image_url);

        const result = await pool.query(
            'UPDATE companies SET name = $1, name_en = $2, name_he = $3, name_th = $4, profile_image_url = $5, default_notification_lang = $6, updated_at = NOW() WHERE id = $7 RETURNING *',
            [newName, newNameEn, newNameHe, newNameTh, newImage, newNotifLang, id]
        );
        const updatedCompany = result.rows[0];

        // Nested update: if manager fields provided, update the associated COMPANY_MANAGER user
        const { manager_name_en, manager_name_he, manager_name_th,
                manager_email, manager_password, manager_phone, manager_line_id } = req.body;
        const hasManagerUpdate = manager_name_en !== undefined || manager_name_he !== undefined ||
            manager_name_th !== undefined || manager_email || manager_password ||
            manager_phone !== undefined || manager_line_id !== undefined;

        if (hasManagerUpdate) {
            const mgrRes = await pool.query(
                'SELECT * FROM users WHERE company_id = $1 AND role = $2 LIMIT 1',
                [id, 'COMPANY_MANAGER']
            );
            if (mgrRes.rows.length > 0) {
                const mgr = mgrRes.rows[0];
                const setClauses = [];
                const vals = [];
                let pi = 1;

                const newMgrNameEn = manager_name_en !== undefined ? (manager_name_en || null) : mgr.full_name_en;
                const newMgrName   = newMgrNameEn || mgr.full_name;
                setClauses.push(`full_name=$${pi++}`);    vals.push(newMgrName);
                setClauses.push(`full_name_en=$${pi++}`); vals.push(newMgrNameEn);
                setClauses.push(`full_name_he=$${pi++}`); vals.push(manager_name_he !== undefined ? (manager_name_he || null) : mgr.full_name_he);
                setClauses.push(`full_name_th=$${pi++}`); vals.push(manager_name_th !== undefined ? (manager_name_th || null) : mgr.full_name_th);
                if (manager_email)              { setClauses.push(`email=$${pi++}`);        vals.push(manager_email.toLowerCase()); }
                if (manager_phone !== undefined){ setClauses.push(`phone=$${pi++}`);        vals.push(manager_phone || null); }
                if (manager_line_id !== undefined){ setClauses.push(`line_user_id=$${pi++}`); vals.push(manager_line_id || null); }
                if (manager_password && manager_password.trim()) {
                    const hashedPw = await bcrypt.hash(manager_password.trim(), 10);
                    setClauses.push(`password=$${pi++}`); vals.push(hashedPw);
                }
                vals.push(mgr.id);
                await pool.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id=$${pi}`, vals);
            }
        }

        res.json(updatedCompany);
    } catch (err) {
        console.error('PUT /companies/:id error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /companies/:id — BIG_BOSS only; nullifies company_id on all linked records
app.delete('/companies/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'BIG_BOSS only' });
    try {
        const { id } = req.params;
        // Nullify FK references before deleting (ON DELETE SET NULL handles this too, but be explicit)
        await pool.query('UPDATE users      SET company_id = NULL WHERE company_id = $1', [id]);
        await pool.query('UPDATE tasks      SET company_id = NULL WHERE company_id = $1', [id]);
        await pool.query('UPDATE locations  SET company_id = NULL WHERE company_id = $1', [id]);
        await pool.query('UPDATE categories SET company_id = NULL WHERE company_id = $1', [id]);
        await pool.query('UPDATE assets     SET company_id = NULL WHERE company_id = $1', [id]);
        await pool.query('DELETE FROM companies WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /companies/:id error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Company Deletion 2FA Flow ──────────────────────────────────────────────

// GET /companies/:id/check-deletion — BIG_BOSS only; returns entity counts + isDeletable flag
app.get('/companies/:id/check-deletion', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'BIG_BOSS only' });
    try {
        const { id } = req.params;
        const [usersRes, tasksRes, locsRes, catsRes, assetsRes] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM users WHERE company_id = $1 AND role IN ('COMPANY_MANAGER','MANAGER','EMPLOYEE')", [id]),
            pool.query('SELECT COUNT(*) FROM tasks WHERE company_id = $1', [id]),
            pool.query('SELECT COUNT(*) FROM locations WHERE company_id = $1', [id]),
            pool.query('SELECT COUNT(*) FROM categories WHERE company_id = $1', [id]),
            pool.query('SELECT COUNT(*) FROM assets WHERE company_id = $1', [id]),
        ]);
        const counts = {
            users:      parseInt(usersRes.rows[0].count),
            tasks:      parseInt(tasksRes.rows[0].count),
            locations:  parseInt(locsRes.rows[0].count),
            categories: parseInt(catsRes.rows[0].count),
            assets:     parseInt(assetsRes.rows[0].count),
        };
        const isDeletable = Object.values(counts).every(c => c === 0);
        res.json({ isDeletable, counts });
    } catch (err) {
        console.error('GET /companies/:id/check-deletion error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /companies/:id/request-deletion — BIG_BOSS only; emails a time-limited confirmation link
app.post('/companies/:id/request-deletion', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'BIG_BOSS only' });
    try {
        const { id } = req.params;
        const companyRes = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
        if (companyRes.rows.length === 0) return res.status(404).json({ error: 'Company not found' });
        const company = companyRes.rows[0];

        // Re-verify company is still empty before sending the link
        const [usersRes, tasksRes, locsRes, catsRes, assetsRes] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM users WHERE company_id = $1 AND role IN ('COMPANY_MANAGER','MANAGER','EMPLOYEE')", [id]),
            pool.query('SELECT COUNT(*) FROM tasks WHERE company_id = $1', [id]),
            pool.query('SELECT COUNT(*) FROM locations WHERE company_id = $1', [id]),
            pool.query('SELECT COUNT(*) FROM categories WHERE company_id = $1', [id]),
            pool.query('SELECT COUNT(*) FROM assets WHERE company_id = $1', [id]),
        ]);
        const totals = [usersRes, tasksRes, locsRes, catsRes, assetsRes].map(r => parseInt(r.rows[0].count));
        if (totals.some(c => c > 0)) return res.status(409).json({ error: 'Company still has associated data. Please remove all entities first.' });

        // Fetch BIG_BOSS email from DB (req.user comes from JWT — email may be stale)
        const userRes = await pool.query('SELECT email, full_name FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'Requesting user not found' });
        const { email, full_name } = userRes.rows[0];

        // Generate a 15-minute deletion token
        const deletionToken = jwt.sign(
            { company_id: id, action: 'delete_company', requested_by: req.user.id },
            SECRET_KEY,
            { expiresIn: '15m' }
        );

        const APP_URL = process.env.APP_URL || 'https://maintenance-app-staging.onrender.com';
        const confirmLink = `${APP_URL}/api/companies/confirm-delete?token=${deletionToken}`;
        const companyLabel = company.name_en || company.name_he || company.name || `#${id}`;

        await transporter.sendMail({
            from: `"Maintenance App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Confirm Company Deletion',
            html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                    <h2 style="color:#dc2626;margin-top:0;">Confirm Company Deletion</h2>
                    <p>Hi <strong>${full_name}</strong>,</p>
                    <p>You requested to permanently delete the company <strong>"${companyLabel}"</strong>.</p>
                    <p>This action is <strong>irreversible</strong>. Click the button below within <strong>15 minutes</strong> to confirm:</p>
                    <p style="margin:28px 0;">
                        <a href="${confirmLink}"
                           style="background:#dc2626;color:#fff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
                            Confirm Deletion
                        </a>
                    </p>
                    <p style="color:#6b7280;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
                </div>
            `,
        });

        res.json({ success: true, message: 'Confirmation email sent' });
    } catch (err) {
        console.error('POST /companies/:id/request-deletion error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /companies/confirm-delete?token=... — Email link handler; verifies JWT and permanently deletes company
app.get('/companies/confirm-delete', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send('<h2 style="font-family:sans-serif;color:#dc2626;">Invalid or missing token.</h2>');
    const APP_URL = process.env.APP_URL || 'https://maintenance-app-staging.onrender.com';
    try {
        let payload;
        try {
            payload = jwt.verify(token, SECRET_KEY);
        } catch (verifyErr) {
            if (verifyErr.name === 'TokenExpiredError') {
                return res.status(410).send('<h2 style="font-family:sans-serif;color:#dc2626;">This link has expired. Please request a new deletion confirmation from the app.</h2>');
            }
            return res.status(400).send('<h2 style="font-family:sans-serif;color:#dc2626;">Invalid token.</h2>');
        }

        if (payload.action !== 'delete_company') {
            return res.status(400).send('<h2 style="font-family:sans-serif;color:#dc2626;">Invalid token action.</h2>');
        }

        const { company_id } = payload;
        const companyRes = await pool.query('SELECT name, name_en FROM companies WHERE id = $1', [company_id]);
        if (companyRes.rows.length === 0) {
            return res.redirect(`${APP_URL}?deleted=already`);
        }

        // Execute the permanent deletion
        await pool.query('UPDATE users      SET company_id = NULL WHERE company_id = $1', [company_id]);
        await pool.query('UPDATE tasks      SET company_id = NULL WHERE company_id = $1', [company_id]);
        await pool.query('UPDATE locations  SET company_id = NULL WHERE company_id = $1', [company_id]);
        await pool.query('UPDATE categories SET company_id = NULL WHERE company_id = $1', [company_id]);
        await pool.query('UPDATE assets     SET company_id = NULL WHERE company_id = $1', [company_id]);
        await pool.query('DELETE FROM companies WHERE id = $1', [company_id]);

        return res.redirect(`${APP_URL}?deleted=1`);
    } catch (err) {
        console.error('GET /companies/confirm-delete error:', err.message);
        return res.status(500).send('<h2 style="font-family:sans-serif;color:#dc2626;">Server error. Please try again.</h2>');
    }
});

app.delete('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    try {
      const { id } = req.params;

      // Fetch the target user's role — subordinate constraint only applies to MANAGER, not COMPANY_MANAGER
      const targetRes = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
      if (!targetRes.rows.length) return res.status(404).json({ error: 'User not found' });
      const targetRole = targetRes.rows[0].role;

      if (targetRole === 'MANAGER') {
          const subordinates = await pool.query('SELECT count(*) FROM users WHERE parent_manager_id = $1', [id]);
          const count = parseInt(subordinates.rows[0].count);
          if (count > 0) {
              return res.status(400).json({
                  error: `לא ניתן למחוק מנהל זה! יש לו ${count} עובדים משויכים. אנא מחק אותם תחילה או העבר אותם למנהל אחר.`
              });
          }
      }

      await pool.query('UPDATE locations SET created_by = NULL WHERE created_by = $1', [id]);
      await pool.query('UPDATE categories SET created_by = NULL WHERE created_by = $1', [id]);
      await pool.query('UPDATE assets SET created_by = NULL WHERE created_by = $1', [id]);
      await pool.query('UPDATE location_fields SET created_by = NULL WHERE created_by = $1', [id]);
      await pool.query('DELETE FROM tasks WHERE worker_id = $1', [id]);
      await pool.query('DELETE FROM users WHERE id = $1', [id]);

      res.json({ success: true });
    } catch (err) { console.error("❌ Error deleting user:", err); res.status(500).json({ error: "תקלה במחיקה", detail: err.message }); }
});

app.get('/managers', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT id, full_name, full_name_he, full_name_en, full_name_th,
             email, phone, role,
             COALESCE(area_id, NULL)             AS area_id,
             company_id,
             profile_picture_url,
             COALESCE(can_manage_fields, TRUE)   AS can_manage_fields,
             COALESCE(auto_approve_tasks, FALSE) AS auto_approve_tasks,
             COALESCE(stuck_skip_approval, FALSE) AS stuck_skip_approval,
             COALESCE(allowed_lang_he, TRUE)     AS allowed_lang_he,
             COALESCE(allowed_lang_en, TRUE)     AS allowed_lang_en,
             COALESCE(allowed_lang_th, TRUE)     AS allowed_lang_th
      FROM users
      WHERE role IN ('MANAGER','COMPANY_MANAGER','BIG_BOSS')
    `;
    const params = [];

    // BIG_BOSS: absolute bypass — sees ALL managers across all areas
    if (req.user.role !== 'BIG_BOSS') {
      const areaId = req.user.role === 'MANAGER' ? req.user.id : (req.user.area_id ?? null);
      if (areaId) {
        query += ` AND (area_id = $1 OR area_id IS NULL OR role = 'BIG_BOSS')`;
        params.push(areaId);
      }
    }

    query += ` ORDER BY role, full_name`;
    const result = await pool.query(query, params);
    res.json(result.rows ?? []);
  } catch (err) {
    console.error('GET /managers error:', err.message);
    // Return safe empty state instead of crashing the UI
    res.json([]);
  }
});

// ==========================================
// ניהול שדות מותאמים אישית למיקומים
// ==========================================
app.get('/location-fields', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM location_fields ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { console.error('GET /location-fields error:', err.message); res.json([]); }
});

app.post('/location-fields', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, type, created_by } = req.body;
        const ownerId = created_by || req.user.id;
        const result = await pool.query(
            'INSERT INTO location_fields (name, type, created_by) VALUES ($1, $2, $3) RETURNING *',
            [name, type, ownerId]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).send('Error adding field'); }
});

app.delete('/location-fields/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM location_fields WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error deleting field'); }
});

// ==========================================
// ניהול מיקומים
// ==========================================
app.get('/locations', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT locations.*, locations.company_id, users.full_name as creator_name
            FROM locations
            LEFT JOIN users ON locations.created_by = users.id
        `;
        let params = [];
        // ?manager_id=X: legacy backward-compat — filter by created_by
        if (req.query.manager_id) {
            query += ` WHERE locations.created_by = $1`;
            params.push(req.query.manager_id);
        } else if (req.query.area_id) {
            query += ` WHERE (locations.area_id = $1 OR locations.area_id IS NULL)`;
            params.push(req.query.area_id);
        } else if (req.user.role === 'BIG_BOSS') {
            if (req.query.company_id) {
                query += ` WHERE (locations.company_id = $1 OR (locations.company_id IS NULL AND locations.area_id IN (SELECT id FROM users WHERE company_id = $1 AND role = 'MANAGER')))`;
                params.push(req.query.company_id);
            }
            // else: Admin sees everything — no filter
        } else if (req.user.role === 'COMPANY_MANAGER') {
            // Critical multi-tenant safety: COMPANY_MANAGER must ONLY see their own company's data
            const companyId = req.user.company_id ?? null;
            if (companyId) {
                query += ` WHERE locations.company_id = $1`;
                params.push(companyId);
            } else {
                // Fallback: scope strictly to area, no NULL bypass
                const areaId = req.user.area_id ?? null;
                if (areaId) {
                    query += ` WHERE locations.area_id = $1`;
                    params.push(areaId);
                } else {
                    query += ` WHERE 1=0`; // No scope = no data
                }
            }
        } else {
            // MANAGER, EMPLOYEE: scope strictly to their company_id; area_id fallback only when company_id is unset
            const companyId = req.user.company_id ?? null;
            if (companyId) {
                query += ` WHERE locations.company_id = $1`;
                params.push(companyId);
            } else {
                const areaId = getEffectiveAreaId(req.user);
                if (areaId) {
                    query += ` WHERE (locations.area_id = $1 OR locations.area_id IS NULL)`;
                    params.push(areaId);
                }
            }
        }
        query += ` ORDER BY locations.name ASC`;
        const r = await pool.query(query, params);
        res.json(r.rows);
    } catch (err) { console.error('GET /locations error:', err.message); res.json([]); }
});

// ==========================================
// ניהול מיקומים - חסין תקלות (כולל מפענח עברית לענן!)
// ==========================================
app.post('/locations', authenticateToken, requireAdmin, (req, res) => {
    upload.any()(req, res, async (uploadErr) => {
        if (uploadErr) return res.status(500).json({ error: "שגיאת קובץ: " + uploadErr.message });
        
        try {
            let { name, name_he, name_en, name_th, map_link, dynamic_fields, created_by, existing_image } = req.body;
            const primaryName = name_en || name_he || name || '';
            if (!primaryName) return res.status(400).json({ error: "שם המיקום חובה" });

            const ownerId = (created_by && created_by !== 'null') ? parseInt(created_by, 10) : req.user.id;
            const check = await pool.query('SELECT id FROM locations WHERE name = $1 AND created_by = $2', [primaryName, ownerId]);
            if (check.rows.length > 0) return res.status(400).json({ error: "כפילות: מיקום כבר קיים" });

            // Determine area_id and company_id first — needed for company-scoped code generation
            let locAreaId = null;
            let locCompanyId = null;
            if (req.user.role === 'MANAGER') {
                locAreaId = req.user.id;
                const coRes = await pool.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
                locCompanyId = coRes.rows[0]?.company_id ?? null;
            } else if (req.user.role === 'COMPANY_MANAGER') {
                locAreaId = req.user.area_id ?? null;
                locCompanyId = req.user.company_id ?? null;
            } else if (req.user.role === 'BIG_BOSS' && ownerId !== req.user.id) {
                const ownerRes = await pool.query('SELECT area_id, role, company_id FROM users WHERE id = $1', [ownerId]);
                const owner = ownerRes.rows[0];
                locAreaId = owner?.area_id || (owner?.role === 'MANAGER' ? ownerId : null);
                locCompanyId = owner?.company_id ?? null;
            }

            // Generate LOC-XXXX code scoped to company_id (consistent with bulk-import)
            const codeQ = locCompanyId
                ? "SELECT code FROM locations WHERE code LIKE 'LOC-%' AND company_id = $1"
                : "SELECT code FROM locations WHERE code LIKE 'LOC-%' AND created_by = $1";
            const codeP = locCompanyId ? [locCompanyId] : [ownerId];
            const locs = await pool.query(codeQ, codeP);
            let max = 0;
            locs.rows.forEach(r => { if(r.code) { let num = parseInt((r.code || '').split('-')[1]); if (!isNaN(num) && num > max) max = num; } });
            const generatedCode = `LOC-${String(max + 1).padStart(4, '0')}`;

            let mainImageUrl = (existing_image && existing_image !== 'null') ? existing_image : null;
            let parsedDynamicFields = [];
            try { if (dynamic_fields && dynamic_fields !== 'null') parsedDynamicFields = JSON.parse(dynamic_fields); } catch(e){}

            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    const fileUrl = file.secure_url || file.path;
                    if (file.fieldname === 'main_image') {
                        mainImageUrl = fileUrl;
                    } else if (file.fieldname.startsWith('dynamic_')) {
                        // 🚀 התיקון הענק: פקודת הפענוח שמתרגמת את הג'יבריש חזרה לשם השדה!
                        const fieldId = decodeURIComponent(file.fieldname.replace('dynamic_', ''));
                        const fieldObj = parsedDynamicFields.find(f => String(f.id) === String(fieldId) || f.name === fieldId);
                        if (fieldObj) fieldObj.value = fileUrl;
                    }
                });
            }

            const r = await pool.query(
                `INSERT INTO locations (name, name_he, name_en, name_th, created_by, code, image_url, coordinates, dynamic_fields, area_id, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [primaryName, name_he || null, name_en || null, name_th || null, ownerId, generatedCode, mainImageUrl, JSON.stringify({ link: map_link }), JSON.stringify(parsedDynamicFields), locAreaId, locCompanyId]
            );
            res.json(r.rows[0]); 
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
});

app.put('/locations/:id', authenticateToken, requireAdmin, (req, res) => {
    upload.any()(req, res, async (uploadErr) => {
        if (uploadErr) return res.status(500).json({ error: "שגיאת קובץ: " + uploadErr.message });
        try {
            let { name, name_he, name_en, name_th, map_link, dynamic_fields, existing_image } = req.body;
            const primaryName = name_en || name_he || name || '';
            let mainImageUrl = (existing_image && existing_image !== 'null') ? existing_image : null;
            let parsedDynamicFields = [];
            try { if (dynamic_fields && dynamic_fields !== 'null') parsedDynamicFields = JSON.parse(dynamic_fields); } catch(e){}

            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    const fileUrl = file.secure_url || file.path;
                    if (file.fieldname === 'main_image') {
                        mainImageUrl = fileUrl;
                    } else if (file.fieldname.startsWith('dynamic_')) {
                        // 🚀 התיקון הענק: פקודת הפענוח שמתרגמת את הג'יבריש חזרה לשם השדה!
                        const fieldId = decodeURIComponent(file.fieldname.replace('dynamic_', ''));
                        const fieldObj = parsedDynamicFields.find(f => String(f.id) === String(fieldId) || f.name === fieldId);
                        if (fieldObj) fieldObj.value = fileUrl;
                    }
                });
            }

            const r = await pool.query(
                `UPDATE locations SET name=$1, name_he=$2, name_en=$3, name_th=$4, image_url=$5, coordinates=$6, dynamic_fields=$7 WHERE id=$8 RETURNING *`,
                [primaryName, name_he || null, name_en || null, name_th || null, mainImageUrl, JSON.stringify({ link: map_link }), JSON.stringify(parsedDynamicFields), req.params.id]
            );
            res.json(r.rows[0]); 
        } catch (e) { res.status(500).json({ error: e.message }); }
    });
});

// ==========================================
// ניהול קטגוריות
// ==========================================
app.get('/categories', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT categories.*, categories.company_id, users.full_name as creator_name
            FROM categories
            LEFT JOIN users ON categories.created_by = users.id
        `;
        let params = [];
        if (req.user.role === 'BIG_BOSS') {
            if (req.query.company_id) {
                query += ` WHERE (categories.company_id = $1 OR (categories.company_id IS NULL AND categories.area_id IN (SELECT id FROM users WHERE company_id = $1 AND role = 'MANAGER')))`;
                params.push(req.query.company_id);
            }
        } else if (req.user.role === 'COMPANY_MANAGER') {
            // Critical multi-tenant safety: COMPANY_MANAGER must ONLY see their own company's data
            const companyId = req.user.company_id ?? null;
            if (companyId) {
                query += ` WHERE categories.company_id = $1`;
                params.push(companyId);
            } else {
                const areaId = req.user.area_id ?? null;
                if (areaId) {
                    query += ` WHERE categories.area_id = $1`;
                    params.push(areaId);
                } else {
                    query += ` WHERE 1=0`;
                }
            }
        } else {
            // MANAGER, EMPLOYEE: scope strictly to their company_id; area_id fallback only when company_id is unset
            const companyId = req.user.company_id ?? null;
            if (companyId) {
                query += ` WHERE categories.company_id = $1`;
                params.push(companyId);
            } else {
                const areaId = getEffectiveAreaId(req.user);
                if (areaId) {
                    query += ` WHERE (categories.area_id = $1 OR categories.area_id IS NULL)`;
                    params.push(areaId);
                }
            }
        }
        query += ` ORDER BY categories.name`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { console.error('GET /categories error:', err.message); res.json([]); }
});

const CATEGORY_CODE_RE = /^[a-zA-Z]{1,5}$/;

app.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, name_he, name_en, name_th, code, created_by } = req.body;
        const ownerId = created_by || req.user.id;
        const primaryName = name_en || name_he || name || '';

        if (code && !CATEGORY_CODE_RE.test(code)) {
            return res.status(400).json({ error: 'Code must be 1-5 English letters' });
        }

        const check = await pool.query('SELECT id FROM categories WHERE name = $1 AND created_by = $2', [primaryName, ownerId]);
        if (check.rows.length > 0) return res.status(400).json({ error: "כפילות: קטגוריה בשם זה כבר קיימת אצלך במערכת!" });

        let catAreaId = null;
        let catCompanyId = null;
        if (req.user.role === 'MANAGER') {
            catAreaId = req.user.id;
            const coRes = await pool.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
            catCompanyId = coRes.rows[0]?.company_id ?? null;
        } else if (req.user.role === 'COMPANY_MANAGER') {
            catAreaId = req.user.area_id ?? null;
            catCompanyId = req.user.company_id ?? null;
        } else if (req.user.role === 'BIG_BOSS' && ownerId !== req.user.id) {
            const ownerRes = await pool.query('SELECT area_id, role, company_id FROM users WHERE id = $1', [ownerId]);
            const owner = ownerRes.rows[0];
            catAreaId = owner?.area_id || (owner?.role === 'MANAGER' ? parseInt(ownerId) : null);
            catCompanyId = owner?.company_id ?? null;
        }

        const result = await pool.query(
            'INSERT INTO categories (name, name_he, name_en, name_th, code, created_by, area_id, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [primaryName, name_he || null, name_en || null, name_th || null, code, ownerId, catAreaId, catCompanyId]
        );
        res.json(result.rows[0]); 
    } catch (err) { 
        if (err.code === '23505') return res.status(400).json({ error: "כפילות: הערך כבר קיים במערכת." });
        res.status(500).json({ error: "DB Error: " + err.message }); 
    }
});

app.put('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, name_he, name_en, name_th, code } = req.body;
        const primaryName = name_en || name_he || name || '';

        if (code && !CATEGORY_CODE_RE.test(code)) {
            return res.status(400).json({ error: 'Code must be 1-5 English letters' });
        }
        const result = await pool.query(
            'UPDATE categories SET name = $1, name_he = $2, name_en = $3, name_th = $4, code = $5 WHERE id = $6 RETURNING *',
            [primaryName, name_he || null, name_en || null, name_th || null, code, id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).send('Error updating category'); }
});

// ==========================================
// ניהול נכסים
// ==========================================
app.get('/assets', authenticateToken, async (req, res) => {
    try { 
        let query = `
            SELECT assets.*, assets.company_id,
                   categories.name as category_name,
                   COALESCE(categories.name_en, categories.name) as category_name_en,
                   COALESCE(categories.name_he, categories.name) as category_name_he,
                   COALESCE(categories.name_th, categories.name) as category_name_th,
                   users.full_name as creator_name
            FROM assets
            LEFT JOIN categories ON assets.category_id = categories.id
            LEFT JOIN users ON assets.created_by = users.id
        `;
        let params = [];
        if (req.user.role === 'BIG_BOSS') {
            if (req.query.company_id) {
                query += ` WHERE (assets.company_id = $1 OR (assets.company_id IS NULL AND assets.area_id IN (SELECT id FROM users WHERE company_id = $1 AND role = 'MANAGER')))`;
                params.push(req.query.company_id);
            }
        } else if (req.user.role === 'COMPANY_MANAGER') {
            // Critical multi-tenant safety: COMPANY_MANAGER must ONLY see their own company's data
            const companyId = req.user.company_id ?? null;
            if (companyId) {
                query += ` WHERE assets.company_id = $1`;
                params.push(companyId);
            } else {
                const areaId = req.user.area_id ?? null;
                if (areaId) {
                    query += ` WHERE assets.area_id = $1`;
                    params.push(areaId);
                } else {
                    query += ` WHERE 1=0`;
                }
            }
        } else {
            // MANAGER, EMPLOYEE: scope strictly to their company_id; area_id fallback only when company_id is unset
            const companyId = req.user.company_id ?? null;
            if (companyId) {
                query += ` WHERE assets.company_id = $1`;
                params.push(companyId);
            } else {
                const areaId = getEffectiveAreaId(req.user);
                if (areaId) {
                    query += ` WHERE (assets.area_id = $1 OR assets.area_id IS NULL)`;
                    params.push(areaId);
                }
            }
        }
        query += ` ORDER BY assets.code`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { console.error('GET /assets error:', err.message); res.json([]); }
});

app.post('/assets', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, name_he, name_en, name_th, code, category_id, location_id, created_by } = req.body;
        const ownerId = created_by || req.user.id;
        const primaryName = name_en || name_he || name || '';

        // Auto-generate a unique code server-side — never reject with a duplicate error
        let finalCode = (code && String(code).trim()) ? String(code).trim() : null;
        if (category_id) {
            const catRes = await pool.query('SELECT code FROM categories WHERE id = $1', [category_id]);
            if (catRes.rows.length > 0) {
                const catCode = (catRes.rows[0].code || 'GEN').toUpperCase();
                const isDuplicate = finalCode
                    ? (await pool.query('SELECT id FROM assets WHERE code = $1', [finalCode])).rows.length > 0
                    : true;
                if (!finalCode || isDuplicate) {
                    const existing = await pool.query(
                        "SELECT code FROM assets WHERE code ~ $1",
                        [`^${catCode}-[0-9]+$`]
                    );
                    let maxNum = 0;
                    existing.rows.forEach(r => {
                        const parts = r.code.split('-');
                        if (parts.length === 2) {
                            const n = parseInt(parts[1]);
                            if (!isNaN(n) && n > maxNum) maxNum = n;
                        }
                    });
                    finalCode = `${catCode}-${String(maxNum + 1).padStart(4, '0')}`;
                }
            }
        }

        let assetAreaId = null;
        let assetCompanyId = null;
        if (req.user.role === 'MANAGER') {
            assetAreaId = req.user.id;
            const coRes = await pool.query('SELECT company_id FROM users WHERE id = $1', [req.user.id]);
            assetCompanyId = coRes.rows[0]?.company_id ?? null;
        } else if (req.user.role === 'COMPANY_MANAGER') {
            assetAreaId = req.user.area_id ?? null;
            assetCompanyId = req.user.company_id ?? null;
        } else if (req.user.role === 'BIG_BOSS' && ownerId !== req.user.id) {
            const ownerRes = await pool.query('SELECT area_id, role, company_id FROM users WHERE id = $1', [ownerId]);
            const owner = ownerRes.rows[0];
            assetAreaId = owner?.area_id || (owner?.role === 'MANAGER' ? parseInt(ownerId) : null);
            assetCompanyId = owner?.company_id ?? null;
        }

        const result = await pool.query(
            `INSERT INTO assets (name, name_he, name_en, name_th, code, category_id, location_id, created_by, area_id, company_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [primaryName, name_he || null, name_en || null, name_th || null, finalCode, category_id, location_id || null, ownerId, assetAreaId, assetCompanyId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "כפילות: הערך כבר קיים במערכת." });
        res.status(500).send('Error saving asset');
    }
});

app.put('/assets/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, name_he, name_en, name_th, category_id, location_id } = req.body;
        const primaryName = name_en || name_he || name || '';
        const result = await pool.query(
            'UPDATE assets SET name = $1, name_he = $2, name_en = $3, name_th = $4, category_id = $5, location_id = $6 WHERE id = $7 RETURNING *',
            [primaryName, name_he || null, name_en || null, name_th || null, category_id, location_id || null, id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).send('Error updating asset'); }
});

const deleteItem = async (table, id, res) => {
    try { await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]); res.json({ success: true }); }
    catch (e) { res.status(400).json({ error: "Cannot delete: Item is in use." }); }
};

app.delete('/locations/:id', authenticateToken, requireAdmin, async (req, res) => {
    const id = req.params.id;
    const companyId = req.user.company_id;
    try {
        // Pre-deletion check — scoped strictly to this tenant to prevent cross-company FK bleed
        const [assetRes, taskRes] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM assets WHERE location_id = $1 AND company_id = $2', [id, companyId]),
            pool.query('SELECT COUNT(*) FROM tasks  WHERE location_id = $1 AND company_id = $2', [id, companyId]),
        ]);
        const assets = parseInt(assetRes.rows[0].count, 10);
        const tasks  = parseInt(taskRes.rows[0].count, 10);
        if (assets > 0 || tasks > 0) {
            const parts = [];
            if (assets > 0) parts.push(`${assets} asset${assets !== 1 ? 's' : ''}`);
            if (tasks  > 0) parts.push(`${tasks} task${tasks !== 1 ? 's' : ''}`);
            return res.status(400).json({ message: `Cannot delete: This location is currently assigned to ${parts.join(' and ')}.` });
        }
        // Scoped delete — only removes this company's record, immune to other tenants' FK references
        await pool.query('DELETE FROM locations WHERE id = $1 AND company_id = $2', [id, companyId]);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ message: 'Cannot delete: Item is in use.' });
    }
});

app.delete('/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
    const id = req.params.id;
    const companyId = req.user.company_id;
    try {
        await pool.query('DELETE FROM categories WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (e) {
        if (e.code === '23503') {
            const assetRes = await pool.query('SELECT COUNT(*) FROM assets WHERE category_id = $1 AND company_id = $2', [id, companyId]);
            const assets   = parseInt(assetRes.rows[0].count, 10);
            const detail   = assets > 0 ? `${assets} asset${assets !== 1 ? 's' : ''}` : 'other records';
            return res.status(400).json({ message: `Cannot delete: This category is currently assigned to ${detail}.` });
        }
        res.status(400).json({ message: 'Cannot delete: Item is in use.' });
    }
});

app.delete('/assets/:id', authenticateToken, requireAdmin, (req, res) => deleteItem('assets', req.params.id, res));

app.get('/tasks', authenticateToken, async (req, res) => {
    try {
        const { role, id } = req.user;
        let query = `
            SELECT t.*,
                   u.full_name as worker_name,
                   cb.full_name as creator_name,
                   l.name as location_name,
                   COALESCE(l.name_en, l.name) as location_name_en,
                   COALESCE(l.name_he, l.name) as location_name_he,
                   COALESCE(l.name_th, l.name) as location_name_th,
                   a.name as asset_name,
                   COALESCE(a.name_en, a.name) as asset_name_en,
                   COALESCE(a.name_he, a.name) as asset_name_he,
                   COALESCE(a.name_th, a.name) as asset_name_th,
                   a.code as asset_code,
                   c.id as category_id,
                   c.name as category_name,
                   COALESCE(c.name_en, c.name) as category_name_en,
                   COALESCE(c.name_he, c.name) as category_name_he,
                   COALESCE(c.name_th, c.name) as category_name_th
            FROM tasks t
            LEFT JOIN users u ON t.worker_id = u.id
            LEFT JOIN users cb ON t.created_by = cb.id
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN assets a ON t.asset_id = a.id
            LEFT JOIN categories c ON a.category_id = c.id
        `;
        
        if (role === 'EMPLOYEE') {
            query += ` WHERE t.worker_id = $1`;
            const result = await pool.query(query + ` ORDER BY t.due_date ASC`, [id]);
            return res.json(result.rows);
        }

        if (role === 'MANAGER') {
            // MANAGER sees tasks of all employees linked via the M:M employee_managers junction table
            query += ` WHERE t.worker_id IN (SELECT employee_id FROM employee_managers WHERE manager_id = $1)`;
            const result = await pool.query(query + ` ORDER BY t.due_date ASC`, [id]);
            return res.json(result.rows);
        }

        if (role === 'COMPANY_MANAGER') {
            // COMPANY_MANAGER sees tasks of ALL users in their company (MANAGER, COMPANY_MANAGER, EMPLOYEE)
            const companyId = req.user.company_id || null;
            if (companyId) {
                query += ` WHERE t.worker_id IN (SELECT id FROM users WHERE company_id = $1)`;
                const result = await pool.query(query + ` ORDER BY t.due_date ASC`, [companyId]);
                return res.json(result.rows);
            } else {
                query += ` WHERE t.worker_id = $1`;
                const result = await pool.query(query + ` ORDER BY t.due_date ASC`, [id]);
                return res.json(result.rows);
            }
        }

        // BIG_BOSS: optional company_id filter
        let bbParams = [];
        if (req.query.company_id) {
            query += ` WHERE t.worker_id IN (SELECT id FROM users WHERE company_id = $1)`;
            bbParams.push(req.query.company_id);
        }
        const result = await pool.query(query + ` ORDER BY t.due_date ASC`, bbParams);
        res.json(result.rows);
    } catch (err) { console.error(err); res.sendStatus(500); }
});

app.post('/tasks', authenticateToken, upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    const imageUrls = files.map(file => file.secure_url || file.path);
    
    console.log("📝 Creating Task:", { body: req.body, images: imageUrls });

    let { title, urgency, due_date, location_id, assigned_worker_id, description, is_recurring, recurring_type, selected_days, recurring_date, asset_id, quarterly_dates } = req.body;

    if (!location_id || location_id === 'undefined') return res.status(400).json({ error: "Location is required" });
    if (!asset_id || asset_id === 'undefined' || asset_id === 'null') asset_id = null;
    if (!due_date) due_date = new Date();

    const worker_id = (assigned_worker_id && assigned_worker_id !== 'undefined') ? assigned_worker_id : req.user.id;
    const isRecurring = is_recurring === 'true';

    let createdCount = 1;

    if (!isRecurring) {
        await pool.query(
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, images, status, asset_id, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)`,
            [title, location_id, worker_id, urgency, due_date, description, imageUrls, asset_id, req.user.id]
        );
    } else {
        const tasksToInsert = [];
        const start = new Date(due_date);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);

        let daysArray = [];
        if (selected_days) {
            try { daysArray = JSON.parse(selected_days).map(d => parseInt(d)); } catch (e) {}
        }
        const monthlyDate = parseInt(recurring_date) || 1;

        let quarterlyDatesArray = [];
        if (recurring_type === 'quarterly' && quarterly_dates) {
            try { quarterlyDatesArray = JSON.parse(quarterly_dates).filter(d => d); } catch (e) {}
        }

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            let match = false;
            if (recurring_type === 'daily' || recurring_type === 'weekly') {
                if (daysArray.includes(d.getDay())) match = true;
            } else if (recurring_type === 'monthly') {
                if (d.getDate() === monthlyDate) match = true;
            } else if (recurring_type === 'quarterly') {
                const dayMonthStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (quarterlyDatesArray.includes(dayMonthStr)) match = true;
            } else if (recurring_type === 'yearly') {
                if (d.getMonth() === start.getMonth() && d.getDate() === start.getDate()) match = true;
            }

            if (match) tasksToInsert.push(new Date(d));
        }

        if (tasksToInsert.length === 0) return res.status(400).json({ error: "No dates matched!" });

        for (const date of tasksToInsert) {
            await pool.query(
                `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, images, status, asset_id, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9)`,
                [title + ' (Recurring)', location_id, worker_id, urgency, date, description, imageUrls, asset_id, req.user.id]
            );
        }
        createdCount = tasksToInsert.length;
    }
    
    // 🚀 Worker notifications — all 3 channels simultaneously
    try {
        const workerRes = await pool.query(
            'SELECT device_token, preferred_language, line_user_id, parent_manager_id FROM users WHERE id = $1',
            [worker_id]
        );
        const workerData = workerRes.rows[0];
        // Fetch the last inserted task id so we can pass full task object
        const lastTaskRes = await pool.query(
            'SELECT id, title, urgency, due_date FROM tasks WHERE worker_id = $1 ORDER BY id DESC LIMIT 1',
            [worker_id]
        );
        const taskObj = lastTaskRes.rows[0] || { title, urgency, due_date: null };
        await sendNotification(worker_id, ['email', 'line', 'push'], 'tasks_assigned', {
            tasks: [taskObj], taskCount: 1
        });

        // Also notify the worker's manager via LINE (informational only)
        if (workerData?.parent_manager_id) {
            const mgrRes = await pool.query('SELECT line_user_id, preferred_language FROM users WHERE id = $1', [workerData.parent_manager_id]);
            const mgrData = mgrRes.rows[0];
            if (mgrData?.line_user_id) {
                const mgrLang = mgrData.preferred_language || 'en';
                const mgrLineDict = {
                    he: `📋 משימה חדשה נוצרה לעובד שלך: "${title}"`,
                    en: `📋 New task created for your employee: "${title}"`,
                    th: `📋 สร้างงานใหม่ให้พนักงานของคุณ: "${title}"`
                };
                sendLineMessage(mgrData.line_user_id, mgrLineDict[mgrLang] || mgrLineDict.en)
                    .catch(e => console.error('⚠️ Manager LINE notify failed:', e.message));
            }
        }
    } catch (err) {
        console.error("⚠️ Failed to send task notification:", err.message);
    }

    res.json({ message: isRecurring ? `Created ${createdCount} recurring tasks` : "Task created successfully" });

  } catch (err) { 
      console.error("❌ Error creating task:", err); 
      res.status(500).json({ error: "Server Error: " + err.message }); 
  }
});

app.post('/tasks/bulk-excel', authenticateToken, async (req, res) => {
    // Only elevated roles may perform bulk task imports
    if (!['BIG_BOSS', 'COMPANY_MANAGER', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions for bulk task import.' });
    }
    try {
        const { tasks } = req.body;
        if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: "לא נשלחו משימות תקינות." });

        // ── SECURITY: resolve caller scope ──────────────────────────────────
        const callerRole      = req.user.role;
        const callerCompanyId = req.user.company_id ?? null;
        const callerId        = req.user.id;

        // Pre-fetch MANAGER's employee IDs for scope enforcement
        let managerEmployeeIds = null;
        if (callerRole === 'MANAGER') {
            const empRes = await pool.query(
                'SELECT employee_id FROM employee_managers WHERE manager_id = $1', [callerId]
            );
            managerEmployeeIds = new Set(empRes.rows.map(r => r.employee_id));
        }

        let insertedCount = 0;
        const notificationsMap = {};

        for (const task of tasks) {
            // ── Worker ownership check ─────────────────────────────────────
            if (callerRole === 'MANAGER') {
                if (!managerEmployeeIds.has(Number(task.worker_id))) {
                    return res.status(403).json({ error: `Worker id=${task.worker_id} is not assigned to your team.` });
                }
            } else if (callerCompanyId) {
                // COMPANY_MANAGER: worker must belong to same company
                const wCheck = await pool.query(
                    'SELECT company_id FROM users WHERE id = $1', [task.worker_id]
                );
                if (!wCheck.rows[0] || String(wCheck.rows[0].company_id) !== String(callerCompanyId)) {
                    return res.status(403).json({ error: `Worker id=${task.worker_id} does not belong to your company.` });
                }
            }

            if (!notificationsMap[task.worker_id]) notificationsMap[task.worker_id] = 0;

            if (!task.is_recurring) {
                await pool.query(
                    `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, status, asset_id, images, company_id)
                     VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9)`,
                    [task.title, task.location_id, task.worker_id, task.urgency, task.due_date, task.description, task.asset_id, task.images, callerCompanyId]
                );
                insertedCount++;
                notificationsMap[task.worker_id]++;
            } else {
                const start = new Date(task.due_date);
                const end = new Date(start);
                end.setFullYear(end.getFullYear() + 1);

                const tasksToInsert = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    let match = false;

                    if ((task.recurring_type === 'daily' || task.recurring_type === 'weekly') && task.selected_days.includes(d.getDay())) match = true;

                    if (task.recurring_type === 'monthly' && task.monthly_dates.includes(d.getDate())) match = true;

                    if (task.recurring_type === 'quarterly') {
                        const dayMonthStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (task.quarterly_dates && task.quarterly_dates.includes(dayMonthStr)) match = true;
                    }

                    if (task.recurring_type === 'yearly') {
                        const dayMonthStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (task.yearly_dates.includes(dayMonthStr)) match = true;
                    }

                    if (match) tasksToInsert.push(new Date(d));
                }

                for (const date of tasksToInsert) {
                    await pool.query(
                        `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, status, asset_id, images, company_id)
                         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9)`,
                        [task.title + ' (מחזורי)', task.location_id, task.worker_id, task.urgency, date.toISOString(), task.description, task.asset_id, task.images, callerCompanyId]
                    );
                }
                insertedCount += tasksToInsert.length;
                notificationsMap[task.worker_id] += tasksToInsert.length;
            }
        }

        // Notify each worker via all 3 channels with their assigned tasks
        try {
            for (const worker_id of Object.keys(notificationsMap)) {
                const taskCount = notificationsMap[worker_id];
                if (taskCount < 1) continue;
                // Fetch the tasks just inserted for this worker (most recent N)
                const taskRows = await pool.query(
                    'SELECT id, title, urgency, due_date FROM tasks WHERE worker_id = $1 ORDER BY id DESC LIMIT $2',
                    [worker_id, taskCount]
                );
                await sendNotification(parseInt(worker_id), ['email', 'line', 'push'], 'tasks_assigned', {
                    tasks: taskRows.rows, taskCount
                });
            }
        } catch (err) { console.error("⚠️ Failed to send bulk-excel notifications:", err.message); }

        res.json({ success: true, message: `הוכנסו בהצלחה ${insertedCount} משימות.` });

    } catch (err) {
        console.error("Excel Bulk Insert Error:", err);
        res.status(500).json({ error: "שגיאת שרת פנימית בזמן שמירת המשימות." });
    }
});

app.put('/tasks/:id/complete', authenticateToken, upload.single('completion_image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { completion_note } = req.body;
        
        if (!req.file && !completion_note) {
            return res.status(400).json({ error: "Required image or note" });
        }

        const completionImageUrl = req.file ? req.file.path : null;

        // Check if the task's direct manager has auto_approve_tasks enabled
        const managerCheckQuery = `
            SELECT m.auto_approve_tasks, m.device_token, m.line_user_id, m.preferred_language
            FROM tasks t
            JOIN users w ON t.worker_id = w.id
            JOIN users m ON w.parent_manager_id = m.id
            WHERE t.id = $1
        `;
        const managerCheck = await pool.query(managerCheckQuery, [id]);
        const managerRow = managerCheck.rows[0];
        // If manager has auto-approve ON → jump straight to COMPLETED
        const newStatus = managerRow?.auto_approve_tasks ? 'COMPLETED' : 'WAITING_APPROVAL';

        await pool.query(
            `UPDATE tasks SET status = $1, completion_note = $2, completion_image_url = $3 WHERE id = $4`,
            [newStatus, completion_note, completionImageUrl, id]
        );

        // Only notify manager when task still needs manual approval (LINE preferred, push fallback)
        try {
            if (newStatus === 'WAITING_APPROVAL' && managerRow) {
                const mgrLang = managerRow.preferred_language || 'he';
                const completeLineDict = {
                    he: `✅ עובד סיים משימה וממתין לאישורך.`,
                    en: `✅ A worker completed a task and is awaiting your approval.`,
                    th: `✅ พนักงานทำงานเสร็จแล้วและรอการอนุมัติจากคุณ`
                };
                if (managerRow.line_user_id) {
                    await sendLineMessage(managerRow.line_user_id, completeLineDict[mgrLang] || completeLineDict['en']);
                } else if (managerRow.device_token) {
                    await admin.messaging().send({
                        token: managerRow.device_token,
                        notification: {
                            title: 'משימה ממתינה לאישור ✅',
                            body: 'עובד סיים משימה. היכנס לאשר.'
                        },
                        webpush: { fcmOptions: { link: '/' } }
                    });
                    console.log("🔔 Notification sent to manager!");
                }
            }
        } catch (err) {
            console.error("⚠️ Failed to send notification:", err.message);
        }
        
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

app.put('/tasks/:id/approve', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    try {
        await pool.query(`UPDATE tasks SET status = 'COMPLETED' WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

app.put('/tasks/:id/stuck', authenticateToken, upload.single('stuck_file'), async (req, res) => {
    try {
        const { id } = req.params;
        const { stuck_description } = req.body;
        if (!stuck_description || !stuck_description.trim()) {
            return res.status(400).json({ error: "Stuck description (reason) is required." });
        }
        const stuckFileUrl = req.file ? req.file.path : null;

        // Check manager's stuck_skip_approval flag
        const managerCheckQuery = `
            SELECT m.stuck_skip_approval, m.device_token, m.line_user_id, m.preferred_language
            FROM tasks t
            JOIN users w ON t.worker_id = w.id
            JOIN users m ON w.parent_manager_id = m.id
            WHERE t.id = $1
        `;
        const managerCheck = await pool.query(managerCheckQuery, [id]);
        const managerRow = managerCheck.rows[0];

        // If stuck_skip_approval = true → go directly to COMPLETED; otherwise → WAITING_APPROVAL
        const newStatus = managerRow?.stuck_skip_approval ? 'COMPLETED' : 'WAITING_APPROVAL';

        await pool.query(
            `UPDATE tasks SET status = $1, is_stuck = TRUE, stuck_description = $2, stuck_file_url = $3 WHERE id = $4`,
            [newStatus, stuck_description || null, stuckFileUrl, id]
        );

        // Notify manager when task needs manual review
        try {
            if (newStatus === 'WAITING_APPROVAL' && managerRow) {
                const mgrLang = managerRow.preferred_language || 'he';
                const stuckLineDict = {
                    he: `⚠️ עובד דיווח על משימה תקועה וממתינה לאישורך.`,
                    en: `⚠️ A worker reported a stuck task and it is awaiting your review.`,
                    th: `⚠️ พนักงานรายงานงานที่ติดขัดและรอการตรวจสอบจากคุณ`
                };
                if (managerRow.line_user_id) {
                    await sendLineMessage(managerRow.line_user_id, stuckLineDict[mgrLang] || stuckLineDict['en']);
                } else if (managerRow.device_token) {
                    await admin.messaging().send({
                        token: managerRow.device_token,
                        notification: {
                            title: '⚠️ משימה תקועה ממתינה לאישור',
                            body: 'עובד דיווח שנתקל בבעיה. היכנס לבדוק.'
                        },
                        webpush: { fcmOptions: { link: '/' } }
                    });
                }
            }
        } catch (err) {
            console.error("⚠️ Failed to send stuck notification:", err.message);
        }

        res.json({ success: true, status: newStatus });
    } catch (err) { console.error(err); res.status(500).send('Error'); }
});

app.post('/tasks/:id/follow-up', authenticateToken, async (req, res) => {
    try {
        const parentId = req.params.id;
        const { due_date, description } = req.body;

        const parentTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [parentId]);
        const pt = parentTask.rows[0];

        await pool.query(
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, status, parent_task_id, company_id)
             VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)`,
            [`Follow up: ${pt.title}`, pt.location_id, pt.worker_id, 'High', due_date, description, parentId, pt.company_id]
        );

        await pool.query(
            `UPDATE tasks SET status = 'COMPLETED', completion_note = $1 WHERE id = $2`,
            [`Follow up created for ${due_date}`, parentId]
        );

        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).send('Error'); }
});

app.delete('/tasks/delete-all', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).send("Access denied");
    try {
        await pool.query('DELETE FROM tasks');
        res.json({ message: "All tasks deleted successfully" });
    } catch (e) { res.status(500).send("Error deleting tasks"); }
});

// ── Bulk Delete ───────────────────────────────────────────────────────────────
app.delete('/tasks/bulk-delete', authenticateToken, async (req, res) => {
    const { role, company_id } = req.user;
    if (role !== 'BIG_BOSS' && role !== 'COMPANY_MANAGER') {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { task_ids } = req.body;
    if (!Array.isArray(task_ids) || task_ids.length === 0) {
        return res.status(400).json({ error: 'task_ids array required' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let result;
        if (role === 'COMPANY_MANAGER') {
            result = await client.query(
                `DELETE FROM tasks WHERE id = ANY($1::int[]) AND company_id = $2`,
                [task_ids, company_id]
            );
        } else {
            result = await client.query(
                `DELETE FROM tasks WHERE id = ANY($1::int[])`,
                [task_ids]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true, deleted: result.rowCount });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('bulk-delete error:', err);
        res.status(500).json({ error: 'Error deleting tasks' });
    } finally {
        client.release();
    }
});

// ── Bulk Update Status ────────────────────────────────────────────────────────
app.put('/tasks/bulk-update-status', authenticateToken, async (req, res) => {
    const { role, company_id } = req.user;
    if (role !== 'BIG_BOSS' && role !== 'COMPANY_MANAGER') {
        return res.status(403).json({ error: 'Access denied' });
    }
    const { task_ids, status } = req.body;
    const ALLOWED_STATUSES = ['PENDING', 'WAITING_APPROVAL', 'COMPLETED'];
    if (!Array.isArray(task_ids) || task_ids.length === 0) {
        return res.status(400).json({ error: 'task_ids array required' });
    }
    if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let result;
        if (role === 'COMPANY_MANAGER') {
            result = await client.query(
                `UPDATE tasks SET status = $1 WHERE id = ANY($2::int[]) AND company_id = $3`,
                [status, task_ids, company_id]
            );
        } else {
            result = await client.query(
                `UPDATE tasks SET status = $1 WHERE id = ANY($2::int[])`,
                [status, task_ids]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true, updated: result.rowCount });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('bulk-update-status error:', err);
        res.status(500).json({ error: 'Error updating tasks' });
    } finally {
        client.release();
    }
});

app.get('/tasks/export/advanced', authenticateToken, async (req, res) => {
    try {
        const { worker_id, start_date, end_date, status } = req.query;
        const { role, id: callerId, company_id } = req.user;

        let query = `
            SELECT t.id, t.title, t.description, t.urgency, t.status, t.due_date,
                   t.images,
                   u.full_name as worker_name,
                   cb.full_name as creator_name,
                   l.name as location_name,
                   a.name as asset_name, a.code as asset_code,
                   c.name as category_name
            FROM tasks t
            LEFT JOIN users u ON t.worker_id = u.id
            LEFT JOIN users cb ON t.created_by = cb.id
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN assets a ON t.asset_id = a.id
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE 1=1
        `;

        const params = [];
        let pIndex = 1;

        // ── SECURITY: enforce role-based scope FIRST ──────────────────────────
        if (role === 'EMPLOYEE') {
            query += ` AND t.worker_id = $${pIndex++}`;
            params.push(callerId);
        } else if (role === 'MANAGER') {
            query += ` AND t.worker_id IN (SELECT employee_id FROM employee_managers WHERE manager_id = $${pIndex++})`;
            params.push(callerId);
        } else if (role === 'COMPANY_MANAGER' && company_id) {
            query += ` AND t.worker_id IN (SELECT id FROM users WHERE company_id = $${pIndex++})`;
            params.push(company_id);
        }
        // BIG_BOSS: no scope restriction

        // ── Optional caller-supplied filters (respected within role's scope) ──
        if (worker_id && worker_id !== 'all') {
            query += ` AND t.worker_id = $${pIndex++}`;
            params.push(worker_id);
        }

        if (start_date) {
            query += ` AND t.due_date >= $${pIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND t.due_date <= $${pIndex++}`;
            params.push(end_date);
        }

        if (status && status !== 'all') {
            query += ` AND t.status = $${pIndex++}`;
            params.push(status);
        }

        query += ` ORDER BY t.due_date DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Export error");
    }
});

app.post('/tasks/import-process', authenticateToken, async (req, res) => {
    // Only elevated roles may perform bulk task imports
    if (!['BIG_BOSS', 'COMPANY_MANAGER', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions for bulk task import.' });
    }
    const { tasks, isDryRun } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const errors   = [];
        const validTasks = [];
        const callerCompanyId = req.user.company_id ?? null;
        const callerId        = req.user.id;

        // ── Scope user lookup to caller's company (BIG_BOSS sees all) ───────
        let usersRes;
        if (req.user.role === 'BIG_BOSS') {
            usersRes = await client.query('SELECT id, full_name, company_id FROM users');
        } else if (callerCompanyId) {
            usersRes = await client.query(
                'SELECT id, full_name, company_id FROM users WHERE company_id = $1', [callerCompanyId]
            );
        } else {
            usersRes = await client.query('SELECT id, full_name, company_id FROM users WHERE id = $1', [callerId]);
        }

        // ── Scope location/asset lookups to caller's company ─────────────────
        const locParams  = callerCompanyId ? [callerCompanyId] : [];
        const locWhere   = callerCompanyId ? ' WHERE company_id = $1' : '';
        const locationsRes = await client.query(`SELECT id, name, company_id FROM locations${locWhere}`, locParams);
        const assetsRes    = await client.query(`SELECT id, name, code, category_id, company_id FROM assets${locWhere}`, locParams);

        const usersMap    = new Map(usersRes.rows.map(u => [u.full_name.trim().toLowerCase(), u.id]));
        const locMap      = new Map(locationsRes.rows.map(l => [l.name.trim().toLowerCase(), { id: l.id, company_id: l.company_id }]));
        const assetCodeMap = new Map(assetsRes.rows.map(a => [a.code.trim().toLowerCase(), a]));
        const assetNameMap = new Map(assetsRes.rows.map(a => [a.name.trim().toLowerCase(), a]));

        // Pre-fetch manager's assigned employee IDs for scope enforcement
        let managerEmployeeIds = new Set();
        if (req.user.role === 'MANAGER') {
            const empRes = await client.query(
                'SELECT employee_id FROM employee_managers WHERE manager_id = $1', [callerId]
            );
            managerEmployeeIds = new Set(empRes.rows.map(r => r.employee_id));
        }

        const getValue = (row, possibleKeys) => {
            for (const key of possibleKeys) {
                const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
                if (foundKey && row[foundKey]) return row[foundKey];
            }
            return null;
        };

        for (let i = 0; i < tasks.length; i++) {
            const row = tasks[i];
            const rowErrors = [];
            
            const id = getValue(row, ['id', 'ID', 'מזהה']);
            const title = getValue(row, ['Title', 'Task Title', 'כותרת', 'שם המשימה']);
            const workerName = getValue(row, ['Worker Name', 'Worker', 'Assigned To', 'עובד', 'שם העובד']);
            const locName = getValue(row, ['Location Name', 'Location', 'מיקום']);
            const assetCode = getValue(row, ['Asset Code', 'Code', 'קוד נכס']);
            const assetName = getValue(row, ['Asset Name', 'Asset', 'שם הנכס']);
            const desc = getValue(row, ['Description', 'תיאור']) || '';
            const urgencyRaw = getValue(row, ['Urgency', 'דחיפות']);
            const statusRaw = getValue(row, ['Status', 'סטטוס']) || 'PENDING'; 
            const dateRaw = getValue(row, ['Due Date', 'Date', 'תאריך', 'תאריך יעד']);
            
            const imagesRaw = getValue(row, ['Images', 'Image URLs', 'Photos', 'תמונות', 'קישורי תמונות']);
            let images = [];
            if (imagesRaw) {
                images = imagesRaw.toString().split(',').map(url => url.trim()).filter(url => url.length > 0);
            }

            let worker_id = null;
            let location_id = null;
            let asset_id = null;

            if (!title) {
                rowErrors.push(`Row ${i + 1}: Missing 'Title' (Task Title)`);
            }

            if (workerName) {
                const wName = workerName.toString().trim().toLowerCase();
                if (usersMap.has(wName)) {
                    worker_id = usersMap.get(wName);
                    // MANAGER scope: employee must be linked via employee_managers M:M table
                    if (req.user.role === 'MANAGER' && !managerEmployeeIds.has(worker_id)) {
                        rowErrors.push(`Row ${i + 1}: Worker '${workerName}' is not assigned to your team.`);
                    }
                    // COMPANY_MANAGER scope: worker must belong to same company (already enforced by
                    // the scoped usersRes query above, but double-check for belt-and-suspenders safety)
                    if (req.user.role === 'COMPANY_MANAGER' && callerCompanyId) {
                        const workerRow = usersRes.rows.find(u => u.id === worker_id);
                        if (!workerRow || String(workerRow.company_id) !== String(callerCompanyId)) {
                            rowErrors.push(`Row ${i + 1}: Worker '${workerName}' does not belong to your company.`);
                        }
                    }
                } else {
                    rowErrors.push(`Row ${i + 1}: Worker '${workerName}' not found in system.`);
                }
            } else {
                worker_id = callerId;
            }

            if (assetCode) {
                const aCode = assetCode.toString().trim().toLowerCase();
                if (assetCodeMap.has(aCode)) {
                    const asset = assetCodeMap.get(aCode);
                    asset_id = asset.id;
                    // Company check: asset must belong to caller's company
                    if (callerCompanyId && asset.company_id && String(asset.company_id) !== String(callerCompanyId)) {
                        rowErrors.push(`Row ${i + 1}: Asset code '${assetCode}' does not belong to your company.`);
                    }
                } else {
                    rowErrors.push(`Row ${i + 1}: Asset Code '${assetCode}' not found.`);
                }
            } else if (assetName) {
                const aName = assetName.toString().trim().toLowerCase();
                if (assetNameMap.has(aName)) {
                    const asset = assetNameMap.get(aName);
                    asset_id = asset.id;
                    // Company check: asset must belong to caller's company
                    if (callerCompanyId && asset.company_id && String(asset.company_id) !== String(callerCompanyId)) {
                        rowErrors.push(`Row ${i + 1}: Asset '${assetName}' does not belong to your company.`);
                    }
                } else {
                    rowErrors.push(`Row ${i + 1}: Asset Name '${assetName}' not found.`);
                }
            }

            if (locName) {
                const lName = locName.toString().trim().toLowerCase();
                if (locMap.has(lName)) {
                    const locData = locMap.get(lName);
                    location_id = locData.id;
                    // Company check: location must belong to caller's company
                    if (callerCompanyId && locData.company_id && String(locData.company_id) !== String(callerCompanyId)) {
                        rowErrors.push(`Row ${i + 1}: Location '${locName}' does not belong to your company.`);
                    }
                } else {
                    rowErrors.push(`Row ${i + 1}: Location '${locName}' not found.`);
                }
            }

            if (rowErrors.length > 0) {
                errors.push(...rowErrors);
            } else {
                validTasks.push({
                    id,
                    title,
                    description: desc,
                    urgency: ['High', 'Urgent', 'גבוהה', 'דחוף'].includes(urgencyRaw) ? 'High' : 'Normal',
                    status: statusRaw,
                    due_date: dateRaw ? new Date(dateRaw) : new Date(),
                    worker_id,
                    location_id,
                    asset_id,
                    images,
                    company_id: callerCompanyId,   // CRITICAL: always injected from JWT, never from client
                });
            }
        }

        if (isDryRun) {
            await client.query('ROLLBACK');
            if (errors.length > 0) {
                return res.json({ success: false, errors, message: "Found blocking errors." });
            } else {
                const updateCount = validTasks.filter(t => t.id).length;
                const newCount = validTasks.length - updateCount;
                return res.json({ success: true, message: `Ready to process: ${newCount} new tasks, ${updateCount} updates.` });
            }
        } else {
            if (errors.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: "Please fix errors.", details: errors });
            }

            for (const t of validTasks) {
                if (t.id) {
                    // Ownership check: existing task must belong to caller's company before updating
                    if (t.company_id) {
                        const ownership = await client.query('SELECT company_id FROM tasks WHERE id = $1', [t.id]);
                        if (ownership.rows[0] && String(ownership.rows[0].company_id) !== String(t.company_id)) {
                            await client.query('ROLLBACK');
                            return res.status(403).json({ error: `Task id=${t.id} does not belong to your company.` });
                        }
                    }
                    const check = await client.query('SELECT id FROM tasks WHERE id = $1', [t.id]);
                    if (check.rows.length > 0) {
                        await client.query(
                            `UPDATE tasks SET
                                title = $1, description = $2, urgency = $3, due_date = $4,
                                worker_id = $5, asset_id = $6, location_id = $7, images = $8, status = $9
                             WHERE id = $10`,
                            [t.title, t.description, t.urgency, t.due_date, t.worker_id, t.asset_id, t.location_id, t.images, t.status, t.id]
                        );
                    } else {
                        await client.query(
                            `INSERT INTO tasks (title, description, urgency, status, due_date, worker_id, asset_id, location_id, images, company_id)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                            [t.title, t.description, t.urgency, t.status, t.due_date, t.worker_id, t.asset_id, t.location_id, t.images, t.company_id]
                        );
                    }
                } else {
                    await client.query(
                        `INSERT INTO tasks (title, description, urgency, status, due_date, worker_id, asset_id, location_id, images, company_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                        [t.title, t.description, t.urgency, t.status, t.due_date, t.worker_id, t.asset_id, t.location_id, t.images, t.company_id]
                    );
                }
            }
            await client.query('COMMIT');
            res.json({ success: true, message: `Successfully processed ${validTasks.length} tasks.` });
        }

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        if (e.message.includes('location_id')) {
             res.status(500).json({ error: "Database Error: The system tried to access a missing location field. Check Server Logs." });
        } else {
             res.status(500).json({ error: e.message });
        }
    } finally {
        client.release();
    }
});

// ─── Tasks — Excel Bulk Import ────────────────────────────────────────────────
// Accepts rows from ConfigExcelPanel ({ rows, isDryRun, target_company_id }).
// Dry-run returns { validCount } on success or { errors } on failure.
// Commit generates all task instances (recurring expanded 1-year) and returns
// { inserted, updated }.
app.post('/tasks/bulk-import', authenticateToken, async (req, res) => {
    if (!['BIG_BOSS', 'COMPANY_MANAGER', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions for bulk task import.' });
    }

    const { rows, isDryRun, target_company_id } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });

    const safeTargetCompanyId = req.user.role === 'BIG_BOSS' ? (target_company_id || null) : null;
    const { insertCompanyId } = await resolveCallerScope(req.user, safeTargetCompanyId);
    const callerId = req.user.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const errors    = [];
        const validRows = [];

        // ── Frequency mapping (EN / HE / TH) ────────────────────────────────
        const FREQ_MAP = {
            'one-time': 'one-time', 'one time': 'one-time', 'onetime': 'one-time',
            'חד פעמי': 'one-time', 'ครั้งเดียว': 'one-time',
            'daily': 'daily', 'יומי': 'daily', 'รายวัน': 'daily',
            'weekly': 'weekly', 'שבועי': 'weekly', 'รายสัปดาห์': 'weekly',
            'monthly': 'monthly', 'חודשי': 'monthly', 'รายเดือน': 'monthly',
            'quarterly': 'quarterly', 'רבעוני': 'quarterly', 'รายไตรมาส': 'quarterly',
            'yearly': 'yearly', 'annual': 'yearly', 'שנתי': 'yearly', 'ประจำปี': 'yearly',
        };

        // ── Helper: find a cell value by any of the provided header aliases ──
        const get = (row, keys) => {
            for (const k of keys) {
                const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
                if (found !== undefined && row[found] !== '' && row[found] !== null && row[found] !== undefined) {
                    return row[found].toString().trim();
                }
            }
            return '';
        };

        // ── Pre-fetch company-scoped lookup tables ───────────────────────────
        const cWhere  = insertCompanyId ? ' AND company_id = $1' : '';
        const cParams = insertCompanyId ? [insertCompanyId] : [];

        const [usersRes, locsRes, catsRes, assetsRes] = await Promise.all([
            insertCompanyId
                ? client.query(`SELECT id, full_name, full_name_en, full_name_he, full_name_th FROM users WHERE company_id = $1 AND role NOT IN ('BIG_BOSS')`, [insertCompanyId])
                : client.query(`SELECT id, full_name, full_name_en, full_name_he, full_name_th FROM users WHERE role NOT IN ('BIG_BOSS')`),
            client.query(`SELECT id, name, name_en, name_he, name_th FROM locations WHERE 1=1${cWhere}`, cParams),
            client.query(`SELECT id, name, name_en, name_he, name_th FROM categories WHERE 1=1${cWhere}`, cParams),
            client.query(`SELECT id, name, name_en, name_he, name_th, code, category_id FROM assets WHERE 1=1${cWhere}`, cParams),
        ]);

        // Build multi-lang lookup map: any name variant (lowercase) → row
        const buildLangMap = (dbRows, fields) => {
            const map = new Map();
            for (const r of dbRows) {
                for (const f of fields) {
                    const v = r[f];
                    if (v) map.set(v.trim().toLowerCase(), r);
                }
            }
            return map;
        };

        const userMap  = buildLangMap(usersRes.rows,  ['full_name', 'full_name_en', 'full_name_he', 'full_name_th']);
        const locMap   = buildLangMap(locsRes.rows,   ['name', 'name_en', 'name_he', 'name_th']);
        const catMap   = buildLangMap(catsRes.rows,   ['name', 'name_en', 'name_he', 'name_th']);
        const assetMap = buildLangMap(assetsRes.rows, ['name', 'name_en', 'name_he', 'name_th', 'code']);

        // MANAGER scope: pre-fetch linked employee IDs
        let managerEmployeeIds = null;
        if (req.user.role === 'MANAGER') {
            const empRes = await client.query(
                'SELECT employee_id FROM employee_managers WHERE manager_id = $1', [callerId]
            );
            managerEmployeeIds = new Set(empRes.rows.map(r => r.employee_id));
        }

        // ── Validate each row ────────────────────────────────────────────────
        for (let i = 0; i < rows.length; i++) {
            const row       = rows[i];
            const ri        = i + 1;
            const rowErrors = [];

            // Extract all columns (support both "header *" and bare header forms)
            const empNameEn    = get(row, ['employee_name_en *', 'employee_name_en']);
            const empNameHe    = get(row, ['employee_name_he (Optional)', 'employee_name_he']);
            const empNameTh    = get(row, ['employee_name_th (Optional)', 'employee_name_th']);
            const taskNameEn   = get(row, ['task_name_en *', 'task_name_en', 'Title', 'title']);
            const locationRaw  = get(row, ['location *', 'location', 'Location']);
            const frequencyRaw = get(row, ['frequency *', 'frequency', 'Frequency']);
            const dateOrDays   = get(row, ['date_or_days *', 'date_or_days', 'Date or Days']);
            const urgencyRaw   = get(row, ['urgency (Optional)', 'urgency', 'Urgency']);
            const categoryRaw  = get(row, ['category (Optional)', 'category', 'Category']);
            const assetRaw     = get(row, ['asset (Optional)', 'asset', 'Asset']);
            const imageUrlRaw  = get(row, ['image_url (Optional)', 'image_url', 'Image URL']);
            const notesRaw     = get(row, ['notes (Optional)', 'notes', 'Notes', 'description']);

            // ── Mandatory: task name ────────────────────────────────────────
            if (!taskNameEn) rowErrors.push(`Row ${ri}: 'task_name_en' is required.`);

            // ── Mandatory: employee lookup (EN → HE → TH fallback) ──────────
            let worker_id = null;
            const empSearch = empNameEn || empNameHe || empNameTh;
            if (!empSearch) {
                rowErrors.push(`Row ${ri}: 'employee_name_en' is required.`);
            } else {
                const empRow = userMap.get(empSearch.toLowerCase());
                if (!empRow) {
                    rowErrors.push(`Row ${ri}: Employee '${empSearch}' not found in this company.`);
                } else {
                    worker_id = empRow.id;
                    if (req.user.role === 'MANAGER' && managerEmployeeIds && !managerEmployeeIds.has(worker_id)) {
                        rowErrors.push(`Row ${ri}: Employee '${empSearch}' is not assigned to your team.`);
                    }
                }
            }

            // ── Mandatory: location lookup (EN / HE / TH) ───────────────────
            let location_id = null;
            if (!locationRaw) {
                rowErrors.push(`Row ${ri}: 'location' is required.`);
            } else {
                const locRow = locMap.get(locationRaw.toLowerCase());
                if (!locRow) {
                    rowErrors.push(`Row ${ri}: Location '${locationRaw}' not found.`);
                } else {
                    location_id = locRow.id;
                }
            }

            // ── Mandatory: frequency ─────────────────────────────────────────
            let frequency = null;
            if (!frequencyRaw) {
                rowErrors.push(`Row ${ri}: 'frequency' is required.`);
            } else {
                frequency = FREQ_MAP[frequencyRaw.trim().toLowerCase()];
                if (!frequency) {
                    rowErrors.push(`Row ${ri}: Unknown frequency '${frequencyRaw}'. Accepted: One-time, Daily, Weekly, Monthly, Quarterly, Yearly (EN/HE/TH).`);
                }
            }

            // ── Mandatory: date_or_days — validated against frequency ────────
            let parsedDate = null;   // for one-time
            let recurrence = null;   // { type, selectedDays? | monthlyDate? | quarterlyDates? | yearlyDates? }

            if (!dateOrDays && frequency) {
                rowErrors.push(`Row ${ri}: 'date_or_days' is required.`);
            } else if (frequency && dateOrDays) {
                const val = dateOrDays.toString().trim();

                if (frequency === 'one-time') {
                    // Expect DD/MM/YYYY
                    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                    if (!m) {
                        rowErrors.push(`Row ${ri}: One-time requires a date in DD/MM/YYYY format (e.g. 25/06/2025).`);
                    } else {
                        const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
                        if (isNaN(d.getTime()) || d.getMonth() !== parseInt(m[2]) - 1) {
                            rowErrors.push(`Row ${ri}: Invalid date '${val}'.`);
                        } else {
                            parsedDate = d;
                        }
                    }

                } else if (frequency === 'daily') {
                    // Expect comma-separated numbers 1–7 (1=Sun … 7=Sat)
                    const parts = val.split(',').map(s => parseInt(s.trim()));
                    if (!parts.length || parts.some(n => isNaN(n) || n < 1 || n > 7)) {
                        rowErrors.push(`Row ${ri}: Daily requires comma-separated numbers 1–7 (1=Sun, 7=Sat). E.g. "1,2,3".`);
                    } else {
                        recurrence = { type: 'daily', selectedDays: parts.map(n => n - 1) };
                    }

                } else if (frequency === 'weekly') {
                    // Expect a single number 1–7
                    const n = parseInt(val);
                    if (isNaN(n) || n < 1 || n > 7 || val.includes(',')) {
                        rowErrors.push(`Row ${ri}: Weekly requires a single number 1–7 (day of week, 1=Sun).`);
                    } else {
                        recurrence = { type: 'weekly', selectedDays: [n - 1] };
                    }

                } else if (frequency === 'monthly') {
                    // Expect a single number 1–30
                    const n = parseInt(val);
                    if (isNaN(n) || n < 1 || n > 30 || val.includes(',')) {
                        rowErrors.push(`Row ${ri}: Monthly requires a single day number 1–30 (e.g. "15").`);
                    } else {
                        recurrence = { type: 'monthly', monthlyDate: n };
                    }

                } else if (frequency === 'quarterly') {
                    // Expect exactly 4 DD/MM dates, one from each quarter
                    const parts = val.split(',').map(s => s.trim());
                    if (parts.length !== 4) {
                        rowErrors.push(`Row ${ri}: Quarterly requires exactly 4 dates in DD/MM format, one per quarter (e.g. "01/01,01/04,01/07,01/10").`);
                    } else {
                        let parseOk = true;
                        const parsed = [];
                        for (const p of parts) {
                            const m = p.match(/^(\d{1,2})\/(\d{1,2})$/);
                            if (!m) { parseOk = false; break; }
                            const day = parseInt(m[1]), mon = parseInt(m[2]);
                            if (day < 1 || day > 31 || mon < 1 || mon > 12) { parseOk = false; break; }
                            parsed.push({ str: `${String(day).padStart(2,'0')}/${String(mon).padStart(2,'0')}`, mon });
                        }
                        if (!parseOk) {
                            rowErrors.push(`Row ${ri}: Quarterly dates must be in DD/MM format (e.g. "01/01,01/04,01/07,01/10").`);
                        } else {
                            const quarters = parsed.map(p => p.mon <= 3 ? 1 : p.mon <= 6 ? 2 : p.mon <= 9 ? 3 : 4);
                            if (new Set(quarters).size !== 4) {
                                rowErrors.push(`Row ${ri}: Each quarterly date must fall in a different quarter (Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Oct–Dec).`);
                            } else {
                                recurrence = { type: 'quarterly', quarterlyDates: parsed.map(p => p.str) };
                            }
                        }
                    }

                } else if (frequency === 'yearly') {
                    // Expect a single DD/MM date
                    const m = val.match(/^(\d{1,2})\/(\d{1,2})$/);
                    if (!m) {
                        rowErrors.push(`Row ${ri}: Yearly requires a date in DD/MM format (e.g. "15/06").`);
                    } else {
                        const day = parseInt(m[1]), mon = parseInt(m[2]);
                        recurrence = { type: 'yearly', yearlyDates: [`${String(day).padStart(2,'0')}/${String(mon).padStart(2,'0')}`] };
                    }
                }
            }

            // ── Optional: urgency (EN / HE / TH) ────────────────────────────
            const URGENT_VALS = new Set(['urgent', 'high', 'דחוף', 'גבוהה', 'ด่วน', 'สูง']);
            const urgency = urgencyRaw && URGENT_VALS.has(urgencyRaw.trim().toLowerCase()) ? 'High' : 'Normal';

            // ── Optional: category lookup (EN / HE / TH) ────────────────────
            let category_id = null;
            if (categoryRaw) {
                const catRow = catMap.get(categoryRaw.toLowerCase());
                if (!catRow) {
                    rowErrors.push(`Row ${ri}: Category '${categoryRaw}' not found.`);
                } else {
                    category_id = catRow.id;
                }
            }

            // ── Optional: asset lookup (EN / HE / TH / code) ────────────────
            let asset_id = null;
            if (assetRaw) {
                const assetRow = assetMap.get(assetRaw.toLowerCase());
                if (!assetRow) {
                    rowErrors.push(`Row ${ri}: Asset '${assetRaw}' not found.`);
                } else {
                    asset_id = assetRow.id;
                    if (category_id && assetRow.category_id && String(assetRow.category_id) !== String(category_id)) {
                        rowErrors.push(`Row ${ri}: Asset '${assetRaw}' does not belong to category '${categoryRaw}'.`);
                    }
                }
            }

            // ── Optional: image URL ──────────────────────────────────────────
            const URL_RE = /^https?:\/\/.+/i;
            const images = [];
            if (imageUrlRaw) {
                if (!URL_RE.test(imageUrlRaw)) {
                    rowErrors.push(`Row ${ri}: image_url must be a valid URL starting with http:// or https://.`);
                } else {
                    images.push(imageUrlRaw);
                }
            }

            if (rowErrors.length > 0) {
                errors.push(...rowErrors);
            } else {
                validRows.push({
                    title:       taskNameEn,
                    description: notesRaw || '',
                    urgency,
                    worker_id,
                    location_id,
                    asset_id,
                    images,
                    company_id:  insertCompanyId,
                    created_by:  callerId,
                    // scheduling
                    frequency,
                    parsedDate,   // Date obj for one-time
                    recurrence,   // { type, ... } for recurring
                });
            }
        }

        // ── Dry-run response ─────────────────────────────────────────────────
        if (isDryRun) {
            await client.query('ROLLBACK');
            if (errors.length > 0) {
                return res.json({ errors, message: 'Found blocking errors.' });
            }
            return res.json({ validCount: validRows.length, message: `${validRows.length} tasks ready to import.` });
        }

        // ── Commit: stop on any errors ───────────────────────────────────────
        if (errors.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Please fix errors before importing.', details: errors });
        }

        // ── Generate task instances ──────────────────────────────────────────
        let insertedCount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yearEnd = new Date(today);
        yearEnd.setFullYear(yearEnd.getFullYear() + 1);

        for (const t of validRows) {
            if (t.frequency === 'one-time') {
                await client.query(
                    `INSERT INTO tasks (title, description, urgency, status, due_date, worker_id, asset_id, location_id, images, company_id, created_by)
                     VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, $10)`,
                    [t.title, t.description, t.urgency, t.parsedDate, t.worker_id, t.asset_id, t.location_id, t.images, t.company_id, t.created_by]
                );
                insertedCount++;
            } else {
                const rec = t.recurrence;
                for (let d = new Date(today); d <= yearEnd; d.setDate(d.getDate() + 1)) {
                    let match = false;
                    if (rec.type === 'daily' || rec.type === 'weekly') {
                        match = rec.selectedDays.includes(d.getDay());
                    } else if (rec.type === 'monthly') {
                        match = d.getDate() === rec.monthlyDate;
                    } else if (rec.type === 'quarterly') {
                        const s = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                        match = rec.quarterlyDates.includes(s);
                    } else if (rec.type === 'yearly') {
                        const s = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                        match = rec.yearlyDates.includes(s);
                    }
                    if (match) {
                        await client.query(
                            `INSERT INTO tasks (title, description, urgency, status, due_date, worker_id, asset_id, location_id, images, company_id, created_by)
                             VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, $10)`,
                            [t.title, t.description, t.urgency, new Date(d), t.worker_id, t.asset_id, t.location_id, t.images, t.company_id, t.created_by]
                        );
                        insertedCount++;
                    }
                }
            }
        }

        await client.query('COMMIT');

        // Notify each worker via all 3 channels (after commit so tasks are queryable)
        try {
            const workerIds = [...new Set(validRows.map(r => r.worker_id))];
            for (const wid of workerIds) {
                const workerTaskCount = validRows.filter(r => r.worker_id === wid).length;
                const taskRows = await pool.query(
                    'SELECT id, title, urgency, due_date FROM tasks WHERE worker_id = $1 AND created_by = $2 ORDER BY id DESC LIMIT $3',
                    [wid, callerId, workerTaskCount]
                );
                await sendNotification(wid, ['email', 'line', 'push'], 'tasks_assigned', {
                    tasks: taskRows.rows, taskCount: workerTaskCount
                });
            }
        } catch (notifErr) {
            console.error('⚠️ bulk-import notifications failed (tasks saved OK):', notifErr.message);
        }

        res.json({ inserted: insertedCount, updated: 0, message: `Successfully created ${insertedCount} task instance(s).` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /tasks/bulk-import error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/upgrade-db', async (req, res) => {
    try {
        await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS code VARCHAR(3);`);
        
        await pool.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS location_id INT;`);
        await pool.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS code VARCHAR(20);`);
        
        await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS code VARCHAR(50);`);
        await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS image_url TEXT;`);
        await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS coordinates JSON;`);
        await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS dynamic_fields JSONB DEFAULT '[]';`);
        
        res.send("✅ Database upgraded successfully! You are ready for the new Configuration Tab.");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error upgrading DB: " + err.message);
    }
});

app.get('/tasks/user/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) return res.status(404).send("User not found");

        const targetRole = userCheck.rows[0].role;
        let whereClause = "";

        if (targetRole === 'MANAGER') {
            // Use M:M junction table to get all employees assigned to this manager
            whereClause = `WHERE t.worker_id IN (SELECT employee_id FROM employee_managers WHERE manager_id = $1)`;
        } else if (targetRole === 'BIG_BOSS') {
            whereClause = `WHERE t.worker_id = $1 OR t.worker_id IN (SELECT id FROM users WHERE parent_manager_id = $1)`;
        } else {
            whereClause = `WHERE t.worker_id = $1`;
        }

        const query = `
            SELECT t.*,
                   l.name as location_name,
                   a.name as asset_name,
                   c.id as category_id,
                   c.name as category_name,
                   u.full_name as worker_name,
                   creator.full_name as creator_name
            FROM tasks t
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN assets a ON t.asset_id = a.id
            LEFT JOIN categories c ON a.category_id = c.id
            LEFT JOIN users u ON t.worker_id = u.id
            LEFT JOIN users creator ON t.created_by = creator.id
            ${whereClause}
            ORDER BY t.due_date DESC
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching user tasks");
    }
});

const cron = require('node-cron');

// ==========================================
// 🔑 POST /api/forgot-password
// ==========================================
app.post('/api/forgot-password', async (req, res) => {
    try {
        const email = req.body.email ? req.body.email.toLowerCase() : '';
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const result = await pool.query('SELECT id, full_name, preferred_language FROM users WHERE email = $1', [email]);
        // Always respond success to prevent email enumeration
        if (result.rows.length === 0) return res.json({ success: true });

        const user = result.rows[0];
        const plainCode = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedCode = crypto.createHash('sha256').update(plainCode).digest('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [hashedCode, expires, user.id]
        );

        const lang = user.preferred_language || 'en';
        await sendResetPasswordEmail(email, user.full_name, plainCode, lang);

        res.json({ success: true });
    } catch (err) {
        console.error('❌ /api/forgot-password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// 🔑 POST /api/reset-password
// ==========================================
app.post('/api/reset-password', async (req, res) => {
    try {
        // Accept both 'token' and 'code' key names from the client
        const token = req.body.token || req.body.code;
        const { new_password, email } = req.body;
        if (!token || !new_password) return res.status(400).json({ error: 'Token and new password are required' });
        if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        let result;
        if (email) {
            result = await pool.query(
                'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW() AND email = $2',
                [hashedToken, email.toLowerCase()]
            );
        } else {
            result = await pool.query(
                'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
                [hashedToken]
            );
        }

        if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset token' });

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [hashedPassword, result.rows[0].id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('❌ /api/reset-password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==========================================
// ☀️ CRON: Morning Briefing — 09:00 Asia/Bangkok
//    Target: EMPLOYEEs only | Channels: LINE + In-App Push (NO email)
// ==========================================
const runMorningBriefing = async () => {
    console.log('⏰ [CRON] Running Morning Briefing (09:00 Bangkok)...');
    try {
        const empRes = await pool.query(
            "SELECT id, full_name, line_user_id, device_token, preferred_language FROM users WHERE role = 'EMPLOYEE'"
        );
        const pendingRes = await pool.query(
            "SELECT id, title, urgency, due_date, worker_id FROM tasks WHERE DATE(due_date) = CURRENT_DATE AND status = 'PENDING'"
        );
        const pendingToday = pendingRes.rows;

        for (const emp of empRes.rows) {
            const lang = emp.preferred_language || 'en';
            const T = NOTIF_T.morning_briefing[lang] || NOTIF_T.morning_briefing.en;
            const empTasks = pendingToday.filter(t => t.worker_id === emp.id);
            const sends = [];

            if (emp.line_user_id) {
                const msg = empTasks.length === 0
                    ? T.none_line(emp.full_name)
                    : T.line(emp.full_name, empTasks.length, buildTaskListLine(empTasks, lang));
                sends.push(sendLineMessage(emp.line_user_id, msg).catch(e => console.error(`⚠️ LINE morning briefing (${emp.id}):`, e.message)));
            }
            if (emp.device_token) {
                const title = empTasks.length === 0 ? T.none_push_t : T.push_t;
                const body  = empTasks.length === 0 ? T.none_push_b() : T.push_b(empTasks.length);
                sends.push(sendFcmPush(emp.device_token, title, body, APP_LINK));
            }
            if (sends.length) await Promise.all(sends);
        }
        console.log(`✅ [CRON] Morning Briefing dispatched to ${empRes.rows.length} employees.`);
    } catch (err) {
        console.error('❌ [CRON] Morning Briefing failed:', err.message);
    }
};

// Morning Briefing: 09:00 Asia/Bangkok — LINE + Push only, NO email
cron.schedule('0 9 * * *', runMorningBriefing, { scheduled: true, timezone: 'Asia/Bangkok' });

// ==========================================
// 📊 CRON: End-of-Day Report — 16:00 Asia/Bangkok
// ==========================================
const runDailyReport = async (manager_id = null) => {
    console.log(`⏰ [EOD] Running End-of-Day Report${manager_id ? ` for manager ${manager_id}` : ' for EVERYONE'}...`);

    const dict = {
        he: {
            dir: 'rtl', align: 'right',
            perf_subj: '🌟 אלופה! סיימת את כל המשימות',
            pend_subj: '⚠️ דוח יומי: עליך להשלים משימות פתוחות',
            none_subj: '🏖️ איזה כיף! אין לך משימות להיום',
            w_perf_title: 'כל הכבוד סיימת הכל! 🎉',
            w_pend_title: 'לא סיימת את המשימות להיום! ⏰',
            w_none_title: 'אין לך משימות להיום! 🏖️',
            w_perf_body: 'להלן הסיכום שלך להיום:',
            w_pend_body: 'פירוט המשימות שביצעת ואלו שעליך להשלים בדחיפות:',
            w_none_body: 'תהנה מהיום שלך, אין משימות פתוחות שמשויכות אליך.',
            m_perf_subj: '🌟 סיכום יומי: כל הצוות סיים בהצטיינות!',
            m_pend_subj: '📊 סיכום יומי: יש משימות פתוחות בצוות',
            m_none_subj: '🏖️ סיכום יומי: לצוות אין משימות היום',
            m_title: 'דוח ביצועי צוות יומי 📊',
            m_desc: 'להלן סטטוס המשימות של העובדים להיום.',
            btn_app: 'לכניסה לאפליקציה לחץ כאן',
            th_task: 'משימה', th_status: 'סטטוס', th_note: 'הערות ביצוע',
            status_done: 'בוצע ✔️', status_not: 'לא בוצע ❌', status_none: 'ללא משימות היום 🏖️',
            perf_badge: 'סיים/ה הכל!', pend_badge: 'יש משימות פתוחות',
            out_of: 'מתוך',
            push_w_perf_title: 'סיימת הכל! 🏆', push_w_perf_body: 'כל הכבוד! הסיכום היומי נשלח למייל.',
            push_w_pend_title: 'יש משימות פתוחות! ⏰', push_w_pend_body: 'נותרו לך משימות להשלים.',
            push_w_none_title: 'יום חופשי! 🏖️', push_w_none_body: 'אין לך משימות פתוחות להיום.',
            push_m_perf_title: 'הצוות סיים הכל! 🏆', push_m_perf_body: 'כל העובדים סיימו את המשימות.',
            push_m_pend_title: 'דוח יומי מוכן 📊', push_m_pend_body: 'לצוות שלך יש משימות פתוחות. הדוח נשלח למייל.',
            push_m_none_title: 'אין משימות לצוות 🏖️', push_m_none_body: 'הצוות שלך סיים הכל להיום.'
        },
        en: {
            dir: 'ltr', align: 'left',
            perf_subj: '🌟 Awesome! All tasks completed',
            pend_subj: '⚠️ Daily Report: Pending tasks to complete',
            none_subj: '🏖️ Free day! No tasks for today',
            w_perf_title: 'Great job, you finished everything! 🎉',
            w_pend_title: 'You have pending tasks today! ⏰',
            w_none_title: 'Enjoy, no tasks for today! 🏖️',
            w_perf_body: 'Here is your summary for today:',
            w_pend_body: 'Details of your tasks and what needs urgent completion:',
            w_none_body: 'There are no tasks assigned to you today.',
            m_perf_subj: '🌟 Daily Summary: Entire team excelled!',
            m_pend_subj: '📊 Daily Summary: Pending tasks in your team',
            m_none_subj: '🏖️ Daily Summary: Team has no tasks today',
            m_title: 'Daily Team Performance 📊',
            m_desc: 'Here is the task status of your employees for today.',
            btn_app: 'Click here to open the app',
            th_task: 'Task', th_status: 'Status', th_note: 'Notes',
            status_done: 'Done ✔️', status_not: 'Pending ❌', status_none: 'No tasks today 🏖️',
            perf_badge: 'Finished all!', pend_badge: 'Pending tasks',
            out_of: 'out of',
            push_w_perf_title: 'All done! 🏆', push_w_perf_body: 'Great job! Daily summary sent to email.',
            push_w_pend_title: 'Pending tasks! ⏰', push_w_pend_body: 'You have tasks left to complete.',
            push_w_none_title: 'Free day! 🏖️', push_w_none_body: 'You have no tasks today.',
            push_m_perf_title: 'Team finished! 🏆', push_m_perf_body: 'All employees completed their tasks.',
            push_m_pend_title: 'Daily Report 📊', push_m_pend_body: 'Your team has pending tasks. Report sent to email.',
            push_m_none_title: 'No team tasks 🏖️', push_m_none_body: 'Your team has no tasks today.'
        },
        th: {
            dir: 'ltr', align: 'left',
            perf_subj: '🌟 ยอดเยี่ยม! ทำภารกิจเสร็จสิ้นทั้งหมด',
            pend_subj: '⚠️ รายงานประจำวัน: มีภารกิจที่ต้องทำ',
            none_subj: '🏖️ วันว่าง! ไม่มีภารกิจสำหรับวันนี้',
            w_perf_title: 'ทำได้ดีมาก คุณทำเสร็จหมดแล้ว! 🎉',
            w_pend_title: 'คุณมีภารกิจค้างอยู่สำหรับวันนี้! ⏰',
            w_none_title: 'วันนี้ไม่มีภารกิจ! 🏖️',
            w_perf_body: 'นี่คือสรุปของคุณสำหรับวันนี้:',
            w_pend_body: 'รายละเอียดภารกิจและสิ่งที่ต้องทำด่วน:',
            w_none_body: 'วันนี้ไม่มีงานที่ได้รับมอบหมาย',
            m_perf_subj: '🌟 สรุปประจำวัน: ทีมทำงานยอดเยี่ยม!',
            m_pend_subj: '📊 สรุปประจำวัน: มีภารกิจค้างในทีม',
            m_none_subj: '🏖️ สรุปประจำวัน: ทีมไม่มีภารกิจวันนี้',
            m_title: 'ผลงานทีมประจำวัน 📊',
            m_desc: 'สถานะภารกิจของพนักงานสำหรับวันนี้.',
            btn_app: 'คลิกที่นี่เพื่อเปิดแอป',
            th_task: 'งาน', th_status: 'สถานะ', th_note: 'หมายเหตุ',
            status_done: 'เสร็จ ✔️', status_not: 'รอดำเนินการ ❌', status_none: 'ไม่มีงาน 🏖️',
            perf_badge: 'เสร็จหมด!', pend_badge: 'มีงานค้าง',
            out_of: 'จาก',
            push_w_perf_title: 'เสร็จหมด! 🏆', push_w_perf_body: 'ยอดเยี่ยม! ส่งสรุปไปที่อีเมลแล้ว.',
            push_w_pend_title: 'มีงานค้าง! ⏰', push_w_pend_body: 'คุณมีงานที่ต้องทำต่อ.',
            push_w_none_title: 'วันว่าง! 🏖️', push_w_none_body: 'วันนี้ไม่มีภารกิจ',
            push_m_perf_title: 'ทีมเสร็จงาน! 🏆', push_m_perf_body: 'พนักงานทุกคนทำงานเสร็จแล้ว.',
            push_m_pend_title: 'รายงานประจำวัน 📊', push_m_pend_body: 'ทีมของคุณมีงานค้าง ส่งรายงานไปที่อีเมลแล้ว.',
            push_m_none_title: 'ไม่มีงานทีม 🏖️', push_m_none_body: 'ทีมของคุณไม่มีงานวันนี้'
        }
    };

    try {
        const usersRes = await pool.query(
            "SELECT id, full_name, email, role, parent_manager_id, device_token, preferred_language, line_user_id, company_id FROM users"
        );
        const allUsers = usersRes.rows;
        const tasksRes = await pool.query("SELECT * FROM tasks WHERE DATE(due_date) = CURRENT_DATE");
        const todayTasks = tasksRes.rows;
        const companiesRes = await pool.query("SELECT id, COALESCE(name_en, name, 'Company') AS display_name FROM companies");
        const companyMap = Object.fromEntries(companiesRes.rows.map(c => [c.id, c.display_name]));

        // הפונקציה המקורית שלך לעטיפת המייל
        const getEmailTemplate = (langDict, content) => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:10px; background-color:#f4f4f5; font-family:Helvetica, Arial, sans-serif; -webkit-text-size-adjust:none;">
            <div style="max-width:500px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.05); direction:${langDict.dir}; text-align:${langDict.align};">
                ${content}
            </div>
        </body>
        </html>`;

        // ==========================================
        // 1. שליחת דוחות לכלל העובדים
        // ==========================================
        const employees = allUsers.filter(u => u.role === 'EMPLOYEE' && (!manager_id || u.parent_manager_id === manager_id));
        for (const emp of employees) {
            const l = dict[emp.preferred_language] || dict['he']; 
            
            const wTasks = todayTasks.filter(t => t.worker_id === emp.id);
            const completed = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
            const pending = wTasks.filter(t => t.status === 'PENDING');
            
            const isNone = wTasks.length === 0;
            const isPerfect = !isNone && pending.length === 0;

            let tableHtml = '';
            if (!isNone) {
                tableHtml = `
                <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;">
                    <tr style="background:#f3f4f6; text-align:${l.align};">
                        <th style="padding:8px 6px; border-bottom:1px solid #e5e7eb;">${l.th_task}</th>
                        <th style="padding:8px 6px; border-bottom:1px solid #e5e7eb;">${l.th_status}</th>
                    </tr>`;
                
                wTasks.forEach(t => {
                    const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                    tableHtml += `
                    <tr>
                        <td style="padding:8px 6px; border-bottom:1px solid #e5e7eb; color:#374151;">${t.title}</td>
                        <td style="padding:8px 6px; border-bottom:1px solid #e5e7eb; font-size:11px;">
                            <span style="background:${isDone ? '#dcfce7' : '#fee2e2'}; color:${isDone ? '#166534' : '#991b1b'}; padding:3px 6px; border-radius:12px; white-space:nowrap;">
                                ${isDone ? l.status_done : l.status_not}
                            </span>
                        </td>
                    </tr>`;
                });
                tableHtml += `</table>`;
            }

            let emailSubj = isNone ? l.none_subj : (isPerfect ? l.perf_subj : l.pend_subj);
            let bodyTitle = isNone ? l.w_none_title : (isPerfect ? l.w_perf_title : l.w_pend_title);
            let bodyText = isNone ? l.w_none_body : (isPerfect ? l.w_perf_body : l.w_pend_body);
            let titleColor = isNone ? '#3b82f6' : (isPerfect ? '#166534' : '#991b1b');
            let pushTitle = isNone ? l.push_w_none_title : (isPerfect ? l.push_w_perf_title : l.push_w_pend_title);
            let pushBody = isNone ? l.push_w_none_body : (isPerfect ? l.push_w_perf_body : l.push_w_pend_body);

            const htmlBody = getEmailTemplate(l, `
                <div style="padding:15px;">
                    <h3 style="margin:0 0 5px 0; font-size:16px; color:${titleColor};">${bodyTitle}</h3>
                    <p style="margin:0; font-size:13px; color:#4b5563;">${emp.full_name}, ${bodyText}</p>
                    ${tableHtml}
                    <div style="text-align:center; margin-top:20px;">
                        <a href="https://air-manage-app.netlify.app/" style="display:inline-block; background:#714B67; color:#fff; padding:10px 20px; text-decoration:none; border-radius:6px; font-size:14px; font-weight:bold;">${l.btn_app}</a>
                    </div>
                </div>
            `);

            // ── EMPLOYEE: All 3 channels simultaneously ────────────────────
            const empSends = [];
            if (emp.email) {
                empSends.push(transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: emp.email, subject: emailSubj, html: htmlBody })
                    .catch(e => console.error(`❌ EOD email employee ${emp.email}:`, e.message)));
            }
            if (emp.line_user_id) {
                let lineMsg = `${pushTitle}\n${pushBody}`;
                if (!isNone) {
                    lineMsg += `\n\n--- ${l.th_task} ---`;
                    wTasks.forEach(t => {
                        const done = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                        lineMsg += `\n• ${t.title}: ${done ? l.status_done : l.status_not}`;
                    });
                    lineMsg += `\n\n${completed.length} ${l.out_of} ${wTasks.length}`;
                }
                empSends.push(sendLineMessage(emp.line_user_id, lineMsg)
                    .catch(e => console.error(`❌ EOD LINE employee ${emp.email}:`, e.message)));
            }
            if (emp.device_token) {
                empSends.push(sendFcmPush(emp.device_token, pushTitle, pushBody, APP_LINK));
            }
            await Promise.all(empSends);
        }

        // Shared helper: build employee sub-block HTML for manager reports
        const buildEmpBlock = (emp, wTasks, l) => {
            const done = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
            const isNone = wTasks.length === 0;
            const isPerfect = !isNone && done.length === wTasks.length;
            const icon = isNone ? '🏖️' : (isPerfect ? '✅' : '❌');
            const statusColor = isNone ? '#6b7280' : (isPerfect ? '#166534' : '#991b1b');
            const bgColor = isNone ? '#f9fafb' : (isPerfect ? '#f0fdf4' : '#fef2f2');
            const badge = isNone ? l.status_none : `${done.length} ${l.out_of} ${wTasks.length}`;
            let html = `<div style="margin-bottom:10px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <div style="background:${bgColor};padding:8px 10px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-weight:bold;font-size:13px;color:${statusColor};">${icon} ${emp.full_name}</span>
                    <span style="font-size:11px;color:#6b7280;background:#fff;padding:2px 6px;border-radius:10px;border:1px solid #ddd;">${badge}</span>
                </div>`;
            if (!isNone) {
                html += `<table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <tr style="background:#f9fafb;color:#4b5563;text-align:${l.align};">
                        <th style="padding:5px 6px;border-bottom:1px solid #eee;">${l.th_task}</th>
                        <th style="padding:5px 6px;border-bottom:1px solid #eee;">${l.th_status}</th>
                    </tr>`;
                wTasks.forEach(t => {
                    const d = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                    html += `<tr>
                        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${t.title}</td>
                        <td style="padding:5px 6px;border-bottom:1px solid #eee;">
                            <span style="background:${d ? '#dcfce7' : '#fee2e2'};color:${d ? '#166534' : '#991b1b'};padding:2px 5px;border-radius:4px;font-size:10px;">${d ? l.status_done : l.status_not}</span>
                        </td></tr>`;
                });
                html += `</table>`;
            }
            return html + `</div>`;
        };

        // ── 2. MANAGERs → Email Only ───────────────────────────────────────
        const managers = allUsers.filter(u => u.role === 'MANAGER' && (!manager_id || u.id === manager_id));
        for (const mgr of managers) {
            if (!mgr.email) continue;
            const mgrEmps = employees.filter(e => e.parent_manager_id === mgr.id);
            if (mgrEmps.length === 0) continue;
            const l = dict[mgr.preferred_language] || dict['en'];
            let allPerfect = true, allNone = true;
            let content = '<div>';
            mgrEmps.forEach(emp => {
                const wTasks = todayTasks.filter(t => t.worker_id === emp.id);
                const done = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
                if (wTasks.length > 0) allNone = false;
                if (wTasks.length > 0 && done.length < wTasks.length) allPerfect = false;
                content += buildEmpBlock(emp, wTasks, l);
            });
            content += '</div>';
            const subj = allNone ? l.m_none_subj : (allPerfect ? l.m_perf_subj : l.m_pend_subj);
            transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: mgr.email, subject: subj, html: getEmailTemplate(l, content) })
                .catch(e => console.error(`❌ EOD email MANAGER ${mgr.email}:`, e.message));
        }

        // ── 3. COMPANY_MANAGERs → Email Only (per-company grouping) ────────
        if (!manager_id) {
            const companyManagers = allUsers.filter(u => u.role === 'COMPANY_MANAGER');
            for (const cm of companyManagers) {
                if (!cm.email || !cm.company_id) continue;
                const cmEmps = employees.filter(e => e.company_id === cm.company_id);
                if (cmEmps.length === 0) continue;
                const l = dict[cm.preferred_language] || dict['en'];
                const coName = companyMap[cm.company_id] || 'Company';
                let content = `<div><h3 style="color:#714B67;margin:0 0 12px 0;">${coName} — ${l.m_title}</h3>`;
                let allPerfect = true, allNone = true;
                cmEmps.forEach(emp => {
                    const wTasks = todayTasks.filter(t => t.worker_id === emp.id);
                    const done = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
                    if (wTasks.length > 0) allNone = false;
                    if (wTasks.length > 0 && done.length < wTasks.length) allPerfect = false;
                    content += buildEmpBlock(emp, wTasks, l);
                });
                content += '</div>';
                const subj = allNone ? l.m_none_subj : (allPerfect ? l.m_perf_subj : l.m_pend_subj);
                transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: cm.email, subject: subj, html: getEmailTemplate(l, content) })
                    .catch(e => console.error(`❌ EOD email COMPANY_MANAGER ${cm.email}:`, e.message));
            }
        }

        // ── 4. BIG_BOSS → Email Only (Master: Company → Manager → Employee → Tasks) ──
        if (!manager_id) {
            const bigBosses = allUsers.filter(u => u.role === 'BIG_BOSS');
            for (const boss of bigBosses) {
                if (!boss.email) continue;
                const l = dict[boss.preferred_language] || dict['en'];

                // Group employees by company_id
                const companiesWithEmps = {};
                employees.forEach(emp => {
                    const cid = emp.company_id || 0;
                    if (!companiesWithEmps[cid]) companiesWithEmps[cid] = [];
                    companiesWithEmps[cid].push(emp);
                });

                let masterContent = `<div><h2 style="color:#714B67;margin:0 0 16px 0;">📊 ${l.m_title}</h2>`;
                let grandPerfect = true, grandNone = true;

                for (const [cid, coEmps] of Object.entries(companiesWithEmps)) {
                    const coName = companyMap[parseInt(cid)] || `Company #${cid}`;
                    let coAllPerfect = true, coAllNone = true;

                    // Company header + employee blocks
                    let coContent = '';
                    coEmps.forEach(emp => {
                        const wTasks = todayTasks.filter(t => t.worker_id === emp.id);
                        const done = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
                        if (wTasks.length > 0) coAllNone = false;
                        if (wTasks.length > 0 && done.length < wTasks.length) coAllPerfect = false;
                        if (wTasks.length > 0) grandNone = false;
                        if (wTasks.length > 0 && done.length < wTasks.length) grandPerfect = false;
                        coContent += buildEmpBlock(emp, wTasks, l);
                    });

                    const coIcon = coAllNone ? '🏖️' : (coAllPerfect ? '✅' : '❌');
                    masterContent += `<div style="margin-bottom:20px;border:2px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                        <div style="background:#714B67;padding:10px 14px;">
                            <span style="color:#fff;font-weight:bold;font-size:14px;">${coIcon} ${coName}</span>
                        </div>
                        <div style="padding:10px;">${coContent}</div>
                    </div>`;
                }
                masterContent += '</div>';

                const subj = grandNone ? l.m_none_subj : (grandPerfect ? l.m_perf_subj : l.m_pend_subj);
                transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: boss.email, subject: `[Master] ${subj}`, html: getEmailTemplate(l, masterContent) })
                    .catch(e => console.error(`❌ EOD email BIG_BOSS ${boss.email}:`, e.message));
            }
        }

        console.log("✅ [EOD] Daily Report completed for everyone.");
    } catch (error) { console.error("❌ [EOD] runDailyReport failed:", error); }
};

// EOD Report: 16:00 Asia/Bangkok — Email only for leaders, All 3 channels for employees
cron.schedule('0 16 * * *', runDailyReport, { scheduled: true, timezone: 'Asia/Bangkok' });

// 2. POST /api/trigger-daily-reports — manual trigger with optional manager_id filter
app.post('/api/trigger-daily-reports', async (req, res) => {
    try {
        const manager_id = req.body?.manager_id ? parseInt(req.body.manager_id, 10) : null;
        await runDailyReport(manager_id);
        res.json({ success: true, message: manager_id ? `Reports sent for manager ${manager_id}'s team.` : 'Reports sent for everyone.' });
    } catch (err) {
        console.error("❌ trigger-daily-reports failed:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Scoped daily report for a single user (all 3 channels simultaneously) ─────
const sendScopedDailyReport = async (userId) => {
    const dict = {
        he: {
            dir: 'rtl', align: 'right',
            perf_subj: '🌟 אלופה! סיימת את כל המשימות',
            pend_subj: '⚠️ דוח יומי: עליך להשלים משימות פתוחות',
            none_subj: '🏖️ איזה כיף! אין לך משימות להיום',
            w_perf_title: 'כל הכבוד סיימת הכל! 🎉', w_pend_title: 'לא סיימת את המשימות להיום! ⏰', w_none_title: 'אין לך משימות להיום! 🏖️',
            w_perf_body: 'להלן הסיכום שלך להיום:', w_pend_body: 'פירוט המשימות שביצעת ואלו שעליך להשלים בדחיפות:', w_none_body: 'תהנה מהיום שלך, אין משימות פתוחות שמשויכות אליך.',
            m_perf_subj: '🌟 סיכום יומי: כל הצוות סיים בהצטיינות!', m_pend_subj: '📊 סיכום יומי: יש משימות פתוחות בצוות', m_none_subj: '🏖️ סיכום יומי: לצוות אין משימות היום',
            m_title: 'דוח ביצועי צוות יומי 📊', m_desc: 'להלן סטטוס המשימות של העובדים להיום.',
            btn_app: 'לכניסה לאפליקציה לחץ כאן', th_task: 'משימה', th_status: 'סטטוס',
            status_done: 'בוצע ✔️', status_not: 'לא בוצע ❌', status_none: 'ללא משימות היום 🏖️', out_of: 'מתוך',
            push_w_perf_title: 'סיימת הכל! 🏆', push_w_perf_body: 'כל הכבוד! הסיכום היומי נשלח למייל.',
            push_w_pend_title: 'יש משימות פתוחות! ⏰', push_w_pend_body: 'נותרו לך משימות להשלים.',
            push_w_none_title: 'יום חופשי! 🏖️', push_w_none_body: 'אין לך משימות פתוחות להיום.',
            push_m_perf_title: 'הצוות סיים הכל! 🏆', push_m_perf_body: 'כל העובדים סיימו את המשימות.',
            push_m_pend_title: 'דוח יומי מוכן 📊', push_m_pend_body: 'לצוות שלך יש משימות פתוחות. הדוח נשלח למייל.',
            push_m_none_title: 'אין משימות לצוות 🏖️', push_m_none_body: 'הצוות שלך סיים הכל להיום.'
        },
        en: {
            dir: 'ltr', align: 'left',
            perf_subj: '🌟 Awesome! All tasks completed', pend_subj: '⚠️ Daily Report: Pending tasks to complete', none_subj: '🏖️ Free day! No tasks for today',
            w_perf_title: 'Great job, you finished everything! 🎉', w_pend_title: 'You have pending tasks today! ⏰', w_none_title: 'Enjoy, no tasks for today! 🏖️',
            w_perf_body: 'Here is your summary for today:', w_pend_body: 'Details of your tasks and what needs urgent completion:', w_none_body: 'There are no tasks assigned to you today.',
            m_perf_subj: '🌟 Daily Summary: Entire team excelled!', m_pend_subj: '📊 Daily Summary: Pending tasks in your team', m_none_subj: '🏖️ Daily Summary: Team has no tasks today',
            m_title: 'Daily Team Performance 📊', m_desc: 'Here is the task status of your employees for today.',
            btn_app: 'Click here to open the app', th_task: 'Task', th_status: 'Status',
            status_done: 'Done ✔️', status_not: 'Pending ❌', status_none: 'No tasks today 🏖️', out_of: 'out of',
            push_w_perf_title: 'All done! 🏆', push_w_perf_body: 'Great job! Daily summary sent to email.',
            push_w_pend_title: 'Pending tasks! ⏰', push_w_pend_body: 'You have tasks left to complete.',
            push_w_none_title: 'Free day! 🏖️', push_w_none_body: 'You have no tasks today.',
            push_m_perf_title: 'Team finished! 🏆', push_m_perf_body: 'All employees completed their tasks.',
            push_m_pend_title: 'Daily Report 📊', push_m_pend_body: 'Your team has pending tasks. Report sent to email.',
            push_m_none_title: 'No team tasks 🏖️', push_m_none_body: 'Your team has no tasks today.'
        },
        th: {
            dir: 'ltr', align: 'left',
            perf_subj: '🌟 ยอดเยี่ยม! ทำภารกิจเสร็จสิ้นทั้งหมด', pend_subj: '⚠️ รายงานประจำวัน: มีภารกิจที่ต้องทำ', none_subj: '🏖️ วันว่าง! ไม่มีภารกิจสำหรับวันนี้',
            w_perf_title: 'ทำได้ดีมาก คุณทำเสร็จหมดแล้ว! 🎉', w_pend_title: 'คุณมีภารกิจค้างอยู่สำหรับวันนี้! ⏰', w_none_title: 'วันนี้ไม่มีภารกิจ! 🏖️',
            w_perf_body: 'นี่คือสรุปของคุณสำหรับวันนี้:', w_pend_body: 'รายละเอียดภารกิจและสิ่งที่ต้องทำด่วน:', w_none_body: 'วันนี้ไม่มีงานที่ได้รับมอบหมาย',
            m_perf_subj: '🌟 สรุปประจำวัน: ทีมทำงานยอดเยี่ยม!', m_pend_subj: '📊 สรุปประจำวัน: มีภารกิจค้างในทีม', m_none_subj: '🏖️ สรุปประจำวัน: ทีมไม่มีภารกิจวันนี้',
            m_title: 'ผลงานทีมประจำวัน 📊', m_desc: 'สถานะภารกิจของพนักงานสำหรับวันนี้.',
            btn_app: 'คลิกที่นี่เพื่อเปิดแอป', th_task: 'งาน', th_status: 'สถานะ',
            status_done: 'เสร็จ ✔️', status_not: 'รอดำเนินการ ❌', status_none: 'ไม่มีงาน 🏖️', out_of: 'จาก',
            push_w_perf_title: 'เสร็จหมด! 🏆', push_w_perf_body: 'ยอดเยี่ยม! ส่งสรุปไปที่อีเมลแล้ว.',
            push_w_pend_title: 'มีงานค้าง! ⏰', push_w_pend_body: 'คุณมีงานที่ต้องทำต่อ.',
            push_w_none_title: 'วันว่าง! 🏖️', push_w_none_body: 'วันนี้ไม่มีภารกิจ',
            push_m_perf_title: 'ทีมเสร็จงาน! 🏆', push_m_perf_body: 'พนักงานทุกคนทำงานเสร็จแล้ว.',
            push_m_pend_title: 'รายงานประจำวัน 📊', push_m_pend_body: 'ทีมของคุณมีงานค้าง ส่งรายงานไปที่อีเมลแล้ว.',
            push_m_none_title: 'ไม่มีงานทีม 🏖️', push_m_none_body: 'ทีมของคุณไม่มีงานวันนี้'
        }
    };

    const getEmailTemplate = (langDict, content) => `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0; padding:10px; background-color:#f4f4f5; font-family:Helvetica, Arial, sans-serif; -webkit-text-size-adjust:none;">
        <div style="max-width:500px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.05); direction:${langDict.dir}; text-align:${langDict.align};">
            ${content}
        </div>
    </body></html>`;

    // Fetch target user (include company_id for COMPANY_MANAGER scoping)
    const userRes = await pool.query(
        'SELECT id, full_name, email, role, parent_manager_id, company_id, device_token, preferred_language, line_user_id FROM users WHERE id = $1',
        [userId]
    );
    if (!userRes.rows.length) throw new Error(`User ${userId} not found`);
    const u = userRes.rows[0];
    const l = dict[u.preferred_language] || dict['en'];

    if (u.role === 'EMPLOYEE') {
        // ── Individual employee report ──────────────────────────────────────────
        const tasksRes = await pool.query(
            'SELECT * FROM tasks WHERE worker_id = $1 AND DATE(due_date) = CURRENT_DATE',
            [userId]
        );
        const wTasks    = tasksRes.rows;
        const completed = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
        const pending   = wTasks.filter(t => t.status === 'PENDING');
        const isNone    = wTasks.length === 0;
        const isPerfect = !isNone && pending.length === 0;

        let tableHtml = '';
        if (!isNone) {
            tableHtml = `<table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;">
                <tr style="background:#f3f4f6; text-align:${l.align};">
                    <th style="padding:8px 6px; border-bottom:1px solid #e5e7eb;">${l.th_task}</th>
                    <th style="padding:8px 6px; border-bottom:1px solid #e5e7eb;">${l.th_status}</th>
                </tr>`;
            wTasks.forEach(t => {
                const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                tableHtml += `<tr>
                    <td style="padding:8px 6px; border-bottom:1px solid #e5e7eb; color:#374151;">${t.title}</td>
                    <td style="padding:8px 6px; border-bottom:1px solid #e5e7eb; font-size:11px;">
                        <span style="background:${isDone ? '#dcfce7' : '#fee2e2'}; color:${isDone ? '#166534' : '#991b1b'}; padding:3px 6px; border-radius:12px; white-space:nowrap;">${isDone ? l.status_done : l.status_not}</span>
                    </td></tr>`;
            });
            tableHtml += `</table>`;
        }

        const emailSubj  = isNone ? l.none_subj      : (isPerfect ? l.perf_subj      : l.pend_subj);
        const bodyTitle  = isNone ? l.w_none_title    : (isPerfect ? l.w_perf_title   : l.w_pend_title);
        const bodyText   = isNone ? l.w_none_body     : (isPerfect ? l.w_perf_body    : l.w_pend_body);
        const titleColor = isNone ? '#3b82f6'         : (isPerfect ? '#166534'        : '#991b1b');
        const pushTitle  = isNone ? l.push_w_none_title : (isPerfect ? l.push_w_perf_title : l.push_w_pend_title);
        const pushBody   = isNone ? l.push_w_none_body  : (isPerfect ? l.push_w_perf_body  : l.push_w_pend_body);

        const htmlBody = getEmailTemplate(l, `
            <div style="padding:15px;">
                <h3 style="margin:0 0 5px 0; font-size:16px; color:${titleColor};">${bodyTitle}</h3>
                <p style="margin:0; font-size:13px; color:#4b5563;">${u.full_name}, ${bodyText}</p>
                ${tableHtml}
                <div style="text-align:center; margin-top:20px;">
                    <a href="https://air-manage-app.netlify.app/" style="display:inline-block; background:#714B67; color:#fff; padding:10px 20px; text-decoration:none; border-radius:6px; font-size:14px; font-weight:bold;">${l.btn_app}</a>
                </div>
            </div>`);

        let lineMsg = `${pushTitle}\n${pushBody}`;
        if (!isNone) {
            lineMsg += `\n\n--- ${l.th_task} ---`;
            wTasks.forEach(t => {
                const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                lineMsg += `\n• ${t.title}: ${isDone ? l.status_done : l.status_not}`;
            });
            lineMsg += `\n\n${completed.length} ${l.out_of} ${wTasks.length}`;
        }

        await Promise.all([
            u.email        ? transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: u.email, subject: emailSubj, html: htmlBody }).catch(e => console.error('❌ [scoped] Email error:', e.message)) : Promise.resolve(),
            u.line_user_id ? sendLineMessage(u.line_user_id, lineMsg).catch(e => console.error('❌ [scoped] LINE error:', e.message)) : Promise.resolve(),
            u.device_token ? admin.messaging().send({ token: u.device_token, notification: { title: pushTitle, body: pushBody }, webpush: { fcmOptions: { link: '/' } } }).catch(e => console.error('❌ [scoped] FCM error:', e.message)) : Promise.resolve(),
        ]);

    } else {
        // ── MANAGER or COMPANY_MANAGER: team report ────────────────────────────
        let empQueryText, empQueryParams;
        if (u.role === 'MANAGER') {
            empQueryText   = "SELECT id, full_name, email, device_token, preferred_language, line_user_id FROM users WHERE parent_manager_id = $1 AND role = 'EMPLOYEE'";
            empQueryParams = [userId];
        } else {
            // COMPANY_MANAGER — summarise ALL employees in their company
            empQueryText   = "SELECT id, full_name, email, device_token, preferred_language, line_user_id FROM users WHERE company_id = $1 AND role = 'EMPLOYEE'";
            empQueryParams = [u.company_id];
        }

        const empsRes  = await pool.query(empQueryText, empQueryParams);
        const teamEmps = empsRes.rows;
        if (!teamEmps.length) { console.log(`ℹ️ No employees found for user ${userId}, skipping scoped report`); return; }

        const empIds     = teamEmps.map(e => e.id);
        const tasksRes   = await pool.query('SELECT * FROM tasks WHERE worker_id = ANY($1) AND DATE(due_date) = CURRENT_DATE', [empIds]);
        const todayTasks = tasksRes.rows;

        let allTeamPerfect = true;
        let allTeamNone    = true;
        let leaderContent  = `<div>`;

        teamEmps.forEach(emp => {
            const wTasks    = todayTasks.filter(t => t.worker_id === emp.id);
            const completed = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
            const isEmpNone    = wTasks.length === 0;
            const isEmpPerfect = !isEmpNone && (completed.length === wTasks.length);
            if (!isEmpNone)                   allTeamNone    = false;
            if (!isEmpPerfect && !isEmpNone)  allTeamPerfect = false;

            const empStatusColor = isEmpNone ? '#6b7280' : (isEmpPerfect ? '#166534' : '#991b1b');
            const empBgColor     = isEmpNone ? '#f9fafb' : (isEmpPerfect ? '#f0fdf4' : '#fef2f2');
            const empIcon        = isEmpNone ? '🏖️' : (isEmpPerfect ? '🌟' : '⚠️');
            const empBadge       = isEmpNone ? l.status_none : `${completed.length} ${l.out_of} ${wTasks.length}`;

            leaderContent += `
                <div style="margin-bottom:12px; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden;">
                    <div style="background:${empBgColor}; padding:8px 10px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; font-size:14px; color:${empStatusColor};">${empIcon} ${emp.full_name}</span>
                        <span style="font-size:11px; color:#6b7280; background:#fff; padding:2px 6px; border-radius:10px; border:1px solid #ddd;">${empBadge}</span>
                    </div>`;
            if (!isEmpNone) {
                leaderContent += `<table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <tr style="background:#f9fafb; text-align:${l.align}; color:#4b5563;">
                        <th style="padding:6px; border-bottom:1px solid #eee;">${l.th_task}</th>
                        <th style="padding:6px; border-bottom:1px solid #eee;">${l.th_status}</th>
                    </tr>`;
                wTasks.forEach(t => {
                    const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                    leaderContent += `<tr>
                        <td style="padding:6px; border-bottom:1px solid #eee;">${t.title}</td>
                        <td style="padding:6px; border-bottom:1px solid #eee;">
                            <span style="background:${isDone ? '#dcfce7' : '#fee2e2'}; color:${isDone ? '#166534' : '#991b1b'}; padding:2px 4px; border-radius:4px; white-space:nowrap; font-size:10px;">${isDone ? l.status_done : l.status_not}</span>
                        </td></tr>`;
                });
                leaderContent += `</table>`;
            }
            leaderContent += `</div>`;
        });
        leaderContent += `</div>`;

        const htmlBody  = getEmailTemplate(l, leaderContent);
        const emailSubj = allTeamNone ? l.m_none_subj      : (allTeamPerfect ? l.m_perf_subj      : l.m_pend_subj);
        const pushTitle = allTeamNone ? l.push_m_none_title : (allTeamPerfect ? l.push_m_perf_title : l.push_m_pend_title);
        const pushBody  = allTeamNone ? l.push_m_none_body  : (allTeamPerfect ? l.push_m_perf_body  : l.push_m_pend_body);

        let lineReport = `${pushTitle}\n${pushBody}\n`;
        teamEmps.forEach(emp => {
            const empTasks = todayTasks.filter(t => t.worker_id === emp.id);
            const empDone  = empTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
            const empIcon  = empTasks.length === 0 ? '🏖️' : (empDone.length === empTasks.length ? '🌟' : '⚠️');
            lineReport += `\n${empIcon} ${emp.full_name} (${empDone.length}/${empTasks.length})`;
            empTasks.forEach(t => {
                const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                lineReport += `\n  • ${t.title}: ${isDone ? l.status_done : l.status_not}`;
            });
        });

        await Promise.all([
            u.email        ? transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: u.email, subject: emailSubj, html: htmlBody }).catch(e => console.error('❌ [scoped] Email error:', e.message)) : Promise.resolve(),
            u.line_user_id ? sendLineMessage(u.line_user_id, lineReport).catch(e => console.error('❌ [scoped] LINE error:', e.message)) : Promise.resolve(),
            u.device_token ? admin.messaging().send({ token: u.device_token, notification: { title: pushTitle, body: pushBody }, webpush: { fcmOptions: { link: '/' } } }).catch(e => console.error('❌ [scoped] FCM error:', e.message)) : Promise.resolve(),
        ]);
    }
    console.log(`✅ [scoped] Daily report dispatched for user ${userId} (${u.role})`);
};

// POST /api/send-daily-report/:userId — send scoped daily report to a specific user
app.post('/api/send-daily-report/:userId', authenticateToken, async (req, res) => {
    try {
        const targetId = parseInt(req.params.userId, 10);
        if (!targetId) return res.status(400).json({ error: 'Invalid userId' });
        await sendScopedDailyReport(targetId);
        res.json({ success: true, message: `Report dispatched for user ${targetId}.` });
    } catch (err) {
        console.error('❌ send-daily-report failed:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/rescue-boss', async (req, res) => {
    try {
        const bossEmail = "talyaisrael2025@gmail.com"; 
        const bossName = "Big Boss";

        const bcrypt = require('bcrypt');
        const dummyPassword = await bcrypt.hash("123456", 10);

        await pool.query('DELETE FROM users WHERE email = $1', [bossEmail]);
        
        await pool.query(
            `INSERT INTO users (full_name, email, role, password) 
             VALUES ($1, $2, 'BIG_BOSS', $3)`,
            [bossName, bossEmail, dummyPassword]
        );

        res.send(`
            <div style="font-family: Arial; text-align: center; margin-top: 50px; direction: rtl;">
                <h1 style="color: #166534;">✅ משתמש ה-Big Boss נוצר בהצלחה במסד הנתונים!</h1>
                <h2>אימייל להתחברות: <b>${bossEmail}</b></h2>
                <p style="color: #4b5563;">(השתמשי בסיסמה שהגדרת ידנית בפיירבייס)</p>
                <p>הכתר חזר אלייך. כנסי עכשיו לאפליקציה ותתחברי.</p>
            </div>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send("❌ שגיאת שרת פנימית: " + error.message);
    }
});

// ==========================================
// 📲 LINE Webhook Verification & Events
// ==========================================
app.post('/webhook/line', (req, res) => {
    // LINE platform sends a POST to verify the webhook URL.
    // We must respond 200 OK immediately — for both verification pings and real events.
    res.sendStatus(200);

    const events = req.body?.events || [];
    events.forEach(event => {
        console.log('📲 LINE webhook event:', JSON.stringify(event));

        if (event.type === 'message' && event.message?.type === 'text') {
            const replyToken = event.replyToken;
            const userId = event.source?.userId;

            console.log('Attempting to reply to:', userId);

            if (!replyToken || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return;

            const https = require('https');
            const body = JSON.stringify({
                replyToken,
                messages: [{ type: 'text', text: `Your LINE User ID is: ${userId}` }]
            });

            const reqLine = https.request({
                hostname: 'api.line.me',
                path: '/v2/bot/message/reply',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN.trim()}`,
                    'Content-Length': Buffer.byteLength(body)
                }
            }, (lineRes) => {
                let data = '';
                lineRes.on('data', chunk => data += chunk);
                lineRes.on('end', () => {
                    if (lineRes.statusCode >= 200 && lineRes.statusCode < 300) {
                        console.log(`✅ LINE reply sent to ${userId}`);
                    } else {
                        console.error(`⚠️ LINE reply API error (${lineRes.statusCode}):`, data);
                    }
                });
            });
            reqLine.on('error', err => console.error('⚠️ LINE reply request failed:', err.message));
            reqLine.write(body);
            reqLine.end();
        }
    });
});

// ── Company (Multi-Tenant) Firestore CRUD ────────────────────────────────────
// Document structure: companies/{company_id}
//   name            : string  — company display name
//   owner_name_en   : string  — owner name (English)
//   owner_name_he   : string  — owner name (Hebrew)
//   owner_name_th   : string  — owner name (Thai)
//   email           : string  — company login email
//   password        : string  — hashed password
//   phone           : string  — contact phone number
//   line_id         : string  — LINE messaging ID
//   notification_lang : string — preferred notification language ('he'|'en'|'th')
//   profile_picture_url : string — Cloudinary URL for company logo/avatar
//   created_at      : Timestamp

const COMPANY_FIELDS = ['name', 'owner_name_en', 'owner_name_he', 'owner_name_th',
    'email', 'phone', 'line_id', 'notification_lang', 'profile_picture_url'];

// GET /companies/:id — fetch a single company document (BIG_BOSS only)
app.get('/companies/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'Access denied' });
    if (!db) return res.status(503).json({ error: 'Firestore not available' });
    try {
        const doc = await db.collection('companies').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Company not found' });
        res.json({ id: doc.id, ...doc.data() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /companies — list all companies (BIG_BOSS only)
app.get('/companies', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'Access denied' });
    if (!db) return res.status(503).json({ error: 'Firestore not available' });
    try {
        const snap = await db.collection('companies').get();
        res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /companies — create a new company (BIG_BOSS only)
app.post('/companies', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'Access denied' });
    if (!db) return res.status(503).json({ error: 'Firestore not available' });
    try {
        const payload = {};
        COMPANY_FIELDS.forEach(f => { if (req.body[f] !== undefined) payload[f] = req.body[f]; });
        if (req.body.password) payload.password = await bcrypt.hash(req.body.password, 10);
        payload.created_at = admin.firestore.FieldValue.serverTimestamp();
        const ref = await db.collection('companies').add(payload);
        res.status(201).json({ id: ref.id, ...payload });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /companies/:id — update an existing company (BIG_BOSS only)
app.put('/companies/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).json({ error: 'Access denied' });
    if (!db) return res.status(503).json({ error: 'Firestore not available' });
    try {
        const updates = {};
        COMPANY_FIELDS.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
        if (req.body.password) updates.password = await bcrypt.hash(req.body.password, 10);
        if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
        await db.collection('companies').doc(req.params.id).update(updates);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// 📊 Config Bulk Import / Export  (locations, categories, assets, managers, employees)
// ==========================================

// Helper: resolve the area_id + company_id that every inserted row must carry,
// based on the authenticated caller.  Enforces company-scoping for non-BIG_BOSS roles.
// For BIG_BOSS acting on a tenant workspace, pass the validated targetCompanyId.
async function resolveCallerScope(reqUser, targetCompanyId = null) {
    const { role, id, area_id } = reqUser;
    // CRITICAL: always pull company_id from the JWT, never from the request body —
    // EXCEPT for BIG_BOSS who may act on behalf of a specific tenant company.
    let insertCompanyId = reqUser.company_id ?? null;
    let insertAreaId    = area_id ?? null;

    if (role === 'BIG_BOSS' && targetCompanyId) {
        // BIG_BOSS is acting on behalf of a tenant — scope inserts to that company
        insertCompanyId = targetCompanyId;
        insertAreaId    = null;
    } else if (role === 'MANAGER') {
        insertAreaId = id;                         // MANAGER's area = their own id
        if (!insertCompanyId) {
            const r = await pool.query('SELECT company_id FROM users WHERE id = $1', [id]);
            insertCompanyId = r.rows[0]?.company_id ?? null;
        }
    }
    // COMPANY_MANAGER and others: already populated from JWT above
    return { insertAreaId, insertCompanyId };
}

// ─── Locations ──────────────────────────────────────────────────────────────

app.get('/locations/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, company_id, area_id } = req.user;
        const ALLOWED = ['id', 'name_he', 'name_en', 'name_th', 'code', 'address'];
        const requested = req.query.fields
            ? req.query.fields.split(',').map(f => f.trim()).filter(f => ALLOWED.includes(f))
            : ALLOWED;
        if (!requested.length) return res.status(400).json({ error: 'No valid fields requested' });

        const cols = requested.map(f =>
            f === 'address' ? `coordinates::jsonb->>'link' AS address` : `locations.${f}`
        ).join(', ');
        let query = `SELECT ${cols} FROM locations WHERE 1=1`;
        const params = [];
        let pi = 1;

        if (role !== 'BIG_BOSS') {
            if (company_id)    { query += ` AND locations.company_id = $${pi++}`; params.push(company_id); }
            else if (area_id)  { query += ` AND locations.area_id    = $${pi++}`; params.push(area_id);    }
            else               { query += ' AND 1=0'; }
        }
        query += ' ORDER BY locations.name ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /locations/export error:', err.message);
        res.status(500).json({ error: 'Export failed' });
    }
});

app.post('/locations/bulk-import', authenticateToken, requireAdmin, async (req, res) => {
    const { rows, isDryRun, target_company_id } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const safeTargetCompanyId = req.user.role === 'BIG_BOSS' ? (target_company_id || null) : null;

    const { insertAreaId, insertCompanyId } = await resolveCallerScope(req.user, safeTargetCompanyId);
    const callerId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const errors = [];
        const validRows = [];

        const GMAPS_RE = /google\.com\/maps|maps\.app\.goo\.gl/i;
        const URL_RE   = /^https?:\/\/.+/i;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ri  = i + 1;
            const name_en = (row.name_en || row['Name (EN)'] || row['name_en *'] || '').toString().trim();
            const name_he = (row.name_he || row['שם בעברית']  || row['name_he (Optional)'] || '').toString().trim();
            const name_th = (row.name_th || row['ชื่อ (TH)']  || row['name_th (Optional)'] || '').toString().trim();
            const primaryName = name_en || name_he || name_th;
            // code is auto-generated — ignore any code column supplied by the file
            const mapUrl   = (row.address || row['Address'] || row['address (Optional)'] || '').toString().trim() || null;
            const imageUrl = (row.image_url || row['image_url (Optional)'] || '').toString().trim() || null;
            const rowId    = row.id ? parseInt(row.id, 10) : null;

            if (!primaryName) { errors.push(`Row ${ri}: at least one name field is required`); continue; }
            if (mapUrl && !GMAPS_RE.test(mapUrl)) {
                errors.push(`Row ${ri}: address must be a valid Google Maps URL (google.com/maps or maps.app.goo.gl)`);
                continue;
            }
            if (imageUrl && !URL_RE.test(imageUrl)) {
                errors.push(`Row ${ri}: image_url must be a valid URL starting with http:// or https://`);
                continue;
            }
            // Duplicate-name check (new rows only): block commit-time unique-constraint failures early
            if (!rowId) {
                const dupQ  = insertCompanyId
                    ? 'SELECT id FROM locations WHERE (LOWER(name)=LOWER($1) OR LOWER(name_en)=LOWER($1) OR LOWER(name_he)=LOWER($1) OR LOWER(name_th)=LOWER($1)) AND company_id=$2'
                    : 'SELECT id FROM locations WHERE (LOWER(name)=LOWER($1) OR LOWER(name_en)=LOWER($1) OR LOWER(name_he)=LOWER($1) OR LOWER(name_th)=LOWER($1)) AND company_id IS NULL';
                const dupP  = insertCompanyId ? [primaryName, insertCompanyId] : [primaryName];
                const dupR  = await client.query(dupQ, dupP);
                if (dupR.rows.length > 0) {
                    errors.push(`Row ${ri}: Location '${primaryName}' already exists in your company`);
                    continue;
                }
            }
            validRows.push({ rowId, primaryName, name_en: name_en || null, name_he: name_he || null, name_th: name_th || null, mapUrl, imageUrl });
        }

        if (errors.length > 0 || isDryRun) {
            await client.query('ROLLBACK');
            return res.json({ errors, validCount: validRows.length });
        }

        let inserted = 0, updated = 0;
        for (const vr of validRows) {
            if (vr.rowId) {
                // Relational-integrity check: existing row must belong to caller's company
                if (insertCompanyId) {
                    const chk = await client.query('SELECT company_id FROM locations WHERE id = $1', [vr.rowId]);
                    if (!chk.rows[0] || String(chk.rows[0].company_id) !== String(insertCompanyId)) {
                        await client.query('ROLLBACK');
                        return res.status(403).json({ error: `Location id=${vr.rowId} does not belong to your company` });
                    }
                }
                await client.query(
                    'UPDATE locations SET name=$1, name_he=$2, name_en=$3, name_th=$4, coordinates=COALESCE($5,coordinates), image_url=COALESCE($6,image_url) WHERE id=$7',
                    [vr.primaryName, vr.name_he, vr.name_en, vr.name_th, vr.mapUrl !== null ? JSON.stringify({ link: vr.mapUrl }) : null, vr.imageUrl, vr.rowId]
                );
                updated++;
            } else {
                // Auto-generate LOC-XXXX code, scoped to the caller's company
                const codeQ  = insertCompanyId
                    ? "SELECT code FROM locations WHERE code LIKE 'LOC-%' AND company_id = $1"
                    : "SELECT code FROM locations WHERE code LIKE 'LOC-%'";
                const codeP  = insertCompanyId ? [insertCompanyId] : [];
                const ex     = await client.query(codeQ, codeP);
                let max = 0;
                ex.rows.forEach(r => { const n = parseInt((r.code || '').split('-')[1]); if (!isNaN(n) && n > max) max = n; });
                const finalCode  = `LOC-${String(max + 1).padStart(4, '0')}`;
                const coordValue = vr.mapUrl ? JSON.stringify({ link: vr.mapUrl }) : null;
                await client.query(
                    'INSERT INTO locations (name, name_he, name_en, name_th, code, coordinates, image_url, created_by, area_id, company_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
                    [vr.primaryName, vr.name_he, vr.name_en, vr.name_th, finalCode, coordValue, vr.imageUrl, callerId, insertAreaId, insertCompanyId]
                );
                inserted++;
            }
        }
        await client.query('COMMIT');
        res.json({ errors: [], validCount: validRows.length, inserted, updated });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /locations/bulk-import error:', err.message);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// ─── Categories ─────────────────────────────────────────────────────────────

app.get('/categories/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, company_id, area_id } = req.user;
        const ALLOWED = ['id', 'name_he', 'name_en', 'name_th', 'code'];
        const requested = req.query.fields
            ? req.query.fields.split(',').map(f => f.trim()).filter(f => ALLOWED.includes(f))
            : ALLOWED;
        if (!requested.length) return res.status(400).json({ error: 'No valid fields requested' });

        const cols = requested.map(f => `categories.${f}`).join(', ');
        let query = `SELECT ${cols} FROM categories WHERE 1=1`;
        const params = [];
        let pi = 1;

        if (role !== 'BIG_BOSS') {
            if (company_id)    { query += ` AND categories.company_id = $${pi++}`; params.push(company_id); }
            else if (area_id)  { query += ` AND categories.area_id    = $${pi++}`; params.push(area_id);    }
            else               { query += ' AND 1=0'; }
        }
        query += ' ORDER BY categories.name ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /categories/export error:', err.message);
        res.status(500).json({ error: 'Export failed' });
    }
});

app.post('/categories/bulk-import', authenticateToken, requireAdmin, async (req, res) => {
    const { rows, isDryRun, target_company_id } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const safeTargetCompanyId = req.user.role === 'BIG_BOSS' ? (target_company_id || null) : null;

    const { insertAreaId, insertCompanyId } = await resolveCallerScope(req.user, safeTargetCompanyId);
    const callerId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const errors = [];
        const validRows = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ri  = i + 1;
            const name_en = (row.name_en || row['Name (EN)'] || row['name_en *'] || '').toString().trim();
            const name_he = (row.name_he || row['שם בעברית']  || row['name_he (Optional)'] || '').toString().trim();
            const name_th = (row.name_th || row['ชื่อ (TH)']  || row['name_th (Optional)'] || '').toString().trim();
            const primaryName = name_en || name_he || name_th;
            const code  = (row.code || row['Code'] || row['code *'] || '').toString().trim() || null;
            const rowId = row.id ? parseInt(row.id, 10) : null;

            if (!primaryName) { errors.push(`Row ${ri}: at least one name field is required`); continue; }
            if (code && !CATEGORY_CODE_RE.test(code)) {
                errors.push(`Row ${ri}: code must be 1-5 English letters`); continue;
            }
            // Duplicate-name check (new rows only)
            if (!rowId) {
                const dupQ  = insertCompanyId
                    ? 'SELECT id FROM categories WHERE (LOWER(name)=LOWER($1) OR LOWER(name_en)=LOWER($1) OR LOWER(name_he)=LOWER($1) OR LOWER(name_th)=LOWER($1)) AND company_id=$2'
                    : 'SELECT id FROM categories WHERE (LOWER(name)=LOWER($1) OR LOWER(name_en)=LOWER($1) OR LOWER(name_he)=LOWER($1) OR LOWER(name_th)=LOWER($1)) AND company_id IS NULL';
                const dupP  = insertCompanyId ? [primaryName, insertCompanyId] : [primaryName];
                const dupR  = await client.query(dupQ, dupP);
                if (dupR.rows.length > 0) {
                    errors.push(`Row ${ri}: Category '${primaryName}' already exists in your company`);
                    continue;
                }
            }
            validRows.push({ rowId, primaryName, name_en: name_en || null, name_he: name_he || null, name_th: name_th || null, code });
        }

        if (errors.length > 0 || isDryRun) {
            await client.query('ROLLBACK');
            return res.json({ errors, validCount: validRows.length });
        }

        let inserted = 0, updated = 0;
        for (const vr of validRows) {
            if (vr.rowId) {
                if (insertCompanyId) {
                    const chk = await client.query('SELECT company_id FROM categories WHERE id = $1', [vr.rowId]);
                    if (!chk.rows[0] || String(chk.rows[0].company_id) !== String(insertCompanyId)) {
                        await client.query('ROLLBACK');
                        return res.status(403).json({ error: `Category id=${vr.rowId} does not belong to your company` });
                    }
                }
                await client.query(
                    'UPDATE categories SET name=$1, name_he=$2, name_en=$3, name_th=$4, code=COALESCE($5,code) WHERE id=$6',
                    [vr.primaryName, vr.name_he, vr.name_en, vr.name_th, vr.code, vr.rowId]
                );
                updated++;
            } else {
                await client.query(
                    'INSERT INTO categories (name, name_he, name_en, name_th, code, created_by, area_id, company_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING',
                    [vr.primaryName, vr.name_he, vr.name_en, vr.name_th, vr.code, callerId, insertAreaId, insertCompanyId]
                );
                inserted++;
            }
        }
        await client.query('COMMIT');
        res.json({ errors: [], validCount: validRows.length, inserted, updated });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /categories/bulk-import error:', err.message);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// ─── Assets ─────────────────────────────────────────────────────────────────

app.get('/assets/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, company_id, area_id } = req.user;
        const ALLOWED = ['id', 'name_he', 'name_en', 'name_th', 'code', 'category_id', 'location_id'];
        const requested = req.query.fields
            ? req.query.fields.split(',').map(f => f.trim()).filter(f => ALLOWED.includes(f))
            : ALLOWED;
        if (!requested.length) return res.status(400).json({ error: 'No valid fields requested' });

        const cols = requested.map(f => `assets.${f}`).join(', ');
        let query = `SELECT ${cols} FROM assets WHERE 1=1`;
        const params = [];
        let pi = 1;

        if (role !== 'BIG_BOSS') {
            if (company_id)    { query += ` AND assets.company_id = $${pi++}`; params.push(company_id); }
            else if (area_id)  { query += ` AND assets.area_id    = $${pi++}`; params.push(area_id);    }
            else               { query += ' AND 1=0'; }
        }
        query += ' ORDER BY assets.code';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /assets/export error:', err.message);
        res.status(500).json({ error: 'Export failed' });
    }
});

app.post('/assets/bulk-import', authenticateToken, requireAdmin, async (req, res) => {
    const { rows, isDryRun, target_company_id } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const safeTargetCompanyId = req.user.role === 'BIG_BOSS' ? (target_company_id || null) : null;

    const { insertAreaId, insertCompanyId } = await resolveCallerScope(req.user, safeTargetCompanyId);
    const callerId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Pre-fetch company-scoped categories and locations for FK resolution
        const fkParams = insertCompanyId ? [insertCompanyId] : [];
        const fkWhere  = insertCompanyId ? ' WHERE company_id = $1' : '';
        const catsRes  = await client.query(`SELECT id, code, name FROM categories${fkWhere}`, fkParams);
        const locsRes  = await client.query(`SELECT id, code, name FROM locations${fkWhere}`,  fkParams);
        const catByCode = new Map(catsRes.rows.map(r => [(r.code  || '').trim().toLowerCase(), r.id]));
        const catByName = new Map(catsRes.rows.map(r => [(r.name  || '').trim().toLowerCase(), r.id]));
        const locByCode = new Map(locsRes.rows.map(r => [(r.code  || '').trim().toLowerCase(), r.id]));
        const locByName = new Map(locsRes.rows.map(r => [(r.name  || '').trim().toLowerCase(), r.id]));

        const errors   = [];
        const validRows = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ri  = i + 1;
            const rowErrors = [];
            const name_en = (row.name_en || row['Name (EN)'] || row['name_en *'] || '').toString().trim();
            const name_he = (row.name_he || row['שם בעברית']  || row['name_he (Optional)'] || '').toString().trim();
            const name_th = (row.name_th || row['ชื่อ (TH)']  || row['name_th (Optional)'] || '').toString().trim();
            const primaryName = name_en || name_he || name_th;
            // code is always auto-generated — ignore any code column supplied by the file
            const rowId = row.id ? parseInt(row.id, 10) : null;

            if (!primaryName) rowErrors.push(`Row ${ri}: at least one name field is required`);

            // FK: category — resolve by code or name, must belong to caller's company
            let category_id = null;
            const catRaw = (row.category_id || row['Category'] || row['category *'] || '').toString().trim();
            if (!rowId && !catRaw) {
                rowErrors.push(`Row ${ri}: category is required`);
            } else if (catRaw) {
                category_id = catByCode.get(catRaw.toLowerCase()) || catByName.get(catRaw.toLowerCase()) || null;
                if (!category_id) rowErrors.push(`Row ${ri}: Category '${catRaw}' not found in your company`);
            }

            // FK: location — resolve by code or name, must belong to caller's company
            let location_id = null;
            const locRaw = (row.location_id || row['Location'] || row['location (Optional)'] || '').toString().trim();
            if (locRaw) {
                location_id = locByCode.get(locRaw.toLowerCase()) || locByName.get(locRaw.toLowerCase()) || null;
                if (!location_id) rowErrors.push(`Row ${ri}: Location '${locRaw}' not found in your company`);
            }

            // Duplicate-name check (new rows only)
            if (!rowId && rowErrors.length === 0) {
                const dupQ  = insertCompanyId
                    ? 'SELECT id FROM assets WHERE (LOWER(name)=LOWER($1) OR LOWER(name_en)=LOWER($1) OR LOWER(name_he)=LOWER($1) OR LOWER(name_th)=LOWER($1)) AND company_id=$2'
                    : 'SELECT id FROM assets WHERE (LOWER(name)=LOWER($1) OR LOWER(name_en)=LOWER($1) OR LOWER(name_he)=LOWER($1) OR LOWER(name_th)=LOWER($1)) AND company_id IS NULL';
                const dupP  = insertCompanyId ? [primaryName, insertCompanyId] : [primaryName];
                const dupR  = await client.query(dupQ, dupP);
                if (dupR.rows.length > 0) rowErrors.push(`Row ${ri}: Asset '${primaryName}' already exists in your company`);
            }

            if (rowErrors.length > 0) { errors.push(...rowErrors); continue; }
            validRows.push({ rowId, primaryName, name_en: name_en || null, name_he: name_he || null, name_th: name_th || null, category_id, location_id });
        }

        if (errors.length > 0 || isDryRun) {
            await client.query('ROLLBACK');
            return res.json({ errors, validCount: validRows.length });
        }

        // In-memory counters per category code to avoid duplicate codes within this batch
        const batchCounters = {};

        let inserted = 0, updated = 0;
        for (const vr of validRows) {
            if (vr.rowId) {
                if (insertCompanyId) {
                    const chk = await client.query('SELECT company_id FROM assets WHERE id = $1', [vr.rowId]);
                    if (!chk.rows[0] || String(chk.rows[0].company_id) !== String(insertCompanyId)) {
                        await client.query('ROLLBACK');
                        return res.status(403).json({ error: `Asset id=${vr.rowId} does not belong to your company` });
                    }
                }
                await client.query(
                    'UPDATE assets SET name=$1, name_he=$2, name_en=$3, name_th=$4, category_id=COALESCE($5,category_id), location_id=COALESCE($6,location_id) WHERE id=$7',
                    [vr.primaryName, vr.name_he, vr.name_en, vr.name_th, vr.category_id, vr.location_id, vr.rowId]
                );
                updated++;
            } else {
                // Auto-generate code from category prefix with in-memory counter for batch safety
                const catCode = vr.category_id
                    ? ((await client.query('SELECT code FROM categories WHERE id = $1', [vr.category_id])).rows[0]?.code || 'GEN').toUpperCase()
                    : 'GEN';

                if (!(catCode in batchCounters)) {
                    // Seed from DB: highest existing sequential number for this category prefix + company
                    const patternQ = insertCompanyId
                        ? 'SELECT code FROM assets WHERE code ~ $1 AND company_id = $2'
                        : 'SELECT code FROM assets WHERE code ~ $1';
                    const patternP = insertCompanyId ? [`^${catCode}-[0-9]+$`, insertCompanyId] : [`^${catCode}-[0-9]+$`];
                    const ex = await client.query(patternQ, patternP);
                    let maxNum = 0;
                    ex.rows.forEach(r => { const n = parseInt((r.code || '').split('-')[1]); if (!isNaN(n) && n > maxNum) maxNum = n; });
                    batchCounters[catCode] = maxNum;
                }
                batchCounters[catCode]++;
                const finalCode = `${catCode}-${String(batchCounters[catCode]).padStart(4, '0')}`;

                await client.query(
                    'INSERT INTO assets (name, name_he, name_en, name_th, code, category_id, location_id, created_by, area_id, company_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
                    [vr.primaryName, vr.name_he, vr.name_en, vr.name_th, finalCode, vr.category_id, vr.location_id, callerId, insertAreaId, insertCompanyId]
                );
                inserted++;
            }
        }
        await client.query('COMMIT');
        res.json({ errors: [], validCount: validRows.length, inserted, updated });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /assets/bulk-import error:', err.message);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// ─── Managers ───────────────────────────────────────────────────────────────

app.get('/managers/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, company_id, area_id } = req.user;
        const ALLOWED = ['id', 'full_name', 'email', 'phone'];
        const requested = req.query.fields
            ? req.query.fields.split(',').map(f => f.trim()).filter(f => ALLOWED.includes(f))
            : ALLOWED;
        if (!requested.length) return res.status(400).json({ error: 'No valid fields requested' });

        const cols = requested.map(f => `u.${f}`).join(', ');
        let query = `SELECT ${cols} FROM users u WHERE u.role = 'MANAGER'`;
        const params = [];
        let pi = 1;

        if (role !== 'BIG_BOSS') {
            if (company_id)    { query += ` AND u.company_id = $${pi++}`; params.push(company_id); }
            else if (area_id)  { query += ` AND u.area_id    = $${pi++}`; params.push(area_id);    }
            else               { query += ' AND 1=0'; }
        }
        query += ' ORDER BY u.full_name';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /managers/export error:', err.message);
        res.status(500).json({ error: 'Export failed' });
    }
});

app.post('/managers/bulk-import', authenticateToken, requireAdmin, async (req, res) => {
    // MANAGERs cannot create peer managers — only BIG_BOSS and COMPANY_MANAGER
    if (req.user.role === 'MANAGER') return res.status(403).json({ error: 'MANAGERs cannot bulk-import managers' });

    const { rows, isDryRun, target_company_id } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const safeTargetCompanyId = req.user.role === 'BIG_BOSS' ? (target_company_id || null) : null;

    const { insertCompanyId } = await resolveCallerScope(req.user, safeTargetCompanyId);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const errors   = [];
        const validRows = [];

        const EMAIL_RE    = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.com$/i;
        const LINE_ID_RE  = /^U[a-zA-Z0-9]+$/;
        const LANG_MAP    = { english: 'en', hebrew: 'he', thai: 'th' };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ri  = i + 1;
            const name_en  = (row['name_en *'] || row.name_en  || row.full_name || row['Full Name'] || '').toString().trim();
            const name_he  = (row['name_he (Optional)'] || row.name_he  || '').toString().trim() || null;
            const name_th  = (row['name_th (Optional)'] || row.name_th  || '').toString().trim() || null;
            const email    = (row['email *']    || row.email    || row['Email']  || '').toString().trim().toLowerCase();
            const phone    = (row['phone (Optional)']   || row.phone    || row['Phone']  || '').toString().trim() || null;
            const password = (row['password *'] || row.password || '').toString().trim();
            const rawLang  = (row['language (Optional)'] || row.language || '').toString().trim().toLowerCase();
            const lang     = LANG_MAP[rawLang] || 'en';
            const rawLineId = (row['line_user_id (Optional)'] || row.line_user_id || '').toString().trim() || null;
            const rowId    = row.id ? parseInt(row.id, 10) : null;
            const profilePicUrl = (row['profile_picture_url (Optional)'] || row.profile_picture_url || '').toString().trim() || null;

            const URL_RE_MGR = /^https?:\/\/.+/i;
            if (!name_en)              { errors.push(`Row ${ri}: name_en is required`);                        continue; }
            if (!rowId && !email)      { errors.push(`Row ${ri}: email is required for new managers`);         continue; }
            if (!rowId && !password)   { errors.push(`Row ${ri}: password is required for new managers`);      continue; }
            if (email && !EMAIL_RE.test(email))      { errors.push(`Row ${ri}: Invalid email format. Must end with .com and contain valid characters.`); continue; }
            if (rawLineId && !LINE_ID_RE.test(rawLineId)) { errors.push(`Row ${ri}: Line ID must start with uppercase 'U' followed by numbers/letters.`); continue; }
            if (profilePicUrl && !URL_RE_MGR.test(profilePicUrl)) { errors.push(`Row ${ri}: profile_picture_url must be a valid URL starting with http:// or https://`); continue; }
            // Duplicate email check (new rows only) — scoped to the same company
            if (!rowId && email) {
                const dupQ = insertCompanyId
                    ? "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id = $2"
                    : "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id IS NULL";
                const dupP = insertCompanyId ? [email, insertCompanyId] : [email];
                const dupR = await client.query(dupQ, dupP);
                if (dupR.rows.length > 0) { errors.push(`Row ${ri}: Email '${email}' is already registered`); continue; }
            }
            validRows.push({ rowId, name_en, name_he, name_th, email, phone, password, lang, line_user_id: rawLineId, profile_picture_url: profilePicUrl });
        }

        if (errors.length > 0 || isDryRun) {
            await client.query('ROLLBACK');
            return res.json({ errors, validCount: validRows.length });
        }

        let inserted = 0, updated = 0;
        for (const vr of validRows) {
            if (vr.rowId) {
                // Security: target manager must belong to caller's company
                if (insertCompanyId) {
                    const chk = await client.query("SELECT company_id FROM users WHERE id = $1 AND role = 'MANAGER'", [vr.rowId]);
                    if (!chk.rows[0] || String(chk.rows[0].company_id) !== String(insertCompanyId)) {
                        await client.query('ROLLBACK');
                        return res.status(403).json({ error: `Manager id=${vr.rowId} does not belong to your company` });
                    }
                }
                const setClauses = ['full_name=$1', 'full_name_en=$1'];
                const vals = [vr.name_en];
                let pi = 2;
                if (vr.name_he !== null)    { setClauses.push(`full_name_he=$${pi++}`);     vals.push(vr.name_he); }
                if (vr.name_th !== null)    { setClauses.push(`full_name_th=$${pi++}`);     vals.push(vr.name_th); }
                if (vr.email)               { setClauses.push(`email=$${pi++}`);             vals.push(vr.email); }
                if (vr.phone !== null)      { setClauses.push(`phone=$${pi++}`);             vals.push(vr.phone); }
                if (vr.line_user_id !== null) { setClauses.push(`line_user_id=$${pi++}`);   vals.push(vr.line_user_id); }
                if (vr.profile_picture_url !== null) { setClauses.push(`profile_picture_url=$${pi++}`); vals.push(vr.profile_picture_url); }
                setClauses.push(`preferred_language=$${pi++}`); vals.push(vr.lang);
                if (vr.password) { const hp = await bcrypt.hash(vr.password, 10); setClauses.push(`password=$${pi++}`); vals.push(hp); }
                vals.push(vr.rowId);
                await client.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id=$${pi}`, vals);
                updated++;
            } else {
                const hashedPw = await bcrypt.hash(vr.password, 10);
                const newMgr = await client.query(
                    `INSERT INTO users (full_name, full_name_en, full_name_he, full_name_th, email, password, role, phone, company_id, line_user_id, preferred_language, profile_picture_url)
                     VALUES ($1,$1,$2,$3,$4,$5,'MANAGER',$6,$7,$8,$9,$10) RETURNING id`,
                    [vr.name_en, vr.name_he, vr.name_th, vr.email, hashedPw, vr.phone, insertCompanyId, vr.line_user_id, vr.lang, vr.profile_picture_url]
                );
                // MANAGER's area_id = their own id (defines their area)
                await client.query('UPDATE users SET area_id = id WHERE id = $1', [newMgr.rows[0].id]);
                inserted++;
            }
        }
        await client.query('COMMIT');
        res.json({ errors: [], validCount: validRows.length, inserted, updated });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: 'Duplicate email — one or more emails already exist' });
        console.error('POST /managers/bulk-import error:', err.message);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// ─── Employees ───────────────────────────────────────────────────────────────

app.get('/employees/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role, company_id, area_id, id: callerId } = req.user;
        const ALLOWED = ['id', 'full_name', 'email', 'phone'];
        const requested = req.query.fields
            ? req.query.fields.split(',').map(f => f.trim()).filter(f => ALLOWED.includes(f))
            : ALLOWED;
        if (!requested.length) return res.status(400).json({ error: 'No valid fields requested' });

        const cols = requested.map(f => `u.${f}`).join(', ');
        let query = `SELECT ${cols} FROM users u WHERE u.role = 'EMPLOYEE'`;
        const params = [];
        let pi = 1;

        if (role === 'MANAGER') {
            // Strict M:M scope — only employees explicitly linked to this manager
            query += ` AND u.id IN (SELECT employee_id FROM employee_managers WHERE manager_id = $${pi++})`;
            params.push(callerId);
        } else if (role !== 'BIG_BOSS') {
            if (company_id)    { query += ` AND u.company_id = $${pi++}`; params.push(company_id); }
            else if (area_id)  { query += ` AND u.area_id    = $${pi++}`; params.push(area_id);    }
            else               { query += ' AND 1=0'; }
        }
        query += ' ORDER BY u.full_name';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /employees/export error:', err.message);
        res.status(500).json({ error: 'Export failed' });
    }
});

app.post('/employees/bulk-import', authenticateToken, requireAdmin, async (req, res) => {
    const { rows, isDryRun, target_company_id } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const safeTargetCompanyId = req.user.role === 'BIG_BOSS' ? (target_company_id || null) : null;

    const { insertAreaId, insertCompanyId } = await resolveCallerScope(req.user, safeTargetCompanyId);
    const callerId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const errors   = [];
        const validRows = [];

        const EMAIL_RE_EMP   = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.com$/i;
        const LINE_ID_RE_EMP = /^U[a-zA-Z0-9]+$/;
        const LANG_MAP_EMP   = { english: 'en', hebrew: 'he', thai: 'th' };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const ri  = i + 1;
            const name_en  = (row['name_en *'] || row.name_en  || row.full_name || row['Full Name'] || '').toString().trim();
            const name_he  = (row['name_he (Optional)'] || row.name_he  || '').toString().trim() || null;
            const name_th  = (row['name_th (Optional)'] || row.name_th  || '').toString().trim() || null;
            const email    = (row['email *']    || row.email    || row['Email']  || '').toString().trim().toLowerCase();
            const phone    = (row['phone (Optional)']   || row.phone    || row['Phone']  || '').toString().trim() || null;
            const password = (row['password *'] || row.password || '').toString().trim();
            const rawLang  = (row['language (Optional)'] || row.language || '').toString().trim().toLowerCase();
            const lang     = LANG_MAP_EMP[rawLang] || 'en';
            const rawLineId = (row['line_user_id (Optional)'] || row.line_user_id || '').toString().trim() || null;
            const rowId    = row.id ? parseInt(row.id, 10) : null;
            const profilePicUrl = (row['profile_picture_url (Optional)'] || row.profile_picture_url || '').toString().trim() || null;

            const URL_RE_EMP = /^https?:\/\/.+/i;
            if (!name_en)            { errors.push(`Row ${ri}: name_en is required`);                        continue; }
            if (!rowId && !email)    { errors.push(`Row ${ri}: email is required for new employees`);        continue; }
            if (!rowId && !password) { errors.push(`Row ${ri}: password is required for new employees`);     continue; }
            if (email && !EMAIL_RE_EMP.test(email))      { errors.push(`Row ${ri}: Invalid email format. Must end with .com and contain valid characters.`); continue; }
            if (rawLineId && !LINE_ID_RE_EMP.test(rawLineId)) { errors.push(`Row ${ri}: Line ID must start with uppercase 'U' followed by numbers/letters.`); continue; }
            if (profilePicUrl && !URL_RE_EMP.test(profilePicUrl)) { errors.push(`Row ${ri}: profile_picture_url must be a valid URL starting with http:// or https://`); continue; }
            // Duplicate email check (new rows only) — scoped to the same company
            if (!rowId && email) {
                const dupQ = insertCompanyId
                    ? "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id = $2"
                    : "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND company_id IS NULL";
                const dupP = insertCompanyId ? [email, insertCompanyId] : [email];
                const dupR = await client.query(dupQ, dupP);
                if (dupR.rows.length > 0) { errors.push(`Row ${ri}: Email '${email}' is already registered`); continue; }
            }

            // For updates: verify employee belongs to caller's company
            if (rowId && insertCompanyId) {
                const chk = await client.query("SELECT company_id FROM users WHERE id = $1 AND role = 'EMPLOYEE'", [rowId]);
                if (!chk.rows[0] || String(chk.rows[0].company_id) !== String(insertCompanyId)) {
                    errors.push(`Row ${ri}: Employee id=${rowId} does not belong to your company`);
                    continue;
                }
            }
            // For MANAGER: updated employee must already be in their M:M team
            if (rowId && req.user.role === 'MANAGER') {
                const chk = await client.query('SELECT 1 FROM employee_managers WHERE manager_id = $1 AND employee_id = $2', [callerId, rowId]);
                if (chk.rowCount === 0) { errors.push(`Row ${ri}: Employee id=${rowId} is not in your team`); continue; }
            }
            validRows.push({ rowId, name_en, name_he, name_th, email, phone, password, lang, line_user_id: rawLineId, profile_picture_url: profilePicUrl });
        }

        if (errors.length > 0 || isDryRun) {
            await client.query('ROLLBACK');
            return res.json({ errors, validCount: validRows.length });
        }

        let inserted = 0, updated = 0;
        for (const vr of validRows) {
            if (vr.rowId) {
                const setClauses = ['full_name=$1', 'full_name_en=$1'];
                const vals = [vr.name_en];
                let pi = 2;
                if (vr.name_he !== null)      { setClauses.push(`full_name_he=$${pi++}`);   vals.push(vr.name_he); }
                if (vr.name_th !== null)      { setClauses.push(`full_name_th=$${pi++}`);   vals.push(vr.name_th); }
                if (vr.email)                 { setClauses.push(`email=$${pi++}`);           vals.push(vr.email); }
                if (vr.phone !== null)        { setClauses.push(`phone=$${pi++}`);           vals.push(vr.phone); }
                if (vr.line_user_id !== null) { setClauses.push(`line_user_id=$${pi++}`);   vals.push(vr.line_user_id); }
                if (vr.profile_picture_url !== null) { setClauses.push(`profile_picture_url=$${pi++}`); vals.push(vr.profile_picture_url); }
                setClauses.push(`preferred_language=$${pi++}`); vals.push(vr.lang);
                if (vr.password) { const hp = await bcrypt.hash(vr.password, 10); setClauses.push(`password=$${pi++}`); vals.push(hp); }
                vals.push(vr.rowId);
                await client.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id=$${pi}`, vals);
                updated++;
            } else {
                const hashedPw = await bcrypt.hash(vr.password, 10);
                const newEmp = await client.query(
                    `INSERT INTO users (full_name, full_name_en, full_name_he, full_name_th, email, password, role, phone, company_id, area_id, parent_manager_id, line_user_id, preferred_language, profile_picture_url)
                     VALUES ($1,$1,$2,$3,$4,$5,'EMPLOYEE',$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
                    [vr.name_en, vr.name_he, vr.name_th, vr.email, hashedPw, vr.phone, insertCompanyId, insertAreaId, callerId, vr.line_user_id, vr.lang, vr.profile_picture_url]
                );
                // M:M link: employee ↔ importing manager (MANAGER or COMPANY_MANAGER)
                await client.query(
                    'INSERT INTO employee_managers (employee_id, manager_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                    [newEmp.rows[0].id, callerId]
                );
                inserted++;
            }
        }
        await client.query('COMMIT');
        res.json({ errors: [], validCount: validRows.length, inserted, updated });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: 'Duplicate email — one or more emails already exist' });
        console.error('POST /employees/bulk-import error:', err.message);
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

app.listen(port, async () => {
    // Ensure all required columns exist without requiring a manual /fix-db call
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_fields BOOLEAN DEFAULT TRUE');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_approve_tasks BOOLEAN DEFAULT FALSE');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255)');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ');

        // Multilingual name columns — required by GET /tasks, /locations, /categories, /assets
        await pool.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS name_he TEXT');
        await pool.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS name_en TEXT');
        await pool.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS name_th TEXT');
        await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_he TEXT');
        await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en TEXT');
        await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_th TEXT');
        await pool.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS name_he TEXT');
        await pool.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS name_en TEXT');
        await pool.query('ALTER TABLE assets ADD COLUMN IF NOT EXISTS name_th TEXT');

        // Multilingual name columns for users — required by user management endpoints
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_he VARCHAR(255)');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_en VARCHAR(255)');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_th VARCHAR(255)');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT \'he\'');

        // Language permission columns — required by PUT /users/:id permission toggles
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_lang_he BOOLEAN DEFAULT TRUE');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_lang_en BOOLEAN DEFAULT TRUE');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_lang_th BOOLEAN DEFAULT TRUE');

        // Stuck-task permission — when TRUE, stuck tasks skip WAITING_APPROVAL and go directly to COMPLETED
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS stuck_skip_approval BOOLEAN DEFAULT FALSE');

        // Stuck-task fields on tasks — required by PUT /tasks/:id/stuck
        await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_stuck BOOLEAN DEFAULT FALSE');
        await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stuck_description TEXT');
        await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS stuck_file_url TEXT');

        // ── Widen categories.code to VARCHAR(5) — fixes "value too long for character varying(3)" on commit ──
        await pool.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='categories' AND column_name='code'
                      AND character_maximum_length IS NOT NULL
                      AND character_maximum_length < 5
                ) THEN
                    ALTER TABLE categories ALTER COLUMN code TYPE VARCHAR(5);
                END IF;
            END $$
        `);

        // ── 4-Tier RBAC: area_id grouping — CRITICAL: must exist before GET /users & GET /managers run ──
        await pool.query('ALTER TABLE users      ADD COLUMN IF NOT EXISTS area_id INTEGER');
        await pool.query('ALTER TABLE locations  ADD COLUMN IF NOT EXISTS area_id INTEGER');
        await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS area_id INTEGER');
        await pool.query('ALTER TABLE assets     ADD COLUMN IF NOT EXISTS area_id INTEGER');

        // Backfill: MANAGER (AreaManager) → area_id = their own id (defines the area)
        await pool.query("UPDATE users SET area_id = id WHERE role = 'MANAGER' AND area_id IS NULL");

        // Backfill: COMPANY_MANAGER (DeptManager) → area_id = parent MANAGER's area_id
        await pool.query(`
            UPDATE users SET area_id = (
                SELECT u2.area_id FROM users u2 WHERE u2.id = users.parent_manager_id
            )
            WHERE role = 'COMPANY_MANAGER' AND parent_manager_id IS NOT NULL AND area_id IS NULL
        `);

        // Backfill: EMPLOYEE → area_id from parent (COMPANY_MANAGER or MANAGER)
        await pool.query(`
            UPDATE users SET area_id = (
                SELECT COALESCE(u2.area_id, CASE WHEN u2.role = 'MANAGER' THEN u2.id ELSE NULL END)
                FROM users u2 WHERE u2.id = users.parent_manager_id
            )
            WHERE role = 'EMPLOYEE' AND parent_manager_id IS NOT NULL AND area_id IS NULL
        `);

        // Backfill: locations/categories/assets → area_id from their creator's area
        await pool.query(`UPDATE locations  SET area_id = (SELECT area_id FROM users WHERE users.id = locations.created_by)  WHERE area_id IS NULL AND created_by IS NOT NULL`);
        await pool.query(`UPDATE categories SET area_id = (SELECT area_id FROM users WHERE users.id = categories.created_by) WHERE area_id IS NULL AND created_by IS NOT NULL`);
        await pool.query(`UPDATE assets     SET area_id = (SELECT area_id FROM users WHERE users.id = assets.created_by)     WHERE area_id IS NULL AND created_by IS NOT NULL`);

        // Seed English name from legacy single-name column (idempotent)
        await pool.query("UPDATE locations  SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL");
        await pool.query("UPDATE categories SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL");
        await pool.query("UPDATE assets     SET name_en = name WHERE name_en IS NULL AND name IS NOT NULL");
        await pool.query("UPDATE users SET full_name_en = full_name WHERE full_name_en IS NULL AND full_name IS NOT NULL");

        // ── Multi-Tenant SaaS: companies table ──
        await pool.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id                SERIAL PRIMARY KEY,
                name              VARCHAR(255) NOT NULL,
                profile_image_url TEXT,
                created_at        TIMESTAMPTZ DEFAULT NOW(),
                updated_at        TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        // ── Add company_id FK to all tenant-scoped tables ──
        await pool.query('ALTER TABLE users      ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');
        await pool.query('ALTER TABLE tasks      ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');
        await pool.query('ALTER TABLE locations  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');
        await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');
        await pool.query('ALTER TABLE assets     ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL');

        // ── M:M: employee ↔ manager junction table ──
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employee_managers (
                id          SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                manager_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(employee_id, manager_id)
            )
        `);

        // ── Smart Migration: one Company per AreaManager that has no company yet ──
        const unassignedMgrs = await pool.query(
            "SELECT id, area_id FROM users WHERE role = 'MANAGER' AND company_id IS NULL ORDER BY id"
        );
        let coCounter = 1;
        for (const mgr of unassignedMgrs.rows) {
            const newCo = await pool.query(
                'INSERT INTO companies (name) VALUES ($1) RETURNING id',
                [`Company ${coCounter}`]
            );
            const coId = newCo.rows[0].id;
            coCounter++;

            // Link the AreaManager to their new company
            await pool.query('UPDATE users SET company_id = $1 WHERE id = $2', [coId, mgr.id]);

            // Link all SUPERVISORs and EMPLOYEEs in the same area
            await pool.query(
                "UPDATE users SET company_id = $1 WHERE area_id = $2 AND role IN ('SUPERVISOR','EMPLOYEE') AND company_id IS NULL",
                [coId, mgr.area_id]
            );

            // Link all Locations, Categories, Assets in the same area
            await pool.query('UPDATE locations  SET company_id = $1 WHERE area_id = $2 AND company_id IS NULL', [coId, mgr.area_id]);
            await pool.query('UPDATE categories SET company_id = $1 WHERE area_id = $2 AND company_id IS NULL', [coId, mgr.area_id]);
            await pool.query('UPDATE assets     SET company_id = $1 WHERE area_id = $2 AND company_id IS NULL', [coId, mgr.area_id]);

            // Link Tasks whose worker belongs to this area
            await pool.query(
                'UPDATE tasks SET company_id = $1 WHERE worker_id IN (SELECT id FROM users WHERE area_id = $2) AND company_id IS NULL',
                [coId, mgr.area_id]
            );
        }

        // ── created_by on tasks: tracks which manager/user created each task ──
        await pool.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL');

        // ── Migrate existing parent_manager_id → M:M junction table (idempotent) ──
        await pool.query(`
            INSERT INTO employee_managers (employee_id, manager_id)
            SELECT id, parent_manager_id
            FROM users
            WHERE parent_manager_id IS NOT NULL
              AND role IN ('EMPLOYEE', 'SUPERVISOR')
            ON CONFLICT DO NOTHING
        `);

        // ── Retire SUPERVISOR role: migrate all SUPERVISORs to EMPLOYEE (idempotent) ──
        await pool.query("UPDATE users SET role = 'EMPLOYEE' WHERE role = 'SUPERVISOR'");

        // ── Ensure locations.code column exists (idempotent) ──
        await pool.query('ALTER TABLE locations ADD COLUMN IF NOT EXISTS code VARCHAR(50)');

        // ── Backfill LOC-XXXX codes for any locations that still have code = NULL ──
        // Groups by company_id so each company gets its own sequential LOC-0001, LOC-0002…
        await pool.query(`
            DO $$
            DECLARE
                loc     RECORD;
                max_num INT;
            BEGIN
                FOR loc IN (
                    SELECT id, company_id FROM locations WHERE code IS NULL ORDER BY id
                )
                LOOP
                    SELECT COALESCE(MAX(
                        CASE WHEN l.code ~ '^LOC-[0-9]+$'
                             THEN CAST(SUBSTRING(l.code FROM 5) AS INT)
                             ELSE 0 END
                    ), 0) INTO max_num
                    FROM locations l
                    WHERE (loc.company_id IS NULL AND l.company_id IS NULL)
                       OR (loc.company_id IS NOT NULL AND l.company_id = loc.company_id);

                    UPDATE locations
                    SET code = 'LOC-' || LPAD((max_num + 1)::TEXT, 4, '0')
                    WHERE id = loc.id;
                END LOOP;
            END $$
        `);

        // ── Email uniqueness: drop global UNIQUE(email), add per-company composite indexes ──
        // Users in different companies may share the same email address.
        // Users with no company (e.g. BIG_BOSS) still require a globally unique email.
        await pool.query(`
            DO $$
            BEGIN
                -- Drop the old global unique constraint if it still exists
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'users_email_key' AND conrelid = 'users'::regclass
                ) THEN
                    ALTER TABLE users DROP CONSTRAINT users_email_key;
                END IF;
            END $$
        `);
        // Per-company uniqueness: email must be unique within a company
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS users_email_company_unique
            ON users (email, company_id)
            WHERE company_id IS NOT NULL
        `);
        // Global uniqueness for company-less users (BIG_BOSS, etc.)
        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS users_email_no_company_unique
            ON users (email)
            WHERE company_id IS NULL
        `);

        console.log("✅ DB columns verified.");
    } catch (e) {
        console.error("⚠️ Startup migration warning:", e.message);
    }
    console.log(`Server running on ${port}`);
});