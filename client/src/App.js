import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, MapPin, UserCircle, Plus } from 'lucide-react'; // אייקונים לטאבים
import Login from './Login';
import CreateTaskForm from './CreateTaskForm';
import AddUserForm from './AddUserForm';
import AddLocationForm from './AddLocationForm';
import { translations } from './translations'; 

// ייבוא הטאבים
import TasksTab from './TasksTab';
import TeamTab from './TeamTab';
import ProfileTab from './ProfileTab'; 

// קומפוננטות זמניות לטאבים שעדיין לא בנינו (מיקומים)
const LocationsTab = ({t, onAddLoc}) => (
    <div className="p-4 pb-24">
        <div className="flex justify-between items-center mb-4">
             <h2 className="text-2xl font-bold">{t.nav_locations}</h2>
             <button onClick={onAddLoc} className="bg-green-600 text-white px-4 py-2 rounded-full shadow text-sm">
                 + {t.add_location}
             </button>
        </div>
        <p className="text-center text-gray-500 mt-10">רשימת המיקומים תופיע כאן</p>
    </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  
  // ניהול שפה (ברירת מחדל: עברית)
  const [lang, setLang] = useState('he'); 
  const t = translations[lang]; 

  // ניהול טאבים (1=משימות, 2=צוות, 3=מיקומים, 4=פרופיל)
  const [activeTab, setActiveTab] = useState(1);

  // ניהול מודאלים (חלונות קופצים)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isLocFormOpen, setIsLocFormOpen] = useState(false);

  // --- חדש: טריגר לרענון רשימת הצוות ---
  // בכל פעם שהמספר הזה משתנה, רשימת העובדים ב-TeamTab תיטען מחדש
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3001/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { setUser(null); return; }
      const data = await res.json();
      setTasks(data);
    } catch (e) { console.error(e); }
  };

  const handleCompleteTask = async (taskId) => {
      alert("משימה הושלמה!"); 
      fetchTasks();
  };

  // פונקציה לעדכון פרטי משתמש בזמן אמת
  const handleUserUpdate = (updatedUser) => {
      setUser(prevUser => ({
          ...prevUser,
          ...updatedUser
      }));
  };

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  // אם המשתמש לא מחובר - הצג מסך כניסה
  if (!user) {
    return (
        <Login 
            onLoginSuccess={setUser} 
            t={t} 
            lang={lang}          
            setLang={setLang}    
        /> 
    );
  }

  // הפונקציה שקובעת איזה מסך להציג לפי הטאב שנבחר למטה
  const renderContent = () => {
      const token = localStorage.getItem('token');
      switch (activeTab) {
          case 1: 
            return <TasksTab tasks={tasks} t={t} token={token} user={user} onRefresh={fetchTasks} onComplete={handleCompleteTask} />;
          case 2: 
            return <TeamTab 
                        user={user} 
                        token={token} 
                        t={t} 
                        onAddUser={() => setIsUserFormOpen(true)} 
                        refreshTrigger={refreshTrigger} // מעבירים את הטריגר לטאב הצוות
                   />;
          case 3: 
            return <LocationsTab t={t} onAddLoc={() => setIsLocFormOpen(true)} />;
          case 4: 
            return <ProfileTab 
                        t={t} 
                        user={user} 
                        token={token}
                        onLogout={() => { setUser(null); localStorage.removeItem('token'); }} 
                        onUpdateUser={handleUserUpdate} 
                   />;
          default: 
            return <TasksTab tasks={tasks} t={t} />;
      }
  };

  const isRTL = lang === 'he'; 

  return (
    <div className={`min-h-screen bg-gray-50 font-sans`} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* כותרת עליונה */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-30">
        <h1 className="text-xl font-bold text-[#6A0DAD]">MAINTENANCE APP</h1>
        
        {/* בחירת שפה */}
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="p-1 border rounded text-xs bg-gray-50">
            <option value="he">HE</option>
            <option value="en">EN</option>
            <option value="th">TH</option>
        </select>
      </header>

      {/* התוכן המרכזי שמתחלף */}
      <main className="max-w-3xl mx-auto min-h-[80vh]">
          {renderContent()}
      </main>

      {/* כפתור צף לפעולה מהירה (רק בטאב משימות) */}
      {activeTab === 1 && (
        <button onClick={() => setIsTaskFormOpen(true)} className="fixed bottom-24 left-6 md:left-auto md:right-6 w-14 h-14 bg-[#6A0DAD] text-white rounded-full shadow-lg flex items-center justify-center z-40 transition transform hover:scale-110">
            <Plus size={30} />
        </button>
      )}

      {/* תפריט ניווט תחתון (Bottom Navigation Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-50 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-3xl mx-auto">
            
            <button onClick={() => setActiveTab(1)} className={`flex flex-col items-center w-full ${activeTab === 1 ? 'text-[#6A0DAD]' : 'text-gray-400'}`}>
                <LayoutDashboard size={24} strokeWidth={activeTab === 1 ? 2.5 : 2} />
                <span className="text-[10px] mt-1 font-medium">{t.nav_tasks}</span>
            </button>

            <button onClick={() => setActiveTab(2)} className={`flex flex-col items-center w-full ${activeTab === 2 ? 'text-[#6A0DAD]' : 'text-gray-400'}`}>
                <Users size={24} strokeWidth={activeTab === 2 ? 2.5 : 2} />
                <span className="text-[10px] mt-1 font-medium">{t.nav_team}</span>
            </button>

            <button onClick={() => setActiveTab(3)} className={`flex flex-col items-center w-full ${activeTab === 3 ? 'text-[#6A0DAD]' : 'text-gray-400'}`}>
                <MapPin size={24} strokeWidth={activeTab === 3 ? 2.5 : 2} />
                <span className="text-[10px] mt-1 font-medium">{t.nav_locations}</span>
            </button>

            <button onClick={() => setActiveTab(4)} className={`flex flex-col items-center w-full ${activeTab === 4 ? 'text-[#6A0DAD]' : 'text-gray-400'}`}>
                <UserCircle size={24} strokeWidth={activeTab === 4 ? 2.5 : 2} />
                <span className="text-[10px] mt-1 font-medium">{t.nav_profile}</span>
            </button>

        </div>
      </nav>

      {/* החלונות הקופצים (Popups) */}
      
      {isTaskFormOpen && <CreateTaskForm 
          onTaskCreated={() => { setIsTaskFormOpen(false); fetchTasks(); }} 
          onCancel={() => setIsTaskFormOpen(false)} 
      />}
      
      {/* כאן עדכנו את סגירת הטופס כדי לרענן את הטאב של הצוות */}
      {isUserFormOpen && <AddUserForm 
          currentUser={user} 
          onClose={() => { 
              setIsUserFormOpen(false); 
              setRefreshTrigger(prev => prev + 1); // הרצת הטריגר
          }} 
      />}
      
      {isLocFormOpen && <AddLocationForm 
          onClose={() => setIsLocFormOpen(false)} 
      />}
      
    </div>
  );
}

export default App;