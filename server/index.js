const bcrypt = require('bcrypt'); // Add this line!
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const xlsx = require('xlsx');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = 3001;
const SECRET_KEY = 'my_super_secret_key';

// --- הגדרת המייל (Brevo SMTP) ---
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

// --- פונקציות עזר למייל ---
const sendUpdateEmail = async (email, fullName, changes) => {
    const appLink = "https://maintenance-management-app.netlify.app";
    let changesHtml = '<ul style="padding-left: 20px; color: #333;">';
    changes.forEach(change => { changesHtml += `<li style="margin-bottom: 5px;">${change}</li>`; });
    changesHtml += '</ul>';

    const mailOptions = {
      from: '"Maintenance App" <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'Account Update - Maintenance Management',
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
      from: '"Maintenance App" <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'Login Details - Maintenance Management',
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

// DB Connection
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

    // בדיקה: אם הסיסמה מוצפנת, נשתמש ב-bcrypt. אם לא (משתמשים ישנים), נבדוק רגיל
    const validPassword = await bcrypt.compare(password, user.password);
    
    // אם ההשוואה נכשלה, נבדוק אם זו סיסמה ישנה (לא מוצפנת) למקרה שזה משתמש ותיק
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

// עדכון פרופיל
app.put('/users/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, password, phone } = req.body; // כולל טלפון
        let profilePictureUrl = req.body.existing_picture; 
        if (req.file) profilePictureUrl = `https://maintenance-app-h84v.onrender.com/uploads/${req.file.filename}`;
        
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

// ניהול משתמשים
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

// יצירת משתמש
// --- יצירת משתמש חדש (Create User) ---
app.post('/users', authenticateToken, async (req, res) => {
  try {
    const { full_name, email, password, role, phone, manager_id } = req.body;
    
    // ולידציה בסיסית
    if (!full_name || !email || !password || !role) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // הצפנת הסיסמה
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // קביעת מנהל
    let assignedManager = manager_id;
    if (!assignedManager && req.user.role === 'MANAGER') {
        assignedManager = req.user.id;
    }

   const newUser = await pool.query(
      // 👇 השינוי כאן: password במקום password_hash, ו-parent_manager_id במקום manager_id
      `INSERT INTO users (full_name, email, password, role, phone, parent_manager_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, email, role, phone`,
      [full_name, email, hashedPassword, role, phone, assignedManager]
    );
    
    res.json(newUser.rows[0]);

  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
        return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).send('Server Error');
  }
});

// --- עדכון משתמש קיים (Update User) - תיקון המחיקה והסיסמה ---
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // מוציאים רק את השדות שאנחנו רוצים לעדכן
    const { full_name, email, phone, role, password } = req.body;

    // בונים את השאילתה דינמית כדי לא לדרוס שדות שלא נשלחו (כמו manager_id)
    let query = 'UPDATE users SET full_name=$1, email=$2, phone=$3, role=$4';
    let params = [full_name, email, phone, role];
    let paramCount = 5;

    // אם נשלחה סיסמה חדשה - נעדכן גם אותה
    if (password && password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += `, password_hash=$${paramCount}`;
        params.push(hashedPassword);
        paramCount++;
    }

    // מוסיפים את ה-ID בסוף
    query += ` WHERE id=$${paramCount}`;
    params.push(id);

    // ביצוע העדכון
    await pool.query(query, params);
    
    res.json({ message: "User updated successfully" });

  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
        return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).send('Server Error');
  }
});

// מחיקת משתמש
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

// --- LOCATIONS / CATEGORIES / ASSETS ---

app.get('/locations', authenticateToken, async (req, res) => {
  try {
    const r = await pool.query('SELECT locations.*, users.full_name as creator_name FROM locations LEFT JOIN users ON locations.created_by = users.id ORDER BY locations.name ASC');
    res.json(r.rows);
  } catch (err) { res.status(500).send('Error'); }
});

app.post('/locations', authenticateToken, async (req, res) => {
  try { 
      const { name } = req.body;
      const check = await pool.query('SELECT id FROM locations WHERE name = $1', [name]);
      if (check.rows.length > 0) return res.status(400).json({ error: "Location name already exists" });

      const r = await pool.query('INSERT INTO locations (name, created_by) VALUES ($1, $2) RETURNING *', [name, req.user.id]); 
      res.json(r.rows[0]); 
  } catch (e) { res.status(500).send('Error'); }
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

app.post('/assets', authenticateToken, async (req, res) => {
    try {
        const { name, code, category_id } = req.body;
        const check = await pool.query('SELECT id FROM assets WHERE code = $1', [code]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Asset code already exists" });
        
        const result = await pool.query('INSERT INTO assets (name, code, category_id) VALUES ($1, $2, $3) RETURNING *', [name, code, category_id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).send('Error'); }
});

// --- Edit Items (PUT) ---
app.put('/locations/:id', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        await pool.query('UPDATE locations SET name = $1 WHERE id = $2', [name, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).send("Error updating location"); }
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
        const { name, code, category_id } = req.body;
        await pool.query(
            'UPDATE assets SET name=$1, code=$2, category_id=$3 WHERE id=$4',
            [name, code, category_id, req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).send("Error updating asset"); }
});

// --- Delete Helpers ---
const deleteItem = async (table, id, res) => {
    try { await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]); res.json({ success: true }); } 
    catch (e) { res.status(400).json({ error: "Cannot delete: Item is in use." }); }
};
app.delete('/locations/:id', authenticateToken, (req, res) => deleteItem('locations', req.params.id, res));
app.delete('/categories/:id', authenticateToken, (req, res) => deleteItem('categories', req.params.id, res));
app.delete('/assets/:id', authenticateToken, (req, res) => deleteItem('assets', req.params.id, res));

// --- TASKS ---
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

app.post('/tasks', authenticateToken, upload.single('task_image'), async (req, res) => {
  try {
    const creationImageUrl = req.file ? `https://maintenance-app-h84v.onrender.com/uploads/${req.file.filename}` : null;
    // כאן הוספנו את asset_id שיהיה אפשר לשייך נכס - זה היה חסר בקוד הקודם!
    const { title, urgency, due_date, location_id, assigned_worker_id, description, is_recurring, recurring_type, selected_days, recurring_date, asset_id } = req.body;
    
    const worker_id = assigned_worker_id || req.user.id;
    const isRecurring = is_recurring === 'true';
    
    // --- משימה חד פעמית ---
    if (!isRecurring) {
        await pool.query(
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, creation_image_url, status, asset_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)`,
            [title, location_id, worker_id, urgency, due_date, description, creationImageUrl, asset_id || null]
        );
        return res.json({ message: "Task created" });
    }

    // --- משימות מחזוריות (לוגיקה משופרת) ---
    const tasksToInsert = [];
    const start = new Date(due_date);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1); // יוצר משימות לשנה קדימה
    
    // המרת ימים למספרים (חשוב מאוד לתיקון הבאג של ימים בשבוע)
    const daysArray = selected_days ? JSON.parse(selected_days).map(d => parseInt(d)) : [];
    const monthlyDate = parseInt(recurring_date);

    // לולאה שעוברת יום-יום
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        let match = false;
        
        if (recurring_type === 'weekly') {
            if (daysArray.includes(d.getDay())) match = true;
        } 
        else if (recurring_type === 'monthly') {
            if (d.getDate() === monthlyDate) match = true;
        } 
        else if (recurring_type === 'yearly') {
            if (d.getMonth() === start.getMonth() && d.getDate() === start.getDate()) match = true;
        }

        if (match) {
            tasksToInsert.push(new Date(d));
        }
    }

    if (tasksToInsert.length === 0) {
        return res.status(400).json({ error: "No dates matched the recurring pattern!" });
    }

    // שמירה בבת אחת (כולל asset_id)
    for (const date of tasksToInsert) {
        await pool.query(
            `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date, description, creation_image_url, status, asset_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)`,
            [title + ' (Recurring)', location_id, worker_id, urgency, date, description, creationImageUrl, asset_id || null]
        );
    }
    
    res.json({ message: `Created ${tasksToInsert.length} recurring tasks` });

  } catch (err) { console.error(err); res.status(500).send('Server Error'); }
});

app.put('/tasks/:id/complete', authenticateToken, upload.single('completion_image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { completion_note } = req.body;
        
        if (!req.file && !completion_note) {
            return res.status(400).json({ error: "Required image or note" });
        }

        const completionImageUrl = req.file ? `https://maintenance-app-h84v.onrender.com/uploads/${req.file.filename}` : null;

        await pool.query(
            `UPDATE tasks SET status = 'WAITING_APPROVAL', completion_note = $1, completion_image_url = $2 WHERE id = $3`,
            [completion_note, completionImageUrl, id]
        );
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

// --- IMPORT / EXPORT / DELETE-ALL ---

app.delete('/tasks/delete-all', authenticateToken, async (req, res) => {
    if (req.user.role !== 'BIG_BOSS') return res.status(403).send("Access denied");
    try {
        await pool.query('DELETE FROM tasks');
        res.json({ message: "All tasks deleted successfully" });
    } catch (e) { res.status(500).send("Error deleting tasks"); }
});

app.get('/tasks/export/advanced', authenticateToken, async (req, res) => {
    try {
        const { worker_id, start_date, end_date } = req.query;
        
        let query = `
            SELECT t.id, t.title, t.description, t.urgency, t.status, t.due_date,
                   u.full_name as worker_name,
                   l.name as location_name,
                   a.name as asset_name, a.code as asset_code,
                   c.name as category_name
            FROM tasks t
            LEFT JOIN users u ON t.worker_id = u.id
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN assets a ON t.asset_id = a.id
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        let pIndex = 1;

        if (worker_id) { query += ` AND t.worker_id = $${pIndex++}`; params.push(worker_id); }
        if (start_date) { query += ` AND t.due_date >= $${pIndex++}`; params.push(start_date); }
        if (end_date) { query += ` AND t.due_date <= $${pIndex++}`; params.push(end_date); }

        query += ` ORDER BY t.due_date DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Export error");
    }
});

// --- IMPORT & VALIDATION ENDPOINT (הגרסה החכמה והגמישה) ---
app.post('/tasks/import-process', authenticateToken, async (req, res) => {
    const { tasks, isDryRun } = req.body; 
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const errors = []; 
        const validTasks = [];

        // 1. טעינת נתוני עזר (ללא location_id בנכסים כדי למנוע קריסה)
        const usersRes = await client.query('SELECT id, full_name FROM users');
        const locationsRes = await client.query('SELECT id, name FROM locations');
        const assetsRes = await client.query('SELECT id, name, code, category_id FROM assets'); // תיקון כאן
        
        // יצירת מילונים לחיפוש מהיר (הופכים הכל לאותיות קטנות להשוואה קלה)
        const usersMap = new Map(usersRes.rows.map(u => [u.full_name.trim().toLowerCase(), u.id]));
        const locMap = new Map(locationsRes.rows.map(l => [l.name.trim().toLowerCase(), l.id]));
        const assetCodeMap = new Map(assetsRes.rows.map(a => [a.code.trim().toLowerCase(), a]));
        const assetNameMap = new Map(assetsRes.rows.map(a => [a.name.trim().toLowerCase(), a]));

        // פונקציית עזר למציאת ערך לפי מספר אפשרויות של כותרות
        const getValue = (row, possibleKeys) => {
            for (const key of possibleKeys) {
                // מחפש את המפתח בדיוק, או באותיות קטנות/גדולות
                const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
                if (foundKey && row[foundKey]) return row[foundKey];
            }
            return null;
        };

        // 2. מעבר על השורות ובדיקה
        for (let i = 0; i < tasks.length; i++) {
            const row = tasks[i];
            const rowErrors = [];
            
            // שליפת נתונים גמישה (תומך גם בעברית וגם באנגלית)
            const title = getValue(row, ['Title', 'Task Title', 'כותרת', 'שם המשימה']);
            const workerName = getValue(row, ['Worker Name', 'Worker', 'Assigned To', 'עובד', 'שם העובד']);
            const locName = getValue(row, ['Location Name', 'Location', 'מיקום']);
            const assetCode = getValue(row, ['Asset Code', 'Code', 'קוד נכס']);
            const assetName = getValue(row, ['Asset Name', 'Asset', 'שם הנכס']);
            const desc = getValue(row, ['Description', 'תיאור']) || '';
            const urgencyRaw = getValue(row, ['Urgency', 'דחיפות']);
            const dateRaw = getValue(row, ['Due Date', 'Date', 'תאריך', 'תאריך יעד']);

            let worker_id = null;
            let location_id = null;
            let asset_id = null;

            // בדיקת כותרת (חובה)
            if (!title) {
                rowErrors.push(`Row ${i + 1}: Missing 'Title' (Task Title)`);
            }

            // בדיקת עובד
            if (workerName) {
                const wName = workerName.toString().trim().toLowerCase();
                if (usersMap.has(wName)) {
                    worker_id = usersMap.get(wName);
                } else {
                    rowErrors.push(`Row ${i + 1}: Worker '${workerName}' not found in system.`);
                }
            } else {
                worker_id = req.user.id; // ברירת מחדל: אני
            }

            // בדיקת נכס
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

            // בדיקת מיקום
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
                    title: title,
                    description: desc,
                    urgency: ['High', 'Urgent', 'גבוהה', 'דחוף'].includes(urgencyRaw) ? 'High' : 'Normal',
                    due_date: dateRaw ? new Date(dateRaw) : new Date(),
                    worker_id,
                    location_id,
                    asset_id
                });
            }
        }

        // 3. סיום: החזרת תשובה
        if (isDryRun) {
            await client.query('ROLLBACK'); // לא שומר כלום בבדיקה
            if (errors.length > 0) {
                return res.json({ success: false, errors, message: "Found blocking errors." });
            } else {
                return res.json({ success: true, message: "Everything seems valid." });
            }
        } else {
            if (errors.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: "Please fix errors.", details: errors });
            }

            // שמירה בפועל
            for (const t of validTasks) {
                await client.query(
                    `INSERT INTO tasks (title, description, urgency, status, due_date, worker_id, asset_id, location_id) 
                     VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7)`,
                    [t.title, t.description, t.urgency, t.due_date, t.worker_id, t.asset_id, t.location_id]
                );
            }
            await client.query('COMMIT');
            res.json({ success: true, message: `Successfully imported ${validTasks.length} tasks.` });
        }

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        // טיפול בשגיאת מיקום ספציפית אם עדיין קורית
        if (e.message.includes('location_id')) {
             res.status(500).json({ error: "Database Error: The system tried to access a missing location field. Check Server Logs." });
        } else {
             res.status(500).json({ error: e.message });
        }
    } finally {
        client.release();
    }
});

// --- 5. Get Tasks for Specific User (Manager View) ---
app.get('/tasks/user/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // בדיקת תפקיד המשתמש הנצפה
        const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) return res.status(404).send("User not found");
        
        const targetRole = userCheck.rows[0].role;
        let whereClause = "";

        if (targetRole === 'MANAGER' || targetRole === 'BIG_BOSS') {
            // אם צופים במנהל -> רואים את המשימות שלו ושל כל העובדים שתחתיו (רקורסיבי)
            whereClause = `WHERE t.worker_id = $1 OR t.worker_id IN (SELECT id FROM users WHERE parent_manager_id = $1)`;
        } else {
            // אם צופים בעובד -> רואים רק את המשימות שלו
            whereClause = `WHERE t.worker_id = $1`;
        }

        const query = `
            SELECT t.*, 
                   l.name as location_name,
                   a.name as asset_name, 
                   u.full_name as worker_name,
                   creator.full_name as manager_name
            FROM tasks t
            LEFT JOIN locations l ON t.location_id = l.id
            LEFT JOIN assets a ON t.asset_id = a.id
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

app.listen(port, () => { console.log(`Server running on ${port}`); });