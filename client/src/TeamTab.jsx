import { useState, useEffect } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, User, X, Plus, Save, Eye, EyeOff } from 'lucide-react';
import TasksTab from './TasksTab';

// ─── Branded delete-confirm modal ────────────────────────────────────────────
const ConfirmDeleteModal = ({ message, onConfirm, onCancel, t }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-200 animate-scale-in">
            <p className="text-gray-800 font-medium text-center mb-6">{message}</p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition"
                >
                    {t?.cancel || 'Cancel'}
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition"
                >
                    {t?.delete_btn || 'Delete'}
                </button>
            </div>
        </div>
    </div>
);

// ─── Skeleton loader row ──────────────────────────────────────────────────────
const SkeletonRow = ({ indent = false }) => (
    <div className={`bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3 animate-pulse mb-3 ${indent ? 'ml-3 sm:ml-6' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-2/5" />
            <div className="h-2.5 bg-gray-100 rounded w-3/5" />
        </div>
    </div>
);

// ─── Role badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role, t }) => {
    if (role === 'BIG_BOSS')
        return <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">Admin</span>;
    if (role === 'MANAGER')
        return <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-semibold">{t?.role_area_manager || 'Area Manager'}</span>;
    if (role === 'SUPERVISOR')
        return <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">{t?.role_dept_manager || 'Dept Manager'}</span>;
    if (role === 'EMPLOYEE')
        return <span className="text-[10px] bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-semibold">{t?.role_employee || 'Employee'}</span>;
    return null;
};

const TeamTab = ({ token, t, user, lang }) => {
    const [team, setTeam] = useState([]);
    const [isLoadingTeam, setIsLoadingTeam] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    const [editMember, setEditMember] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '', full_name_he: '', full_name_en: '', full_name_th: '', email: '', phone: '', role: '', password: '', line_user_id: '' });
    const [showPassword, setShowPassword] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        full_name: '', full_name_he: '', full_name_en: '', full_name_th: '',
        email: '', password: '', phone: '', role: 'EMPLOYEE',
        parent_manager_id: '', preferred_language: 'he', line_user_id: ''
    });

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberTasks, setMemberTasks] = useState([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);

    // All managers/supervisors visible to the viewer (for parent dropdown)
    const activeManagers = (Array.isArray(team) ? team : []).filter(u => u?.role === 'MANAGER' || u?.role === 'BIG_BOSS' || u?.role === 'SUPERVISOR');

    useEffect(() => { fetchTeam(); }, []);

    const fetchTeam = async () => {
        setIsLoadingTeam(true);
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const raw = await res.json();
                const data = Array.isArray(raw) ? raw : [];
                setTeam(data);
                // Auto-expand all area managers and dept managers
                const toExpand = data
                    .filter(u => u?.role === 'MANAGER' || u?.role === 'SUPERVISOR')
                    .map(u => u.id);
                setExpandedNodes(new Set(toExpand));
            }
        } catch (e) { console.error(e); }
        finally { setIsLoadingTeam(false); }
    };

    const toggleNode = (id) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleMemberClick = async (member) => {
        if (user.role === 'EMPLOYEE') return;
        setSelectedMember(member);
        setIsLoadingTasks(true);
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/tasks/user/${member.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setMemberTasks(await res.json());
        } catch (e) { console.error("Error fetching tasks", e); }
        finally { setIsLoadingTasks(false); }
    };

    const confirmDelete = async () => {
        const userId = deleteConfirmId;
        setDeleteConfirmId(null);
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchTeam();
            else {
                const d = await res.json();
                alert(d.error || "Error deleting user");
            }
        } catch (e) { alert("Server error"); }
    };

    const openEditModal = (member) => {
        setEditMember(member);
        setEditForm({
            full_name: member.full_name || '',
            full_name_he: member.full_name_he || '',
            full_name_en: member.full_name_en || member.full_name || '',
            full_name_th: member.full_name_th || '',
            email: member.email || '',
            phone: member.phone || '',
            role: member.role,
            password: '',
            line_user_id: member.line_user_id || ''
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/users/${editMember.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            if (res.ok) { setShowEditModal(false); fetchTeam(); }
            else alert(data.error === "Email already exists" ? (t.error_email_exists || "Email already exists") : "Error updating user");
        } catch (e) { alert("Server error"); }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        let payload = { ...addForm };
        if (user.role === 'MANAGER' || user.role === 'SUPERVISOR') {
            payload.parent_manager_id = user.id;
            payload.role = 'EMPLOYEE';
        }
        if (payload.role === 'MANAGER' || payload.role === 'SUPERVISOR') payload.parent_manager_id = null;

        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                setShowAddModal(false);
                setAddForm({ full_name: '', full_name_he: '', full_name_en: '', full_name_th: '', email: '', password: '', phone: '', role: 'EMPLOYEE', parent_manager_id: '', preferred_language: 'he', line_user_id: '' });
                fetchTeam();
            } else {
                alert(data.error === "Email already exists"
                    ? (t.error_email_exists || "Email already exists")
                    : ("Error: " + (data.error || "Failed")));
            }
        } catch (e) { alert("Server Error"); }
    };

    // ─── Member row renderer ───────────────────────────────────────────────────
    const renderMemberRow = (member, depth = 0) => {
        const displayName = member['full_name_' + lang] || member.full_name_en || member.full_name || '?';
        const initial = displayName.charAt(0).toUpperCase();
        const isExpandable = member.role === 'MANAGER' || member.role === 'SUPERVISOR';
        const indentClass = depth === 1 ? 'ml-4 sm:ml-6' : depth === 2 ? 'ml-8 sm:ml-12' : depth === 3 ? 'ml-12 sm:ml-16' : '';
        const borderClass = depth === 1 ? 'border-l-4 border-l-indigo-200' : depth === 2 ? 'border-l-4 border-l-blue-200' : depth === 3 ? 'border-l-4 border-l-green-200' : '';

        return (
            <div key={member.id} className={`bg-white p-3 sm:p-4 rounded-xl border border-gray-200 flex justify-between items-center ${indentClass} ${borderClass} mb-1`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 border-2 border-gray-200 bg-slate-50 flex items-center justify-center">
                        {member.profile_picture_url ? (
                            <img src={member.profile_picture_url} alt={member.full_name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-sm font-bold text-[#714B67]">{initial}</span>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span
                            onClick={() => handleMemberClick(member)}
                            className={`font-semibold text-slate-800 text-sm sm:text-base leading-tight ${user.role !== 'EMPLOYEE' ? 'cursor-pointer hover:text-[#714B67]' : ''}`}
                        >
                            {displayName}
                        </span>
                        <div className="text-xs text-gray-500 truncate max-w-[180px] sm:max-w-xs">
                            {member.email}{member.phone && ` | ${member.phone}`}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <RoleBadge role={member.role} t={t} />
                    <button onClick={() => openEditModal(member)} className="p-2 text-gray-400 hover:text-[#714B67] hover:bg-[#fdf4ff] rounded-full transition"><Edit2 size={16}/></button>
                    <button onClick={() => setDeleteConfirmId(member.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><Trash2 size={16}/></button>
                    {isExpandable && (
                        <button onClick={() => toggleNode(member.id)} className="p-1 text-gray-400 hover:text-[#714B67] transition">
                            {expandedNodes.has(member.id) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ─── 4-tier hierarchy builders ─────────────────────────────────────────────
    const safeTeam     = Array.isArray(team) ? team : [];
    const bigBosses    = safeTeam.filter(u => u?.role === 'BIG_BOSS');
    const areaManagers = safeTeam.filter(u => u?.role === 'MANAGER');
    const deptManagers = safeTeam.filter(u => u?.role === 'SUPERVISOR');
    const employees    = safeTeam.filter(u => u?.role === 'EMPLOYEE');

    // Render Employees under a given parent id
    const renderEmployees = (parentId) => {
        if (parentId == null) return null;
        const emps = employees.filter(e => e.parent_manager_id === parentId);
        if (emps.length === 0) return null;
        return (
            <div className="space-y-1 mt-1">
                {emps.map(emp => renderMemberRow(emp, 3))}
            </div>
        );
    };

    // Render DeptManagers AND direct Employees under a given AreaManager id.
    // DeptManager is OPTIONAL — direct employees are shown at the same level as DeptManagers.
    const renderDeptManagers = (areaManagerId) => {
        if (areaManagerId == null) return null;
        const depts = deptManagers.filter(d => d.parent_manager_id === areaManagerId);
        // Employees reporting directly to this AreaManager (no DeptManager)
        const directEmps = employees.filter(e => e.parent_manager_id === areaManagerId);
        if (depts.length === 0 && directEmps.length === 0) {
            return <p className="text-sm text-gray-400 text-center py-2 ml-8">{t?.no_employees_assigned || 'No team members assigned'}</p>;
        }
        return (
            <div className="space-y-1 mt-1">
                {depts.map(dept => (
                    <div key={dept.id}>
                        {renderMemberRow(dept, 2)}
                        {expandedNodes.has(dept.id) && (
                            <div className="animate-fade-in">
                                {renderEmployees(dept.id) || (
                                    <p className="text-sm text-gray-400 text-center py-2 ml-12">{t?.no_employees_assigned || 'No employees assigned'}</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {/* Direct employees (no DeptManager) — rendered at the same level as DeptManagers */}
                {directEmps.map(emp => renderMemberRow(emp, 2))}
            </div>
        );
    };

    // ─── Unassigned / Legacy: users not connected to any manager in the tree ──
    const renderUnassignedSection = () => {
        // Build the set of user IDs that WILL be rendered in the main hierarchy
        const renderedIds = new Set();
        bigBosses.forEach(b => renderedIds.add(b.id));
        areaManagers.forEach(am => {
            renderedIds.add(am.id);
            deptManagers
                .filter(d => d?.parent_manager_id === am.id)
                .forEach(d => {
                    renderedIds.add(d.id);
                    employees
                        .filter(e => e?.parent_manager_id === d.id)
                        .forEach(e => renderedIds.add(e.id));
                });
            employees
                .filter(e => e?.parent_manager_id === am.id)
                .forEach(e => renderedIds.add(e.id));
        });
        const orphans = safeTeam.filter(u => u?.role !== 'BIG_BOSS' && u?.role !== 'MANAGER' && !renderedIds.has(u?.id));
        if (orphans.length === 0) return null;
        return (
            <div className="mt-4">
                <p className="text-xs text-amber-600 font-semibold mb-2 px-1">⚠️ {t?.unassigned_legacy || 'Unassigned / Legacy'}</p>
                <div className="space-y-1">
                    {orphans.map(u => renderMemberRow(u, 0))}
                </div>
            </div>
        );
    };

    // ─── View for BIG_BOSS or MANAGER (AreaManager) viewers ───────────────────
    const renderFullHierarchy = () => {
        const isBigBoss = user?.role === 'BIG_BOSS';

        if (isBigBoss) {
            return (
                <>
                    {bigBosses.map(boss => renderMemberRow(boss, 0))}
                    {areaManagers.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">{t?.no_area_managers || 'No Area Managers assigned'}</p>
                    )}
                    {areaManagers.map(am => (
                        <div key={am.id} className="space-y-1">
                            {renderMemberRow(am, 1)}
                            {expandedNodes.has(am.id) && (
                                <div className="animate-fade-in">
                                    {renderDeptManagers(am.id)}
                                </div>
                            )}
                        </div>
                    ))}
                    {renderUnassignedSection()}
                </>
            );
        }

        // MANAGER (AreaManager) viewer: sees DeptManagers + direct Employees (DeptManager is optional)
        const myDepts = deptManagers.filter(d => d?.parent_manager_id === user?.id);
        const myDirectEmps = employees.filter(e => e?.parent_manager_id === user?.id);

        return (
            <>
                {myDepts.map(dept => (
                    <div key={dept.id}>
                        {renderMemberRow(dept, 0)}
                        {expandedNodes.has(dept.id) && (
                            <div className="animate-fade-in">
                                {renderEmployees(dept.id) || (
                                    <p className="text-sm text-gray-400 text-center py-2 ml-8">{t?.no_employees_assigned || 'No employees assigned'}</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {myDirectEmps.map(emp => renderMemberRow(emp, 0))}
                {myDepts.length === 0 && myDirectEmps.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">{t?.no_employees_assigned || 'No employees assigned'}</p>
                )}
            </>
        );
    };

    // ─── View for SUPERVISOR (DeptManager) viewer ──────────────────────────────
    const renderDeptManagerView = () => {
        // Only show employees that directly report to this DeptManager
        const uniqueEmps = employees.filter(e => e?.parent_manager_id === user?.id);
        return (
            <>
                {uniqueEmps.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">{t?.no_employees_assigned || 'No employees assigned'}</p>
                )}
                {uniqueEmps.map(emp => renderMemberRow(emp, 0))}
            </>
        );
    };

    return (
        <div className="px-3 sm:px-4 pt-3 pb-24 min-h-screen bg-slate-50">
            {deleteConfirmId !== null && (
                <ConfirmDeleteModal
                    message={t.confirm_delete_user || "Are you sure you want to delete this user?"}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfirmId(null)}
                    t={t}
                />
            )}

            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4">{t.my_team_title || t.nav_team || 'Team'}</h1>

            <div className="flex justify-end items-center mb-5">
                <button
                    className="bg-[#714B67] text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-[#5a3b52] transition flex items-center gap-1.5"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={18}/> {t.add_team_member || "Add User"}
                </button>
            </div>

            {/* Hierarchy Legend (Admin/AreaManager viewers only) */}
            {(user?.role === 'BIG_BOSS' || user?.role === 'MANAGER') && (
                <div className="flex gap-3 mb-4 flex-wrap text-xs text-gray-500">
                    {user?.role === 'BIG_BOSS' && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-400 inline-block"/> Admin</span>}
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-400 inline-block"/> {t.role_area_manager || 'Area Manager'}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block"/> {t.role_dept_manager || 'Dept Manager'}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block"/> {t.role_employee || 'Employee'}</span>
                </div>
            )}

            <div className="space-y-2 max-w-3xl mx-auto">
                {isLoadingTeam ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow indent />
                        <SkeletonRow indent />
                        <SkeletonRow indent />
                    </>
                ) : (
                    user?.role === 'SUPERVISOR'
                        ? renderDeptManagerView()
                        : renderFullHierarchy()
                )}
            </div>

            {/* Employee task view modal */}
            {selectedMember && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full h-full max-w-6xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                        <div className="bg-[#714B67] text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <User size={20}/> {t.viewing_as || "Viewing as"}: {selectedMember.full_name}
                                </h3>
                                <p className="text-xs text-purple-200 opacity-80">Full Access View</p>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-50 relative">
                            {isLoadingTasks ? (
                                <div className="flex justify-center items-center h-full text-[#714B67] font-bold gap-3">
                                    <span className="w-5 h-5 border-2 border-[#714B67] border-t-transparent rounded-full animate-spin"/>
                                    Loading...
                                </div>
                            ) : (
                                <div className="pointer-events-auto h-full">
                                    <TasksTab
                                        tasks={memberTasks}
                                        t={t}
                                        token={token}
                                        user={selectedMember}
                                        subordinates={team.filter(u => u.parent_manager_id === selectedMember.id)}
                                        onRefresh={() => handleMemberClick(selectedMember)}
                                        lang={lang}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{t.edit || "Edit"}</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"><X size={18}/></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700">{t.full_name_label}</label>
                                <input dir="rtl" className="w-full p-2 border rounded text-sm" placeholder="שם בעברית" value={editForm.full_name_he} onChange={e => setEditForm({...editForm, full_name_he: e.target.value})} />
                                <input dir="ltr" className="w-full p-2 border rounded text-sm" placeholder="Name in English" required value={editForm.full_name_en} onChange={e => setEditForm({...editForm, full_name_en: e.target.value, full_name: e.target.value})} />
                                <input dir="ltr" className="w-full p-2 border rounded text-sm" placeholder="ชื่อภาษาไทย" value={editForm.full_name_th} onChange={e => setEditForm({...editForm, full_name_th: e.target.value})} />
                            </div>
                            {user.role === 'BIG_BOSS' && editMember && editMember.role !== 'BIG_BOSS' && (
                                <div>
                                    <label className="text-sm font-bold text-gray-700">{t.role_label || 'Role'}</label>
                                    <select
                                        className="w-full p-2 border rounded bg-white"
                                        value={editForm.role}
                                        onChange={e => setEditForm({...editForm, role: e.target.value})}
                                    >
                                        <option value="EMPLOYEE">{t.role_employee || 'Employee'}</option>
                                        <option value="SUPERVISOR">{t.role_dept_manager || 'Dept Manager'}</option>
                                        <option value="MANAGER">{t.role_area_manager || 'Area Manager'}</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-bold text-gray-700">{t.email_label}</label>
                                <input className="w-full p-2 border rounded" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700">{t.phone_label}</label>
                                <input className="w-full p-2 border rounded" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="050-0000000" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700">{t.line_user_id || "LINE User ID"}</label>
                                <input className="w-full p-2 border rounded" dir="ltr" placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={editForm.line_user_id} onChange={e => setEditForm({...editForm, line_user_id: e.target.value})} />
                            </div>
                            <div className="relative">
                                <label className="text-sm font-bold text-gray-700">{t.new_password || "New Password"}</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full p-2 border rounded pr-10"
                                    placeholder={t.optional || "Optional"}
                                    value={editForm.password}
                                    onChange={e => setEditForm({...editForm, password: e.target.value})}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-8 right-2 text-gray-400">
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 border rounded">{t.cancel}</button>
                                <button type="submit" className="flex-1 py-2 bg-[#714B67] text-white rounded font-bold hover:bg-[#5a3b52] transition">{t.save}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-xl border border-gray-200 animate-scale-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">{t.add_team_member || "Add User"}</h3>
                            <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleAddUser} className="space-y-3">
                            <div className="space-y-1.5">
                                <p className="text-xs font-bold text-gray-500">{t.full_name_label || 'Name'}</p>
                                <input dir="rtl" className="w-full p-2 border rounded-xl text-sm" placeholder="שם בעברית" value={addForm.full_name_he} onChange={e => setAddForm({...addForm, full_name_he: e.target.value})} />
                                <input dir="ltr" className="w-full p-2 border rounded-xl text-sm" placeholder="Name in English" required value={addForm.full_name_en} onChange={e => setAddForm({...addForm, full_name_en: e.target.value, full_name: e.target.value})} />
                                <input dir="ltr" className="w-full p-2 border rounded-xl text-sm" placeholder="ชื่อภาษาไทย" value={addForm.full_name_th} onChange={e => setAddForm({...addForm, full_name_th: e.target.value})} />
                            </div>
                            <input className="w-full p-3 border rounded-xl" placeholder={t.email_label || "Email"} type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} required dir="ltr" />
                            <input className="w-full p-3 border rounded-xl" placeholder={t.password_placeholder || "Password"} value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} required dir="ltr" />
                            <input className="w-full p-3 border rounded-xl" placeholder={t.phone_label || "Phone (Optional)"} value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} dir="ltr" />
                            <input className="w-full p-3 border rounded-xl" placeholder={t.line_user_id || "LINE User ID (Optional)"} value={addForm.line_user_id} onChange={e => setAddForm({...addForm, line_user_id: e.target.value})} dir="ltr" />

                            <select
                                className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-[#714B67]/30 outline-none"
                                value={addForm.preferred_language}
                                onChange={e => setAddForm({...addForm, preferred_language: e.target.value})}
                            >
                                <option value="he">עברית (Hebrew)</option>
                                <option value="en">English</option>
                                <option value="th">ภาษาไทย (Thai)</option>
                            </select>

                            {user.role === 'BIG_BOSS' && (
                                <div className="space-y-3">
                                    <select
                                        className="w-full p-3 border rounded-xl bg-white"
                                        value={addForm.role}
                                        onChange={e => setAddForm({ ...addForm, role: e.target.value, parent_manager_id: '' })}
                                    >
                                        <option value="EMPLOYEE">{t.role_employee || "Employee"}</option>
                                        <option value="SUPERVISOR">{t.role_dept_manager || "Dept Manager"}</option>
                                        <option value="MANAGER">{t.role_area_manager || "Area Manager"}</option>
                                    </select>

                                    {(addForm.role === 'EMPLOYEE' || addForm.role === 'SUPERVISOR') && (
                                        <div className="relative">
                                            <p className="text-xs text-gray-500 mb-1">
                                                {addForm.role === 'SUPERVISOR'
                                                    ? (t.role_area_manager || 'Area Manager') + ' (parent)'
                                                    : (t.select_manager || 'Select Manager') + ' (' + (t.optional || 'Optional — leave blank for direct Area Manager') + ')'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setManagerDropdownOpen(o => !o)}
                                                className="w-full p-3 border rounded-xl bg-white flex items-center gap-2 text-left"
                                            >
                                                {addForm.parent_manager_id ? (() => {
                                                    const m = activeManagers.find(m => String(m.id) === String(addForm.parent_manager_id));
                                                    return m ? (
                                                        <>
                                                            <span className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[#714B67]/10 border border-[#714B67]/20 flex items-center justify-center">
                                                                {m.profile_picture_url
                                                                    ? <img src={m.profile_picture_url} alt={m.full_name} className="w-full h-full object-cover"/>
                                                                    : <span className="text-xs font-bold text-[#714B67]">{(m.full_name||'?').charAt(0).toUpperCase()}</span>}
                                                            </span>
                                                            <span className="text-gray-800 font-medium text-sm">{m.full_name}</span>
                                                        </>
                                                    ) : <span className="text-gray-400 text-sm">{t.select_manager || "Select Manager..."}</span>;
                                                })() : <span className="text-gray-400 text-sm">{t.select_manager || "Select Manager..."}</span>}
                                                <ChevronDown size={16} className="ml-auto text-gray-400 shrink-0"/>
                                            </button>
                                            {managerDropdownOpen && (
                                                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                    {activeManagers
                                                        .filter(m => addForm.role === 'SUPERVISOR' ? m.role === 'MANAGER' : true)
                                                        .map(m => (
                                                        <div
                                                            key={m.id}
                                                            onClick={() => { setAddForm({...addForm, parent_manager_id: m.id}); setManagerDropdownOpen(false); }}
                                                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#fdf4ff] transition ${String(addForm.parent_manager_id) === String(m.id) ? 'bg-[#fdf4ff]' : ''}`}
                                                        >
                                                            <span className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[#714B67]/10 border border-[#714B67]/20 flex items-center justify-center">
                                                                {m.profile_picture_url
                                                                    ? <img src={m.profile_picture_url} alt={m.full_name} className="w-full h-full object-cover"/>
                                                                    : <span className="text-xs font-bold text-[#714B67]">{(m.full_name||'?').charAt(0).toUpperCase()}</span>}
                                                            </span>
                                                            <span className="text-sm text-gray-700">
                                                                {m.full_name}
                                                                <span className="text-xs text-gray-400 ml-1">
                                                                    ({m.role === 'MANAGER' ? (t.role_area_manager || 'Area Mgr') : m.role === 'SUPERVISOR' ? (t.role_dept_manager || 'Dept Mgr') : m.role})
                                                                </span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button type="submit" className="w-full py-2.5 bg-[#714B67] hover:bg-[#5a3b52] text-white rounded-xl font-bold shadow-sm mt-2 flex justify-center items-center gap-2 transition text-sm">
                                <Save size={18}/> {t.save || "Create User"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamTab;
