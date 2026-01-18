import React, { useState, useEffect } from 'react';
import { X, User, RefreshCw, Camera, FileText } from 'lucide-react';

const CreateTaskForm = ({ onTaskCreated, onCancel, currentUser, token, t }) => {
  // סטייט לכל הנתונים
  const [formData, setFormData] = useState({
    title: '', 
    urgency: 'Normal', 
    due_date: new Date().toISOString().split('T')[0],
    location_id: '', 
    assigned_worker_id: currentUser?.role === 'EMPLOYEE' ? currentUser.id : '',
    description: '', 
    is_recurring: false, 
    recurring_type: 'weekly', 
    selected_days: [], 
    recurring_date: 1
  });

  const [file, setFile] = useState(null); // לתמונה
  const [locations, setLocations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // מערך ימי השבוע - משתמש בתרגום (t)
  const daysOfWeek = [
      { id: 0, label: t.day_0 }, { id: 1, label: t.day_1 }, { id: 2, label: t.day_2 }, 
      { id: 3, label: t.day_3 }, { id: 4, label: t.day_4 }, { id: 5, label: t.day_5 }, { id: 6, label: t.day_6 }
  ];

  // טעינת נתונים (מיקומים ועובדים)
  useEffect(() => {
    fetch('https://maintenance-app-h84v.onrender.com/locations', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(setLocations)
        .catch(err => console.error("Error fetching locations", err));

    if (currentUser?.role !== 'EMPLOYEE') {
        fetch('https://maintenance-app-h84v.onrender.com/users', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(setTeamMembers)
        .catch(err => console.error("Error fetching users", err));
    }
  }, [token, currentUser]);

  const toggleDay = (dayId) => {
    setFormData(prev => ({ 
        ...prev, 
        selected_days: prev.selected_days.includes(dayId) 
            ? prev.selected_days.filter(d => d !== dayId) 
            : [...prev.selected_days, dayId] 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // יצירת FormData (כדי לתמוך בהעלאת קבצים)
    const data = new FormData();
    
    Object.keys(formData).forEach(key => {
        if (key === 'selected_days') {
            data.append(key, JSON.stringify(formData[key]));
        } else {
            data.append(key, formData[key]);
        }
    });

    if (file) {
        data.append('task_image', file);
    }

    try {
      const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      if (res.ok) { 
          alert(t.save + '!'); // הודעה מתורגמת
          onTaskCreated(); 
      } else { 
          alert('Error creating task'); 
      }
    } catch (err) { 
        alert('Server Error'); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg h-auto max-h-[90vh] overflow-y-auto shadow-2xl">
        
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-[#6A0DAD]">{t.create_new_task}</h2>
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* כותרת */}
            <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">{t.task_title_label}</label>
                <input required className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none" 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder={t.task_title_placeholder}
                />
            </div>
            
            {/* תיאור */}
            <div>
                <label className="block text-sm font-bold mb-1 flex gap-2 text-gray-700"><FileText size={16}/> {t.description_label}</label>
                <textarea className="w-full p-3 border rounded-lg bg-gray-50 h-24 resize-none focus:ring-2 focus:ring-purple-200 outline-none" 
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder={t.description_placeholder}
                />
            </div>

            {/* תמונה */}
            <div>
                <label className="block text-sm font-bold mb-1 flex gap-2 text-gray-700"><Camera size={16}/> {t.add_image}</label>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} 
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer" 
                />
            </div>

            {/* בחירת עובד (למנהלים בלבד) */}
            {currentUser?.role !== 'EMPLOYEE' && (
                <div>
                    <label className="block text-sm font-bold mb-1 flex items-center gap-1 text-gray-700"><User size={14}/> {t.assign_to_label}</label>
                    <select className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none" 
                        value={formData.assigned_worker_id} onChange={e => setFormData({...formData, assigned_worker_id: e.target.value})}>
                        <option value={currentUser.id}>{t.assign_self}</option>
                        {teamMembers.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.full_name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* מיקום ודחיפות */}
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-bold mb-1 text-gray-700">{t.location}</label>
                    <select required className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none" 
                        value={formData.location_id} onChange={e => setFormData({...formData, location_id: e.target.value})}>
                        <option value="">{t.select_location}</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-bold mb-1 text-gray-700">{t.urgency_label}</label>
                    <select className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none" 
                        value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
                        <option value="Normal">{t.normal_label}</option>
                        <option value="High">{t.urgent_label}</option>
                        <option value="Low">{t.low_label}</option>
                    </select>
                </div>
            </div>

            {/* תאריך */}
            <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">{t.date_label}</label>
                <input type="date" required className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none" 
                    value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} 
                />
            </div>

            {/* מחזוריות */}
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 transition-all">
                <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="recurring" className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        checked={formData.is_recurring} onChange={e => setFormData({...formData, is_recurring: e.target.checked})} 
                    />
                    <label htmlFor="recurring" className="font-bold text-purple-900 flex items-center gap-2 cursor-pointer select-none">
                        <RefreshCw size={16}/> {t.recurring_task}
                    </label>
                </div>

                {formData.is_recurring && (
                    <div className="space-y-4 animate-fade-in pl-7">
                        <select className="w-full p-2 border rounded-lg bg-white text-sm" 
                            value={formData.recurring_type} onChange={e => setFormData({...formData, recurring_type: e.target.value})}>
                            <option value="weekly">{t.recurring_weekly}</option>
                            <option value="monthly">{t.recurring_monthly}</option>
                        </select>

                        {formData.recurring_type === 'weekly' ? (
                            <div className="flex justify-between gap-2">
                                {daysOfWeek.map(day => (
                                    <button type="button" key={day.id} 
                                        onClick={() => toggleDay(day.id)} 
                                        className={`w-9 h-9 rounded-full text-xs font-bold transition-all shadow-sm ${
                                            formData.selected_days.includes(day.id) 
                                            ? 'bg-purple-600 text-white scale-110 ring-2 ring-purple-300' 
                                            : 'bg-white border text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-700 bg-white p-2 rounded border w-fit">
                                <input type="number" min="1" max="31" className="w-12 p-1 border rounded text-center font-bold" 
                                    value={formData.recurring_date} onChange={e => setFormData({...formData, recurring_date: e.target.value})} 
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button type="submit" className="w-full py-3.5 bg-[#6A0DAD] text-white rounded-xl font-bold shadow-lg hover:bg-purple-800 transition transform active:scale-95 text-lg">
                {t.save_task_btn}
            </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskForm;