import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import TasksTab from './TasksTab';

const BASE = 'https://maintenance-app-staging.onrender.com';

// ─── ScopedTasksModal ──────────────────────────────────────────────────────────
// Full-screen overlay that renders the main TasksTab scoped to a specific user.
// Used when clicking a user's name in the Config/Companies admin lists.
//
// Props:
//   scopedUser      – the user object (MANAGER, SUPERVISOR, or EMPLOYEE) whose tasks to show
//   scopedUserRole  – 'MANAGER' | 'EMPLOYEE'  (controls subordinates fetch)
//   token           – JWT
//   lang            – active language code
//   t               – translations object
//   onClose         – callback to close the modal
const ScopedTasksModal = ({ scopedUser, scopedUserRole, token, lang, t, onClose }) => {
    const [tasks, setTasks]           = useState([]);
    const [subordinates, setSubordinates] = useState(undefined);
    const [loading, setLoading]       = useState(true);

    const isManagerScope = scopedUserRole === 'MANAGER';

    const userName = u =>
        u?.['full_name_' + lang] || u?.full_name_en || u?.full_name || u?.name || '—';

    // ── Fetch scoped user's tasks ──────────────────────────────────────────────
    const fetchTasks = async () => {
        try {
            const r = await fetch(`${BASE}/tasks/user/${scopedUser.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await r.json().catch(() => []);
            setTasks(Array.isArray(d) ? d : []);
        } catch {
            setTasks([]);
        }
    };

    // ── Initial load ───────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchTasks();
            if (isManagerScope) {
                try {
                    const r = await fetch(`${BASE}/users?manager_id=${scopedUser.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const d = await r.json().catch(() => []);
                    setSubordinates(Array.isArray(d) ? d : []);
                } catch {
                    setSubordinates([]);
                }
            }
            setLoading(false);
        };
        load();
    }, [scopedUser.id, token]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="fixed inset-0 z-[300] bg-white flex flex-col">

            {/* ── Header bar ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-slate-50 shrink-0">
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#714B67] text-white text-xs font-bold hover:bg-[#5a3b52] transition shrink-0"
                >
                    <ArrowLeft size={14} /> Back
                </button>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{userName(scopedUser)}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                        {scopedUserRole} · Tasks View
                    </p>
                </div>
            </div>

            {/* ── Content ────────────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-[#714B67]" />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    <TasksTab
                        tasks={tasks}
                        t={t}
                        token={token}
                        user={scopedUser}
                        onRefresh={fetchTasks}
                        lang={lang}
                        subordinates={isManagerScope ? subordinates : undefined}
                    />
                </div>
            )}
        </div>
    );
};

export default ScopedTasksModal;
