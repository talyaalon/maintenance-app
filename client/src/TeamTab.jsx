import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, ChevronDown, ChevronUp, User, X, Clock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const TeamTab = ({ token, t, user, onRefresh }) => {
    const [team, setTeam] = useState([]);
    const [expandedManager, setExpandedManager] = useState(null);
    
    // סטייטים לצפייה במשימות עובד
    const [selectedMember, setSelectedMember] = useState(null); // העובד שנבחר
    const [memberTasks, setMemberTasks] = useState([]); // המשימות של העובד שנבחר
    const [activeTaskTab, setActiveTaskTab] = useState('todo'); // todo, waiting, history
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);

    // סטייטים לעריכה ומחיקה (הקיימים)
    const [editMember, setEditMember] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' });

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setTeam(await res.json());
        } catch (e) { console.error(e); }
    };

    // --- פונקציה חדשה: לחיצה על עובד וטעינת משימותיו ---
    const handleMemberClick = async (member) => {
        setSelectedMember(member);
        setIsLoadingTasks(true);
        setActiveTaskTab('todo'); // ברירת מחדל
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/tasks/user/${member.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const tasks = await res.json();
                setMemberTasks(tasks);
            }
        } catch (e) {
            console.error("Error fetching tasks", e);
            alert("Error loading tasks");
        } finally {
            setIsLoadingTasks(false);
        }
    };

    // סינון משימות לטאבים
    const todoTasks = memberTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    const waitingTasks = memberTasks.filter(t => t.status === 'WAITING_APPROVAL');
    const historyTasks = memberTasks.filter(t => t.status === 'COMPLETED');

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
            else alert("Error deleting");
        } catch (e) { alert("Server error"); }
    };

    // --- Edit Functions ---
    const openEditModal = (member) => {
        setEditMember(member);
        setEditForm({ full_name: member.full_name, email: member.email, phone: member.phone || '' });
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
            if (res.ok) {
                setShowEditModal(false);
                fetchTeam();
                alert("User updated successfully");
            } else {
                alert("Error updating user");
            }
        } catch (e) { alert("Server error"); }
    };

    const renderMemberRow = (member, isSub = false) => (
        <div key={member.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center ${isSub ? 'ml-6 border-l-4 border-l-purple-200' : 'mb-3'}`}>
            <div className="flex items-center gap-3">
                {/* אייקון עובד */}
                <div className={`p-2 rounded-full ${member.role === 'MANAGER' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                    <User size={20} />
                </div>
                
                <div className="flex flex-col">
                    {/* --- השינוי כאן: השם הוא כפתור --- */}
                    <span 
                        onClick={() => handleMemberClick(member)}
                        className="font-bold text-gray-800 cursor-pointer hover:text-purple-600 hover:underline transition-colors text-lg"
                    >
                        {member.full_name}
                    </span>
                    <div className="text-xs text-gray-500">
                        {member.email} {member.phone && `| ${member.phone}`}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* תגית תפקיד */}
                {member.role === 'MANAGER' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">מנהל</span>}
                
                {/* כפתורי פעולה */}
                <button onClick={() => openEditModal(member)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition"><Edit2 size={16}/></button>
                <button onClick={() => handleDelete(member.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><Trash2 size={16}/></button>
                
                {/* חץ למנהלים */}
                {member.role === 'MANAGER' && (
                    <button onClick={() => toggleManager(member.id)} className="p-1 text-gray-400">
                        {expandedManager === member.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                    </button>
                )}
            </div>
        </div>
    );

    const managers = team.filter(u => u.role === 'MANAGER');
    const directEmployees = team.filter(u => u.role === 'EMPLOYEE' && u.parent_manager_id === user.id);

    return (
        <div className="p-4 pb-24 min-h-screen bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-black">{t.my_team_title || "My Team"}</h2>
                <button className="bg-[#6A0DAD] text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2" onClick={() => alert("Please use the 'Add User' page to add new members")}>
                   <User size={18}/> {t.add_team_member || "Add User"}
                </button>
            </div>

            <div className="space-y-4 max-w-3xl mx-auto">
                {/* רשימת המנהלים שתחתיי */}
                {managers.map(manager => {
                    const subEmployees = team.filter(u => u.parent_manager_id === manager.id);
                    return (
                        <div key={manager.id} className="space-y-2">
                            {renderMemberRow(manager)}
                            {expandedManager === manager.id && (
                                <div className="space-y-2 animate-fade-in">
                                    {subEmployees.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No employees under this manager</p>}
                                    {subEmployees.map(sub => renderMemberRow(sub, true))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* רשימת עובדים ישירים */}
                {managers.length === 0 && directEmployees.length > 0 && (
                    <>
                        <h3 className="text-sm font-bold text-gray-500 mt-6 mb-2">{t.direct_employees || "Direct Employees"}</h3>
                        {directEmployees.map(emp => renderMemberRow(emp))}
                    </>
                )}
            </div>

            {/* --- User Tasks Modal (החלון החדש!) --- */}
            {selectedMember && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-end sm:items-center z-50 backdrop-blur-sm">
                    <div className="bg-white w-full sm:w-[90%] max-w-2xl h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl animate-slide-up overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{selectedMember.full_name}</h3>
                                <p className="text-xs text-gray-500">Tasks Overview</p>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="p-2 bg-white rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-2 gap-2 bg-white border-b">
                            <button onClick={() => setActiveTaskTab('todo')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTaskTab === 'todo' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                                To Do ({todoTasks.length})
                            </button>
                            <button onClick={() => setActiveTaskTab('waiting')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTaskTab === 'waiting' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                                Waiting ({waitingTasks.length})
                            </button>
                            <button onClick={() => setActiveTaskTab('history')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTaskTab === 'history' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                                Completed ({historyTasks.length})
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            {isLoadingTasks ? (
                                <div className="text-center py-10 text-gray-500">Loading tasks...</div>
                            ) : (
                                <div className="space-y-3">
                                    {activeTaskTab === 'todo' && todoTasks.length === 0 && <p className="text-center text-gray-400 mt-10">No pending tasks.</p>}
                                    {activeTaskTab === 'waiting' && waitingTasks.length === 0 && <p className="text-center text-gray-400 mt-10">No tasks waiting for approval.</p>}
                                    {activeTaskTab === 'history' && historyTasks.length === 0 && <p className="text-center text-gray-400 mt-10">No completed tasks yet.</p>}

                                    {/* Task List */}
                                    {(activeTaskTab === 'todo' ? todoTasks : activeTaskTab === 'waiting' ? waitingTasks : historyTasks).map(task => (
                                        <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-800">{task.title}</h4>
                                                <span className={`text-[10px] px-2 py-1 rounded font-bold ${task.urgency === 'High' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {task.urgency}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 space-y-1">
                                                <div className="flex items-center gap-1"><Clock size={12}/> Due: {format(parseISO(task.due_date), 'dd/MM/yyyy')}</div>
                                                <div>📍 {task.location_name || 'No Location'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Edit Modal (Existing) --- */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">Edit User</h3>
                        <form onSubmit={handleEditSubmit} className="space-y-3">
                            <div>
                                <label className="text-sm font-bold text-gray-700">Name</label>
                                <input className="w-full p-2 border rounded" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} required/>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700">Email</label>
                                <input className="w-full p-2 border rounded" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required/>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-gray-700">Phone</label>
                                <input className="w-full p-2 border rounded" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 border rounded">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-purple-600 text-white rounded font-bold">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamTab;