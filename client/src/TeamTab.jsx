import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, UserPlus, ChevronDown, User } from 'lucide-react';

const TeamTab = ({ user, token, t, onAddUser, refreshTrigger }) => {
  const [usersList, setUsersList] = useState([]);
  const [expandedManager, setExpandedManager] = useState(null); 
  const [editingUser, setEditingUser] = useState(null); 

  const fetchTeam = async () => {
    try {
        const res = await fetch('https://maintenance-app-h84v.onrender.com/users', { 
             headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setUsersList(data);
    } catch (err) {
        console.error("Error loading team");
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [refreshTrigger]);

  const handleDelete = async (userToDelete) => {
    // תרגום: אישור מחיקה
    if (!window.confirm(t.confirm_delete_user || "Are you sure you want to delete this user?")) return;

    const res = await fetch(`https://maintenance-app-h84v.onrender.com/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        fetchTeam();
    } else {
        const errorData = await res.json();
        // תרגום: שגיאת מחיקה
        alert(errorData.error || t.error_delete || "Error deleting user");
    }
  };

  const toggleManager = (managerId) => {
    if (expandedManager === managerId) setExpandedManager(null);
    else setExpandedManager(managerId);
  };

  const managers = usersList.filter(u => u.role === 'MANAGER' || u.role === 'BIG_BOSS');
  
  const getWorkersForManager = (managerId) => {
      return usersList.filter(u => u.parent_manager_id === managerId);
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t.nav_team}</h2>
        {(user.role === 'BIG_BOSS' || user.role === 'MANAGER') && (
            <button onClick={onAddUser} className="bg-[#6A0DAD] text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md text-sm hover:bg-purple-800 transition">
                <UserPlus size={18} /> {t.add_team_member} {/* הוחלף: הוסף איש צוות */}
            </button>
        )}
      </div>

      <div className="space-y-4">
        {managers.map(manager => {
            const myWorkers = getWorkersForManager(manager.id);
            const isExpanded = expandedManager === manager.id;

            return (
                <div key={manager.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300">
                    
                    <div className="p-4 flex items-center justify-between bg-white hover:bg-gray-50 cursor-pointer" onClick={() => toggleManager(manager.id)}>
                        <div className="flex items-center gap-3">
                            <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                {myWorkers.length > 0 && <ChevronDown size={20} />}
                            </div>
                            
                            <div>
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    {manager.full_name} 
                                    {manager.role === 'BIG_BOSS' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full">{t.ceo_role || 'CEO'}</span>}
                                </h3>
                                {/* הוחלף: עובדים */}
                                <p className="text-xs text-gray-500">{manager.email} | {myWorkers.length} {t.workers_suffix}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                             <button onClick={(e) => { e.stopPropagation(); setEditingUser(manager); }} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-full">
                                <Pencil size={16}/>
                            </button>
                            {manager.id !== user.id && (
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(manager); }} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full">
                                    <Trash2 size={16}/>
                                </button>
                            )}
                        </div>
                    </div>

                    {isExpanded && myWorkers.length > 0 && (
                        <div className="bg-gray-50 border-t border-gray-100 p-2">
                            {myWorkers.map(worker => (
                                <div key={worker.id} className="flex justify-between items-center p-3 bg-white rounded-lg mb-2 border border-gray-100 ml-8 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 p-1.5 rounded-full text-green-600"><User size={14}/></div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-700">{worker.full_name}</p>
                                            <p className="text-xs text-gray-400">{worker.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingUser(worker)} className="text-gray-400 hover:text-blue-600"><Pencil size={16}/></button>
                                        <button onClick={() => handleDelete(worker)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                            <div className="ml-8 border-2 border-dashed border-gray-200 rounded-lg p-2 text-center text-xs text-gray-400">
                                {t.workers_under}: {manager.full_name}
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
      </div>

      {editingUser && (
        <EditUserModal 
            userToEdit={editingUser} 
            token={token} 
            managersList={managers} 
            currentUserRole={user.role} 
            onClose={() => setEditingUser(null)} 
            onSuccess={() => { setEditingUser(null); fetchTeam(); }}
            t={t} // חשוב: העברנו את t למודאל
        />
      )}
    </div>
  );
};

const EditUserModal = ({ userToEdit, token, onClose, onSuccess, managersList, currentUserRole, t }) => {
    const [formData, setFormData] = useState({
        full_name: userToEdit.full_name,
        email: userToEdit.email,
        password: '',
        parent_manager_id: userToEdit.parent_manager_id || '' 
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/users/${userToEdit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                // תרגום: הצלחה
                alert(t.alert_update_success || "Details updated!");
                onSuccess();
            }
            else alert(t.alert_update_error || "Update error");
        } catch (err) { alert(t.server_error || "Server error"); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                {/* הוחלף: עריכת פרטים */}
                <h3 className="text-xl font-bold mb-4 text-purple-700">{t.edit_details_title}: {userToEdit.full_name}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500">{t.full_name_label}</label>
                        <input 
                            className="w-full p-2 border rounded bg-gray-50" 
                            value={formData.full_name} 
                            onChange={e => setFormData({...formData, full_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">{t.email_label}</label>
                        <input 
                            className="w-full p-2 border rounded bg-gray-50" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">{t.password_placeholder_edit}</label>
                        <input 
                            className="w-full p-2 border rounded bg-gray-50" 
                            type="password"
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    {currentUserRole === 'BIG_BOSS' && userToEdit.role === 'EMPLOYEE' && (
                        <div>
                            {/* הוחלף: שייך למנהל */}
                            <label className="text-xs text-gray-500 font-bold">{t.assign_to_manager}:</label>
                            <select 
                                className="w-full p-2 border rounded bg-gray-50"
                                value={formData.parent_manager_id}
                                onChange={e => setFormData({...formData, parent_manager_id: e.target.value})}
                            >
                                {/* הוחלף: ללא מנהל */}
                                <option value="">{t.no_manager}</option>
                                {managersList.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2 mt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border rounded">{t.cancel}</button>
                        <button type="submit" className="flex-1 py-2 bg-purple-600 text-white rounded">{t.save_changes}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeamTab;