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

const app = express();
const port = 3001;
const SECRET_KEY = 'my_super_secret_key';

cloudinary.config({
  cloud_name: 'dojnc3j0r',
  api_key: '133411631835124',
  api_secret: '-7M6Z0dvS0fPFkQiEuWj66FWPXM'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'maintenance_app',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'avi', 'mkv'],
  },
});

const upload = multer({ storage: storage });

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

const sendUpdateEmail = async (email, fullName, changes) => {
    const appLink = "https://maintenance-management-app.netlify.app";
    let changesHtml = '<ul style="padding-left: 20px; color: #333;">';
    changes.forEach(change => { changesHtml += `<li style="margin-bottom: 5px;">${change}</li>`; });
    changesHtml += '</ul>';

    const mailOptions = {
      from: '"OpsManager App" <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'Account Update - OpsManager App',
      html: `
        <div dir="ltr" style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;border:1px solid #e0e0e0;">
          <h2 style="color:#714B67;text-align:center;">Account Profile Updated</h2>
          <div style="background:white;padding:20px;border-radius:8px;">
            <p style="font-size:16px;">Hello <strong>${fullName}</strong>,</p>
            <p>The following changes were made to your profile:</p>
            <div style="background-color:#f0f9ff; border-left: 4px solid #0ea5e9; padding: 10px; margin: 15px 0;">
                ${changesHtml}
            </div>
            <p style="font-size:14px; color:#666;">If you did not request these changes, please contact your manager.</p>
            <div style="text-align:center;margin-top:30px;">
              <a href="${appLink}" style="background:#714B67;color:white;padding:10px 25px;text-decoration:none;border-radius:25px;font-weight:bold;">Login to System</a>
            </div>
          </div>
        </div>
      `
    };
    try { await transporter.sendMail(mailOptions); } 
    catch (error) { console.error('Error sending update email:', error); }
};

const sendWelcomeEmail = async (email, fullName, password, role, managerName) => {
    const appLink = "https://maintenance-management-app.netlify.app";
    let titleText = 'Welcome to the team! 🛠️', descriptionText = 'Your account has been created.';
    if (role === 'MANAGER' || role === 'BIG_BOSS') {
        titleText = `Welcome to the Management Team! 💼`;
        descriptionText = `A manager account has been created for you with extended permissions.`;
    }

    const mailOptions = {
      from: '"OpsManager App" <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'Login Details - OpsManager App',
      html: `
        <div dir="ltr" style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;">
          <h1 style="color:#714B67;text-align:center;">Maintenance Management</h1>
          <div style="background:white;padding:20px;border-radius:8px;">
            <h2>Hello ${fullName},</h2>
            <h3 style="color:#714B67;">${titleText}</h3>
            <p>${descriptionText}</p>
            <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #714B67;">
              <p><strong>📧 Email:</strong> ${email}</p>
              <p><strong>🔑 Password:</strong> ${password}</p>
            </div>
            <div style="text-align:center;margin-top:30px;">
              <a href="${appLink}" style="background:#714B67;color:white;padding:12px 25px;text-decoration:none;border-radius:25px;font-weight:bold;">Login to App</a>
            </div>
          </div>
        </div>
      `
    };
    try { await transporter.sendMail(mailOptions); } 
    catch (error) { console.error("❌ Error sending email:", error); }
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

// פונקציה לעדכון ותיקון בסיס הנתונים
app.get('/fix-db', async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            console.log("🔧 Starting DB Fix...");
            
            // 1. עדכונים לטבלת המשימות (מה שעשינו קודם)
            await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS images TEXT[]');
            await client.query('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_images TEXT[]'); 
            await client.query('ALTER TABLE tasks ALTER COLUMN due_date TYPE TIMESTAMP WITHOUT TIME ZONE');
            
            // 2. 👇 הנה השורה החדשה שלנו! הוספת עמודה לטוקן בטבלת משתמשים 👇
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS device_token TEXT');
            
            console.log("✅ DB Fix Completed!");
            res.send("✅ Database updated! Added 'completion_images' to tasks AND 'device_token' to users.");
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

// נתיב חדש: שמירת הטוקן של המכשיר
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
    // 1. המרה לאותיות קטנות (מוודאים קודם שהמשתמש באמת שלח אימייל כדי למנוע קריסה)
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

    const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.full_name, role: user.role, email: user.email, phone: user.phone, profile_picture_url: user.profile_picture_url } });
  } catch (err) { 
      console.error(err);
      res.status(500).json({ error: "שגיאת שרת" }); 
  }
});

app.put('/users/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, password, phone } = req.body;
        let profilePictureUrl = req.body.existing_picture; 
        
        if (req.file) profilePictureUrl = req.file.path;
        
        const oldUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const oldUser = oldUserRes.rows[0];

        let query, params;
        let changes = [];

        if (full_name !== oldUser.full_name) changes.push(`שמך שונה ל: <strong>${full_name}</strong>`);
        if (email !== oldUser.email) changes.push(`כתובת האימייל שונתה ל: <strong>${email}</strong>`);
        if (password && password.trim() !== '') changes.push('הסיסמה שלך שונתה');
        if (phone && phone !== oldUser.phone) changes.push('מספר הטלפון עודכן');
        if (req.file) changes.push('תמונת הפרופיל הוחלפה');

        if (password && password.trim() !== '') {
            query = `UPDATE users SET full_name = $1, email = $2, password = $3, profile_picture_url = $4, phone = $5 WHERE id = $6 RETURNING *`;
            params = [full_name, email, password, profilePictureUrl, phone, userId];
        } else {
            query = `UPDATE users SET full_name = $1, email = $2, profile_picture_url = $3, phone = $4 WHERE id = $5 RETURNING *`;
            params = [full_name, email, profilePictureUrl, phone, userId];
        }
        const result = await pool.query(query, params);
        const updatedUser = result.rows[0];

        if (changes.length > 0) {
            sendUpdateEmail(updatedUser.email, updatedUser.full_name, changes);
        }
        
        res.json({ success: true, user: updatedUser });
    } catch (err) { res.status(500).send("Update failed"); }
});

app.get('/users', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT u.id, u.full_name, u.email, u.phone, u.role, u.parent_manager_id, u.profile_picture_url, m.full_name as manager_name
            FROM users u
            LEFT JOIN users m ON u.parent_manager_id = m.id
        `;
        let params = [];
        if (req.user.role === 'MANAGER') {
            query += ` WHERE u.id = $1 OR u.parent_manager_id = $1`;
            params.push(req.user.id);
        } else if (req.user.role === 'EMPLOYEE') {
             query += ` WHERE u.id = $1`;
             params.push(req.user.id);
        }
        query += ` ORDER BY u.role, u.full_name`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).send('Server Error'); }
});

// Create User
app.post('/users', authenticateToken, async (req, res) => {
  try {
    const { full_name, password, role, parent_manager_id } = req.body;
    let { email, phone } = req.body;
    
    // 1. המרת אימייל לאותיות קטנות
    email = email ? email.toLowerCase() : '';

    if (!full_name || !email || !password || !role) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // 2. אימות מספר הטלפון (במידה והוזן)
    if (phone) {
        // רגקס (ביטוי רגולרי) שמוודא שיש רק בין 9 ל-15 ספרות
        const phoneRegex = /^[0-9]{9,15}$/; 
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: "מספר הטלפון לא תקין. נא להזין ספרות בלבד (לפחות 9 ספרות)." });
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let assignedManager = parent_manager_id;
    if (!assignedManager && req.user.role === 'MANAGER') {
        assignedManager = req.user.id;
    }

    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password, role, phone, parent_manager_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, role, phone`,
      [full_name, email, hashedPassword, role, phone, assignedManager]
    );
    
    try {
        await sendWelcomeEmail(email, full_name, password, role);
    } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
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

// ==========================================
// עריכת משתמש: סנכרון Firebase + שמירת היסטוריית שינויים ומיילים
// ==========================================
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, role, password } = req.body;

    // 1. מביאים את המשתמש הישן (כדי לדעת מה השתנה בשביל המייל)
    const oldUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (oldUserRes.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const oldUser = oldUserRes.rows[0];

    // ==========================================
    // 2. עדכון שרת ההתחברות (Firebase Auth) - קריטי כדי שהכניסה תעבוד!
    // ==========================================
    const firebaseUpdateData = {
        displayName: full_name,
        email: email
    };
    
    // מעדכנים סיסמה בפיירבייס רק אם הוזנה סיסמה חדשה
    if (password && password.trim() !== '') {
        if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters long for Firebase" });
        firebaseUpdateData.password = password;
    }

    try {
        await admin.auth().updateUser(id, firebaseUpdateData);
    } catch (firebaseErr) {
        console.error("Firebase update failed:", firebaseErr);
        if (firebaseErr.code === 'auth/email-already-exists') {
            return res.status(400).json({ error: "האימייל הזה כבר תפוס על ידי משתמש אחר במערכת." });
        }
        return res.status(500).json({ error: "שגיאה בעדכון פרטי ההתחברות של המשתמש." });
    }

    // ==========================================
    // 3. עדכון מסד הנתונים (PostgreSQL) כולל הצפנת Bcrypt כמו שהיה לך
    // ==========================================
    let query = 'UPDATE users SET full_name=$1, email=$2, phone=$3, role=$4';
    let params = [full_name, email, phone, role];
    let paramCount = 5;

    if (password && password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += `, password=$${paramCount}`; 
        params.push(hashedPassword);
        paramCount++;
    }

    query += ` WHERE id=$${paramCount} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);
    const updatedUser = result.rows[0];

    // ==========================================
    // 4. מערכת הדיווח שלך: מעקב שינויים ושליחת מייל
    // ==========================================
    let changes = [];
    if (oldUser.full_name !== updatedUser.full_name) changes.push(`Name changed to: <strong>${updatedUser.full_name}</strong>`);
    if (oldUser.email !== updatedUser.email) changes.push(`Email changed to: <strong>${updatedUser.email}</strong>`);
    if (oldUser.phone !== updatedUser.phone) changes.push(`Phone updated`);
    if (password && password.trim() !== '') changes.push('Password has been changed');

    // שליחת המייל דרך הפונקציה המקורית שלך
    if (changes.length > 0) {
        sendUpdateEmail(updatedUser.email, updatedUser.full_name, changes)
            .catch(err => console.error("Email send error:", err));
    }
    
    res.json({ message: "User updated successfully", user: updatedUser });

  } catch (err) {
    console.error("❌ Error updating user:", err); 
    // תפיסת שגיאת כפילות אימייל של ה-DB שלך (קוד 23505)
    if (err.code === '23505') {
        return res.status(400).json({ error: "Email already exists in Database" });
    }
    res.status(500).send('Server Error');
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
      await pool.query('DELETE FROM tasks WHERE worker_id = $1', [id]);
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "תקלה במחיקה" }); }
});

app.get('/managers', authenticateToken, async (req, res) => {
  try {
    const managers = await pool.query("SELECT id, full_name FROM users WHERE role = 'MANAGER' OR role = 'BIG_BOSS'");
    res.json(managers.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/locations', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT locations.*, users.full_name as creator_name FROM locations LEFT JOIN users ON locations.created_by = users.id ORDER BY locations.name ASC');
    res.json(r.rows);
  } catch (err) { res.status(500).send('Error'); }
});

// ==========================================
// ניהול מיקומים (יצירה ועריכה) - מעודכן לשדות דינמיים
// ==========================================
app.post('/locations', authenticateToken, async (req, res) => {
  try { 
      const { name, code, image_url, coordinates, dynamic_fields } = req.body;
      
      const check = await pool.query('SELECT id FROM locations WHERE name = $1', [name]);
      if (check.rows.length > 0) return res.status(400).json({ error: "Location name already exists" });

      const r = await pool.query(
          `INSERT INTO locations (name, created_by, code, image_url, coordinates, dynamic_fields) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, 
          [name, req.user.id, code || null, image_url || null, coordinates || null, dynamic_fields || '[]']
      ); 
      res.json(r.rows[0]); 
  } catch (e) { 
      console.error(e); 
      res.status(500).send('Error saving location'); 
  }
});

app.get('/categories', authenticateToken, async (req, res) => {
    try { const result = await pool.query('SELECT * FROM categories ORDER BY name'); res.json(result.rows); } catch (err) { res.status(500).send('Error'); }
});

app.post('/categories', authenticateToken, async (req, res) => {
    try { 
        const { name } = req.body;
        const check = await pool.query('SELECT id FROM categories WHERE name = $1', [name]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Category name already exists" });

        const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]); 
        res.json(result.rows[0]); 
    } catch (err) { res.status(500).send('Error'); }
});

app.get('/assets', authenticateToken, async (req, res) => {
    try { const result = await pool.query('SELECT assets.*, categories.name as category_name FROM assets LEFT JOIN categories ON assets.category_id = categories.id ORDER BY assets.code'); res.json(result.rows); } catch (err) { res.status(500).send('Error'); }
});

// ==========================================
// ניהול נכסים (יצירה ועריכה) - מעודכן לשיוך מיקום
// ==========================================
app.post('/assets', authenticateToken, async (req, res) => {
    try {
        const { name, code, category_id, location_id } = req.body;
        
        if (code) {
            const check = await pool.query('SELECT id FROM assets WHERE code = $1', [code]);
            if (check.rows.length > 0) return res.status(400).json({ error: "Asset code already exists" });
        }
        
        const result = await pool.query(
            `INSERT INTO assets (name, code, category_id, location_id) 
             VALUES ($1, $2, $3, $4) RETURNING *`, 
            [name, code, category_id, location_id || null]
        );
        res.json(result.rows[0]);
    } catch (err) { 
        console.error(err); 
        res.status(500).send('Error saving asset'); 
    }
});

app.put('/locations/:id', authenticateToken, async (req, res) => {
  try {
      const { name, code, image_url, coordinates, dynamic_fields } = req.body;
      const r = await pool.query(
          `UPDATE locations 
           SET name = $1, code = $2, image_url = $3, coordinates = $4, dynamic_fields = $5
           WHERE id = $6 RETURNING *`,
          [name, code || null, image_url || null, coordinates || null, dynamic_fields || '[]', req.params.id]
      );
      res.json(r.rows[0]);
  } catch (e) { 
      console.error(e); 
      res.status(500).send('Error updating location'); 
  }
});

app.put('/categories/:id', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        await pool.query('UPDATE categories SET name = $1 WHERE id = $2', [name, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).send("Error updating category"); }
});
app.put('/assets/:id', authenticateToken, async (req, res) => {
    try {
        const { name, category_id, location_id } = req.body;
        // שימי לב: אנחנו לא מאפשרים עריכת "קוד" אחרי שנוצר כדי למנוע בלאגן במערכת
        const result = await pool.query(
            `UPDATE assets 
             SET name = $1, category_id = $2, location_id = $3
             WHERE id = $4 RETURNING *`,
            [name, category_id, location_id || null, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { 
        console.error(err); 
        res.status(500).send('Error updating asset'); 
    }
});

const deleteItem = async (table, id, res) => {
    try { await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]); res.json({ success: true }); } 
    catch (e) { res.status(400).json({ error: "Cannot delete: Item is in use." }); }
};
app.delete('/locations/:id', authenticateToken, (req, res) => deleteItem('locations', req.params.id, res));
app.delete('/categories/:id', authenticateToken, (req, res) => deleteItem('categories', req.params.id, res));
app.delete('/assets/:id', authenticateToken, (req, res) => deleteItem('assets', req.params.id, res));

app.get('/tasks', authenticateToken, async (req, res) => {
    try {
        const { role, id } = req.user;
        let query = `
            SELECT t.*, 
                   u.full_name as worker_name, 
                   l.name as location_name,
                   a.name as asset_name, 
                   a.code as asset_code,
                   c.name as category_name
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
            query += ` WHERE t.worker_id = $1 OR t.worker_id IN (SELECT id FROM users WHERE parent_manager_id = $1)`;
            const result = await pool.query(query + ` ORDER BY t.due_date ASC`, [id]);
            return res.json(result.rows);
        }

        const result = await pool.query(query + ` ORDER BY t.due_date ASC`);
        res.json(result.rows);
    } catch (err) { console.error(err); res.sendStatus(500); }
});

// ==========================================
// 1. יצירת משימה בודדת מהאפליקציה (הקוד המקורי שלך!)
// ==========================================
app.post('/tasks', authenticateToken, upload.any(), async (req, res) => {
  try {
    const files = req.files || [];
    const imageUrls = files.map(file => file.path);
    
    console.log("📝 Creating Task:", { body: req.body, images: imageUrls });

    let { title, urgency, due_date, location_id, assigned_worker_id, description, is_recurring, recurring_type, selected_days, recurring_date, asset_id } = req.body;
    
    if (!location_id || location_id === 'undefined') return res.status(400).json({ error: "Location is required" });
    if (!asset_id || asset_id === 'undefined' || asset_id === 'null') asset_id = null;
    if (!due_date) due_date = new Date();
    
    const worker_id = (assigned_worker_id && assigned_worker_id !== 'undefined') ? assigned_worker_id : req.user.id;
    const isRecurring = is_recurring === 'true';

    let createdCount = 1;

    // יצירת המשימות במסד הנתונים
    if (!isRecurring) {
        await pool.query(
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, images, status, asset_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)`,
            [title, location_id, worker_id, urgency, due_date, description, imageUrls, asset_id] 
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

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            let match = false;
            if (recurring_type === 'weekly') {
                if (daysArray.includes(d.getDay())) match = true;
            } else if (recurring_type === 'monthly') {
                if (d.getDate() === monthlyDate) match = true;
            } else if (recurring_type === 'yearly') {
                if (d.getMonth() === start.getMonth() && d.getDate() === start.getDate()) match = true;
            }

            if (match) tasksToInsert.push(new Date(d));
        }

        if (tasksToInsert.length === 0) return res.status(400).json({ error: "No dates matched!" });

        for (const date of tasksToInsert) {
            await pool.query(
                `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, images, status, asset_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)`,
                [title + ' (Recurring)', location_id, worker_id, urgency, date, description, imageUrls, asset_id]
            );
        }
        createdCount = tasksToInsert.length;
    }
    
    // שליחת ההתראה לעובד
    try {
        const workerRes = await pool.query('SELECT device_token FROM users WHERE id = $1', [worker_id]);
        const workerToken = workerRes.rows[0]?.device_token;

        if (workerToken) {
            await admin.messaging().send({
                token: workerToken,
                notification: {
                    title: 'משימה חדשה! 📋',
                    body: `הוקצתה לך משימה חדשה: ${title}`
                },
                webpush: { fcmOptions: { link: '/' } }
            });
            console.log("🔔 Notification sent to worker!");
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

// ==========================================
// 2. יצירת משימות במאסה מתוך אקסל (הקוד החדש והחכם)
// ==========================================
// ==========================================
// יצירת משימות במאסה מתוך אקסל (תמיכה מלאה בתמונות ומערכי תאריכים)
// ==========================================
app.post('/tasks/bulk-excel', authenticateToken, async (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: "לא נשלחו משימות תקינות." });

        let insertedCount = 0;
        const notificationsMap = {};

        for (const task of tasks) {
            if (!notificationsMap[task.worker_id]) notificationsMap[task.worker_id] = 0;

            if (!task.is_recurring) {
                // משימה חד פעמית (כולל תמונות)
                await pool.query(
                    `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, status, asset_id, images) 
                     VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)`,
                    [task.title, task.location_id, task.worker_id, task.urgency, task.due_date, task.description, task.asset_id, task.images]
                );
                insertedCount++;
                notificationsMap[task.worker_id]++;
            } else {
                // משימה מחזורית - רץ לשנה הקרובה
                const start = new Date(task.due_date);
                const end = new Date(start);
                end.setFullYear(end.getFullYear() + 1); 
                
                const tasksToInsert = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    let match = false;
                    
                    if (task.recurring_type === 'weekly' && task.selected_days.includes(d.getDay())) match = true;
                    
                    if (task.recurring_type === 'monthly' && task.monthly_dates.includes(d.getDate())) match = true;
                    
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

        // שליחת התראה מרוכזת אחת לעובד על כל המאסה
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

        await pool.query(
            `UPDATE tasks SET status = 'WAITING_APPROVAL', completion_note = $1, completion_image_url = $2 WHERE id = $3`,
            [completion_note, completionImageUrl, id]
        );

        // 👇 קוד התראה למנהל - להדביק לפני res.json
        try {
            // 1. נמצא מי המנהל של העובד
            const managerQuery = `
                SELECT m.device_token 
                FROM tasks t
                JOIN users w ON t.worker_id = w.id
                JOIN users m ON w.parent_manager_id = m.id
                WHERE t.id = $1
            `;
            const managerRes = await pool.query(managerQuery, [id]);
            const managerToken = managerRes.rows[0]?.device_token;

            // 2. נשלח למנהל הודעה
            if (managerToken) {
                await admin.messaging().send({
                    token: managerToken,
                    notification: {
                        title: 'משימה ממתינה לאישור ✅',
                        body: 'עובד סיים משימה. היכנס לאשר.'
                    },
                    webpush: { fcmOptions: { link: '/' } }
                });
                console.log("🔔 Notification sent to manager!");
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

// ==========================================
// 👇 ייצוא לאקסל
// ==========================================
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

// ==========================================
// 👇 ייבוא מאקסל (כולל עדכון סטטוס וכל השדות)
// ==========================================
app.post('/tasks/import-process', authenticateToken, async (req, res) => {
    const { tasks, isDryRun } = req.body; 
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const errors = []; 
        const validTasks = [];

        const usersRes = await client.query('SELECT id, full_name FROM users');
        const locationsRes = await client.query('SELECT id, name FROM locations');
        const assetsRes = await client.query('SELECT id, name, code, category_id FROM assets');
        
        const usersMap = new Map(usersRes.rows.map(u => [u.full_name.trim().toLowerCase(), u.id]));
        const locMap = new Map(locationsRes.rows.map(l => [l.name.trim().toLowerCase(), l.id]));
        const assetCodeMap = new Map(assetsRes.rows.map(a => [a.code.trim().toLowerCase(), a]));
        const assetNameMap = new Map(assetsRes.rows.map(a => [a.name.trim().toLowerCase(), a]));

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
            const statusRaw = getValue(row, ['Status', 'סטטוס']) || 'PENDING'; // 👇 קריאת סטטוס
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
                } else {
                    rowErrors.push(`Row ${i + 1}: Asset Code '${assetCode}' not found.`);
                }
            } else if (assetName) {
                const aName = assetName.toString().trim().toLowerCase();
                if (assetNameMap.has(aName)) {
                    asset_id = assetNameMap.get(aName).id;
                } else {
                    rowErrors.push(`Row ${i + 1}: Asset Name '${assetName}' not found.`);
                }
            }

            if (locName) {
                const lName = locName.toString().trim().toLowerCase();
                if (locMap.has(lName)) {
                    location_id = locMap.get(lName);
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
                    status: statusRaw, // 👇 שמירת הסטטוס
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
                    // 👇 UPDATE כולל סטטוס
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
                        // 👇 INSERT כולל סטטוס (אם ID לא קיים)
                        await client.query(
                            `INSERT INTO tasks (title, description, urgency, status, due_date, worker_id, asset_id, location_id, images) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [t.title, t.description, t.urgency, t.status, t.due_date, t.worker_id, t.asset_id, t.location_id, t.images]
                        );
                    }
                } else {
                    // 👇 INSERT רגיל כולל סטטוס
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

// 👇 נתיב שדרוג מסד הנתונים (להרצה חד-פעמית)
app.get('/api/upgrade-db', async (req, res) => {
    try {
        // שדרוג טבלת קטגוריות
        await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS code VARCHAR(3);`);
        
        // שדרוג טבלת נכסים
        await pool.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS location_id INT;`);
        await pool.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS code VARCHAR(20);`);
        
        // שדרוג טבלת מיקומים (כולל שדות דינמיים וקואורדינטות)
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

        if (targetRole === 'MANAGER' || targetRole === 'BIG_BOSS') {
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
// 🚀 CRON JOB: דוח יומי חכם (15:00 שעון תאילנד)
// ==========================================
cron.schedule('45 16 * * *', async () => {
    console.log("⏰ [CRON] Starting Daily 15:00 Task Check...");
    try {
        // 1. שולפים את כל המשתמשים כדי לדעת מי עובד, מי מנהל ומי ביג בוס
        const usersRes = await pool.query("SELECT id, full_name, email, role, parent_manager_id, device_token FROM users");
        const allUsers = usersRes.rows;

        // 2. שולפים את המשימות של *היום בלבד*
        const tasksRes = await pool.query("SELECT * FROM tasks WHERE DATE(due_date) = CURRENT_DATE");
        const todayTasks = tasksRes.rows;

        if (todayTasks.length === 0) {
            console.log("✅ [CRON] No tasks for today.");
            return;
        }

        // 3. מקבצים את המשימות פר עובד (ורק למי שמוגדר כ-EMPLOYEE!)
        const employeeTasks = {};
        const employees = allUsers.filter(u => u.role === 'EMPLOYEE');
        
        employees.forEach(emp => {
            const myTasks = todayTasks.filter(t => t.worker_id === emp.id);
            if (myTasks.length > 0) {
                employeeTasks[emp.id] = { user: emp, tasks: myTasks };
            }
        });

        // ==========================================
        // 🔔 שלב א': טיפול בעובדים (אימייל + פוש)
        // ==========================================
        for (const empId in employeeTasks) {
            const { user: emp, tasks: wTasks } = employeeTasks[empId];
            const completed = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
            const pending = wTasks.filter(t => t.status === 'PENDING');
            const isPerfect = pending.length === 0;

            // בניית טבלה אישית לעובד
            let tableHtml = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                <tr style="background-color: #f3f4f6; text-align: right;">
                    <th style="padding: 10px; border: 1px solid #ddd;">שם המשימה</th>
                    <th style="padding: 10px; border: 1px solid #ddd;">סטטוס</th>
                </tr>
            `;
            wTasks.forEach(t => {
                const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                tableHtml += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>${t.title}</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd; color: ${isDone ? '#166534' : '#991b1b'}; font-weight: bold; background-color: ${isDone ? '#dcfce7' : '#fee2e2'};">
                        ${isDone ? 'בוצע ✔️' : 'לא בוצע ❌'}
                    </td>
                </tr>`;
            });
            tableHtml += `</table>`;

            const subject = isPerfect ? '🌟 אלופה! סיימת את כל המשימות להיום' : '⚠️ דוח יומי: עליך להשלים משימות פתוחות';
            const bodyTitle = isPerfect 
                ? `<h2 style="color: #166534;">כל הכבוד ${emp.full_name}! סיימת את כל המשימות! 🎉</h2><p>להלן הסיכום שלך להיום:</p>` 
                : `<h2 style="color: #991b1b;">שלום ${emp.full_name}, לא סיימת את המשימות שלך להיום! ⏰</h2><p>להלן פירוט המשימות שביצעת ואלו שעליך להשלים בדחיפות:</p>`;

            const htmlBody = `
                <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px;">
                    ${bodyTitle}
                    ${tableHtml}
                    <br/>
                    <a href="https://air-manage-app.netlify.app/" style="display: inline-block; background-color: #714B67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">לכניסה לאפליקציה לחץ כאן</a>
                </div>
            `;

            // שליחת מייל לעובד באופן מאובטח (await)
            if (emp.email) {
                try {
                    await transporter.sendMail({
                        from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', // 👈 שורת הקסם שלך!
                        to: emp.email,
                        subject: subject,
                        html: htmlBody
                    });
                    console.log(`📧 Email sent to Employee: ${emp.full_name}`);
                } catch(e) { console.error(`❌ Failed email to ${emp.email}:`, e.message); }
            }

            // שליחת התראת פוש לעובד
            if (emp.device_token) {
                try {
                    await admin.messaging().send({
                        token: emp.device_token,
                        notification: { 
                            title: isPerfect ? 'סיימת הכל! 🏆' : 'יש משימות פתוחות! ⏰', 
                            body: isPerfect ? 'כל הכבוד! הסיכום היומי נשלח למייל.' : `נותרו לך ${pending.length} משימות להשלים.`
                        }
                    });
                } catch(e) { console.error(`❌ Failed push to ${emp.full_name}:`, e.message); }
            }
        }

        // ==========================================
        // 👑 שלב ב': טיפול במנהלים וב-BIG BOSS
        // ==========================================
        const leaders = allUsers.filter(u => u.role === 'MANAGER' || u.role === 'BIG_BOSS');

        for (const leader of leaders) {
            // ביג בוס מקבל את כולם. מנהל רגיל מקבל רק את מי שתחתיו.
            const relevantEmps = leader.role === 'BIG_BOSS' 
                ? Object.values(employeeTasks) 
                : Object.values(employeeTasks).filter(e => e.user.parent_manager_id === leader.id);

            if (relevantEmps.length === 0) continue; // אין משימות לצוות הזה היום

            let allTeamPerfect = true;
            let leaderHtml = `
                <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; background: #f9fafb;">
                    <div style="background-color: #714B67; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                        <h1 style="margin:0;">דוח ביצועי צוות יומי 📊</h1>
                        <p style="margin:5px 0 0 0;">שלום ${leader.full_name}, להלן סטטוס המשימות של העובדים שלך להיום.</p>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            `;

            relevantEmps.forEach(empData => {
                const { user: emp, tasks: wTasks } = empData;
                const completed = wTasks.filter(t => t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL');
                const pending = wTasks.filter(t => t.status === 'PENDING');
                const isPerfect = pending.length === 0;

                if (!isPerfect) allTeamPerfect = false;

                leaderHtml += `
                    <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: ${isPerfect ? '#f0fdf4' : '#fef2f2'}; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                            <h3 style="margin: 0; color: ${isPerfect ? '#166534' : '#991b1b'};">
                                ${isPerfect ? '🌟' : '⚠️'} ${emp.full_name} - ${isPerfect ? 'סיים/ה את כל המשימות!' : 'יש משימות פתוחות'}
                            </h3>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">בוצעו ${completed.length} מתוך ${wTasks.length}</p>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr style="background-color: #f3f4f6; text-align: right;">
                                <th style="padding: 8px; border-bottom: 1px solid #e5e7eb;">משימה</th>
                                <th style="padding: 8px; border-bottom: 1px solid #e5e7eb;">סטטוס</th>
                                <th style="padding: 8px; border-bottom: 1px solid #e5e7eb;">הערות ביצוע</th>
                            </tr>
                `;

                wTasks.forEach(t => {
                    const isDone = t.status === 'COMPLETED' || t.status === 'WAITING_APPROVAL';
                    leaderHtml += `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${t.title}</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                                <span style="background-color: ${isDone ? '#dcfce7' : '#fee2e2'}; color: ${isDone ? '#166534' : '#991b1b'}; padding: 4px 8px; border-radius: 99px; font-weight: bold; font-size: 12px;">
                                    ${isDone ? 'בוצע ✔️' : 'לא בוצע ❌'}
                                </span>
                            </td>
                            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${t.completion_note || '-'}</td>
                        </tr>
                    `;
                });
                leaderHtml += `</table></div>`;
            });

            leaderHtml += `</div></div>`;

            // שליחת מייל למנהל/ביג בוס
            if (leader.email) {
                try {
                    await transporter.sendMail({
                        from: '"OpsManager App" <maintenance.app.tkp@gmail.com>', // 👈 שורת הקסם שלך!
                        to: leader.email,
                        subject: allTeamPerfect ? '🌟 דוח יומי: כל הצוות סיים בהצטיינות!' : '📊 דוח יומי: יש משימות פתוחות בצוות',
                        html: leaderHtml
                    });
                    console.log(`📧 Email sent to Manager/BigBoss: ${leader.full_name}`);
                } catch(e) { console.error(`❌ Failed email to ${leader.email}:`, e.message); }
            }

            // שליחת התראת פוש למנהל
            if (leader.device_token) {
                try {
                    await admin.messaging().send({
                        token: leader.device_token,
                        notification: { 
                            title: allTeamPerfect ? 'הצוות סיים הכל! 🏆' : 'דוח יומי מוכן 📊', 
                            body: allTeamPerfect ? 'כל העובדים סיימו את המשימות.' : 'לצוות שלך יש משימות פתוחות. הדוח נשלח למייל.'
                        }
                    });
                } catch(e) { console.error(`❌ Failed push to ${leader.full_name}:`, e.message); }
            }
        }

        console.log("✅ [CRON] Daily End-of-Day job completed successfully.");
    } catch (error) {
        console.error("❌ [CRON] Failed to execute daily task check:", error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Bangkok" // 🇹🇭 שעה 15:00 מדויקת לפי שעון תאילנד
});

// ==========================================
// 🚑 פונקציית חירום 2.0: שחזור משתמש BIG_BOSS נקי
// ==========================================
app.get('/api/rescue-boss', async (req, res) => {
    try {
        // 👇 שכתבי פה את האימייל והסיסמה - וודאי שאין רווחים מיותרים! 👇
        const bossEmail = "talyaisrael2025@gmail.com"; 
        const bossPassword = "123456"; 
        const bossName = "Big Boss";

        let uid;
        
        // 1. פיירבייס: מוחקים את המשתמש אם הוא קיים (כדי להתחיל נקי), ואז יוצרים מחדש
        try {
            const existingUser = await admin.auth().getUserByEmail(bossEmail);
            await admin.auth().deleteUser(existingUser.uid);
        } catch (e) { /* מתעלמים אם הוא לא קיים */ }

        // יוצרים משתמש פיירבייס חדש ונוצץ
        const newUser = await admin.auth().createUser({
            email: bossEmail,
            password: bossPassword,
            displayName: bossName
        });
        uid = newUser.uid;
        
        // 2. מסד נתונים: מוחקים שאריות ישנות של המייל הזה
        await pool.query('DELETE FROM users WHERE email = $1', [bossEmail]);
        
        // מצפינים את הסיסמה ומכניסים נקי למסד הנתונים עם ה-UID של פיירבייס
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(bossPassword, 10);

        await pool.query(
            `INSERT INTO users (id, full_name, email, role, password) 
             VALUES ($1, $2, $3, 'BIG_BOSS', $4)`,
            [uid, bossName, bossEmail, hashedPassword]
        );

        res.send(`
            <div style="font-family: Arial; text-align: center; margin-top: 50px; direction: rtl;">
                <h1 style="color: #166534;">✅ משתמש ה-Big Boss נוצר מחדש בהצלחה!</h1>
                <h2>אימייל להתחברות: <b>${bossEmail}</b></h2>
                <h2>סיסמה: <b>${bossPassword}</b></h2>
                <p>כנסי עכשיו לאפליקציה וזה יעבוד.</p>
            </div>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send("❌ שגיאה: " + error.message);
    }
});

app.listen(port, () => { console.log(`Server running on ${port}`); });