// server/index.js - הקובץ הסופי עם תיקון מחיקת מנהל שיצר מיקומים
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

// --- הגדרת המייל (Gmail) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maintenance.app.tkp@gmail.com', 
    pass: 'xwyrwclaazvoiopm'     
  },
  tls: {
    rejectUnauthorized: false 
  }
});

// --- פונקציית שליחת המייל (IP מעודכן) ---
const sendWelcomeEmail = async (email, fullName, password, role, managerName) => {
    console.log(`Attempting to send email to: ${email} (Role: ${role})...`);

    const appLink = "http://192.168.0.106:3000"; 

    let titleText = '';
    let descriptionText = '';
    let featuresList = '';
    let managerInfo = '';

    if (role === 'MANAGER' || role === 'BIG_BOSS') {
        titleText = `ברכות על הצטרפותך לצוות הניהול! 💼`;
        descriptionText = `כמנהל/ת במערכת, נפתח עבורך חשבון עם הרשאות מורחבות.`;
        featuresList = `
            <ul style="color: #555; padding-right: 20px;">
                <li>👥 <strong>ניהול צוות:</strong> הוספה וניהול של עובדים.</li>
                <li>📋 <strong>יצירת משימות:</strong> פתיחת קריאות שירות.</li>
                <li>👀 <strong>בקרה:</strong> מעקב סטטוס בזמן אמת.</li>
            </ul>
        `;
    } else {
        titleText = `שמחים שאת/ה איתנו! 🛠️`;
        descriptionText = `נפתח עבורך משתמש באפליקציה לקבלת משימות ועדכונים.`;
        
        if (managerName) {
            managerInfo = `
                <div style="background-color: #eef2ff; padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px solid #c7d2fe;">
                    <p style="margin: 0; color: #3730a3; font-weight: bold;">👤 המנהל הישיר שלך:</p>
                    <p style="margin: 5px 0 0 0; color: #1e1b4b; font-size: 16px;">${managerName}</p>
                </div>
            `;
        }

        featuresList = `
            <ul style="color: #555; padding-right: 20px;">
                <li>✅ <strong>צפייה במשימות:</strong> כל המשימות שלך במקום אחד.</li>
                <li>📍 <strong>עדכונים מהשטח:</strong> עדכון סטטוסים בלחיצת כפתור.</li>
            </ul>
        `;
    }

    const mailOptions = {
      from: 'Maintenance App <maintenance.app.tkp@gmail.com>',
      to: email,
      subject: 'פרטי התחברות למערכת ניהול אחזקה',
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #e0e0e0;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #6A0DAD; margin: 0;">ניהול אחזקה</h1>
          </div>
          <div style="background-color: white; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-top: 0;">שלום ${fullName},</h2>
            <h3 style="color: #6A0DAD; margin-top: 5px;">${titleText}</h3>
            <p style="color: #555;">${descriptionText}</p>
            ${managerInfo}
            ${featuresList}
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #6A0DAD;">
              <p style="margin: 5px 0;"><strong>📧 אימייל:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>🔑 סיסמה:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px;">${password}</span></p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${appLink}" style="background-color: #6A0DAD; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">כניסה למערכת</a>
            </div>
             <p style="font-size: 12px; color: #888; text-align: center; margin-top: 15px;">
              * נא לשנות סיסמה בכניסה הראשונה.
            </p>
          </div>
        </div>
      `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully');
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
};

// --- הגדרת שמירת קבצים ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
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

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'maintenance_management_app',
  password: '1234', 
  port: 5432,
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

// --- התחברות (Login) ---
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: "משתמש לא נמצא" });

    const user = result.rows[0];
    if (password !== user.password_hash) return res.status(400).json({ error: "סיסמה שגויה" });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.full_name }, 
      SECRET_KEY, 
      { expiresIn: '24h' }
    );
    
    res.json({ 
        token, 
        user: { 
            id: user.id, 
            name: user.full_name, 
            role: user.role,
            email: user.email,
            profile_picture_url: user.profile_picture_url 
        } 
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאת שרת" });
  }
});

// --- עדכון פרופיל אישי ---
app.put('/users/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, password } = req.body;
        let profilePictureUrl = req.body.existing_picture; 

        if (req.file) {
            profilePictureUrl = `http://192.168.0.106:3001/uploads/${req.file.filename}`;
        }

        let query, params;

        if (password && password.trim() !== '') {
            query = `UPDATE users SET full_name = $1, email = $2, password_hash = $3, profile_picture_url = $4 WHERE id = $5 RETURNING id, full_name, email, role, profile_picture_url`;
            params = [full_name, email, password, profilePictureUrl, userId];
        } else {
            query = `UPDATE users SET full_name = $1, email = $2, profile_picture_url = $3 WHERE id = $4 RETURNING id, full_name, email, role, profile_picture_url`;
            params = [full_name, email, profilePictureUrl, userId];
        }

        const result = await pool.query(query, params);
        const updatedUser = result.rows[0];
        
        res.json({ success: true, user: updatedUser });

    } catch (err) {
        console.error(err);
        res.status(500).send("Update failed");
    }
});

// --- ניהול משתמשים ---

app.get('/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.full_name, u.email, u.role, u.parent_manager_id, u.profile_picture_url, m.full_name as manager_name
            FROM users u
            LEFT JOIN users m ON u.parent_manager_id = m.id
            ORDER BY u.role, u.full_name
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// יצירת משתמש חדש
app.post('/users', authenticateToken, async (req, res) => {
  const { full_name, email, password, role, parent_manager_id } = req.body;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: "אימייל לא תקין" });
  if (req.user.role === 'EMPLOYEE') return res.status(403).json({ error: "אין הרשאה" });

  try {
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, parent_manager_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role`,
      [full_name, email, password, role, parent_manager_id]
    );

    let managerName = null;
    if (role === 'EMPLOYEE' && parent_manager_id) {
        const managerRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [parent_manager_id]);
        if (managerRes.rows.length > 0) {
            managerName = managerRes.rows[0].full_name;
        }
    }
    
    sendWelcomeEmail(email, full_name, password, role, managerName);
    res.json(newUser.rows[0]);

  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: "האימייל קיים במערכת" });
    res.status(500).json({ error: "שגיאה ביצירת משתמש" });
  }
});

// עריכת משתמש אחר
app.put('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    const { id } = req.params;
    const { full_name, email, password } = req.body;
    
    console.log(`Updating user ${id} with:`, req.body); 

    try {
        let query, params;
        if (password && password.trim() !== "") {
            query = 'UPDATE users SET full_name = $1, email = $2, password_hash = $3 WHERE id = $4 RETURNING *';
            params = [full_name, email, password, id];
        } else {
            query = 'UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING *';
            params = [full_name, email, id];
        }
        const result = await pool.query(query, params);
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).send("Error updating user");
    }
});

// server/index.js - מחיקת משתמש (כולל ניקוי יסודי של עובדים תחתיו)
app.delete('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    
    try {
      const { id } = req.params;
      console.log(`Attempting to delete user hierarchy for ID: ${id}...`);

      // 1. קודם כל, ננתק את המנהל ממיקומים שהוא יצר (כדי לא לשבור את טבלת Locations)
      await pool.query('UPDATE locations SET created_by = NULL WHERE created_by = $1', [id]);

      // --- כאן מתחיל הניקוי של העובדים שתחתיו ---

      // 2. מחיקת המשימות של כל העובדים שכפופים למנהל הזה
      await pool.query(`
        DELETE FROM tasks 
        WHERE worker_id IN (SELECT id FROM users WHERE parent_manager_id = $1)
      `, [id]);

      // 3. מחיקת העובדים עצמם (שכפופים למנהל הזה)
      await pool.query('DELETE FROM users WHERE parent_manager_id = $1', [id]);

      // --- עכשיו מטפלים במנהל עצמו ---

      // 4. מחיקת המשימות של המנהל עצמו (אם יש לו משימות אישיות)
      await pool.query('DELETE FROM tasks WHERE worker_id = $1', [id]);

      // 5. ולבסוף - מחיקת המנהל עצמו
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      
      console.log(`User hierarchy deleted successfully for ID: ${id}`);
      res.json({ success: true });

    } catch (err) {
      console.error("CRITICAL ERROR deleting user:", err);
      res.status(500).json({ error: "תקלה במחיקת המשתמש והצוות שלו" });
    }
});

app.get('/managers', authenticateToken, async (req, res) => {
  try {
    const managers = await pool.query("SELECT id, full_name FROM users WHERE role = 'MANAGER' OR role = 'BIG_BOSS'");
    res.json(managers.rows);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// --- ניהול מיקומים ומשימות ---

app.get('/locations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/locations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('INSERT INTO locations (name, created_by) VALUES ($1, $2) RETURNING *', [req.body.name, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.delete('/locations/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    try {
        await pool.query('DELETE FROM tasks WHERE location_id = $1', [req.params.id]); 
        await pool.query('DELETE FROM locations WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).send('Server Error'); }
});

app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = `SELECT tasks.*, users.full_name as worker_name, locations.name as location_name FROM tasks LEFT JOIN users ON tasks.worker_id = users.id LEFT JOIN locations ON tasks.location_id = locations.id`;
    let params = [];
    if (role === 'EMPLOYEE') { query += ' WHERE worker_id = $1'; params.push(id); }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, urgency, due_date, location_id } = req.body; 
    const workerRes = await pool.query('SELECT id FROM users LIMIT 1');
    const newJob = await pool.query(`INSERT INTO tasks (title, location_id, worker_id, urgency, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [title, location_id, workerRes.rows[0]?.id, urgency, due_date]);
    res.json(newJob.rows[0]);
  } catch (err) { res.status(500).send('Server Error'); }
});

app.post('/tasks/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    try {
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        for (const row of data) {
            const loc = await pool.query('SELECT id FROM locations LIMIT 1');
            const usr = await pool.query('SELECT id FROM users LIMIT 1');
            await pool.query(`INSERT INTO tasks (title, location_id, worker_id, urgency, due_date) VALUES ($1, $2, $3, $4, $5)`, [row.Title || 'Imported', loc.rows[0].id, usr.rows[0].id, row.Urgency || 'Normal', row.DueDate ? new Date(row.DueDate) : new Date()]);
        }
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import successful' });
    } catch (err) { res.status(500).send('Error processing Excel'); }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});