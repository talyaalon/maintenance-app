require('dotenv').config();
// server/index.js - הקובץ המלא: משתמשים, הרשאות, משימות מתקדמות, תמונות וסטטוסים
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

// --- הגדרת המייל (תיקון ל-Render: שימוש בפורט 587) ---
console.log("📧 Configuring Email using Brevo SMTP...");

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 2525, // הפורט שעוקף חסימות
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// בדיקת חיבור
transporter.verify((error, success) => {
  if (error) {
    console.error('🔴 Still failing to connect:', error);
  } else {
    console.log('🟢 SUCCESS! Email server connected successfully.');
  }
});

// --- פונקציה: שליחת מייל עדכון פרטים ---
cconst sendUpdateEmail = async (email, fullName, changes) => {
    const appLink = "https://maintenance-management-app.netlify.app";
    let changesHtml = '<ul style="padding-left: 20px; color: #333;">';
    changes.forEach(change => {
        changesHtml += `<li style="margin-bottom: 5px;">${change}</li>`;
    });
    changesHtml += '</ul>';

    const mailOptions = {
      from: '"Maintenance App" <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'Account Update - Maintenance Management',
      html: `
        <div dir="ltr" style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;border:1px solid #e0e0e0;">
          <h2 style="color:#6A0DAD;text-align:center;">Account Profile Updated</h2>
          <div style="background:white;padding:20px;border-radius:8px;">
            <p style="font-size:16px;">Hello <strong>${fullName}</strong>,</p>
            <p>The following changes were made to your profile:</p>
            <div style="background-color:#f0f9ff; border-left: 4px solid #0ea5e9; padding: 10px; margin: 15px 0;">
                ${changesHtml}
            </div>
            <p style="font-size:14px; color:#666;">If you did not request these changes, please contact your manager.</p>
            <div style="text-align:center;margin-top:30px;">
              <a href="${appLink}" style="background:#6A0DAD;color:white;padding:10px 25px;text-decoration:none;border-radius:25px;font-weight:bold;">Login to System</a>
            </div>
          </div>
        </div>
      `
    };
    try { await transporter.sendMail(mailOptions); } 
    catch (error) { console.error('Error sending update email:', error); }
};

// --- פונקציה: שליחת מייל ברוכים הבאים ---
const sendWelcomeEmail = async (email, fullName, password, role, managerName) => {
    const appLink = "https://maintenance-management-app.netlify.app";
    let titleText = 'Welcome to the team! 🛠️', descriptionText = 'Your account has been created.';

    if (role === 'MANAGER' || role === 'BIG_BOSS') {
        titleText = `Welcome to the Management Team! 💼`;
        descriptionText = `A manager account has been created for you with extended permissions.`;
    }

    const mailOptions = {
      from: '"Maintenance App" <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'Login Details - Maintenance Management',
      html: `
        <div dir="ltr" style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;">
          <h1 style="color:#6A0DAD;text-align:center;">Maintenance Management</h1>
          <div style="background:white;padding:20px;border-radius:8px;">
            <h2>Hello ${fullName},</h2>
            <h3 style="color:#6A0DAD;">${titleText}</h3>
            <p>${descriptionText}</p>
            <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:20px 0;border-left:4px solid #6A0DAD;">
              <p><strong>📧 Email:</strong> ${email}</p>
              <p><strong>🔑 Password:</strong> ${password}</p>
            </div>
            <div style="text-align:center;margin-top:30px;">
              <a href="${appLink}" style="background:#6A0DAD;color:white;padding:12px 25px;text-decoration:none;border-radius:25px;font-weight:bold;">Login to App</a>
            </div>
          </div>
        </div>
      `
    };
    try { await transporter.sendMail(mailOptions); } 
    catch (error) { console.error("❌ Error sending email:", error); }
};

// --- הגדרת קבצים ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// שינוי הגדרות הדאטה-בייס לעבודה בענן
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

// --- מסלולים (Routes) ---

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "משתמש לא נמצא" });
    const user = result.rows[0];
    if (password !== user.password) return res.status(400).json({ error: "סיסמה שגויה" });
    const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.full_name, role: user.role, email: user.email, profile_picture_url: user.profile_picture_url } });
  } catch (err) { res.status(500).json({ error: "שגיאת שרת" }); }
});

// עדכון פרופיל אישי + מייל עדכון
app.put('/users/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, password } = req.body;
        let profilePictureUrl = req.body.existing_picture; 
        if (req.file) profilePictureUrl = `https://maintenance-app-h84v.onrender.com/uploads/${req.file.filename}`;
        
        const oldUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const oldUser = oldUserRes.rows[0];

        let query, params;
        let changes = [];

        if (full_name !== oldUser.full_name) changes.push(`שמך שונה ל: <strong>${full_name}</strong>`);
        if (email !== oldUser.email) changes.push(`כתובת האימייל שונתה ל: <strong>${email}</strong>`);
        if (password && password.trim() !== '') changes.push('הסיסמה שלך שונתה');
        if (req.file) changes.push('תמונת הפרופיל הוחלפה');

        if (password && password.trim() !== '') {
            query = `UPDATE users SET full_name = $1, email = $2, password = $3, profile_picture_url = $4 WHERE id = $5 RETURNING *`;
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

// --- ניהול משתמשים (כולל הרשאות צפייה) ---
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

// יצירת משתמש חדש
app.post('/users', authenticateToken, async (req, res) => {
  const { full_name, email, password, role, parent_manager_id } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "אימייל לא תקין" });
  if (req.user.role === 'EMPLOYEE') return res.status(403).json({ error: "אין הרשאה" });

  try {
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password, role, parent_manager_id)
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

// עריכת משתמש ע"י מנהל + מייל מפורט
app.put('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const { full_name, email, password, parent_manager_id } = req.body; 
    
    try {
        const oldUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        const oldUser = oldUserRes.rows[0];
        if (!oldUser) return res.status(404).send("User not found");

        let query, params;
        let changes = [];

        if (full_name !== oldUser.full_name) changes.push(`השם שלך שונה ל: <strong>${full_name}</strong>`);
        if (email !== oldUser.email) changes.push(`כתובת האימייל שונתה ל: <strong>${email}</strong>`);
        if (password && password.trim() !== "") changes.push('הסיסמה שלך שונתה');

        const oldManagerId = oldUser.parent_manager_id;
        const newManagerId = parent_manager_id || null; 

        if (oldManagerId !== newManagerId) {
            if (newManagerId) {
                const mRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [newManagerId]);
                if (mRes.rows.length > 0) {
                    changes.push(`הועברת למנהל חדש: <strong>${mRes.rows[0].full_name}</strong>`);
                }
            } else {
                changes.push('הוסרת משיוך למנהל (כעת אין לך מנהל ישיר)');
            }
        }

        if (password && password.trim() !== "") {
            query = 'UPDATE users SET full_name = $1, email = $2, password = $3, parent_manager_id = $4 WHERE id = $5 RETURNING *';
            params = [full_name, email, password, parent_manager_id || null, id];
        } else {
            query = 'UPDATE users SET full_name = $1, email = $2, parent_manager_id = $3 WHERE id = $4 RETURNING *';
            params = [full_name, email, parent_manager_id || null, id];
        }
        
        const result = await pool.query(query, params);
        const updatedUser = result.rows[0];

        if (changes.length > 0) {
            sendUpdateEmail(updatedUser.email, updatedUser.full_name, changes);
        }

        res.json(updatedUser);
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).send("Error updating user");
    }
});

// מחיקת משתמש (בטוחה)
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

// --- LOCATIONS ---
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

// --- TASKS (המדורג!) ---

// 1. שליפת משימות (כולל סטטוסים ותמונות)
app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = `
        SELECT tasks.*, users.full_name as worker_name, locations.name as location_name, users.parent_manager_id
        FROM tasks 
        LEFT JOIN users ON tasks.worker_id = users.id 
        LEFT JOIN locations ON tasks.location_id = locations.id
    `;
    let params = [];
    if (role === 'EMPLOYEE') {
        query += ' WHERE worker_id = $1';
        params.push(id);
    } else if (role === 'MANAGER') {
        query += ` WHERE worker_id = $1 OR worker_id IN (SELECT id FROM users WHERE parent_manager_id = $1)`;
        params.push(id);
    }
    query += ' ORDER BY due_date ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

// 2. יצירת משימה (תמיכה בתמונות ומחזוריות)
app.post('/tasks', authenticateToken, upload.single('task_image'), async (req, res) => {
  try {
    const creationImageUrl = req.file ? `https://maintenance-app-h84v.onrender.com/uploads/${req.file.filename}` : null;
    const { title, urgency, due_date, location_id, assigned_worker_id, description, is_recurring, recurring_type, selected_days, recurring_date } = req.body;
    
    const worker_id = assigned_worker_id || req.user.id;
    
    const isRecurring = is_recurring === 'true';
    const selDays = selected_days ? JSON.parse(selected_days) : [];

    if (!isRecurring) {
        await pool.query(
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, creation_image_url, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')`,
            [title, location_id, worker_id, urgency, due_date, description, creationImageUrl]
        );
        return res.json({ message: "משימה נוצרה" });
    }

    // משימות מחזוריות
    const tasksToInsert = [];
    const startDate = new Date(due_date);
    const oneYearFromNow = new Date(startDate);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    let currentDate = new Date(startDate);

    while (currentDate <= oneYearFromNow) {
        let shouldInsert = false;
        if (recurring_type === 'weekly') {
            if (selDays.includes(currentDate.getDay())) shouldInsert = true;
        } else if (recurring_type === 'monthly') {
            if (currentDate.getDate() === parseInt(recurring_date)) shouldInsert = true;
        }
        if (shouldInsert) tasksToInsert.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const date of tasksToInsert) {
        await pool.query(
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, creation_image_url, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')`,
            [title + ' (מחזורי)', location_id, worker_id, urgency, date, description, creationImageUrl]
        );
    }
    res.json({ message: `נוצרו ${tasksToInsert.length} משימות מחזוריות` });

  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

// 3. דיווח ביצוע ע"י עובד
app.put('/tasks/:id/complete', authenticateToken, upload.single('completion_image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { completion_note } = req.body;
        
        if (!req.file && !completion_note) {
            return res.status(400).json({ error: "חובה להעלות תמונה או לכתוב הערה לסיום משימה" });
        }

        const completionImageUrl = req.file ? `https://maintenance-app-h84v.onrender.com/uploads/${req.file.filename}` : null;

        await pool.query(
            `UPDATE tasks SET status = 'WAITING_APPROVAL', completion_note = $1, completion_image_url = $2 WHERE id = $3`,
            [completion_note, completionImageUrl, id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

// 4. אישור משימה ע"י מנהל
app.put('/tasks/:id/approve', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    try {
        await pool.query(`UPDATE tasks SET status = 'COMPLETED' WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).send('Error'); }
});

// 5. משימת המשך (Follow-up)
app.post('/tasks/:id/follow-up', authenticateToken, async (req, res) => {
    try {
        const parentId = req.params.id;
        const { due_date, description } = req.body;

        const parentTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [parentId]);
        const pt = parentTask.rows[0];

        await pool.query(
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, status, parent_task_id) 
             VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)`,
            [`המשך ל: ${pt.title}`, pt.location_id, pt.worker_id, 'High', due_date, description, parentId]
        );
        
        await pool.query(`UPDATE tasks SET status = 'COMPLETED', completion_note = 'נפתחה משימת המשך לתאריך ${due_date}' WHERE id = $1`, [parentId]);

        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).send('Error'); }
});

// 6. ייבוא חכם
app.post('/tasks/import-smart', authenticateToken, async (req, res) => {
    const { tasks } = req.body; 
    if (!tasks || !Array.isArray(tasks)) return res.status(400).send("Invalid data");

    let created = 0;
    let updated = 0;

    try {
        for (const task of tasks) {
            const urgency = task.urgency || 'Normal';
            if (task.id) {
                const check = await pool.query('SELECT id FROM tasks WHERE id = $1', [task.id]);
                if (check.rows.length > 0) {
                    await pool.query(
                        `UPDATE tasks SET title=$1, urgency=$2, location_id=$3, worker_id=$4, due_date=$5 WHERE id=$6`,
                        [task.title, urgency, task.location_id, task.worker_id, task.due_date, task.id]
                    );
                    updated++;
                } else {
                    await pool.query(
                        `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date) VALUES ($1, $2, $3, $4, $5)`,
                        [task.title, task.location_id, task.worker_id, urgency, task.due_date]
                    );
                    created++;
                }
            } else {
                await pool.query(
                    `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date) VALUES ($1, $2, $3, $4, $5)`,
                    [task.title, task.location_id, task.worker_id, urgency, task.due_date]
                );
                created++;
            }
        }
        res.json({ message: 'Import completed', stats: { created, updated } });
    } catch (e) { res.status(500).send('Error importing'); }
});


// --- CONFIGURATION / ASSETS MANAGEMENT ---

// קבלת כל הקטגוריות
app.get('/categories', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).send('Error fetching categories'); }
});

// יצירת קטגוריה חדשה
app.post('/categories', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).send('Error creating category'); }
});

// קבלת כל הנכסים
app.get('/assets', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT assets.*, categories.name as category_name 
            FROM assets 
            LEFT JOIN categories ON assets.category_id = categories.id 
            ORDER BY assets.code
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).send('Error fetching assets'); }
});

// יצירת נכס חדש
app.post('/assets', authenticateToken, async (req, res) => {
    try {
        const { name, code, category_id } = req.body;
        
        // בדיקה אם הקוד כבר קיים
        const check = await pool.query('SELECT id FROM assets WHERE code = $1', [code]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: "Asset code already exists" });
        }

        const result = await pool.query(
            'INSERT INTO assets (name, code, category_id) VALUES ($1, $2, $3) RETURNING *',
            [name, code, category_id]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).send('Error creating asset'); }
});

app.listen(port, () => { console.log(`Server running on ${port}`); });