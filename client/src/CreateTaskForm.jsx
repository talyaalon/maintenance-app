import React, { useState, useEffect } from 'react';
import { X, Calendar, Camera, Box, Video } from 'lucide-react';

const CreateTaskForm = ({ onTaskCreated, onClose, user, token, t, onRefresh, subordinates, lang }) => {
  const [frequency, setFrequency] = useState('Once'); 
  const currentUser = user;

  const userRole = currentUser?.role ? String(currentUser.role).toUpperCase() : '';
  const isEmployee = userRole === 'EMPLOYEE' || userRole === 'WORKER' || userRole === 'עובד';
  const isManager = currentUser && !isEmployee;

  // 🚀 שעון בנגקוק - תמיד ימשוך את השעה הנכונה בתאילנד!
  const getCurrentBkkTime = () => {
      const now = new Date();
      const bkkTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
      bkkTime.setMinutes(bkkTime.getMinutes() - bkkTime.getTimezoneOffset());
      return bkkTime.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: '', 
    urgency: 'Normal', 
    due_date: getCurrentBkkTime(), 
    location_id: '', 
    asset_id: '', 
    assigned_worker_id: isEmployee ? currentUser?.id : '', 
    description: '', 
    selected_days: [], 
    recurring_date: 1, 
    recurring_month: 0 
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(''); 

  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysHe = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const currentDays = lang === 'he' ? daysHe : daysEn;

  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${token}` };

    fetch('https://maintenance-app-h84v.onrender.com/locations', { headers })
        .then(res => res.json()).then(setLocations).catch(err => console.error("Error locations", err));

    fetch('https://maintenance-app-h84v.onrender.com/categories', { headers })
        .then(res => res.json()).then(setCategories).catch(err => console.error("Error categories", err));

    fetch('https://maintenance-app-h84v.onrender.com/assets', { headers })
        .then(res => res.json()).then(setAssets).catch(err => console.error("Error assets", err));

    if (isManager) {
        if (subordinates && subordinates.length > 0) {
            setTeamMembers(subordinates);
        } else {
            fetch('https://maintenance-app-h84v.onrender.com/users', { headers })
                .then(res => res.json())
                .then(setTeamMembers)
                .catch(err => console.error("Error users", err));
        }
    }
  }, [token, isManager, subordinates]);

  const filteredAssets = selectedCategory 
      ? assets.filter(a => a.category_id === parseInt(selectedCategory))
      : [];

  const employeesOnly = teamMembers.filter(member => {
      const r = member?.role ? String(member.role).toUpperCase() : '';
      return r === 'EMPLOYEE' || r === 'WORKER' || r === 'עובד';
  });
  
  const optionsToRender = employeesOnly.length > 0 ? employeesOnly : teamMembers;

  const toggleDay = (dayIndex) => {
    setFormData(prev => ({ 
        ...prev, 
        selected_days: prev.selected_days.includes(dayIndex) 
            ? prev.selected_days.filter(d => d !== dayIndex) 
            : [...prev.selected_days, dayIndex] 
    }));
  };

  const handleFileChange = (e) => {
      if (e.target.files) {
          const newFiles = Array.from(e.target.files);
          setSelectedFiles(prev => [...prev, ...newFiles]);
      }
  };

  const removeFile = (index) => {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.due_date || !formData.location_id || (isManager && !formData.assigned_worker_id)) {
        alert("עליך למלא את כל שדות החובה: תאריך, שם המשימה, מיקום, ובחירת עובד לביצוע.");
        return; 
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('urgency', formData.urgency);
    data.append('location_id', formData.location_id);
    data.append('asset_id', formData.asset_id);
    data.append('assigned_worker_id', formData.assigned_worker_id);
    data.append('description', formData.description);

    if (frequency === 'Once') {
        data.append('is_recurring', 'false');
        data.append('due_date', formData.due_date);
    } else {
        data.append('is_recurring', 'true');
        data.append('recurring_type', frequency.toLowerCase()); 
        data.append('due_date', formData.due_date); 

        if (frequency === 'Weekly') {
            data.append('selected_days', JSON.stringify(formData.selected_days));
        } else if (frequency === 'Monthly') {
            data.append('recurring_date', formData.recurring_date);
        } else if (frequency === 'Yearly') {
            const dateObj = new Date(formData.due_date);
            data.append('recurring_month', dateObj.getMonth());
            data.append('recurring_date', dateObj.getDate());
        }
    }

    if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => {
            data.append('files', file);
        });
    }

    try {
      const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      const responseData = await res.json(); 

      if (res.ok) { 
          alert((t.save || "Saved") + '!'); 
          if (onRefresh) onRefresh(); 
          if (onTaskCreated) onTaskCreated(); 
          if (onClose) onClose(); 
      } else { 
          alert(responseData.error || t.error_create_task || 'Error creating task'); 
      }
    } catch (err) { 
        console.error(err);
        alert(t.server_error || 'Server Error'); 
    }
  };

  const handleClose = () => {
      if (onClose) onClose();
      else if (onTaskCreated) onTaskCreated();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
      <div className="bg-white w-[95%] max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-scale-in overflow-hidden">
        
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 shrink-0">
            <h2 className="text-xl font-bold text-[#714B67]">{t.create_new_task || "Create Task"}</h2>
            <button type="button" onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
            
            <div className="bg-white p-4 rounded-xl border border-[#714B67]/30 shadow-sm">
                <label className="block text-sm font-bold text-[#714B67] mb-2 flex items-center gap-2">
                    <Calendar size={18}/> {t.frequency_label || "Frequency / Date"} 
                    <span className="text-red-500 ml-1">*</span>
                </label>
                
                <select 
                    className="w-full p-2.5 border rounded-lg bg-white font-bold text-gray-700 mb-3 focus:ring-1 focus:ring-[#714B67] outline-none"
                    value={frequency} 
                    onChange={e => setFrequency(e.target.value)}
                >
                    <option value="Once">{t.freq_once || "One Time (Specific Date)"}</option>
                    <option value="Weekly">{t.freq_weekly || "Weekly (Repeats)"}</option>
                    <option value="Monthly">{t.freq_monthly || "Monthly (Repeats)"}</option>
                    <option value="Yearly">{t.freq_yearly || "Yearly (Repeats)"}</option>
                </select>

                <div className="animate-fade-in">
                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1 block">
                            {frequency === 'Once' ? (t.pick_date || "Pick Date & Time") : (t.start_date || "Start Date")}
                        </label>
                        <div className="relative w-full">
                            <input type="datetime-local" className="w-full p-2 border border-[#714B67]/30 rounded-lg bg-white appearance-none outline-none focus:ring-2 focus:ring-[#714B67]/30 min-w-0" 
                             value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} 
                            />
                        </div>
                    </div>

                    {frequency === 'Weekly' && (
                        <div className="mt-3">
                            <label className="text-xs font-bold text-gray-500 mb-2 block">{t.pick_days || "Select Days"}</label>
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {currentDays.map((day, index) => (
                                    <button type="button" key={index} onClick={() => toggleDay(index)} 
                                        className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all flex items-center justify-center shadow-sm mx-auto ${
                                            formData.selected_days.includes(index) 
                                            ? 'bg-[#714B67] text-white scale-110' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {frequency === 'Monthly' && (
                        <div className="mt-3">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">{t.pick_day_of_month || "Day of Month"}</label>
                            <select className="w-full p-2 border rounded-lg outline-none focus:border-[#714B67]"
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

            <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">
                    {t.task_title_label} <span className="text-red-500 ml-1">*</span>
                </label>
                <input required className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none transition" 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder={t.task_title_placeholder}
                />
            </div>

            <div className="flex gap-3">
                 <div className="flex-1">
                    <label className="text-sm font-bold text-gray-700 block mb-1">
                        {t.location} <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select required className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67]" 
                        value={formData.location_id} onChange={e => setFormData({...formData, location_id: e.target.value})}>
                        <option value="">{t.select_location}</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                 </div>
                 <div className="flex-1">
                    <label className="text-sm font-bold text-gray-700 block mb-1">{t.urgency_label}</label>
                    <select className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67]" 
                        value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
                        <option value="Normal">{t.normal_label}</option>
                        <option value="High">{t.urgent_label}</option>
                    </select>
                 </div>
            </div>

            {isManager && (
                <div>
                    <label className="text-sm font-bold text-gray-700 block mb-1">
                        {t.assign_to_label} <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select required className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67]" 
                        value={formData.assigned_worker_id} onChange={e => setFormData({...formData, assigned_worker_id: e.target.value})}>
                        <option value="">בחר עובד לביצוע המשימה...</option>
                        {optionsToRender.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                </div>
            )}

            <div className="border rounded-xl p-3 bg-gray-50">
                 <label className="text-xs font-bold text-gray-500 mb-2 block flex items-center gap-1"><Box size={14}/> {t.select_asset_title || "Asset (Optional)"}</label>
                 <div className="flex gap-2">
                    <select className="flex-1 p-2 border rounded text-sm bg-white outline-none focus:border-[#714B67]" 
                        value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setFormData({...formData, asset_id: ''}); }}>
                        <option value="">{t.category_label}</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="flex-1 p-2 border rounded text-sm bg-white outline-none focus:border-[#714B67]" 
                        disabled={!selectedCategory} value={formData.asset_id} onChange={e => setFormData({...formData, asset_id: e.target.value})}>
                        <option value="">{t.select_asset}</option>
                        {filteredAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                 </div>
            </div>

            <div>
                <label className="text-sm font-bold text-gray-700 block mb-1">{t.description_label}</label>
                <textarea className="w-full p-3 border rounded-lg bg-gray-50 h-20 resize-none outline-none focus:bg-white focus:ring-1 focus:ring-[#714B67]" 
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                />
            </div>
             <div>
                <label className="text-sm font-bold text-gray-700 block mb-1 flex items-center gap-1">
                    <Camera size={16}/> {t.add_image || "Add Photos/Video"}
                </label>
                
                {/* 🚀 התיקון העיצובי לכפתור העלאת קבצים */}
                <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*" 
                    onChange={handleFileChange} 
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#fdf4ff] file:text-[#714B67] hover:file:bg-[#714B67]/10 cursor-pointer" 
                />
                
                {selectedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {selectedFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                                <span className="truncate max-w-[150px]">{f.name}</span>
                                <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700"><X size={12}/></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>

        <div className="p-4 border-t bg-gray-50 shrink-0">
            <button onClick={handleSubmit} className="w-full py-3.5 bg-[#714B67] text-white rounded-xl font-bold shadow-lg hover:bg-[#5a3b52] transition transform active:scale-95 text-lg">
                {t.save_task_btn || "Create Task"}
            </button>
        </div>

      </div>
    </div>
  );
};

export default CreateTaskForm;