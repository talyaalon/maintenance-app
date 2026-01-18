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
    if (!window.confirm("האם למחוק משתמש זה?")) return;

    const res = await fetch(`https://maintenance-app-h84v.onrender.com/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        fetchTeam();
    } else {
        // כאן אנחנו תופסים את השגיאה מהשרת (למשל: למנהל יש עובדים) ומציגים אותה
        const errorData = await res.json();
        alert(errorData.error || "שגיאה במחיקה");
    }
  };

  const toggleManager = (managerId) => {
    if (expandedManager === managerId) setExpandedManager(null);
    else setExpandedManager(managerId);
  };

  // רשימת המנהלים (נשתמש בה גם להעברה)
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
                <UserPlus size={18} /> הוסף איש צוות
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
                                    {manager.role === 'BIG_BOSS' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full">CEO</span>}
                                </h3>
                                <p className="text-xs text-gray-500">{manager.email} | {myWorkers.length} עובדים</p>
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
            managersList={managers} // מעבירים את רשימת המנהלים כדי שיהיה אפשר להחליף
            currentUserRole={user.role} // מעבירים את התפקיד של המשתמש הנוכחי (כדי לדעת אם הוא ביג בוס)
            onClose={() => setEditingUser(null)} 
            onSuccess={() => { setEditingUser(null); fetchTeam(); }}
        />
      )}
    </div>
  );
};

const EditUserModal = ({ userToEdit, token, onClose, onSuccess, managersList, currentUserRole }) => {
    const [formData, setFormData] = useState({
        full_name: userToEdit.full_name,
        email: userToEdit.email,
        password: '',
        parent_manager_id: userToEdit.parent_manager_id || '' // המנהל הנוכחי
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
                alert("הפרטים עודכנו בהצלחה! מייל נשלח למשתמש.");
                onSuccess();
            }
            else alert("שגיאה בעדכון");
        } catch (err) { alert("שגיאת שרת"); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-xl font-bold mb-4 text-purple-700">עריכת פרטים: {userToEdit.full_name}</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-gray-500">שם מלא</label>
                        <input 
                            className="w-full p-2 border rounded bg-gray-50" 
                            value={formData.full_name} 
                            onChange={e => setFormData({...formData, full_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">אימייל</label>
                        <input 
                            className="w-full p-2 border rounded bg-gray-50" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">סיסמה (השאר ריק כדי לא לשנות)</label>
                        <input 
                            className="w-full p-2 border rounded bg-gray-50" 
                            type="password"
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    {/* אפשרות להחלפת מנהל - מופיעה רק לביג בוס ורק אם עורכים עובד */}
                    {currentUserRole === 'BIG_BOSS' && userToEdit.role === 'EMPLOYEE' && (
                        <div>
                            <label className="text-xs text-gray-500 font-bold">שייך למנהל:</label>
                            <select 
                                className="w-full p-2 border rounded bg-gray-50"
                                value={formData.parent_manager_id}
                                onChange={e => setFormData({...formData, parent_manager_id: e.target.value})}
                            >
                                <option value="">ללא מנהל</option>
                                {managersList.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2 mt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border rounded">ביטול</button>
                        <button type="submit" className="flex-1 py-2 bg-purple-600 text-white rounded">שמור שינויים</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeamTab;