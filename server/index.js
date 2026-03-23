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
    const textWithLink = `${text}\n\nView in App: ${APP_LINK}`;
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
    
    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword && password !== user.password) {
        return res.status(400).json({ error: "סיסמה שגויה" });
    }

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
            if (req.query.teamOnly === 'true') {
                // Return only employees directly assigned to this manager via M:M junction table
                query += ` WHERE u.id IN (SELECT employee_id FROM employee_managers WHERE manager_id = $1) AND u.role = 'EMPLOYEE'`;
            } else {
                // AreaManager sees all users sharing their area (area_id = their own id)
                query += ` WHERE u.area_id = $1`;
            }
            params.push(req.user.id);
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

    if (line_user_id) {
        const welcomeLineDict = {
            he: `שלום ${effectiveFullName}! 👋 ברוך הבא למערכת OpsManager. חשבונך נוצר בהצלחה.`,
            en: `Hello ${effectiveFullName}! 👋 Welcome to OpsManager. Your account has been created successfully.`,
            th: `สวัสดี ${effectiveFullName}! 👋 ยินดีต้อนรับสู่ OpsManager บัญชีของคุณถูกสร้างเรียบร้อยแล้ว`
        };
        sendLineMessage(line_user_id, welcomeLineDict[lang] || welcomeLineDict['en']).catch(err => console.error("LINE welcome error:", err));
    }

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

    if (password && password.trim() !== '') {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        setClauses.push(`password=$${paramCount}`);
        params.push(hashedPassword);
        paramCount++;
    }

    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id=$${paramCount} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);
    const updatedUser = result.rows[0];

    let changes = [];
    if (oldUser.full_name !== updatedUser.full_name) changes.push(`Name changed to: <strong>${updatedUser.full_name}</strong>`);
    if (oldUser.email !== updatedUser.email) changes.push(`Email changed to: <strong>${updatedUser.email}</strong>`);
    if (oldUser.phone !== updatedUser.phone) changes.push(`Phone updated`);
    if (oldUser.preferred_language !== updatedUser.preferred_language) changes.push(`Language changed to: <strong>${updatedUser.preferred_language}</strong>`);
    if (password && password.trim() !== '') changes.push('Password has been changed');
    
    // Track permission changes made by Big Boss
    if (oldUser.can_manage_fields !== updatedUser.can_manage_fields) changes.push(`Field Settings Permission updated`);
    if (oldUser.auto_approve_tasks !== updatedUser.auto_approve_tasks) changes.push(`Auto-Approve Tasks updated to: <strong>${updatedUser.auto_approve_tasks}</strong>`);

    // Welcome LINE message when lineUserId is set for the first time
    const oldLineId = oldUser.line_user_id;
    const newLineId = updatedUser.line_user_id;
    if (newLineId && !oldLineId) {
        const lang2 = updatedUser.preferred_language || 'he';
        const welcomeDict = {
            he: `שלום ${updatedUser.full_name}! 👋 ברוך הבא למערכת OpsManager. חשבונך מחובר בהצלחה.`,
            en: `Hello ${updatedUser.full_name}! 👋 Welcome to the team! Your account is now connected to OpsManager.`,
            th: `สวัสดี ${updatedUser.full_name}! 👋 ยินดีต้อนรับสู่ทีม! บัญชีของคุณเชื่อมต่อกับ OpsManager แล้ว`
        };
        sendLineMessage(newLineId, welcomeDict[lang2] || welcomeDict['en']).catch(err => console.error("❌ LINE welcome error:", err));
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

app.delete('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    try {
      const { id } = req.params;
      const subordinates = await pool.query('SELECT count(*) FROM users WHERE parent_manager_id = $1', [id]);
      const count = parseInt(subordinates.rows[0].count);

      if (count > 0) {
          return res.status(400).json({ 
              error: `לא ניתן למחוק מנהל זה! יש לו ${count} עובדים משויכים. אנא מחק אותם תחילה או העבר אותם למנהל אחר.` 
          });
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
            // MANAGER, EMPLOYEE: restrict to their area
            const areaId = getEffectiveAreaId(req.user);
            if (areaId) {
                query += ` WHERE (locations.area_id = $1 OR locations.area_id IS NULL)`;
                params.push(areaId);
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

            const locs = await pool.query("SELECT code FROM locations WHERE created_by = $1 AND code LIKE 'LOC-%'", [ownerId]);
            let max = 0;
            locs.rows.forEach(r => { if(r.code) { let num = parseInt(r.code.split('-')[1]); if (num > max) max = num; } });
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

            // Determine area_id and company_id for the new location
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
            const areaId = getEffectiveAreaId(req.user);
            if (areaId) {
                query += ` WHERE (categories.area_id = $1 OR categories.area_id IS NULL)`;
                params.push(areaId);
            }
        }
        query += ` ORDER BY categories.name`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { console.error('GET /categories error:', err.message); res.json([]); }
});

app.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, name_he, name_en, name_th, code, created_by } = req.body;
        const ownerId = created_by || req.user.id;
        const primaryName = name_en || name_he || name || '';

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
            const areaId = getEffectiveAreaId(req.user);
            if (areaId) {
                query += ` WHERE (assets.area_id = $1 OR assets.area_id IS NULL)`;
                params.push(areaId);
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
app.delete('/locations/:id', authenticateToken, requireAdmin, (req, res) => deleteItem('locations', req.params.id, res));
app.delete('/categories/:id', authenticateToken, requireAdmin, (req, res) => deleteItem('categories', req.params.id, res));
app.delete('/assets/:id', authenticateToken, requireAdmin, (req, res) => deleteItem('assets', req.params.id, res));

app.get('/tasks', authenticateToken, async (req, res) => {
    try {
        const { role, id } = req.user;
        let query = `
            SELECT t.*,
                   u.full_name as worker_name,
                   l.name as location_name,
                   COALESCE(l.name_en, l.name) as location_name_en,
                   COALESCE(l.name_he, l.name) as location_name_he,
                   COALESCE(l.name_th, l.name) as location_name_th,
                   a.name as asset_name,
                   COALESCE(a.name_en, a.name) as asset_name_en,
                   COALESCE(a.name_he, a.name) as asset_name_he,
                   COALESCE(a.name_th, a.name) as asset_name_th,
                   a.code as asset_code,
                   c.name as category_name,
                   COALESCE(c.name_en, c.name) as category_name_en,
                   COALESCE(c.name_he, c.name) as category_name_he,
                   COALESCE(c.name_th, c.name) as category_name_th
            FROM tasks t
            LEFT JOIN users u ON t.worker_id = u.id
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
    
    // 🚀 Worker & manager notifications (LINE preferred, push fallback)
    try {
        const workerRes = await pool.query('SELECT device_token, preferred_language, line_user_id, parent_manager_id FROM users WHERE id = $1', [worker_id]);
        const workerData = workerRes.rows[0];
        const workerLang = workerData?.preferred_language || 'he';

        const lineTaskDict = {
            he: `📋 משימה חדשה הוקצתה לך: "${title}"`,
            en: `📋 New task assigned to you: "${title}"`,
            th: `📋 คุณได้รับมอบหมายงานใหม่: "${title}"`
        };

        if (workerData?.line_user_id) {
            await sendLineMessage(workerData.line_user_id, lineTaskDict[workerLang] || lineTaskDict['en']);
        } else if (workerData?.device_token) {
            const pushDict = {
                he: { title: 'משימה חדשה! 📋', body: `הוקצתה לך משימה חדשה: ${title}` },
                en: { title: 'New Task! 📋', body: `You have been assigned a new task: ${title}` },
                th: { title: 'งานใหม่! 📋', body: `คุณได้รับมอบหมายงานใหม่: ${title}` }
            };
            await admin.messaging().send({
                token: workerData.device_token,
                notification: pushDict[workerLang],
                webpush: { fcmOptions: { link: '/' } }
            });
            console.log(`🔔 Notification sent to worker in ${workerLang}!`);
        }

        // Also notify the worker's manager via LINE
        if (workerData?.parent_manager_id) {
            const mgrRes = await pool.query('SELECT line_user_id, preferred_language FROM users WHERE id = $1', [workerData.parent_manager_id]);
            const mgrData = mgrRes.rows[0];
            if (mgrData?.line_user_id) {
                const mgrLang = mgrData.preferred_language || 'he';
                const mgrLineDict = {
                    he: `📋 משימה חדשה נוצרה לעובד שלך: "${title}"`,
                    en: `📋 New task created for your employee: "${title}"`,
                    th: `📋 สร้างงานใหม่ให้พนักงานของคุณ: "${title}"`
                };
                await sendLineMessage(mgrData.line_user_id, mgrLineDict[mgrLang] || mgrLineDict['en']);
            }
        }
    } catch (err) {
        console.error("⚠️ Failed to send notification:", err.message);
    }

    res.json({ message: isRecurring ? `Created ${createdCount} recurring tasks` : "Task created successfully" });

  } catch (err) { 
      console.error("❌ Error creating task:", err); 
      res.status(500).json({ error: "Server Error: " + err.message }); 
  }
});

app.post('/tasks/bulk-excel', authenticateToken, async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: "לא נשלחו משימות תקינות." });

        let insertedCount = 0;
        const notificationsMap = {};

        for (const task of tasks) {
            if (!notificationsMap[task.worker_id]) notificationsMap[task.worker_id] = 0;

            if (!task.is_recurring) {
                await pool.query(
                    `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, status, asset_id, images) 
                     VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)`,
                    [task.title, task.location_id, task.worker_id, task.urgency, task.due_date, task.description, task.asset_id, task.images]
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
                        `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, status, asset_id, images) 
                         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)`,
                        [task.title + ' (מחזורי)', task.location_id, task.worker_id, task.urgency, date.toISOString(), task.description, task.asset_id, task.images]
                    );
                }
                insertedCount += tasksToInsert.length;
                notificationsMap[task.worker_id] += tasksToInsert.length;
            }
        }

        try {
            for (const worker_id in notificationsMap) {
                const taskCount = notificationsMap[worker_id];
                if (taskCount > 0) {
                    const workerRes = await pool.query('SELECT device_token FROM users WHERE id = $1', [worker_id]);
                    const workerToken = workerRes.rows[0]?.device_token;

                    if (workerToken) {
                        await admin.messaging().send({
                            token: workerToken,
                            notification: {
                                title: 'ייבוא משימות הושלם! 🚀',
                                body: `מנהל הקצה לך ${taskCount} משימות חדשות.`
                            },
                            webpush: { fcmOptions: { link: '/' } }
                        });
                    }
                }
            }
        } catch (err) { console.error("⚠️ Failed to send bulk notifications:", err.message); }

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
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, status, parent_task_id) 
             VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)`,
            [`Follow up: ${pt.title}`, pt.location_id, pt.worker_id, 'High', due_date, description, parentId]
        );
        
        await pool.query(`UPDATE tasks SET status = 'COMPLETED', completion_note = 'Follow up created for ${due_date}' WHERE id = $1`, [parentId]);

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

app.get('/tasks/export/advanced', authenticateToken, async (req, res) => {
    try {
        const { worker_id, start_date, end_date, status } = req.query;
        
        let query = `
            SELECT t.id, t.title, t.description, t.urgency, t.status, t.due_date,
                   t.images, 
                   u.full_name as worker_name,
                   m.full_name as manager_name,
                   l.name as location_name,
                   a.name as asset_name, a.code as asset_code,
                   c.name as category_name
            FROM tasks t
            LEFT JOIN users u ON t.worker_id = u.id
            LEFT JOIN users m ON u.parent_manager_id = m.id
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN assets a ON t.asset_id = a.id
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        let pIndex = 1;

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
    const { tasks, isDryRun } = req.body; 
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const errors = []; 
        const validTasks = [];

        const usersRes = await client.query('SELECT id, full_name FROM users');
        const locationsRes = await client.query('SELECT id, name, company_id FROM locations');
        const assetsRes = await client.query('SELECT id, name, code, category_id, company_id FROM assets');

        const usersMap = new Map(usersRes.rows.map(u => [u.full_name.trim().toLowerCase(), u.id]));
        const locMap = new Map(locationsRes.rows.map(l => [l.name.trim().toLowerCase(), { id: l.id, company_id: l.company_id }]));
        const assetCodeMap = new Map(assetsRes.rows.map(a => [a.code.trim().toLowerCase(), a]));
        const assetNameMap = new Map(assetsRes.rows.map(a => [a.name.trim().toLowerCase(), a]));

        // Pre-fetch manager's assigned employee IDs for scope enforcement
        let managerEmployeeIds = new Set();
        if (req.user.role === 'MANAGER') {
            const empRes = await client.query(
                'SELECT employee_id FROM employee_managers WHERE manager_id = $1',
                [req.user.id]
            );
            managerEmployeeIds = new Set(empRes.rows.map(r => r.employee_id));
        }
        const callerCompanyId = req.user.company_id ?? null;

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
                } else {
                    rowErrors.push(`Row ${i + 1}: Worker '${workerName}' not found in system.`);
                }
            } else {
                worker_id = req.user.id;
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
                    images
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
                            `INSERT INTO tasks (title, description, urgency, status, due_date, worker_id, asset_id, location_id, images) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [t.title, t.description, t.urgency, t.status, t.due_date, t.worker_id, t.asset_id, t.location_id, t.images]
                        );
                    }
                } else {
                    await client.query(
                        `INSERT INTO tasks (title, description, urgency, status, due_date, worker_id, asset_id, location_id, images) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [t.title, t.description, t.urgency, t.status, t.due_date, t.worker_id, t.asset_id, t.location_id, t.images]
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
                   c.name as category_name,
                   u.full_name as worker_name,
                   creator.full_name as manager_name
            FROM tasks t
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN assets a ON t.asset_id = a.id
            LEFT JOIN categories c ON a.category_id = c.id
            LEFT JOIN users u ON t.worker_id = u.id
            LEFT JOIN users creator ON u.parent_manager_id = creator.id
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

const runDailyReport = async (manager_id = null) => {
    console.log(`⏰ Running Daily Task Check${manager_id ? ` for manager ${manager_id}'s team` : ' for EVERYONE'}...`);

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
        const usersRes = await pool.query("SELECT id, full_name, email, role, parent_manager_id, device_token, preferred_language, line_user_id FROM users");
        const allUsers = usersRes.rows;
        const tasksRes = await pool.query("SELECT * FROM tasks WHERE DATE(due_date) = CURRENT_DATE");
        const todayTasks = tasksRes.rows;

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

            if (emp.line_user_id) {
                // Build detailed task list for LINE message
                let lineMsg = `${pushTitle}\n${pushBody}`;
                if (!isNone) {
                    lineMsg += `\n\n--- ${l.th_task} ---`;
                    wTasks.forEach(t => {
                        const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                        lineMsg += `\n• ${t.title}: ${isDone ? l.status_done : l.status_not}`;
                    });
                    lineMsg += `\n\n${completed.length} ${l.out_of} ${wTasks.length}`;
                }
                try { await sendLineMessage(emp.line_user_id, lineMsg); }
                catch (e) { console.error(`❌ LINE send failed for employee ${emp.email}:`, e.message); }
            } else if (emp.email) {
                try { await transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: emp.email, subject: emailSubj, html: htmlBody }); }
                catch (e) { console.error(`❌ Email send failed for employee ${emp.email}:`, e.message); }
            }
            if (emp.device_token) admin.messaging().send({ token: emp.device_token, notification: { title: pushTitle, body: pushBody }, webpush: { fcmOptions: { link: '/' } } }).catch(e => console.error("FCM push error:", e.message));
        }

        // ==========================================
        // 2. שליחת דוחות מלאים למנהלים (כולל מי שאין לו משימות)
        // ==========================================
        const leaders = allUsers.filter(u => (u.role === 'MANAGER' || u.role === 'BIG_BOSS') && (!manager_id || u.id === manager_id));
        for (const leader of leaders) {
            const relevantEmps = leader.role === 'BIG_BOSS' 
                ? employees 
                : employees.filter(e => e.parent_manager_id === leader.id);

            if (relevantEmps.length === 0) continue;

            const l = dict[leader.preferred_language] || dict['he'];
            let allTeamPerfect = true;
            let allTeamNone = true;

            let leaderContent = `<div>`;

            relevantEmps.forEach(emp => {
                const wTasks = todayTasks.filter(t => t.worker_id === emp.id);
                const completed = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
                
                const isEmpNone = wTasks.length === 0;
                const isEmpPerfect = !isEmpNone && (completed.length === wTasks.length);

                if (!isEmpNone) allTeamNone = false;
                if (!isEmpPerfect && !isEmpNone) allTeamPerfect = false;

                let empStatusColor = isEmpNone ? '#6b7280' : (isEmpPerfect ? '#166534' : '#991b1b');
                let empBgColor = isEmpNone ? '#f9fafb' : (isEmpPerfect ? '#f0fdf4' : '#fef2f2');
                let empIcon = isEmpNone ? '🏖️' : (isEmpPerfect ? '🌟' : '⚠️');
                let empBadge = isEmpNone ? l.status_none : `${completed.length} ${l.out_of} ${wTasks.length}`;

                leaderContent += `
                    <div style="margin-bottom:12px; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden;">
                        <div style="background:${empBgColor}; padding:8px 10px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:bold; font-size:14px; color:${empStatusColor};">${empIcon} ${emp.full_name}</span>
                            <span style="font-size:11px; color:#6b7280; background:#fff; padding:2px 6px; border-radius:10px; border:1px solid #ddd;">${empBadge}</span>
                        </div>`;
                
                if (!isEmpNone) {
                    leaderContent += `
                        <table style="width:100%; border-collapse:collapse; font-size:12px;">
                            <tr style="background:#f9fafb; text-align:${l.align}; color:#4b5563;">
                                <th style="padding:6px; border-bottom:1px solid #eee;">${l.th_task}</th>
                                <th style="padding:6px; border-bottom:1px solid #eee;">${l.th_status}</th>
                            </tr>
                    `;

                    wTasks.forEach(t => {
                        const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                        leaderContent += `
                            <tr>
                                <td style="padding:6px; border-bottom:1px solid #eee;">${t.title}</td>
                                <td style="padding:6px; border-bottom:1px solid #eee;">
                                    <span style="background:${isDone ? '#dcfce7' : '#fee2e2'}; color:${isDone ? '#166534' : '#991b1b'}; padding:2px 4px; border-radius:4px; white-space:nowrap; font-size:10px;">
                                        ${isDone ? l.status_done : l.status_not}
                                    </span>
                                </td>
                            </tr>
                        `;
                    });
                    leaderContent += `</table>`;
                }
                leaderContent += `</div>`;
            });

            leaderContent += `</div>`;
            const leaderHtml = getEmailTemplate(l, leaderContent);

            let lSubj = allTeamNone ? l.m_none_subj : (allTeamPerfect ? l.m_perf_subj : l.m_pend_subj);
            let lPushTitle = allTeamNone ? l.push_m_none_title : (allTeamPerfect ? l.push_m_perf_title : l.push_m_pend_title);
            let lPushBody = allTeamNone ? l.push_m_none_body : (allTeamPerfect ? l.push_m_perf_body : l.push_m_pend_body);

            // Build detailed plain-text report for LINE (HTML not supported in LINE)
            let lineReport = `${lPushTitle}\n${lPushBody}\n`;
            relevantEmps.forEach(emp => {
                const empTasks = todayTasks.filter(t => t.worker_id === emp.id);
                const empDone = empTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
                const empIcon = empTasks.length === 0 ? '🏖️' : (empDone.length === empTasks.length ? '🌟' : '⚠️');
                lineReport += `\n${empIcon} ${emp.full_name} (${empDone.length}/${empTasks.length})`;
                if (empTasks.length === 0) {
                    lineReport += `\n  ${l.status_none}`;
                } else {
                    empTasks.forEach(t => {
                        const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                        lineReport += `\n  • ${t.title}: ${isDone ? l.status_done : l.status_not}`;
                    });
                }
            });

            // Send via LINE if available
            if (leader.line_user_id) {
                try { await sendLineMessage(leader.line_user_id, lineReport); }
                catch (e) { console.error(`❌ LINE send failed for leader ${leader.email}:`, e.message); }
            }
            // Always send full detailed email to manager/admin
            if (leader.email) {
                try { await transporter.sendMail({ from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', to: leader.email, subject: lSubj, html: leaderHtml }); }
                catch (e) { console.error(`❌ Email send failed for leader ${leader.email}:`, e.message); }
            }
            if (leader.device_token) admin.messaging().send({ token: leader.device_token, notification: { title: lPushTitle, body: lPushBody }, webpush: { fcmOptions: { link: '/' } } }).catch(e => console.error("FCM push error:", e.message));
        }
        console.log("✅ [CRON] Daily Check completed for everyone.");
    } catch (error) { console.error("❌ [CRON] Failed:", error); }
};

// 1. Automatic daily run at 15:00 Asia/Bangkok
cron.schedule('0 15 * * *', runDailyReport, { scheduled: true, timezone: "Asia/Bangkok" });

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

        console.log("✅ DB columns verified.");
    } catch (e) {
        console.error("⚠️ Startup migration warning:", e.message);
    }
    console.log(`Server running on ${port}`);
});