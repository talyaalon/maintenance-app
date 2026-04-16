import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Paperclip } from 'lucide-react';

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
    });

    const [selectedCategory, setSelectedCategory] = useState('');
    const [workers, setWorkers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);

    const [mediaFile, setMediaFile] = useState(null);
    const fileInputRef = useRef(null);

    const [showLangFields, setShowLangFields] = useState(!!(task.title_he || task.title_th));
    const [recurringPrompt, setRecurringPrompt] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

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

    const filteredAssets = selectedCategory
        ? assets.filter(a => String(a?.category_id) === String(selectedCategory))
        : [];

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
            let res;
            if (mediaFile) {
                // Multipart submission when a new file is attached
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
                if (formData.due_date) fd.append('due_date', formData.due_date);
                fd.append('media', mediaFile);

                res = await fetch(`${BASE}/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fd,
                });
            } else {
                res = await fetch(`${BASE}/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        title_en: formData.title_en,
                        title_he: formData.title_he,
                        title_th: formData.title_th,
                        description: formData.description,
                        urgency: formData.urgency,
                        worker_id: formData.worker_id || null,
                        location_id: formData.location_id || null,
                        asset_id: formData.asset_id || null,
                        category_id: selectedCategory || null,
                        update_mode,
                        due_date: formData.due_date || undefined,
                    }),
                });
            }

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

    if (showSuccess) return createPortal(
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[10000]">
            <div className="bg-white p-8 rounded-3xl animate-scale-in flex flex-col items-center">
                <Check size={40} className="text-green-600 mb-2"/>
                <h2 className="text-xl font-bold">{t.alert_sent || 'Saved!'}</h2>
            </div>
        </div>,
        document.body
    );

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

                    {/* Due Date */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                            {t.due_date_label || 'Due Date'}
                        </label>
                        <input
                            type="datetime-local"
                            className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67]"
                            value={formData.due_date}
                            onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                        />
                        {isRecurringSeries && (
                            <p className="text-xs text-amber-600 mt-1">
                                {t.recurring_date_hint || 'For "Entire Set": future tasks will be shifted by the same time difference.'}
                            </p>
                        )}
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
                                onChange={e => setFormData(p => ({ ...p, worker_id: e.target.value }))}
                            >
                                <option value="">{t.select_worker || 'Select Worker...'}</option>
                                {workers.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Location */}
                    {locations.length > 0 && (
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                                {t.location || 'Location'}
                            </label>
                            <select
                                className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:border-[#714B67]"
                                value={formData.location_id}
                                onChange={e => setFormData(p => ({ ...p, location_id: e.target.value }))}
                            >
                                <option value="">{t.select_location || 'Select Location...'}</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l['name_' + lang] || l.name_en || l.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Category + Asset */}
                    {categories.length > 0 && (
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                                {t.select_asset_title || 'Asset (Optional)'}
                            </label>
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
                                    {categories.map(c => (
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

                    {/* Media Upload */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                            {t.media_label || 'Attach Media (Optional)'}
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={e => setMediaFile(e.target.files[0] || null)}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#714B67] hover:text-[#714B67] transition w-full justify-center"
                        >
                            <Paperclip size={16}/>
                            {mediaFile ? mediaFile.name : (t.attach_file_btn || 'Choose image or video...')}
                        </button>
                        {mediaFile && (
                            <button
                                type="button"
                                onClick={() => { setMediaFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="mt-1 text-xs text-red-500 hover:underline"
                            >
                                {t.remove_file || 'Remove'}
                            </button>
                        )}
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
