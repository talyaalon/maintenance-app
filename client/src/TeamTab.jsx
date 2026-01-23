import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, User, X, Plus, Save, Eye, EyeOff } from 'lucide-react';
import TasksTab from './TasksTab'; 

const TeamTab = ({ token, t, user, onRefresh, lang }) => {
    // --- 1. State for Team Management ---
    const [team, setTeam] = useState([]);
    const [expandedManager, setExpandedManager] = useState(null);
    
    // --- 2. State for Editing User ---
    const [editMember, setEditMember] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    // --- משתנים להוספת משתמש חדש ---
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '', phone: '', role: 'EMPLOYEE', parent_manager_id: '' });

    // רשימת המנהלים הפעילים לבחירה בטופס
    const activeManagers = team.filter(u => u.role === 'MANAGER' || u.role === 'BIG_BOSS');

    // --- פונקציה לשליחת משתמש חדש ---
    const handleAddUser = async (e) => {
        e.preventDefault();
        
        let payload = { ...addForm };
        
        // אם המשתמש הוא מנהל רגיל, הוא אוטומטית המנהל של העובד החדש
        if (user.role === 'MANAGER') {
            payload.parent_manager_id = user.id;
            payload.role = 'EMPLOYEE'; // מנהל רגיל יכול ליצור רק עובדים תחתיו
        }

        // אם בחרנו ליצור מנהל, נוודא שאין לו parent_manager_id (כדי שיהיה עצמאי)
        if (payload.role === 'MANAGER') {
            payload.parent_manager_id = null;
        }

        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                alert(t.alert_created || "User created successfully! Email sent.");
                setShowAddModal(false);
                setAddForm({ full_name: '', email: '', password: '', phone: '', role: 'EMPLOYEE', parent_manager_id: '' });
                fetchTeam(); // רענון הרשימה מיד אחרי ההוספה
            } else {
                if (data.error === "Email already exists") {
                    alert(t.error_email_exists || "Email already exists");
                } else {
                    alert("Error: " + (data.error || "Failed"));
                }
            }
        } catch (e) { alert("Server Error"); }
    };

    // --- 3. State for Viewing Employee Tasks ---
    const [selectedMember, setSelectedMember] = useState(null); 
    const [memberTasks, setMemberTasks] = useState([]); 
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);

    // --- Fetch Team Data ---
    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTeam(data);
            }
        } catch (e) { console.error(e); }
    };

    // --- Handle Member Click ---
    const handleMemberClick = async (member) => {
        if (user.role === 'EMPLOYEE') return;

        setSelectedMember(member);
        setIsLoadingTasks(true);
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/tasks/user/${member.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMemberTasks(await res.json());
            }
        } catch (e) {
            console.error("Error fetching tasks", e);
            alert("Error loading tasks");
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const toggleManager = (managerId) => {
        setExpandedManager(expandedManager === managerId ? null : managerId);
    };

    const handleDelete = async (userId) => {
        if (!window.confirm(t.confirm_delete_user || "Are you sure you want to delete this user?")) return;
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
            full_name: member.full_name, 
            email: member.email, 
            phone: member.phone || '',
            role: member.role,
            password: '' 
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

            if (res.ok) {
                setShowEditModal(false);
                fetchTeam();
                alert(t.alert_update_success || "User updated successfully");
            } else {
                if (data.error === "Email already exists") {
                    alert(t.error_email_exists || "Email already exists");
                } else {
                    alert("Error updating user");
                }
            }
        } catch (e) { alert("Server error"); }
    };

    const renderMemberRow = (member, isSub = false) => (
        <div key={member.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center ${isSub ? 'ml-6 border-l-4 border-l-purple-200' : 'mb-3'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${member.role === 'MANAGER' || member.role === 'BIG_BOSS' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                    <User size={20} />
                </div>
                
                <div className="flex flex-col">
                    <span 
                        onClick={() => handleMemberClick(member)}
                        className={`font-bold text-gray-800 text-lg ${user.role !== 'EMPLOYEE' ? 'cursor-pointer hover:text-purple-600 hover:underline' : ''}`}
                    >
                        {member.full_name}
                    </span>
                    <div className="text-xs text-gray-500">
                        {member.email} {member.phone && `| ${member.phone}`}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {(member.role === 'MANAGER' || member.role === 'BIG_BOSS') && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">{member.role}</span>}
                
                <button onClick={() => openEditModal(member)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition"><Edit2 size={16}/></button>
                <button onClick={() => handleDelete(member.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><Trash2 size={16}/></button>
                
                {/* חץ להרחבה - רלוונטי לכל מנהל */}
                {(member.role === 'MANAGER' || member.role === 'BIG_BOSS') && (
                    <button onClick={() => toggleManager(member.id)} className="p-1 text-gray-400">
                        {expandedManager === member.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </button>
                )}
            </div>
        </div>
    );

    const managers = team.filter(u => u.role === 'MANAGER' || u.role === 'BIG_BOSS');
    const directEmployees = team.filter(u => u.role === 'EMPLOYEE' && u.parent_manager_id === user.id);

    return (
        <div className="p-4 pb-24 min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-black">{t.my_team_title || "My Team"}</h2>
                <button className="bg-[#714B67] text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2" onClick={() => setShowAddModal(true)}>
                   <Plus size={18}/> {t.add_team_member || "Add User"}
                </button>
            </div>

            {/* Team List */}
            <div className="space-y-4 max-w-3xl mx-auto">
                {managers.map(manager => {
                    const subEmployees = team.filter(u => u.parent_manager_id === manager.id);
                    return (
                        <div key={manager.id} className="space-y-2">
                            {renderMemberRow(manager)}
                            {expandedManager === manager.id && (
                                <div className="space-y-2 animate-fade-in">
                                    {subEmployees.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No employees assigned</p>}
                                    {subEmployees.map(sub => renderMemberRow(sub, true))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {managers.length === 0 && directEmployees.length > 0 && (
                    <>
                        <h3 className="text-sm font-bold text-gray-500 mt-6 mb-2">{t.direct_employees || "Direct Employees"}</h3>
                        {directEmployees.map(emp => renderMemberRow(emp))}
                    </>
                )}
            </div>

            {/* --- Full Simulation Modal --- */}
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
                                <div className="flex justify-center items-center h-full text-purple-600 font-bold">Loading Employee View...</div>
                            ) : (
                                <div className="pointer-events-auto h-full"> 
                                    {/* 👇 התיקון כאן: אנחנו מסננים ושולחים רק את העובדים של המנהל הנוכחי */}
                                    <TasksTab 
                                        tasks={memberTasks} 
                                        t={t} 
                                        token={token}
                                        user={selectedMember} 
                                        subordinates={team.filter(u => u.parent_manager_id === selectedMember.id)} // שולחים את הרשימה המסוננת
                                        onRefresh={() => handleMemberClick(selectedMember)} 
                                        lang={lang}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Edit User Modal --- */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">{t.edit || "Edit"}</h3>
                        <form onSubmit={handleEditSubmit} className="space-y-3">
                            <div>
                                <label className="text-sm font-bold text-gray-700">{t.full_name_label}</label>
                                <input 
                                    className="w-full p-2 border rounded" 
                                    value={editForm.full_name} 
                                    onChange={e => setEditForm({...editForm, full_name: e.target.value})} 
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700">{t.email_label}</label>
                                <input 
                                    className="w-full p-2 border rounded" 
                                    value={editForm.email} 
                                    onChange={e => setEditForm({...editForm, email: e.target.value})} 
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700">{t.phone_label}</label>
                                <input 
                                    className="w-full p-2 border rounded" 
                                    value={editForm.phone} 
                                    onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                                    placeholder="050-0000000"
                                />
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
                                <button type="submit" className="flex-1 py-2 bg-purple-600 text-white rounded font-bold">{t.save}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        
            {/* --- Add User Modal --- */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{t.add_team_member || "Add User"}</h3>
                            <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <form onSubmit={handleAddUser} className="space-y-3">
                            <input className="w-full p-3 border rounded-xl" placeholder={t.full_name_label || "Name"} value={addForm.full_name} onChange={e => setAddForm({...addForm, full_name: e.target.value})} required />
                            <input className="w-full p-3 border rounded-xl" placeholder={t.email_label || "Email"} type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} required />
                            <input className="w-full p-3 border rounded-xl" placeholder={t.password_placeholder || "Password"} value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} required />
                            <input className="w-full p-3 border rounded-xl" placeholder={t.phone_label || "Phone (Optional)"} value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} />
                            
                            {user.role === 'BIG_BOSS' && (
                                <div className="space-y-3">
                                    <select 
                                        className="w-full p-3 border rounded-xl bg-white" 
                                        value={addForm.role} 
                                        onChange={e => setAddForm({
                                            ...addForm, 
                                            role: e.target.value,
                                            parent_manager_id: '' 
                                        })}
                                    >
                                        <option value="EMPLOYEE">Employee</option>
                                        <option value="MANAGER">Manager</option>
                                    </select>
                                    
                                    {addForm.role === 'EMPLOYEE' && (
                                        <select 
                                            className="w-full p-3 border rounded-xl bg-white" 
                                            value={addForm.parent_manager_id} 
                                            onChange={e => setAddForm({...addForm, parent_manager_id: e.target.value})}
                                            required={addForm.role === 'EMPLOYEE'} 
                                        >
                                            <option value="">Select Manager...</option>
                                            {activeManagers.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.role})</option>)}
                                        </select>
                                    )}
                                </div>
                            )}
                            
                            <button type="submit" className="w-full py-3 bg-[#714B67] text-white rounded-xl font-bold shadow-lg mt-2 flex justify-center items-center gap-2">
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