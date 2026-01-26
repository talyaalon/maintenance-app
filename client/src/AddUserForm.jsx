import React, { useState, useEffect } from 'react';

const AddUserForm = ({ currentUser, onClose, t }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    parent_manager_id: currentUser.role === 'MANAGER' ? currentUser.id : ''
  });
  
  const [managers, setManagers] = useState([]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); 

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
    setIsSubmitting(true); 
    const token = localStorage.getItem('token');
    
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
        // תרגום: משתמש נוצר בהצלחה
        setMessage(t.user_created_success || "User created successfully!");
        
        setTimeout(() => {
            onClose(); 
        }, 1000);
      } else {
        // תרגום: שגיאה ביצירה
        setMessage(responseData.error || t.error_create_user || "Error creating user");
        setIsSubmitting(false);
      }
    } catch (err) {
      setMessage(t.server_error || "Server error");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      {/* תרגום: כיוון הטקסט נקבע אוטומטית לפי ההורה */}
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        {/* תרגום: כותרת הוספת עובד */}
        <h2 className="text-xl font-bold mb-4 text-purple-700">{t.add_new_user_title}</h2>
        
        {message && <div className={`p-2 mb-2 rounded ${message.includes('Error') || message.includes('שגיאה') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
          
          <input 
            type="text" 
            placeholder={t.full_name_label} // תרגום: שם מלא
            required
            className="w-full p-2 border rounded"
            onChange={e => setFormData({...formData, full_name: e.target.value})}
          />
          
          <input 
            type="email" 
            placeholder={t.email_label} // תרגום: אימייל
            required
            autoComplete="new-password" 
            className="w-full p-2 border rounded"
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          
          <input 
            type="password" 
            placeholder={t.password_label} // תרגום: סיסמה
            required
            autoComplete="new-password" 
            className="w-full p-2 border rounded"
            onChange={e => setFormData({...formData, password: e.target.value})}
          />

          {currentUser.role === 'BIG_BOSS' && (
            <div>
              {/* תרגום: תפקיד */}
              <label className="block text-sm font-bold mb-1">{t.role_label}:</label>
              <select 
                className="w-full p-2 border rounded"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="EMPLOYEE">{t.role_employee}</option> {/* עובד רגיל */}
                <option value="MANAGER">{t.role_manager}</option>   {/* מנהל */}
              </select>
            </div>
          )}

          {(currentUser.role === 'BIG_BOSS' && formData.role === 'EMPLOYEE') && (
            <div>
              {/* תרגום: שייך למנהל */}
              <label className="block text-sm font-bold mb-1">{t.assign_to_manager}:</label>
              <select 
                className="w-full p-2 border rounded"
                required
                onChange={e => setFormData({...formData, parent_manager_id: e.target.value})}
              >
                <option value="">{t.select_manager}...</option> {/* בחר מנהל */}
                {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded hover:bg-gray-50">{t.cancel}</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 bg-purple-700 text-white rounded hover:#5a3b52 disabled:opacity-50">
                {isSubmitting ? (t.creating || 'Creating...') : (t.create_btn || 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserForm;