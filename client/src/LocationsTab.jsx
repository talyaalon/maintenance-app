import React, { useState, useEffect } from 'react';
import { Trash2, Pencil, MapPin, Plus, X, Save } from 'lucide-react';

const LocationsTab = ({ token, t }) => {
    const [locations, setLocations] = useState([]);
    const [isAdding, setIsAdding] = useState(false); // האם אנחנו במצב הוספה?
    const [newLocName, setNewLocName] = useState('');
    
    // משתנים לעריכת מיקום קיים
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');

    // פונקציה לטעינת המיקומים מהשרת
    const fetchLocations = async () => {
        try {
            // שימי לב: משתמשים ב-IP שלך ולא ב-localhost
            const res = await fetch('https://maintenance-app-h84v.onrender.com/locations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setLocations(data);
        } catch (err) { 
            console.error("Error fetching locations", err); 
        }
    };

    // טעינה ראשונית כשנכנסים לטאב
    useEffect(() => {
        fetchLocations();
    }, []);

    // הוספת מיקום חדש
    const handleAddLocation = async () => {
        if (!newLocName.trim()) return;
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/locations', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newLocName })
            });

            if (res.ok) {
                setNewLocName(''); // ניקוי השדה
                setIsAdding(false); // סגירת מצב הוספה
                fetchLocations(); // רענון הרשימה מיד
            } else {
                alert("שגיאה בהוספה");
            }
        } catch (e) { 
            alert("שגיאת שרת"); 
        }
    };

    // מחיקת מיקום
    const handleDelete = async (id) => {
        if(!window.confirm("למחוק מיקום זה? זה ימחק גם את המשימות שקשורות אליו!")) return;
        try {
            await fetch(`https://maintenance-app-h84v.onrender.com/locations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchLocations(); // רענון הרשימה מיד
        } catch (e) { 
            alert("שגיאה במחיקה"); 
        }
    };

    // התחלת עריכה
    const startEdit = (loc) => {
        setEditingId(loc.id);
        setEditName(loc.name);
    };

    // שמירת עריכה
    const saveEdit = async () => {
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/locations/${editingId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: editName })
            });
            if(res.ok) {
                setEditingId(null);
                fetchLocations(); // רענון הרשימה מיד
            }
        } catch(e) { 
            alert("שגיאה בעדכון"); 
        }
    };

    return (
        <div className="p-4 pb-24">
            {/* כותרת וכפתור הוספה */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{t.nav_locations}</h2>
                <button 
                    onClick={() => setIsAdding(!isAdding)} 
                    className="bg-[#714B67] text-white px-4 py-2 rounded-full shadow flex items-center gap-2 text-sm hover:#5a3b52 transition">
                    {isAdding ? <X size={18}/> : <Plus size={18}/>}
                    {isAdding ? 'ביטול' : t.add_location}
                </button>
            </div>

            {/* טופס הוספה - מופיע רק כשלוחצים על הפלוס */}
            {isAdding && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 mb-4 animate-fade-in">
                    <h3 className="font-bold text-gray-700 mb-2">הוספת מיקום חדש</h3>
                    <div className="flex gap-2">
                        <input 
                            value={newLocName}
                            onChange={(e) => setNewLocName(e.target.value)}
                            placeholder="שם המיקום (למשל: מחסן ראשי)"
                            className="flex-1 p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                        <button onClick={handleAddLocation} className="bg-green-600 text-white px-4 rounded-lg font-bold">שמור</button>
                    </div>
                </div>
            )}

            {/* רשימת המיקומים */}
            <div className="grid gap-3">
                {locations.map(loc => (
                    <div key={loc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                                <MapPin size={20} />
                            </div>
                            
                            {/* מצב עריכה מול מצב תצוגה */}
                            {editingId === loc.id ? (
                                <div className="flex gap-2">
                                    <input 
                                        value={editName} 
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="border rounded p-1"
                                    />
                                    <button onClick={saveEdit} className="text-green-600"><Save size={18}/></button>
                                    <button onClick={() => setEditingId(null)} className="text-gray-400"><X size={18}/></button>
                                </div>
                            ) : (
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{loc.name}</h3>
                                    <p className="text-xs text-gray-400">
                                        נוצר ע"י: {loc.creator_name || 'לא ידוע'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {editingId !== loc.id && (
                                <>
                                    <button onClick={() => startEdit(loc)} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-full">
                                        <Pencil size={16}/>
                                    </button>
                                    <button onClick={() => handleDelete(loc.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full">
                                        <Trash2 size={16}/>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* הודעה אם אין מיקומים */}
            {locations.length === 0 && !isAdding && (
                <div className="text-center text-gray-400 mt-10">
                    <p>עדיין אין מיקומים במערכת.</p>
                </div>
            )}
        </div>
    );
};

export default LocationsTab;