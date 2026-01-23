import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Camera, FileText, Box, RefreshCw } from 'lucide-react';

// 👇 השינוי הראשון: הוספתי את subordinates לרשימת ה-Props
const CreateTaskForm = ({ onTaskCreated, onClose, user, token, t, onRefresh, subordinates }) => {
  // --- סטייט לניהול התדירות והטופס ---
  const [frequency, setFrequency] = useState('Once'); // Once, Weekly, Monthly, Yearly
  
  // שימוש ב-user שהתקבל כ-currentUser (כדי למנוע בלבול שמות)
  const currentUser = user;

  const [formData, setFormData] = useState({
    title: '', 
    urgency: 'Normal', 
    due_date: new Date().toISOString().split('T')[0], // תאריך ברירת מחדל להיום
    location_id: '', 
    asset_id: '', 
    assigned_worker_id: currentUser?.role === 'EMPLOYEE' ? currentUser.id : '',
    description: '', 
    selected_days: [], // לימים בשבוע (0-6)
    recurring_date: 1, // ליום בחודש (1-31)
    recurring_month: 0 // לחודש בשנה (0-11)
  });

  const [file, setFile] = useState(null); 
  
  // נתונים שיגיעו מהשרת
  const [locations, setLocations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(''); 

  // רשימות עזר
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // --- טעינת נתונים ---
  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. מיקומים
    fetch('https://maintenance-app-h84v.onrender.com/locations', { headers })
        .then(res => res.json()).then(setLocations).catch(err => console.error("Error locations", err));

    // 2. קטגוריות ונכסים
    fetch('https://maintenance-app-h84v.onrender.com/categories', { headers })
        .then(res => res.json()).then(setCategories).catch(err => console.error("Error categories", err));

    fetch('https://maintenance-app-h84v.onrender.com/assets', { headers })
        .then(res => res.json()).then(setAssets).catch(err => console.error("Error assets", err));

    // 3. עובדים (רק למנהלים) - לוגיקה חכמה
    if (currentUser?.role !== 'EMPLOYEE') {
        // 👇 השינוי המרכזי כאן:
        // אם קיבלנו רשימת כפופים (subordinates) מה-TeamTab, נשתמש בה!
        if (subordinates && subordinates.length > 0) {
            setTeamMembers(subordinates);
        } else {
            // אחרת (למשל מנהל שנכנס רגיל לטאב משימות), נביא את רשימת המשתמשים מהשרת
            fetch('https://maintenance-app-h84v.onrender.com/users', { headers })
                .then(res => res.json())
                .then(data => {
                    // אופציונלי: כאן אפשר לסנן רק את העובדים של המנהל הנוכחי אם רוצים,
                    // אבל כרגע נשאיר את זה שמביא את כולם אם לא נשלח סינון ספציפי
                    setTeamMembers(data);
                })
                .catch(err => console.error("Error users", err));
        }
    }
  }, [token, currentUser, subordinates]); // הוספנו את subordinates לתלויות

  // סינון נכסים לפי קטגוריה
  const filteredAssets = selectedCategory 
      ? assets.filter(a => a.category_id === parseInt(selectedCategory))
      : [];

  // בחירת ימים בשבוע (עבור Weekly)
  const toggleDay = (dayIndex) => {
    setFormData(prev => ({ 
        ...prev, 
        selected_days: prev.selected_days.includes(dayIndex) 
            ? prev.selected_days.filter(d => d !== dayIndex) 
            : [...prev.selected_days, dayIndex] 
    }));
  };

  // --- שליחת הטופס ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    // שדות בסיסיים
    data.append('title', formData.title);
    data.append('urgency', formData.urgency);
    data.append('location_id', formData.location_id);
    data.append('asset_id', formData.asset_id);
    data.append('assigned_worker_id', formData.assigned_worker_id);
    data.append('description', formData.description);

    // לוגיקה חכמה לפי התדירות שנבחרה
    if (frequency === 'Once') {
        // חד פעמי
        data.append('is_recurring', 'false');
        data.append('due_date', formData.due_date);
    } else {
        // משימה חוזרת
        data.append('is_recurring', 'true');
        data.append('recurring_type', frequency.toLowerCase()); // weekly, monthly, yearly
        
        // כאן התיקון החשוב: שליחת תאריך התחלה תקין גם למשימות מחזוריות
        data.append('due_date', formData.due_date); 

        if (frequency === 'Weekly') {
            // השרת מצפה למערך ימים (כסטרינג של JSON)
            data.append('selected_days', JSON.stringify(formData.selected_days));
        } else if (frequency === 'Monthly') {
            data.append('recurring_date', formData.recurring_date);
        } else if (frequency === 'Yearly') {
            // בשנתי - ניקח את התאריך מהלוח שנה ונחלץ ממנו יום וחודש
            const dateObj = new Date(formData.due_date);
            data.append('recurring_month', dateObj.getMonth()); // 0-11
            data.append('recurring_date', dateObj.getDate());   // 1-31
        }
    }

    if (file) {
        data.append('task_image', file);
    }

    try {
      const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      const responseData = await res.json(); // קריאת התגובה מהשרת

      if (res.ok) { 
          alert((t.save || "Saved") + '!'); 
          if (onRefresh) onRefresh(); // רענון הרשימה בחוץ
          if (onTaskCreated) onTaskCreated(); // תמיכה לאחור
          if (onClose) onClose(); // סגירת המודל
      } else { 
          // הצגת שגיאה מפורטת מהשרת אם יש
          alert(responseData.error || t.error_create_task || 'Error creating task'); 
      }
    } catch (err) { 
        console.error(err);
        alert(t.server_error || 'Server Error'); 
    }
  };

  // פונקציית עזר לסגירה (תומכת גם ב-onCancel וגם ב-onClose)
  const handleClose = () => {
      if (onClose) onClose();
      else if (onTaskCreated) onTaskCreated(); // במקרה הישן
  };

  return (
    // המבנה הזה (fixed + flex column) פותר את הבעיה שהכפתורים נחתכים בנייד
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[95vh] animate-scale-in overflow-hidden">
        
        {/* --- Header (קבוע למעלה) --- */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 shrink-0">
            <h2 className="text-xl font-bold text-[#714B67]">{t.create_new_task || "Create Task"}</h2>
            <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
        </div>

        {/* --- Scrollable Content (האמצע נגלל) --- */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
            
            {/* 1. מתי לבצע? (הלוגיקה החדשה) */}
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
                <label className="block text-sm font-bold text-purple-900 mb-2 flex items-center gap-2">
                    <Calendar size={18}/> {t.frequency_label || "Frequency / Date"}
                </label>
                
                {/* בחירת סוג תדירות */}
                <select 
                    className="w-full p-3 border rounded-lg bg-white font-bold text-gray-700 mb-3 focus:ring-2 focus:ring-purple-200 outline-none"
                    value={frequency} 
                    onChange={e => setFrequency(e.target.value)}
                >
                    <option value="Once">{t.freq_once || "One Time (Specific Date)"}</option>
                    <option value="Weekly">{t.freq_weekly || "Weekly (Repeats)"}</option>
                    <option value="Monthly">{t.freq_monthly || "Monthly (Repeats)"}</option>
                    <option value="Yearly">{t.freq_yearly || "Yearly (Repeats)"}</option>
                </select>

                {/* התוכן משתנה לפי הבחירה */}
                <div className="bg-white p-3 rounded-lg border animate-fade-in">
                    
                    {/* בחירת תאריך התחלה (רלוונטי לכולם) */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">
                            {frequency === 'Once' ? (t.pick_date || "Pick Date") : (t.start_date || "Start Date")}
                        </label>
                        <input type="date" className="w-full p-2 border rounded-lg outline-none focus:border-purple-500" 
                            value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} 
                        />
                    </div>

                    {/* שבועי (כפתורי ימים) */}
                    {frequency === 'Weekly' && (
                        <div className="mt-3">
                            <label className="text-xs font-bold text-gray-500 mb-2 block">{t.pick_days || "Select Days"}</label>
                            <div className="flex justify-between gap-1">
                                {daysShort.map((day, index) => (
                                    <button type="button" key={day} onClick={() => toggleDay(index)} 
                                        className={`w-9 h-9 rounded-full text-[10px] font-bold transition-all flex items-center justify-center shadow-sm ${
                                            formData.selected_days.includes(index) 
                                            ? 'bg-purple-600 text-white scale-110' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* חודשי (רשימת ימים 1-31) */}
                    {frequency === 'Monthly' && (
                        <div className="mt-3">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">{t.pick_day_of_month || "Day of Month"}</label>
                            <select className="w-full p-2 border rounded-lg outline-none"
                                value={formData.recurring_date} onChange={e => setFormData({...formData, recurring_date: parseInt(e.target.value)})}
                            >
                                {[...Array(31)].map((_, i) => (
                                    <option key={i+1} value={i+1}>{i+1}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. פרטי המשימה */}
            <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">{t.task_title_label}</label>
                <input required className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-200 outline-none transition" 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder={t.task_title_placeholder}
                />
            </div>

            <div className="flex gap-3">
                 <div className="flex-1">
                    <label className="text-sm font-bold text-gray-700 block mb-1">{t.location}</label>
                    <select required className="w-full p-3 border rounded-lg bg-gray-50 outline-none" 
                        value={formData.location_id} onChange={e => setFormData({...formData, location_id: e.target.value})}>
                        <option value="">{t.select_location}</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                 </div>
                 <div className="flex-1">
                    <label className="text-sm font-bold text-gray-700 block mb-1">{t.urgency_label}</label>
                    <select className="w-full p-3 border rounded-lg bg-gray-50 outline-none" 
                        value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
                        <option value="Normal">{t.normal_label}</option>
                        <option value="High">{t.urgent_label}</option>
                    </select>
                 </div>
            </div>

            {/* בחירת עובד - Assign To */}
            {currentUser?.role !== 'EMPLOYEE' && (
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">{t.assign_to_label}</label>
                    <select className="w-full p-3 border rounded-lg bg-gray-50 outline-none" 
                        value={formData.assigned_worker_id} onChange={e => setFormData({...formData, assigned_worker_id: e.target.value})}>
                        <option value={currentUser.id}>{t.assign_self}</option>
                        {/* כאן תוצג רק הרשימה הרלוונטית (של המנהל הספציפי או כולם אם לא נבחר מנהל) */}
                        {teamMembers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                </div>
            )}

            {/* נכס (אופציונלי) */}
            <div className="border rounded-xl p-3 bg-gray-50">
                 <label className="text-xs font-bold text-gray-500 mb-2 block flex items-center gap-1"><Box size={14}/> {t.select_asset_title || "Asset (Optional)"}</label>
                 <div className="flex gap-2">
                    <select className="flex-1 p-2 border rounded text-sm bg-white outline-none" 
                        value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setFormData({...formData, asset_id: ''}); }}>
                        <option value="">{t.category_label}</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="flex-1 p-2 border rounded text-sm bg-white outline-none" 
                        disabled={!selectedCategory} value={formData.asset_id} onChange={e => setFormData({...formData, asset_id: e.target.value})}>
                        <option value="">{t.select_asset}</option>
                        {filteredAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                 </div>
            </div>

            {/* תיאור ותמונה */}
            <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">{t.description_label}</label>
                <textarea className="w-full p-3 border rounded-lg bg-gray-50 h-24 resize-none outline-none focus:bg-white focus:ring-2 focus:ring-purple-200" 
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                />
            </div>
             <div>
                <label className="text-sm font-bold text-gray-700 block mb-1 flex items-center gap-1"><Camera size={16}/> {t.add_image}</label>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer" />
            </div>

        </div>

        {/* --- Footer (קבוע למטה) --- */}
        <div className="p-4 border-t bg-gray-50 shrink-0">
            <button onClick={handleSubmit} className="w-full py-3.5 bg-[#714B67] text-white rounded-xl font-bold shadow-lg hover:bg-purple-800 transition transform active:scale-95 text-lg">
                {t.save_task_btn || "Create Task"}
            </button>
        </div>

      </div>
    </div>
  );
};

export default CreateTaskForm;