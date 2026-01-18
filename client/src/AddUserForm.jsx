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
  const [isSubmitting, setIsSubmitting] = useState(false); // כדי למנוע לחיצות כפולות

  useEffect(() => {
    if (currentUser.role === 'BIG_BOSS') {
      const fetchManagers = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('https://maintenance-app-h84v.onrender.com/managers', {
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
    setIsSubmitting(true); // נועל את הכפתור
    const token = localStorage.getItem('token');
    
    // תיקון למקרה של מחרוזת ריקה במנהל
    const dataToSend = {
        ...formData,
        parent_manager_id: formData.parent_manager_id === '' ? null : formData.parent_manager_id
    };

    try {
      const res = await fetch('https://maintenance-app-h84v.onrender.com/users', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });
      
      const responseData = await res.json();

      if (res.ok) {
        setMessage('משתמש נוצר בהצלחה!');
        // המתנה קצרה כדי שיראו את ההודעה הירוקה, ואז סגירה
        setTimeout(() => {
            onClose(); // <--- הקריאה הזו גורמת לרענון ב-App.js
        }, 1000);
      } else {
        setMessage(responseData.error || 'שגיאה ביצירת משתמש');
        setIsSubmitting(false);
      }
    } catch (err) {
      setMessage('שגיאת שרת');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" dir="rtl">
        <h2 className="text-xl font-bold mb-4 text-purple-700">הוספת איש צוות חדש</h2>
        
        {message && <div className={`p-2 mb-2 rounded ${message.includes('שגיאה') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
          
          <input 
            type="text" 
            placeholder="שם מלא" 
            required
            className="w-full p-2 border rounded"
            onChange={e => setFormData({...formData, full_name: e.target.value})}
          />
          
          <input 
            type="email" 
            placeholder="אימייל" 
            required
            autoComplete="new-password" 
            className="w-full p-2 border rounded"
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          
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

          {(currentUser.role === 'BIG_BOSS' && formData.role === 'EMPLOYEE') && (
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
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded hover:bg-gray-50">ביטול</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 disabled:opacity-50">
                {isSubmitting ? 'יוצר...' : 'צור משתמש'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserForm;