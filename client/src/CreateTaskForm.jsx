import React, { useState, useEffect } from 'react';
import { X, User, RefreshCw, Camera, FileText, Box } from 'lucide-react';

const CreateTaskForm = ({ onTaskCreated, onCancel, currentUser, token, t }) => {
  // סטייט לכל הנתונים (הוספתי שדות לטיפול בשנתי/חודשי)
  const [formData, setFormData] = useState({
    title: '', 
    urgency: 'Normal', 
    due_date: new Date().toISOString().split('T')[0],
    location_id: '', 
    asset_id: '', 
    assigned_worker_id: currentUser?.role === 'EMPLOYEE' ? currentUser.id : '',
    description: '', 
    is_recurring: false, 
    recurring_type: 'weekly', // weekly, monthly, yearly
    selected_days: [], 
    recurring_date: 1, // יום בחודש (1-31)
    recurring_month: 0 // חודש בשנה (0-11) - חדש!
  });

  const [file, setFile] = useState(null); 
  const [locations, setLocations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // נתונים לנכסים
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(''); 

  // שמות ימים קצרים קבועים (כדי שהעיגולים יראו טוב)
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // שמות חודשים
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // טעינת נתונים (מהקוד המקורי שלך)
  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. מיקומים
    fetch('https://maintenance-app-h84v.onrender.com/locations', { headers })
        .then(res => res.json())
        .then(setLocations)
        .catch(err => console.error("Error fetching locations", err));

    // 2. קטגוריות ונכסים
    fetch('https://maintenance-app-h84v.onrender.com/categories', { headers })
        .then(res => res.json())
        .then(setCategories)
        .catch(err => console.error("Error fetching categories", err));

    fetch('https://maintenance-app-h84v.onrender.com/assets', { headers })
        .then(res => res.json())
        .then(setAssets)
        .catch(err => console.error("Error fetching assets", err));

    // 3. עובדים (רק למנהלים)
    if (currentUser?.role !== 'EMPLOYEE') {
        fetch('https://maintenance-app-h84v.onrender.com/users', { headers })
        .then(res => res.json())
        .then(setTeamMembers)
        .catch(err => console.error("Error fetching users", err));
    }
  }, [token, currentUser]);

  // סינון נכסים לפי קטגוריה
  const filteredAssets = selectedCategory 
      ? assets.filter(a => a.category_id === parseInt(selectedCategory))
      : [];

  // בחירת ימים בשבוע
  const toggleDay = (dayIndex) => {
    setFormData(prev => ({ 
        ...prev, 
        selected_days: prev.selected_days.includes(dayIndex) 
            ? prev.selected_days.filter(d => d !== dayIndex) 
            : [...prev.selected_days, dayIndex] 
    }));
  };

  // שליחת הטופס
  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
          alert((t.save || "Saved") + '!'); 
          onTaskCreated(); 
      } else { 
          alert(t.error_create_task || 'Error creating task'); 
      }
    } catch (err) { 
        alert(t.server_error || 'Server Error'); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg h-auto max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        
        {/* כותרת */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-[#6A0DAD]">{t.create_new_task || "Create New Task"}</h2>
            <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* --- חלק 1: בחירת נכס (מקורי שלך) --- */}
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 space-y-3">
                <h3 className="font-bold text-purple-900 text-sm flex items-center gap-2">
                    <Box size={16}/> {t.select_asset_title || "Select Asset (Optional)"}
                </h3>
                
                {/* בחירת קטגוריה */}
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t.category_label || "Category"}</label>
                    <select className="w-full p-2 border rounded bg-white text-sm" 
                        value={selectedCategory} 
                        onChange={e => { setSelectedCategory(e.target.value); setFormData({...formData, asset_id: ''}); }}
                    >
                        <option value="">-- {t.select_category || "Select Category"} --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* בחירת נכס */}
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">{t.specific_asset_label || "Specific Asset"}</label>
                    <select className="w-full p-2 border rounded bg-white text-sm" 
                        disabled={!selectedCategory}
                        value={formData.asset_id} 
                        onChange={e => setFormData({...formData, asset_id: e.target.value})}
                    >
                        <option value="">
                             {selectedCategory 
                                ? (filteredAssets.length ? `-- ${t.select_asset || "Select Asset"} --` : (t.no_assets_in_category || "No assets")) 
                                : `-- ${t.select_category_first || "Select category first"} --`}
                        </option>
                        {filteredAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                    </select>
                </div>
            </div>

            {/* --- חלק 2: פרטי משימה רגילים --- */}
            <div>
                <label className="block text-sm font-bold mb-1 text-gray-700">{t.task_title_label}</label>
                <input required className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none" 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder={t.task_title_placeholder || "e.g., Fix AC"}
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
                <label className="block text-sm font-bold mb-1 flex gap-2 text-gray-700"><Camera size={16}/> {t.add_image || "Add Photo"}</label>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} 
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer" 
                />
            </div>

            {/* בחירת עובד */}
            {currentUser?.role !== 'EMPLOYEE' && (
                <div>
                    <label className="block text-sm font-bold mb-1 flex items-center gap-1 text-gray-700"><User size={14}/> {t.assign_to_label || "Assign To"}</label>
                    <select className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none" 
                        value={formData.assigned_worker_id} onChange={e => setFormData({...formData, assigned_worker_id: e.target.value})}>
                        <option value={currentUser.id}>{t.assign_self || "Assign to myself"}</option>
                        {teamMembers.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name}</option>
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
                        <option value="">{t.select_location || "Select Location"}</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-bold mb-1 text-gray-700">{t.urgency_label}</label>
                    <select className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-purple-200 outline-none" 
                        value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
                        <option value="Normal">{t.normal_label}</option>
                        <option value="High">{t.urgent_label}</option>
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

            {/* --- חלק 3: מחזוריות (החלק החדש והמשודרג!) --- */}
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 transition-all">
                <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="recurring" className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        checked={formData.is_recurring} onChange={e => setFormData({...formData, is_recurring: e.target.checked})} 
                    />
                    <label htmlFor="recurring" className="font-bold text-purple-900 flex items-center gap-2 cursor-pointer select-none">
                        <RefreshCw size={16}/> {t.recurring_task || "Recurring Task"}
                    </label>
                </div>

                {formData.is_recurring && (
                    <div className="space-y-4 animate-fade-in pl-1">
                        {/* בחירת סוג מחזוריות */}
                        <select className="w-full p-2 border rounded-lg bg-white text-sm font-medium" 
                            value={formData.recurring_type} onChange={e => setFormData({...formData, recurring_type: e.target.value})}>
                            <option value="weekly">{t.recurring_weekly || "Weekly"}</option>
                            <option value="monthly">{t.recurring_monthly || "Monthly"}</option>
                            <option value="yearly">{t.yearly || "Yearly"}</option> {/* חדש! */}
                        </select>

                        {/* --- שבועי (Weekly) --- */}
                        {formData.recurring_type === 'weekly' && (
                            <div className="flex justify-between gap-1">
                                {daysShort.map((day, index) => (
                                    <button type="button" key={day} 
                                        onClick={() => toggleDay(index)} 
                                        className={`w-9 h-9 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center ${
                                            formData.selected_days.includes(index) 
                                            ? 'bg-purple-600 text-white scale-110 ring-2 ring-purple-300' 
                                            : 'bg-white border text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* --- חודשי (Monthly) --- */}
                        {formData.recurring_type === 'monthly' && (
                            <div>
                                <label className="text-xs font-bold text-gray-600 mb-1 block">{t.day_of_month || "Day of month"}:</label>
                                <select className="w-full p-2 border rounded-lg bg-white text-sm"
                                    value={formData.recurring_date} onChange={e => setFormData({...formData, recurring_date: parseInt(e.target.value)})}
                                >
                                    {[...Array(31)].map((_, i) => (
                                        <option key={i+1} value={i+1}>{i+1}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* --- שנתי (Yearly) - חדש! --- */}
                        {formData.recurring_type === 'yearly' && (
                             <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">{t.month || "Month"}:</label>
                                    <select className="w-full p-2 border rounded-lg bg-white text-sm"
                                        value={formData.recurring_month} onChange={e => setFormData({...formData, recurring_month: parseInt(e.target.value)})}
                                    >
                                        {months.map((m, i) => (
                                            <option key={i} value={i}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 mb-1 block">{t.day || "Day"}:</label>
                                    <select className="w-full p-2 border rounded-lg bg-white text-sm"
                                        value={formData.recurring_date} onChange={e => setFormData({...formData, recurring_date: parseInt(e.target.value)})}
                                    >
                                        {[...Array(31)].map((_, i) => (
                                            <option key={i+1} value={i+1}>{i+1}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <button type="submit" className="w-full py-3.5 bg-[#6A0DAD] text-white rounded-xl font-bold shadow-lg hover:bg-purple-800 transition transform active:scale-95 text-lg">
                {t.save_task_btn || "Save Task"}
            </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskForm;