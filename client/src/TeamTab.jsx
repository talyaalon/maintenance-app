import React, { useEffect, useState } from 'react';
import { Pencil, Trash2, UserPlus } from 'lucide-react';

const TeamTab = ({ user, token, t, onAddUser }) => {
  const [usersList, setUsersList] = useState([]);

  // פונקציה למחיקת משתמש
  const handleDelete = async (id) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק משתמש זה?")) return;
    try {
        await fetch(`http://localhost:3001/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchTeam(); // רענון הרשימה אחרי מחיקה
    } catch (err) {
        alert("שגיאה במחיקה");
    }
  };

  // שליפת כל המשתמשים מהשרת
  const fetchTeam = async () => {
    try {
        const res = await fetch('http://localhost:3001/users', { 
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
  }, []);

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{t.nav_team}</h2>
        {(user.role === 'BIG_BOSS' || user.role === 'MANAGER') && (
            <button onClick={onAddUser} className="bg-[#6A0DAD] text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md text-sm">
                <UserPlus size={16} /> {t.add_worker}
            </button>
        )}
      </div>

      <div className="space-y-3">
        {usersList.map(u => (
            <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-800">{u.full_name}</h3>
                    <p className="text-xs text-gray-500">{u.role === 'BIG_BOSS' ? 'CEO' : u.role} | {u.email}</p>
                    {u.manager_name && <p className="text-xs text-purple-600 mt-1">{t.workers_under}: {u.manager_name}</p>}
                </div>
                
                {/* כפתורי עריכה ומחיקה - רק למנהלים, ולא לעצמם */}
                {(user.role === 'BIG_BOSS' || (user.role === 'MANAGER' && u.role === 'EMPLOYEE')) && user.id !== u.id && (
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full">
                        <Trash2 size={18}/>
                    </button>
                )}
            </div>
        ))}
      </div>
    </div>
  );
};

export default TeamTab;