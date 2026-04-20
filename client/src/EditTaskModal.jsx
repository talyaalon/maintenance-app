import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Paperclip, Calendar } from 'lucide-react';

const BASE = 'https://maintenance-app-staging.onrender.com';

// Format a UTC timestamp to Bangkok-timezone datetime-local string (YYYY-MM-DDTHH:mm)
const toDatetimeLocal = (dateStr) => {
    if (!dateStr) return '';
    try {
        const fmt = new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
        return fmt.format(new Date(dateStr)).replace(' ', 'T');
    } catch { return ''; }
};

const EditTaskModal = ({ task, onClose, token, t, onRefresh, user, lang = 'en' }) => {

    // Recurring series: check recurring_group_id first, fall back to title suffix
    const isRecurringSeries =
        task.recurring_group_id != null ||
        !!(task.title && task.title.endsWith(' (Recurring)')) ||
        !!(task.title_en && task.title_en.endsWith(' (Recurring)'));

    const stripRecurringSuffix = (str) => (str || '').replace(' (Recurring)', '').replace(' (מחזורי)', '').replace(' (เกิดซ้ำ)', '');

    const userRole = user?.role ? String(user.role).toUpperCase() : '';
    const isBigBoss = userRole === 'BIG_BOSS';
    const isManager = userRole === 'MANAGER' || userRole === 'COMPANY_MANAGER';
    const userCompanyId = user?.company_id ?? null;

    // ── Frequency helpers ─────────────────────────────────────────────────────
    const getInitialFrequency = () => {
        // Check both snake_case (DB) and camelCase (possible API transform)
        const rt = (task.recurring_type || task.recurringType || '').trim().toLowerCase();
        console.log('[Recurrence Debug] recurring_type:', task.recurring_type, task.recurringType, '| is_recurring:', task.is_recurring, task.isRecurring, '| recurring_group_id:', task.recurring_group_id);
        if (rt === 'daily')     return 'Daily';
        if (rt === 'weekly')    return 'Weekly';
        if (rt === 'monthly')   return 'Monthly';
        if (rt === 'quarterly') return 'Quarterly';
        if (rt === 'yearly')    return 'Yearly';
        // No valid recurring_type — check flag, group id, and title suffix (for pre-migration tasks)
        const isRec = task.is_recurring === true || task.is_recurring === 1
            || task.is_recurring === '1' || task.is_recurring === 'true'
            || task.isRecurring === true || task.isRecurring === 1
            || task.isRecurring === 'true';
        const hasTitleSuffix =
            !!(task.title    && task.title.endsWith(' (Recurring)')) ||
            !!(task.title_en && task.title_en.endsWith(' (Recurring)'));
        if (isRec || task.recurring_group_id != null || hasTitleSuffix) return 'Daily';
        return 'Once';
    };

    const parseSelectedDays = () => {
        // API may return either `selected_days` or `recurring_days` — check both
        console.log('[Recurrence Debug] Raw task days:', task.recurring_days, task.selected_days);
        const raw = task.selected_days ?? task.recurring_days;
        if (!raw) return [1, 2, 3, 4, 5];
        if (Array.isArray(raw)) return raw;
        try { return JSON.parse(raw); } catch { return [1, 2, 3, 4, 5]; }
    };

    const parseQuarterlyDates = () => {
        if (!task.quarterly_dates) return { Q1: '', Q2: '', Q3: '', Q4: '' };
        try {
            const yr = new Date().getFullYear();
            let parsed = task.quarterly_dates;
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            if (Array.isArray(parsed)) {
                const keys = ['Q1', 'Q2', 'Q3', 'Q4'];
                const result = { Q1: '', Q2: '', Q3: '', Q4: '' };
                parsed.forEach((ds, i) => {
                    if (ds && ds.includes('/')) {
                        const [day, month] = ds.split('/');
                        result[keys[i]] = `${yr}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                });
                return result;
            }
            if (typeof parsed === 'object' && parsed !== null) return parsed;
        } catch {}
        return { Q1: '', Q2: '', Q3: '', Q4: '' };
    };

    // ── State ─────────────────────────────────────────────────────────────────
    const [frequency, setFrequency] = useState(getInitialFrequency);

    const [formData, setFormData] = useState({
        title_en: stripRecurringSuffix(task.title_en || task.title || ''),
        title_he: stripRecurringSuffix(task.title_he || ''),
        title_th: stripRecurringSuffix(task.title_th || ''),
        description: task.description || '',
        urgency: task.urgency || 'Normal',
        worker_id: task.worker_id || '',
        location_id: task.location_id || '',
        asset_id: task.asset_id || '',
        due_date: toDatetimeLocal(task.due_date),
        selected_days: parseSelectedDays(),
        recurring_date: task.recurring_date || 1,
        recurring_month: task.recurring_month || 0,
        quarterly_dates: parseQuarterlyDates(),
    });

    const [selectedCategory, setSelectedCategory] = useState('');
    const [workers, setWorkers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);

    const [existingImages, setExistingImages] = useState(
        Array.isArray(task.images) ? task.images.filter(Boolean) : []
    );
    const [newFiles, setNewFiles] = useState([]);
    const fileInputRef = useRef(null);

    const [showLangFields, setShowLangFields] = useState(!!(task.title_he || task.title_th));
    const [recurringPrompt, setRecurringPrompt] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // ── Safety net: correct frequency if getInitialFrequency() fired before task hydrated ──
    useEffect(() => {
        const isRec = task.is_recurring === true || task.is_recurring === 1
            || task.is_recurring === '1' || task.is_recurring === 'true'
            || task.isRecurring === true || task.isRecurring === 1
            || task.isRecurring === 'true';
        const hasTitleSuffix =
            !!(task.title    && task.title.endsWith(' (Recurring)')) ||
            !!(task.title_en && task.title_en.endsWith(' (Recurring)'));
        if ((isRec || task.recurring_group_id != null || hasTitleSuffix) && frequency === 'Once') {
            const rt = (task.recurring_type || task.recurringType || '').trim().toLowerCase();
            const map = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
            setFrequency(map[rt] || 'Daily');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Day labels & quarter constraints (match CreateTaskForm) ───────────────
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysHe = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    const currentDays = lang === 'he' ? daysHe : daysEn;

    const quarterConstraints = [
        { label: t.q1_label || 'Q1 (Jan–Mar)', min: '-01-01', max: '-03-31' },
        { label: t.q2_label || 'Q2 (Apr–Jun)', min: '-04-01', max: '-06-30' },
        { label: t.q3_label || 'Q3 (Jul–Sep)', min: '-07-01', max: '-09-30' },
        { label: t.q4_label || 'Q4 (Oct–Dec)', min: '-10-01', max: '-12-31' },
    ];
    const currentYear = new Date().getFullYear();

    // ── Frequency handlers ────────────────────────────────────────────────────
    const handleFrequencyChange = (newFreq) => {
        setFrequency(newFreq);
        if (newFreq === 'Daily') {
            setFormData(prev => ({ ...prev, selected_days: [1, 2, 3, 4, 5] }));
        } else if (newFreq === 'Weekly') {
            setFormData(prev => ({ ...prev, selected_days: [] }));
        }
    };

    const toggleDay = (dayIndex) => {
        if (frequency === 'Weekly') {
            setFormData(prev => ({ ...prev, selected_days: [dayIndex] }));
        } else {
            setFormData(prev => ({
                ...prev,
                selected_days: prev.selected_days.includes(dayIndex)
                    ? prev.selected_days.filter(d => d !== dayIndex)
                    : [...prev.selected_days, dayIndex],
            }));
        }
    };

    // ── Data fetching ─────────────────────────────────────────────────────────
    useEffect(() => {
        const headers = { 'Authorization': `Bearer ${token}` };

        fetch(`${BASE}/locations`, { headers })
            .then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : [])).catch(() => {});
        fetch(`${BASE}/categories`, { headers })
            .then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
        fetch(`${BASE}/assets`, { headers })
            .then(r => r.json()).then(d => setAssets(Array.isArray(d) ? d : [])).catch(() => {});

        if (isBigBoss) {
            fetch(`${BASE}/users`, { headers })
                .then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : [])).catch(() => {});
        } else if (isManager) {
            fetch(`${BASE}/users?teamOnly=true`, { headers })
                .then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : [])).catch(() => {});
        }
    }, [token]);

    // Pre-fill selectedCategory once assets are loaded
    useEffect(() => {
        if (task.asset_id && assets.length > 0 && !selectedCategory) {
            const asset = assets.find(a => String(a.id) === String(task.asset_id));
            if (asset?.category_id) setSelectedCategory(String(asset.category_id));
        }
    }, [assets]);

    // ── Cascading filter by worker's company_id (mirrors CreateTaskForm) ────────
    let targetCompanyId = null;
    if (isBigBoss && formData.worker_id) {
        const selectedWorker = workers.find(u => String(u?.id) === String(formData.worker_id));
        targetCompanyId = selectedWorker?.company_id ?? null;
    } else if (!isBigBoss && userCompanyId) {
        targetCompanyId = userCompanyId;
    }

    const filteredLocations = (() => {
        if (!targetCompanyId) {
            if (isBigBoss) {
                // Workers list still loading but a worker_id is already set (edit mode):
                // show all locations so task.location_id is visible while workers fetch completes
                return (formData.worker_id && workers.length === 0) ? locations : [];
            }
            return locations;
        }
        return locations.filter(l => String(l?.company_id) === String(targetCompanyId));
    })();

    const filteredCategories = (() => {
        if (!targetCompanyId) {
            if (isBigBoss) {
                return (formData.worker_id && workers.length === 0) ? categories : [];
            }
            return categories;
        }
        return categories.filter(c => String(c?.company_id) === String(targetCompanyId));
    })();

    console.log('[EditTaskModal] Target Company ID:', targetCompanyId, 'Filtered Categories count:', filteredCategories.length);

    const filteredAssets = selectedCategory
        ? assets.filter(a => {
            if (!a) return false;
            const categoryMatch = String(a?.category_id) === String(selectedCategory);
            if (!categoryMatch) return false;
            if (!targetCompanyId) return true;
            return String(a?.company_id) === String(targetCompanyId);
        })
        : [];

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title_en.trim()) {
            setError(t.alert_required_fields || 'Title (English) is required.');
            return;
        }
        setError('');
        if (isRecurringSeries) {
            setRecurringPrompt(true);
        } else {
            submitUpdate('single');
        }
    };

    const submitUpdate = async (update_mode) => {
        setLoading(true);
        setError('');
        try {
            // Always use FormData so we can include media + remove flag
            const fd = new FormData();
            fd.append('title_en', formData.title_en);
            fd.append('title_he', formData.title_he);
            fd.append('title_th', formData.title_th);
            fd.append('description', formData.description);
            fd.append('urgency', formData.urgency);
            fd.append('worker_id', formData.worker_id || '');
            fd.append('location_id', formData.location_id || '');
            fd.append('asset_id', formData.asset_id || '');
            fd.append('category_id', selectedCategory || '');
            fd.append('update_mode', update_mode);

            // Convert Bangkok datetime-local to UTC ISO
            if (formData.due_date) {
                const dueDateUtc = new Date(formData.due_date + ':00+07:00').toISOString();
                fd.append('due_date', dueDateUtc);
            }

            // Frequency fields
            if (frequency === 'Once') {
                fd.append('is_recurring', 'false');
            } else {
                fd.append('is_recurring', 'true');
                fd.append('recurring_type', frequency.toLowerCase());

                if (frequency === 'Daily' || frequency === 'Weekly') {
                    fd.append('selected_days', JSON.stringify(formData.selected_days));
                } else if (frequency === 'Monthly') {
                    fd.append('recurring_date', String(formData.recurring_date));
                } else if (frequency === 'Quarterly') {
                    const qdates = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                        const d = formData.quarterly_dates[q];
                        if (!d) return '';
                        const dt = new Date(d);
                        return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
                    });
                    fd.append('quarterly_dates', JSON.stringify(qdates));
                } else if (frequency === 'Yearly') {
                    const dateObj = new Date(formData.due_date);
                    fd.append('recurring_month', String(dateObj.getMonth()));
                    fd.append('recurring_date', String(dateObj.getDate()));
                }
            }

            // Images: send kept URLs + any new files
            fd.append('keptImages', JSON.stringify(existingImages));
            newFiles.forEach(f => fd.append('media', f));

            console.log('[EditTaskModal] FormData Contents:', Object.fromEntries(fd.entries()));
            const res = await fetch(`${BASE}/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: fd,
            });

            if (res.ok) {
                setShowSuccess(true);
                setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500);
            } else {
                const body = await res.json().catch(() => ({}));
                if (body.error === 'ERR_NOT_CREATOR') {
                    setError(t.err_not_creator || 'You cannot edit this task.');
                } else {
                    setError(body.error || t.server_error || 'Error updating task.');
                }
                setRecurringPrompt(false);
            }
        } catch (err) {
            console.error('[EditTaskModal] submit error:', err);
            setError(t.server_error || 'Server error.');
            setRecurringPrompt(false);
        } finally {
            setLoading(false);
        }
    };

    // ── Success overlay ───────────────────────────────────────────────────────
    if (showSuccess) return createPortal(
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[10000]">
            <div className="bg-white p-8 rounded-3xl animate-scale-in flex flex-col items-center">
                <Check size={40} className="text-green-600 mb-2"/>
                <h2 className="text-xl font-bold">{t.alert_sent || 'Saved!'}</h2>
            </div>
        </div>,
        document.body
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[10000] backdrop-blur-sm p-4">
            <div className="bg-white w-full sm:w-[95%] max-w-md rounded-2xl overflow-hidden shadow-xl border border-gray-200 animate-slide-up max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-base font-bold text-slate-800">{t.edit_task_title || 'Edit Task'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition">
                        <X size={18}/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">

                    {/* Urgency */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                            {t.urgency_label || 'Urgency'}
                        </label>
                        <select
                            className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67]"
                            value={formData.urgency}
                            onChange={e => setFormData(p => ({ ...p, urgency: e.target.value }))}
                        >
                            <option value="Normal">{t.normal_label || 'Normal'}</option>
                            <option value="High">{t.urgent_label || 'High'}</option>
                            <option value="Low">{t.urgency_low || 'Low'}</option>
                        </select>
                    </div>

                    {/* Frequency / Date — matches CreateTaskForm card exactly */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <Calendar size={18}/> {t.frequency_label || 'Frequency / Date'}
                        </label>

                        <select
                            className="w-full p-2.5 border rounded-lg bg-white font-bold text-gray-700 mb-3 focus:ring-1 focus:ring-[#714B67] outline-none"
                            value={frequency}
                            onChange={e => handleFrequencyChange(e.target.value)}
                        >
                            <option value="Once">{t.freq_once || 'One Time (Specific Date)'}</option>
                            <option value="Daily">{t.freq_daily || 'Daily (Mon–Fri)'}</option>
                            <option value="Weekly">{t.freq_weekly || 'Weekly (One Day)'}</option>
                            <option value="Monthly">{t.freq_monthly || 'Monthly (Repeats)'}</option>
                            <option value="Quarterly">{t.freq_quarterly || 'Quarterly'}</option>
                            <option value="Yearly">{t.freq_yearly || 'Yearly (Repeats)'}</option>
                        </select>

                        <div className="animate-fade-in">
                            {/* Date/time picker — shown for Once and Yearly */}
                            {!['Daily', 'Weekly', 'Monthly', 'Quarterly'].includes(frequency) && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                                        {frequency === 'Once' ? (t.pick_date || 'Pick Date & Time') : (t.start_date || 'Start Date')}
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-2 border border-[#714B67]/30 rounded-lg bg-white appearance-none outline-none focus:ring-2 focus:ring-[#714B67]/30 min-w-0"
                                        value={formData.due_date}
                                        onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                                    />
                                    {isRecurringSeries && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            {t.recurring_date_hint || 'For "Entire Set": future tasks will be shifted by the same time difference.'}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Day bubbles — Daily (multi) / Weekly (single) */}
                            {(frequency === 'Daily' || frequency === 'Weekly') && (
                                <div className="mt-3">
                                    <label className="text-xs font-bold text-gray-500 mb-2 block">
                                        {frequency === 'Daily'
                                            ? (t.pick_days_daily || 'Select Days (Mon–Fri default)')
                                            : (t.pick_day_weekly || 'Select One Day')}
                                    </label>
                                    <div className="grid grid-cols-7 gap-1 text-center">
                                        {currentDays.map((day, index) => (
                                            <button
                                                type="button"
                                                key={index}
                                                onClick={() => toggleDay(index)}
                                                className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all flex items-center justify-center shadow-sm mx-auto ${
                                                    formData.selected_days.includes(index)
                                                        ? 'bg-[#714B67] text-white scale-110'
                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Monthly — day of month picker */}
                            {frequency === 'Monthly' && (
                                <div className="mt-3">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                                        {t.pick_day_of_month || 'Day of Month'}
                                    </label>
                                    <select
                                        className="w-full p-2 border rounded-lg outline-none focus:border-[#714B67]"
                                        value={formData.recurring_date}
                                        onChange={e => setFormData(p => ({ ...p, recurring_date: parseInt(e.target.value) }))}
                                    >
                                        {[...Array(31)].map((_, i) => (
                                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Quarterly — one date per quarter */}
                            {frequency === 'Quarterly' && (
                                <div className="mt-3 space-y-2">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">
                                        {t.pick_quarterly_dates || 'Select One Date Per Quarter'}
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
                                                        quarterly_dates: { ...prev.quarterly_dates, [key]: e.target.value },
                                                    }))}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assigned Worker */}
                    {(isBigBoss || isManager) && workers.length > 0 && (
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                                {t.assign_to_label || 'Assign To'}
                            </label>
                            <select
                                className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67]"
                                value={formData.worker_id}
                                onChange={e => {
                                    const newWorkerId = e.target.value;
                                    const prevWorker = workers.find(u => String(u?.id) === String(formData.worker_id));
                                    const newWorker  = workers.find(u => String(u?.id) === String(newWorkerId));
                                    const deptChanged = prevWorker?.company_id !== newWorker?.company_id;
                                    setFormData(p => ({
                                        ...p,
                                        worker_id: newWorkerId,
                                        ...(deptChanged && { location_id: '', asset_id: '' }),
                                    }));
                                    if (deptChanged) setSelectedCategory('');
                                }}
                            >
                                <option value="">{t.select_worker || 'Select Worker...'}</option>
                                {workers.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Location */}
                    {(isBigBoss || locations.length > 0) && (
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                                {t.location || 'Location'}
                            </label>
                            <select
                                className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67] disabled:opacity-50"
                                value={formData.location_id}
                                onChange={e => setFormData(p => ({ ...p, location_id: e.target.value }))}
                                disabled={isBigBoss && !formData.worker_id}
                            >
                                <option value="">{t.select_location || 'Select Location...'}</option>
                                {filteredLocations.map(l => (
                                    <option key={l.id} value={l.id}>{l['name_' + lang] || l.name_en || l.name}</option>
                                ))}
                            </select>
                            {isBigBoss && !formData.worker_id && (
                                <p className="text-xs text-gray-400 mt-1">{t.select_worker_first || 'Select a worker first'}</p>
                            )}
                        </div>
                    )}

                    {/* Category + Asset */}
                    {(isBigBoss || categories.length > 0) && (
                        <div className={isBigBoss && !formData.worker_id ? 'opacity-50 pointer-events-none' : ''}>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                                {t.select_asset_title || 'Asset (Optional)'}
                            </label>
                            {isBigBoss && !formData.worker_id && (
                                <p className="text-xs text-gray-400 mb-1">{t.select_worker_first || 'Select a worker first'}</p>
                            )}
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67] text-sm"
                                    value={selectedCategory}
                                    onChange={e => {
                                        setSelectedCategory(e.target.value);
                                        setFormData(p => ({ ...p, asset_id: '' }));
                                    }}
                                >
                                    <option value="">{t.category_label || 'Category'}</option>
                                    {filteredCategories.map(c => (
                                        <option key={c.id} value={c.id}>{c['name_' + lang] || c.name_en || c.name}</option>
                                    ))}
                                </select>
                                <select
                                    className="flex-1 p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67] text-sm disabled:opacity-50"
                                    disabled={!selectedCategory}
                                    value={formData.asset_id}
                                    onChange={e => setFormData(p => ({ ...p, asset_id: e.target.value }))}
                                >
                                    <option value="">{t.select_asset || 'Asset'}</option>
                                    {filteredAssets.map(a => (
                                        <option key={a.id} value={a.id}>{a['name_' + lang] || a.name_en || a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Title EN + optional HE/TH */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                            {t.task_title_label || 'Task Title'} <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                className="w-full p-3 pr-14 border rounded-lg bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none transition"
                                value={formData.title_en}
                                onChange={e => setFormData(p => ({ ...p, title_en: e.target.value }))}
                                placeholder={t.task_title_placeholder || 'Task title in English...'}
                                dir="ltr"
                            />
                            <button
                                type="button"
                                title={t.add_translations || 'Add translations (HE / TH)'}
                                onClick={() => setShowLangFields(v => !v)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition select-none
                                    ${showLangFields
                                        ? 'text-white bg-[#714B67] border-[#714B67]'
                                        : 'text-[#714B67] bg-purple-50 border-purple-200 hover:bg-purple-100'
                                    }`}
                            >
                                EN
                            </button>
                        </div>

                        {showLangFields && (
                            <div className="space-y-2 mt-2 pl-1 border-l-2 border-purple-100 animate-fade-in">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
                                        <span className="text-[10px] font-bold text-white bg-[#714B67] px-1.5 py-0.5 rounded-md leading-none">HE</span>
                                        {t.title_he_label || 'Hebrew (עברית)'}
                                    </label>
                                    <input
                                        className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none"
                                        value={formData.title_he}
                                        onChange={e => setFormData(p => ({ ...p, title_he: e.target.value }))}
                                        placeholder={t.task_title_he_placeholder || 'שם המשימה בעברית...'}
                                        dir="rtl"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5 mb-1">
                                        <span className="text-[10px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded-md leading-none">TH</span>
                                        {t.title_th_label || 'Thai (ภาษาไทย)'}
                                    </label>
                                    <input
                                        className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#714B67] outline-none"
                                        value={formData.title_th}
                                        onChange={e => setFormData(p => ({ ...p, title_th: e.target.value }))}
                                        placeholder={t.task_title_th_placeholder || 'ชื่องานภาษาไทย...'}
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                            {t.description_label || 'Description'}
                        </label>
                        <textarea
                            className="w-full p-3 border rounded-lg bg-gray-50 h-24 resize-none outline-none focus:bg-white focus:ring-1 focus:ring-[#714B67]"
                            value={formData.description}
                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        />
                    </div>

                    {/* Media — existing thumbnails grid + new upload */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                            {t.media_label || 'Attach Media (Optional)'}
                        </label>

                        {/* Existing images grid — one thumbnail per URL with individual X */}
                        {existingImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {existingImages.map((url, idx) => (
                                    <div key={url} className="relative inline-block">
                                        {/\.(mp4|mov|webm|ogg)(\?|$)/i.test(url) ? (
                                            <video
                                                src={url}
                                                className="h-20 w-auto rounded-lg border border-gray-200 object-cover"
                                                muted
                                                playsInline
                                            />
                                        ) : (
                                            <img
                                                src={url}
                                                alt={`media ${idx + 1}`}
                                                className="h-20 w-auto rounded-lg border border-gray-200 object-cover"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition shadow"
                                            title={t.remove_file || 'Remove'}
                                        >
                                            <X size={12}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* New files preview */}
                        {newFiles.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {newFiles.map((f, idx) => (
                                    <div key={idx} className="relative inline-block">
                                        <img
                                            src={URL.createObjectURL(f)}
                                            alt={f.name}
                                            className="h-20 w-auto rounded-lg border border-dashed border-[#714B67]/40 object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition shadow"
                                            title={t.remove_file || 'Remove'}
                                        >
                                            <X size={12}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* File picker — multiple */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={e => {
                                const picked = Array.from(e.target.files || []);
                                if (picked.length) setNewFiles(prev => [...prev, ...picked]);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#714B67] hover:text-[#714B67] transition w-full justify-center"
                        >
                            <Paperclip size={16}/>
                            {t.attach_file_btn || 'Add images or videos...'}
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-xl">{error}</div>
                    )}

                    {/* Recurring scope prompt — shown after first submit attempt */}
                    {recurringPrompt && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                            <p className="text-sm font-semibold text-amber-800">
                                {t.recurring_update_prompt || 'This is a recurring task. Apply changes to:'}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => submitUpdate('single')}
                                    disabled={loading}
                                    className="flex-1 py-2.5 border border-amber-300 bg-white text-amber-800 rounded-xl font-bold text-sm hover:bg-amber-50 transition disabled:opacity-60"
                                >
                                    {t.update_this_task_only || 'This Task Only'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => submitUpdate('set')}
                                    disabled={loading}
                                    className="flex-1 py-2.5 bg-[#714B67] text-white rounded-xl font-bold text-sm hover:bg-[#5a3b52] transition disabled:opacity-60"
                                >
                                    {t.update_entire_set || 'Entire Set'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Cancel / Save — hidden once recurring prompt is active */}
                    {!recurringPrompt && (
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 border rounded-xl bg-white text-gray-600 hover:bg-gray-50 font-medium"
                            >
                                {t.cancel || 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2.5 bg-[#714B67] text-white rounded-xl font-bold hover:bg-[#5a3b52] transition disabled:opacity-60"
                            >
                                {loading ? '...' : (t.save_changes_btn || 'Save Changes')}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>,
        document.body
    );
};

export default EditTaskModal;
