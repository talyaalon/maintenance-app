// server/index.js - הקובץ המלא והסופי
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// ספריות לניהול קבצים, אקסל ונתיבים
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path'); // ספרייה מובנית לטיפול בנתיבים

const app = express();
const port = 3001;
const SECRET_KEY = 'my_super_secret_key';

// --- הגדרת שמירת קבצים משודרגת (כדי לשמור סיומת קובץ .jpg/.png) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    // יצירת התיקייה אם היא לא קיימת
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // נותן לקובץ שם ייחודי עם תאריך כדי למנוע כפילויות
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// --- שורה קריטית: חשיפת תיקיית התמונות לדפדפן ---
// זה מאפשר לראות את התמונות בכתובת http://localhost:3001/uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1', // כתובת IP לביצועים טובים יותר בווינדוס
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

// --- התחברות (Login) - מעודכן ---
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
    
    // מחזירים גם את תמונת הפרופיל
    res.json({ 
        token, 
        user: { 
            id: user.id, 
            name: user.full_name, 
            role: user.role,
            email: user.email,
            profile_picture_url: user.profile_picture_url // חדש
        } 
    });
  } catch (err) {
    res.status(500).json({ error: "שגיאת שרת" });
  }
});

// --- מסלול חדש: עדכון פרופיל משתמש ---
app.put('/users/profile', authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, password } = req.body;
        let profilePictureUrl = req.body.existing_picture; // אם לא הועלתה תמונה חדשה

        // אם הועלה קובץ חדש, נעדכן את הנתיב
        if (req.file) {
            profilePictureUrl = `http://localhost:3001/uploads/${req.file.filename}`;
        }

        let query;
        let params;

        // בודקים אם צריך לעדכן סיסמה
        if (password && password.trim() !== '') {
            query = `UPDATE users SET full_name = $1, email = $2, password_hash = $3, profile_picture_url = $4 WHERE id = $5 RETURNING id, full_name, email, role, profile_picture_url`;
            params = [full_name, email, password, profilePictureUrl, userId];
        } else {
            query = `UPDATE users SET full_name = $1, email = $2, profile_picture_url = $3 WHERE id = $4 RETURNING id, full_name, email, role, profile_picture_url`;
            params = [full_name, email, profilePictureUrl, userId];
        }

        const result = await pool.query(query, params);
        
        // החזרת המשתמש המעודכן
        const updatedUser = result.rows[0];
        res.json({ 
            success: true, 
            user: {
                id: updatedUser.id,
                name: updatedUser.full_name,
                email: updatedUser.email,
                role: updatedUser.role,
                profile_picture_url: updatedUser.profile_picture_url
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Update failed");
    }
});


// --- ניהול מיקומים ---

// 1. קבלת כל המיקומים
app.get('/locations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// 2. יצירת מיקום חדש
app.post('/locations', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO locations (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// 3. מחיקת מיקום
app.delete('/locations/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tasks WHERE location_id = $1', [id]); 
        await pool.query('DELETE FROM locations WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- משימות ---

app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = `
      SELECT tasks.*, users.full_name as worker_name, locations.name as location_name 
      FROM tasks 
      LEFT JOIN users ON tasks.worker_id = users.id 
      LEFT JOIN locations ON tasks.location_id = locations.id
    `;
    let params = [];

    if (role === 'EMPLOYEE') {
      query += ' WHERE worker_id = $1';
      params.push(id);
    }
    
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

app.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, urgency, due_date, location_id } = req.body; 
    
    // מציאת עובד ברירת מחדל
    const workerRes = await pool.query('SELECT id FROM users LIMIT 1');
    const worker_id = workerRes.rows[0]?.id;

    if (!location_id) return res.status(400).json({ error: "חובה לבחור מיקום" });

    const newJob = await pool.query(
      `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, location_id, worker_id, urgency, due_date]
    );
    res.json(newJob.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// --- יבוא אקסל (Bulk Import) ---
app.post('/tasks/import', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        for (const row of data) {
            const locationRes = await pool.query('SELECT id FROM locations LIMIT 1');
            const workerRes = await pool.query('SELECT id FROM users LIMIT 1');
            const dueDate = row.DueDate ? new Date(row.DueDate) : new Date();

            await pool.query(
                `INSERT INTO tasks (title, location_id, worker_id, urgency, due_date) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    row.Title || 'משימה מיובאת', 
                    locationRes.rows[0].id, 
                    workerRes.rows[0].id, 
                    row.Urgency || 'Normal', 
                    dueDate
                ]
            );
        }
        
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Import successful' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error processing Excel');
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

app.post('/users', authenticateToken, async (req, res) => {
  const { full_name, email, password, role, parent_manager_id } = req.body;
  if (req.user.role === 'EMPLOYEE') return res.status(403).json({ error: "אין הרשאה" });

  try {
    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, parent_manager_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role`,
      [full_name, email, password, role, parent_manager_id]
    );
    res.json(newUser.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "שגיאה ביצירת משתמש" });
  }
});

app.delete('/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role === 'EMPLOYEE') return res.status(403).send("Unauthorized");
    
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM tasks WHERE worker_id = $1 OR manager_id = $1', [id]);
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});