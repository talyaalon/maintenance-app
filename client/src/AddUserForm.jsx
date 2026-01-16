import React, { useState, useEffect } from 'react';

const AddUserForm = ({ currentUser, onClose }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    parent_manager_id: currentUser.role === 'MANAGER' ? currentUser.id : ''
  });
  
  const [managers, setManagers] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentUser.role === 'BIG_BOSS') {
      const fetchManagers = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:3001/managers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setManagers(data);
      };
      fetchManagers();
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    // --- התיקון: ניקוי הנתונים לפני השליחה ---
    // אם המזהה של המנהל הוא ריק (מחרוזת ריקה), נהפוך אותו ל-null
    // זה מונע את השגיאה ב-PostgreSQL
    const dataToSend = {
        ...formData,
        parent_manager_id: formData.parent_manager_id === '' ? null : formData.parent_manager_id
    };

    try {
      const res = await fetch('http://localhost:3001/users', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend) // שולחים את המידע המתוקן
      });
      
      if (res.ok) {
        setMessage('משתמש נוצר בהצלחה!');
        setTimeout(onClose, 1500);
      } else {
        // קריאת הודעת השגיאה המדויקת מהשרת (יעזור לנו להבין אם האימייל תפוס)
        const errorData = await res.json();
        setMessage(errorData.error || 'שגיאה ביצירת משתמש');
      }
    } catch (err) {
      setMessage('שגיאת שרת');
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" dir="rtl">
        <h2 className="text-xl font-bold mb-4 text-purple-700">הוספת איש צוות חדש</h2>
        
        {message && <div className="bg-green-100 text-green-700 p-2 mb-2 rounded">{message}</div>}

        {/* הוספנו autoComplete="off" לטופס עצמו כדי לנסות למנוע השלמות */}
        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
          
          <input 
            type="text" 
            placeholder="שם מלא" 
            required
            className="w-full p-2 border rounded"
            onChange={e => setFormData({...formData, full_name: e.target.value})}
          />
          
          {/* תיקון: הוספת autoComplete="new-email" או "off" */}
          <input 
            type="email" 
            placeholder="אימייל" 
            required
            autoComplete="new-password" 
            className="w-full p-2 border rounded"
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          
          {/* תיקון: הוספת autoComplete="new-password" */}
          <input 
            type="password" 
            placeholder="סיסמה ראשונית" 
            required
            autoComplete="new-password" 
            className="w-full p-2 border rounded"
            onChange={e => setFormData({...formData, password: e.target.value})}
          />

          {currentUser.role === 'BIG_BOSS' && (
            <div>
              <label className="block text-sm font-bold mb-1">תפקיד:</label>
              <select 
                className="w-full p-2 border rounded"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="EMPLOYEE">עובד רגיל</option>
                <option value="MANAGER">מנהל אזור</option>
              </select>
            </div>
          )}

          {currentUser.role === 'BIG_BOSS' && formData.role === 'EMPLOYEE' && (
            <div>
              <label className="block text-sm font-bold mb-1">שייך למנהל:</label>
              <select 
                className="w-full p-2 border rounded"
                required
                onChange={e => setFormData({...formData, parent_manager_id: e.target.value})}
              >
                <option value="">בחר מנהל...</option>
                {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded">ביטול</button>
            <button type="submit" className="flex-1 py-2 bg-purple-700 text-white rounded">צור משתמש</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserForm;