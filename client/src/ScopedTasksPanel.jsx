import { useState, useEffect } from 'react';
import { ClipboardList, Plus, X, Loader2 } from 'lucide-react';

const BASE = 'https://maintenance-app-staging.onrender.com';

// ─── Bangkok datetime helper ───────────────────────────────────────────────────
const getBkkNowForInput = () => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts = {};
    fmt.formatToParts(new Date()).forEach(p => { parts[p.type] = p.value; });
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const formatBkkDate = (ds) => {
    if (!ds) return '';
    try {
        const p = {};
        new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Bangkok', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(new Date(ds)).forEach(x => { p[x.type] = x.value; });
        return `${p.day}/${p.month} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
    } catch { return ''; }
};

// ─── Mini status chip ─────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
    if (status === 'COMPLETED')
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 shrink-0">Done</span>;
    if (status === 'WAITING_APPROVAL')
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">Waiting</span>;
    return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">Pending</span>;
};

// ─── Shared input/label styles (match parent components) ──────────────────────
const inputCls = "w-full p-2 border rounded-lg bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-xs transition";
const labelCls = "text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-0.5";
const saveBtnCls = "flex-1 py-1.5 text-xs bg-[#714B67] text-white rounded-lg font-bold hover:bg-[#5a3b52] transition disabled:opacity-60 flex items-center justify-center gap-1";
const cancelBtnCls = "flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition";

// ─── ScopedTasksPanel ─────────────────────────────────────────────────────────
// Renders as an inline accordion row-panel in CompaniesTab / CompanyManagerSettingsTab.
// • scopedUser      – the MANAGER or EMPLOYEE whose tasks we're viewing
// • scopedUserRole  – 'MANAGER' | 'EMPLOYEE'
// • currentUser     – logged-in user (BIG_BOSS or COMPANY_MANAGER)
// • token           – JWT
// • lang            – active display language
// • t               – translations object (optional, falls back to English)
const ScopedTasksPanel = ({ scopedUser, scopedUserRole, currentUser, token, lang, t }) => {
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [managerEmployees, setManagerEmployees] = useState([]);
    const [locations, setLocations] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', due_date: getBkkNowForInput(), location_id: '', description: '', assigned_worker_id: '' });
    const [submitting, setSubmitting] = useState(false);

    const isManagerScope = scopedUserRole === 'MANAGER';
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const userName = u => u?.['full_name_' + lang] || u?.full_name_en || u?.full_name || u?.name || '—';

    // ── Fetch tasks ────────────────────────────────────────────────────────────
    const fetchTasks = async () => {
        setLoadingTasks(true);
        try {
            const r = await fetch(`${BASE}/tasks/user/${scopedUser.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await r.json().catch(() => []);
            setTasks(Array.isArray(d) ? d : []);
        } catch { setTasks([]); }
        setLoadingTasks(false);
    };

    // ── Fetch manager's assigned employees (for assignee dropdown) ─────────────
    const fetchManagerEmployees = async () => {
        try {
            const r = await fetch(`${BASE}/users?manager_id=${scopedUser.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await r.json().catch(() => []);
            setManagerEmployees(Array.isArray(d) ? d : []);
        } catch { setManagerEmployees([]); }
    };

    // ── Fetch locations (scoped by company) ───────────────────────────────────
    const fetchLocations = async () => {
        try {
            const cid = scopedUser?.company_id || currentUser?.company_id;
            const qs = cid ? `?company_id=${cid}` : '';
            const r = await fetch(`${BASE}/locations${qs}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await r.json().catch(() => []);
            setLocations(Array.isArray(d) ? d : []);
        } catch { setLocations([]); }
    };

    useEffect(() => {
        fetchTasks();
        fetchLocations();
        if (isManagerScope) fetchManagerEmployees();
    }, [scopedUser.id, token]);

    // ── Assignable employees for create form ──────────────────────────────────
    const assignableEmployees = isManagerScope ? managerEmployees : [scopedUser];

    // ── Open create form with defaults ────────────────────────────────────────
    const openCreate = () => {
        const defaultWorker = assignableEmployees[0]?.id ?? scopedUser.id;
        setForm({ title: '', due_date: getBkkNowForInput(), location_id: '', description: '', assigned_worker_id: String(defaultWorker) });
        setShowCreate(true);
    };

    // ── Submit new task ───────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!form.title.trim()) { alert('Title is required'); return; }
        if (!form.location_id) { alert('Location is required'); return; }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('due_date', form.due_date);
            fd.append('location_id', form.location_id);
            fd.append('description', form.description);
            fd.append('assigned_worker_id', form.assigned_worker_id || String(scopedUser.id));
            fd.append('urgency', 'Normal');
            const r = await fetch(`${BASE}/tasks`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            if (r.ok) {
                setShowCreate(false);
                fetchTasks();
            } else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error || 'Error creating task');
            }
        } catch { alert('Server error'); }
        setSubmitting(false);
    };

    const panelTitle = isManagerScope
        ? `Tasks — ${userName(scopedUser)}'s Team`
        : `Tasks — ${userName(scopedUser)}`;

    return (
        <div className="mt-2 pt-3 border-y border-slate-200 space-y-2 animate-fade-in bg-slate-50 shadow-inner rounded-b-xl -mx-4 px-4 pb-3">

            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider flex items-center gap-1">
                    <ClipboardList size={10} />
                    {panelTitle}
                </p>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#714B67] text-white text-[10px] font-bold hover:bg-[#5a3b52] transition"
                >
                    <Plus size={10} /> Add Task
                </button>
            </div>

            {/* ── Create task mini-form ────────────────────────────────────── */}
            {showCreate && (
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">New Task</p>
                        <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={12} />
                        </button>
                    </div>

                    <div>
                        <label className={labelCls}>Title *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Assign To</label>
                        {isManagerScope ? (
                            <select
                                value={form.assigned_worker_id}
                                onChange={e => set('assigned_worker_id', e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                            >
                                {assignableEmployees.length === 0 && (
                                    <option value="">No employees assigned to this manager</option>
                                )}
                                {assignableEmployees.map(e => (
                                    <option key={e.id} value={String(e.id)}>{userName(e)}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={userName(scopedUser)}
                                readOnly
                                className="w-full p-2 border rounded-lg bg-gray-50 text-xs text-gray-500 cursor-not-allowed outline-none"
                            />
                        )}
                    </div>

                    <div>
                        <label className={labelCls}>Due Date</label>
                        <input
                            type="datetime-local"
                            value={form.due_date}
                            onChange={e => set('due_date', e.target.value)}
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Location *</label>
                        <select
                            value={form.location_id}
                            onChange={e => set('location_id', e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                        >
                            <option value="">Select location…</option>
                            {locations.map(l => (
                                <option key={l.id} value={String(l.id)}>
                                    {l['name_' + lang] || l.name_en || l.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            rows={2}
                            className="w-full p-2 border rounded-lg bg-white focus:ring-1 focus:ring-[#714B67] outline-none text-xs transition resize-none"
                        />
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button onClick={() => setShowCreate(false)} className={cancelBtnCls}>
                            {t?.cancel || 'Cancel'}
                        </button>
                        <button onClick={handleSubmit} disabled={submitting} className={saveBtnCls}>
                            {submitting && <Loader2 size={10} className="animate-spin" />}
                            Create Task
                        </button>
                    </div>
                </div>
            )}

            {/* ── Task list ────────────────────────────────────────────────── */}
            {loadingTasks ? (
                <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-[#714B67]" />
                </div>
            ) : tasks.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No tasks found.</p>
            ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-white border border-gray-100 rounded-lg px-3 py-2 flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{task.title}</p>
                                {task.worker_name && isManagerScope && (
                                    <p className="text-[10px] text-gray-400">{task.worker_name}</p>
                                )}
                                <p className="text-[10px] text-gray-400">{formatBkkDate(task.due_date)}</p>
                            </div>
                            <StatusChip status={task.status} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScopedTasksPanel;
