import { useState, useEffect } from 'react';
import { X, Calendar, Camera, Box } from 'lucide-react';

const CreateTaskForm = ({ onTaskCreated, onClose, user, token, t, onRefresh, subordinates, lang }) => {
  const [frequency, setFrequency] = useState('Once');
  const currentUser = user;

  const userRole = currentUser?.role ? String(currentUser.role).toUpperCase() : '';
  const isEmployee = userRole === 'EMPLOYEE' || userRole === 'WORKER' || userRole === 'עובד';
  const isManager = currentUser && !isEmployee;

  // 🚀 שעון בנגקוק חסין תקלות - לוקח את השעה הנוכחית בבנגקוק ומעצב אותה במדויק לשדה התאריך
  const getCurrentBkkTimeForInput = () => {
      const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
      });
      const parts = formatter.formatToParts(new Date());
      const vals = {}; parts.forEach(p => vals[p.type] = p.value);
      return `${vals.year}-${vals.month}-${vals.day}T${vals.hour}:${vals.minute}`;
  };

  const [formData, setFormData] = useState({
    title: '',
    urgency: 'Normal',
    due_date: getCurrentBkkTimeForInput(),
    location_id: '',
    asset_id: '',
    assigned_worker_id: isEmployee ? currentUser?.id : '',
    description: '',
    selected_days: [1, 2, 3, 4, 5], // Mon-Fri default for Daily
    recurring_date: 1,
    recurring_month: 0,
    quarterly_dates: { Q1: '', Q2: '', Q3: '', Q4: '' }
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

  // Quarter constraints: [minMonth, maxMonth] (1-indexed for HTML date input)
  const quarterConstraints = [
    { label: t.q1_label || 'Q1 (Jan–Mar)', min: '-01-01', max: '-03-31' },
    { label: t.q2_label || 'Q2 (Apr–Jun)', min: '-04-01', max: '-06-30' },
    { label: t.q3_label || 'Q3 (Jul–Sep)', min: '-07-01', max: '-09-30' },
    { label: t.q4_label || 'Q4 (Oct–Dec)', min: '-10-01', max: '-12-31' },
  ];
  const currentYear = new Date().getFullYear();

  const isBigBoss = userRole === 'BIG_BOSS';

  useEffect(() => {
    const headers = { 'Authorization': `Bearer ${token}` };

    // Backend handles area-based filtering for all non-BIG_BOSS roles automatically
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

  // For BIG_BOSS: filter by the selected worker's area_id so each area stays isolated
  // For all other roles: backend already scoped the data to their area — show everything fetched
  let targetAreaId = null;
  if (isBigBoss && formData.assigned_worker_id) {
      const selectedWorker = teamMembers.find(u => String(u.id) === String(formData.assigned_worker_id));
      targetAreaId = selectedWorker?.area_id || null;
  }

  const filteredLocations = (isBigBoss && targetAreaId)
      ? locations.filter(l => String(l.area_id) === String(targetAreaId) || !l.area_id)
      : locations;

  const filteredCategories = (isBigBoss && targetAreaId)
      ? categories.filter(c => String(c.area_id) === String(targetAreaId) || !c.area_id)
      : categories;

  const filteredAssets = selectedCategory
      ? assets.filter(a => {
          const categoryMatch = String(a.category_id) === String(selectedCategory);
          const areaMatch = !isBigBoss || !targetAreaId || String(a.area_id) === String(targetAreaId) || !a.area_id;
          return categoryMatch && areaMatch;
      })
      : [];

  const employeesOnly = teamMembers.filter(member => {
      const r = member?.role ? String(member.role).toUpperCase() : '';
      return r === 'EMPLOYEE' || r === 'WORKER' || r === 'עובד';
  });

  const optionsToRender = employeesOnly.length > 0 ? employeesOnly : teamMembers;

  const handleFrequencyChange = (newFreq) => {
    setFrequency(newFreq);
    if (newFreq === 'Daily') {
      // Pre-select Mon-Fri
      setFormData(prev => ({ ...prev, selected_days: [1, 2, 3, 4, 5] }));
    } else if (newFreq === 'Weekly') {
      // Clear to single-select
      setFormData(prev => ({ ...prev, selected_days: [] }));
    }
  };

  const toggleDay = (dayIndex) => {
    if (frequency === 'Weekly') {
      // Single-select: clicking a day selects only that day
      setFormData(prev => ({ ...prev, selected_days: [dayIndex] }));
    } else {
      // Multi-select for Daily
      setFormData(prev => ({
          ...prev,
          selected_days: prev.selected_days.includes(dayIndex)
              ? prev.selected_days.filter(d => d !== dayIndex)
              : [...prev.selected_days, dayIndex]
      }));
    }
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
        alert(t.alert_required_fields || "עליך למלא את כל שדות החובה: תאריך, שם המשימה, מיקום, ובחירת עובד לביצוע.");
        return;
    }

    // If a category was selected, an asset MUST also be selected
    if (selectedCategory && !formData.asset_id) {
        alert(t.alert_category_requires_asset || "אם בחרת קטגוריה, חובה לבחור גם נכס.");
        return;
    }

    // Validate Quarterly dates
    if (frequency === 'Quarterly') {
        const { Q1, Q2, Q3, Q4 } = formData.quarterly_dates;
        if (!Q1 || !Q2 || !Q3 || !Q4) {
            alert(t.alert_quarterly_dates || "Please fill in all 4 quarterly dates.");
            return;
        }
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('urgency', formData.urgency);
    data.append('location_id', formData.location_id);
    data.append('asset_id', formData.asset_id);
    data.append('assigned_worker_id', formData.assigned_worker_id);
    data.append('description', formData.description);

    // Convert Bangkok datetime-local value ("YYYY-MM-DDTHH:mm") to UTC ISO
    // by appending the +07:00 offset before parsing — prevents double-shifting
    const dueDateUtc = new Date(formData.due_date + ':00+07:00').toISOString();

    if (frequency === 'Once') {
        data.append('is_recurring', 'false');
        data.append('due_date', dueDateUtc);
    } else {
        data.append('is_recurring', 'true');
        data.append('recurring_type', frequency.toLowerCase());
        data.append('due_date', dueDateUtc);

        if (frequency === 'Daily' || frequency === 'Weekly') {
            data.append('selected_days', JSON.stringify(formData.selected_days));
        } else if (frequency === 'Monthly') {
            data.append('recurring_date', formData.recurring_date);
        } else if (frequency === 'Quarterly') {
            // Convert each date to DD/MM format
            const qdates = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                const d = formData.quarterly_dates[q];
                if (!d) return '';
                const dt = new Date(d);
                return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
            });
            data.append('quarterly_dates', JSON.stringify(qdates));
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
      <div className="bg-white w-[95%] max-w-md rounded-2xl shadow-xl border border-gray-200 flex flex-col max-h-[90vh] animate-scale-in overflow-hidden">

        <div className="flex justify-between items-center px-4 py-3.5 border-b border-gray-200 bg-white shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">{t.create_new_task || "Create Task"}</h2>
            <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {isManager && (
                <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                        {t.assign_to_label || "Assign To"} <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select required className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#714B67]/30 font-bold"
                        value={formData.assigned_worker_id}
                        onChange={e => {
                            setFormData({...formData, assigned_worker_id: e.target.value, location_id: '', asset_id: ''});
                            setSelectedCategory('');
                        }}>
                        <option value="">{t.select_worker || "Select Worker..."}</option>
                        {optionsToRender.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
                    </select>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Calendar size={18}/> {t.frequency_label || "Frequency / Date"}
                    <span className="text-red-500 ml-1">*</span>
                </label>

                <select
                    className="w-full p-2.5 border rounded-lg bg-white font-bold text-gray-700 mb-3 focus:ring-1 focus:ring-[#714B67] outline-none"
                    value={frequency}
                    onChange={e => handleFrequencyChange(e.target.value)}
                >
                    <option value="Once">{t.freq_once || "One Time (Specific Date)"}</option>
                    <option value="Daily">{t.freq_daily || "Daily (Mon–Fri)"}</option>
                    <option value="Weekly">{t.freq_weekly || "Weekly (One Day)"}</option>
                    <option value="Monthly">{t.freq_monthly || "Monthly (Repeats)"}</option>
                    <option value="Quarterly">{t.freq_quarterly || "Quarterly"}</option>
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

                    {(frequency === 'Daily' || frequency === 'Weekly') && (
                        <div className="mt-3">
                            <label className="text-xs font-bold text-gray-500 mb-2 block">
                                {frequency === 'Daily'
                                    ? (t.pick_days_daily || "Select Days (Mon–Fri default)")
                                    : (t.pick_day_weekly || "Select One Day")}
                            </label>
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

                    {frequency === 'Quarterly' && (
                        <div className="mt-3 space-y-2">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">
                                {t.pick_quarterly_dates || "Select One Date Per Quarter"}
                            </label>
                            {quarterConstraints.map((q, i) => {
                                const key = `Q${i + 1}`;
                                return (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#714B67] w-28 shrink-0">{q.label}</span>
                                        <input
                                            type="date"
                                            min={`${currentYear}${q.min}`}
                                            max={`${currentYear}${q.max}`}
                                            className="flex-1 p-2 border border-[#714B67]/30 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#714B67]/30 text-sm"
                                            value={formData.quarterly_dates[key]}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                quarterly_dates: { ...prev.quarterly_dates, [key]: e.target.value }
                                            }))}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                    {t.task_title_label} <span className="text-red-400 ml-1">*</span>
                </label>
                <input required className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none transition"
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder={t.task_title_placeholder}
                />
            </div>

            <div className="flex gap-3">
                 <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                        {t.location} <span className="text-red-400 ml-1">*</span>
                    </label>
                    <select required className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67] disabled:opacity-50"
                        value={formData.location_id}
                        onChange={e => setFormData({...formData, location_id: e.target.value})}
                        disabled={isBigBoss && !formData.assigned_worker_id}>
                        <option value="">{t.select_location}</option>
                        {filteredLocations.map(l => <option key={l.id} value={l.id}>{l['name_' + lang] || l.name_en || l.name}</option>)}
                    </select>
                    {isBigBoss && !formData.assigned_worker_id && (
                        <p className="text-xs text-gray-400 mt-1">{t.select_worker_first || "Select a worker first"}</p>
                    )}
                 </div>
                 <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{t.urgency_label}</label>
                    <select className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67]"
                        value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
                        <option value="Normal">{t.normal_label}</option>
                        <option value="High">{t.urgent_label}</option>
                    </select>
                 </div>
            </div>

            <div className={`border border-gray-200 rounded-xl p-3 bg-slate-50 transition ${isBigBoss && !formData.assigned_worker_id ? 'opacity-50 pointer-events-none' : ''}`}>
                 <label className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Box size={14}/> {t.select_asset_title || "Asset (Optional)"}</label>
                 {isBigBoss && !formData.assigned_worker_id && (
                     <p className="text-xs text-gray-400 mb-2">{t.select_worker_first || "Select a worker first"}</p>
                 )}
                 <div className="flex gap-2">
                    <select className="flex-1 p-2 border rounded text-sm bg-white outline-none focus:border-[#714B67]"
                        value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setFormData({...formData, asset_id: ''}); }}>
                        <option value="">{t.category_label}</option>
                        {/* 🚀 מציג רק קטגוריות של המנהל הנוכחי */}
                        {filteredCategories.map(c => <option key={c.id} value={c.id}>{c['name_' + lang] || c.name_en || c.name}</option>)}
                    </select>
                    <select className="flex-1 p-2 border rounded text-sm bg-white outline-none focus:border-[#714B67]"
                        disabled={!selectedCategory} value={formData.asset_id} onChange={e => setFormData({...formData, asset_id: e.target.value})}>
                        <option value="">{t.select_asset}</option>
                        {filteredAssets.map(a => <option key={a.id} value={a.id}>{a['name_' + lang] || a.name_en || a.name}</option>)}
                    </select>
                 </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{t.description_label}</label>
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

        <div className="p-4 border-t border-gray-200 bg-white shrink-0">
            <button onClick={handleSubmit} className="w-full py-3 bg-[#714B67] text-white rounded-xl font-bold shadow-sm hover:bg-[#5a3b52] transition active:scale-95 text-base">
                {t.save_task_btn || "Create Task"}
            </button>
        </div>

      </div>
    </div>
  );
};

export default CreateTaskForm;
