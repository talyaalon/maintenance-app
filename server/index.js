// server/index.js - גרסה עם מיילים מפורטים וחכמים
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path'); 
const nodemailer = require('nodemailer');

const app = express();
const port = 3001;
const SECRET_KEY = 'my_super_secret_key';

// --- הגדרת המייל ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maintenance.app.tkp@gmail.com', 
    pass: 'xwyrwclaazvoiopm'     
  },
  tls: { rejectUnauthorized: false }
});

// --- שליחת מייל עדכון ---
const sendUpdateEmail = async (email, fullName, changes) => {
    console.log(`Sending update email to: ${email}...`);
    const appLink = "http://192.168.0.106:3000"; 

    let changesHtml = '<ul style="padding-right: 20px; color: #333;">';
    changes.forEach(change => {
        changesHtml += `<li style="margin-bottom: 5px;">${change}</li>`;
    });
    changesHtml += '</ul>';

    const mailOptions = {
      from: 'Maintenance App <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'עדכון פרטים בחשבונך - ניהול אחזקה',
      html: `
        <div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;border:1px solid #e0e0e0;">
          <h2 style="color:#6A0DAD;text-align:center;">עדכון פרטים בחשבונך</h2>
          <div style="background:white;padding:20px;border-radius:8px;">
            <p style="font-size:16px;">שלום <strong>${fullName}</strong>,</p>
            <p>בוצעו השינויים הבאים בפרופיל המשתמש שלך:</p>
            
            <div style="background-color:#f0f9ff; border-right: 4px solid #0ea5e9; padding: 10px; margin: 15px 0;">
                ${changesHtml}
            </div>

            <p style="font-size:14px; color:#666;">אם לא ביצעת או ביקשת את השינויים האלו, אנא פנה למנהל המערכת.</p>
            <div style="text-align:center;margin-top:30px;">
              <a href="${appLink}" style="background:#6A0DAD;color:white;padding:10px 25px;text-decoration:none;border-radius:25px;font-weight:bold;">כניסה למערכת</a>
            </div>
          </div>
        </div>
      `
    };

    try { await transporter.sendMail(mailOptions); } 
    catch (error) { console.error('Error sending update email:', error); }
};

// --- שליחת מייל ברוכים הבאים ---
const sendWelcomeEmail = async (email, fullName, password, role, managerName) => {
    const appLink = "http://192.168.0.106:3000"; 
    let titleText = '', descriptionText = '', featuresList = '', managerInfo = '';

    if (role === 'MANAGER' || role === 'BIG_BOSS') {
        titleText = `ברכות על הצטרפותך לצוות הניהול! 💼`;
        descriptionText = `כמנהל/ת במערכת, נפתח עבורך חשבון עם הרשאות מורחבות.`;
        featuresList = `<ul style="color: #555;"><li>👥 ניהול צוות</li><li>📋 יצירת משימות</li></ul>`;
    } else {
        titleText = `שמחים שאת/ה איתנו! 🛠️`;
        descriptionText = `נפתח עבורך משתמש באפליקציה לקבלת משימות.`;
        if (managerName) {
            managerInfo = `<div style="background:#eef2ff;padding:10px;margin-bottom:15px;border:1px solid #c7d2fe;"><p style="margin:0;color:#3730a3;font-weight:bold;">👤 המנהל שלך:</p><p style="margin:0;">${managerName}</p></div>`;
        }
        featuresList = `<ul style="color: #555;"><li>✅ צפייה במשימות</li><li>📍 עדכונים מהשטח</li></ul>`;
    }

    const mailOptions = {
      from: 'Maintenance App <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'פרטי התחברות למערכת ניהול אחזקה',
      html: `
        <div dir="rtl" style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;">
          <h1 style="color:#6A0DAD;text-align:center;">ניהול אחזקה</h1>
          <div style="background:white;padding:20px;border-radius:8px;">
            <h2>שלום ${fullName},</h2>
            <h3 style="color:#6A0DAD;">${titleText}</h3>
            <p>${descriptionText}</p>
            ${managerInfo}
            ${featuresList}
            <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:20px 0;border-right:4px solid #6A0DAD;">
              <p><strong>📧 אימייל:</strong> ${email}</p>
              <p><strong>🔑 סיסמה:</strong> ${password}</p>
            </div>
            <div style="text-align:center;margin-top:30px;">
              <a href="${appLink}" style="background:#6A0DAD;color:white;padding:12px 25px;text-decoration:none;border-radius:25px;font-weight:bold;">כניסה למערכת</a>
            </div>
          </div>
        </div>
      `
    };
    try { await transporter.sendMail(mailOptions); } catch (e) {}
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'maintenance_management_app', password: '1234', port: 5432,
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

// --- ROUTES ---

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "משתמש לא נמצא" });
    const user = result.rows[0];
    if (password !== user.password_hash) return res.status(400).json({ error: "סיסמה שגויה" });
    const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.full_name, role: user.role, email: user.email, profile_picture_url: user.profile_picture_url } });
  } catch (err) { res.status(500).json({ error: "שגיאת שרת" }); }
});

app.put('/users/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, password } = req.body;
        let profilePictureUrl = req.body.existing_picture; 
        if (req.file) profilePictureUrl = `http://192.168.0.106:3001/uploads/${req.file.filename}`;
        
        // שליפת המשתמש הישן להשוואה
        const oldUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const oldUser = oldUserRes.rows[0];

        let query, params;
        let changes = [];

        if (full_name !== oldUser.full_name) changes.push(`שמך שונה ל: <strong>${full_name}</strong>`);
        if (email !== oldUser.email) changes.push(`כתובת האימייל שונתה ל: <strong>${email}</strong>`);
        if (password && password.trim() !== '') changes.push('הסיסמה שלך שונתה');
        if (req.file) changes.push('תמונת הפרופיל הוחלפה');

        if (password && password.trim() !== '') {
            query = `UPDATE users SET full_name = $1, email = $2, password_hash = $3, profile_picture_url = $4 WHERE id = $5 RETURNING *`;
            params = [full_name, email, password, profilePictureUrl, userId];
        } else {
            query = `UPDATE users SET full_name = $1, email = $2, profile_picture_url = $3 WHERE id = $4 RETURNING *`;
            params = [full_name, email, profilePictureUrl, userId];
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
            SELECT u.id, u.full_name, u.email, u.role, u.parent_manager_id, u.profile_picture_url, m.full_name as manager_name
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

app.post('/users', authenticateToken, async (req, res) => {
  const { full_name, email, password, role, parent_manager_id } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "אימייל לא תקין" });
  if (req.user.role === 'EMPLOYEE') return res.status(403).json({ error: "אין הרשאה" });

  try {
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, parent_manager_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role`,
      [full_name, email, password, role, parent_manager_id]
    );
    let managerName = null;
    if (role === 'EMPLOYEE' && parent_manager_id) {
        const mRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [parent_manager_id]);
        if (mRes.rows.length > 0) managerName = mRes.rows[0].full_name;
    }
    sendWelcomeEmail(email, full_name, password, role, managerName);
    res.json(newUser.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: "המייל קיים" });
    res.status(500).json({ error: "שגיאה" });
  }
});

// --- עריכת משתמש (ע"י מנהל) - גרסה מפורטת ---
app.put('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const { full_name, email, password, parent_manager_id } = req.body; 
    
    try {
        // 1. שליפת המצב הישן (לפני השינוי)
        const oldUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        const oldUser = oldUserRes.rows[0];

        if (!oldUser) return res.status(404).send("User not found");

        let query, params;
        let changes = [];

        // 2. זיהוי שינויים
        if (full_name !== oldUser.full_name) {
            changes.push(`השם שלך שונה ל: <strong>${full_name}</strong>`);
        }
        if (email !== oldUser.email) {
            changes.push(`כתובת האימייל שונתה ל: <strong>${email}</strong>`);
        }
        if (password && password.trim() !== "") {
            changes.push('הסיסמה שלך שונתה');
        }

        // בדיקת שינוי מנהל (החלק המורכב)
        const oldManagerId = oldUser.parent_manager_id;
        const newManagerId = parent_manager_id || null; // אם נשלח ריק זה null

        if (oldManagerId !== newManagerId) {
            if (newManagerId) {
                // המנהל הוחלף/נוסף - צריך להביא את השם שלו
                const mRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [newManagerId]);
                if (mRes.rows.length > 0) {
                    const newManagerName = mRes.rows[0].full_name;
                    changes.push(`הועברת למנהל חדש: <strong>${newManagerName}</strong>`);
                }
            } else {
                // המנהל הוסר
                changes.push('הוסרת משיוך למנהל (כעת אין לך מנהל ישיר)');
            }
        }

        // 3. ביצוע העדכון בדאטה בייס
        if (password && password.trim() !== "") {
            query = 'UPDATE users SET full_name = $1, email = $2, password_hash = $3, parent_manager_id = $4 WHERE id = $5 RETURNING *';
            params = [full_name, email, password, parent_manager_id || null, id];
        } else {
            query = 'UPDATE users SET full_name = $1, email = $2, parent_manager_id = $3 WHERE id = $4 RETURNING *';
            params = [full_name, email, parent_manager_id || null, id];
        }
        
        const result = await pool.query(query, params);
        const updatedUser = result.rows[0];

        // 4. שליחת המייל (רק אם היו שינויים)
        if (changes.length > 0) {
            sendUpdateEmail(updatedUser.email, updatedUser.full_name, changes);
        }

        res.json(updatedUser);
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).send("Error updating user");
    }
});

// --- מחיקת משתמש: חסימה אם יש עובדים ---
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

// Locations & Tasks
app.get('/locations', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT locations.*, users.full_name as creator_name FROM locations LEFT JOIN users ON locations.created_by = users.id ORDER BY locations.name ASC');
    res.json(r.rows);
  } catch (err) { res.status(500).send('Error'); }
});
app.post('/locations', authenticateToken, async (req, res) => {
  try { const r = await pool.query('INSERT INTO locations (name, created_by) VALUES ($1, $2) RETURNING *', [req.body.name, req.user.id]); res.json(r.rows[0]); } catch (e) { res.status(500).send('Error'); }
});
app.put('/locations/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    try { const r = await pool.query('UPDATE locations SET name = $1 WHERE id = $2 RETURNING *', [req.body.name, req.params.id]); res.json(r.rows[0]); } catch (e) { res.status(500).send('Error'); }
});
app.delete('/locations/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    try { await pool.query('DELETE FROM tasks WHERE location_id = $1', [req.params.id]); await pool.query('DELETE FROM locations WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).send('Error'); }
});
app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let q = `SELECT tasks.*, users.full_name as worker_name, locations.name as location_name FROM tasks LEFT JOIN users ON tasks.worker_id = users.id LEFT JOIN locations ON tasks.location_id = locations.id`;
    let p = [];
    if (role === 'EMPLOYEE') { q += ' WHERE worker_id = $1'; p.push(id); }
    q += ' ORDER BY created_at DESC';
    const r = await pool.query(q, p); res.json(r.rows);
  } catch (e) { res.status(500).send('Error'); }
});
app.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, urgency, due_date, location_id } = req.body; 
    const wRes = await pool.query('SELECT id FROM users LIMIT 1');
    const newJob = await pool.query(`INSERT INTO tasks (title, location_id, worker_id, urgency, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [title, location_id, wRes.rows[0]?.id, urgency, due_date]);
    res.json(newJob.rows[0]);
  } catch (e) { res.status(500).send('Error'); }
});
app.post('/tasks/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file');
    try {
        const wb = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        for (const row of data) {
            const loc = await pool.query('SELECT id FROM locations LIMIT 1');
            const usr = await pool.query('SELECT id FROM users LIMIT 1');
            await pool.query(`INSERT INTO tasks (title, location_id, worker_id, urgency, due_date) VALUES ($1, $2, $3, $4, $5)`, [row.Title || 'Imported', loc.rows[0].id, usr.rows[0].id, row.Urgency || 'Normal', row.DueDate ? new Date(row.DueDate) : new Date()]);
        }
        fs.unlinkSync(req.file.path); res.json({ message: 'Success' });
    } catch (e) { res.status(500).send('Error'); }
});

app.listen(port, () => { console.log(`Server running on ${port}`); });