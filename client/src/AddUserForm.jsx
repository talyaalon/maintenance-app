import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const AddUserForm = ({ currentUser, onClose, t }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    parent_manager_id: currentUser.role === 'MANAGER' ? currentUser.id : '',
    preferred_language: 'he'
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
        setMessage(t.user_created_success || "User created successfully!");
        setTimeout(() => { onClose(); }, 1000);
      } else {
        setMessage(responseData.error || t.error_create_user || "Error creating user");
        setIsSubmitting(false);
      }
    } catch (err) {
      setMessage(t.server_error || "Server error");
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full p-3 bg-gray-50 rounded-lg border border-gray-200 focus:border-[#714B67]/50 focus:ring-2 focus:ring-[#714B67]/20 outline-none transition-all text-gray-800";
  const labelClass = "block text-sm font-bold text-gray-600 mb-1.5";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-[#714B67]">{t.add_new_user_title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X size={20}/>
          </button>
        </div>

        {message && (
          <div className={`p-3 mb-4 rounded-lg text-sm ${message.includes('Error') || message.includes('שגיאה') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

          <div>
            <label className={labelClass}>{t.full_name_label || "Full Name"}</label>
            <input
              type="text"
              required
              className={inputClass}
              placeholder={t.full_name_label}
              onChange={e => setFormData({...formData, full_name: e.target.value})}
            />
          </div>

          <div>
            <label className={labelClass}>{t.email_label || "Email"}</label>
            <input
              type="email"
              required
              autoComplete="new-password"
              className={inputClass}
              placeholder="name@example.com"
              onChange={e => setFormData({...formData, email: e.target.value})}
              dir="ltr"
            />
          </div>

          <div>
            <label className={labelClass}>{t.password_label || "Password"}</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
              placeholder="••••••••"
              onChange={e => setFormData({...formData, password: e.target.value})}
              dir="ltr"
            />
          </div>

          <div>
            <label className={labelClass}>{t.preferred_language || "Language"}</label>
            <select
              className={inputClass}
              value={formData.preferred_language}
              onChange={e => setFormData({...formData, preferred_language: e.target.value})}
            >
              <option value="he">עברית (Hebrew)</option>
              <option value="en">English</option>
              <option value="th">ภาษาไทย (Thai)</option>
            </select>
          </div>

          {currentUser.role === 'BIG_BOSS' && (
            <div>
              <label className={labelClass}>{t.role_label || "Role"}</label>
              <select
                className={inputClass}
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="EMPLOYEE">{t.role_employee}</option>
                <option value="MANAGER">{t.role_manager}</option>
              </select>
            </div>
          )}

          {(currentUser.role === 'BIG_BOSS' && formData.role === 'EMPLOYEE') && (
            <div>
              <label className={labelClass}>{t.assign_to_manager || "Assign to Manager"}</label>
              <select
                className={inputClass}
                required
                onChange={e => setFormData({...formData, parent_manager_id: e.target.value})}
              >
                <option value="">{t.select_manager}...</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium transition">
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#714B67] hover:bg-[#5a3b52] text-white rounded-lg font-bold disabled:opacity-50 transition"
            >
              {isSubmitting ? (t.creating || 'Creating...') : (t.create_btn || 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserForm;
