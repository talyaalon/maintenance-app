import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

const BASE = 'https://maintenance-app-staging.onrender.com';

const EditTaskModal = ({ task, onClose, token, t, onRefresh }) => {
    const isRecurringSeries = task.title && task.title.endsWith(' (Recurring)');

    const stripRecurringSuffix = (str) => (str || '').replace(' (Recurring)', '');

    const [formData, setFormData] = useState({
        title_en: stripRecurringSuffix(task.title_en || task.title || ''),
        title_he: stripRecurringSuffix(task.title_he || ''),
        title_th: stripRecurringSuffix(task.title_th || ''),
        description: task.description || '',
        urgency: task.urgency || 'Normal',
    });

    const [showLangFields, setShowLangFields] = useState(!!(task.title_he || task.title_th));
    const [recurringPrompt, setRecurringPrompt] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

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
            const res = await fetch(`${BASE}/tasks/${task.id}`, {
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
                    update_mode,
                }),
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
        } catch {
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
