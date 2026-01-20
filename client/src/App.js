import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, UserCircle, Plus, Settings } from 'lucide-react'; 
import Login from './Login';
import CreateTaskForm from './CreateTaskForm';
import AddUserForm from './AddUserForm';
import { translations } from './translations'; 
import logoImg from './app-logo.png';

// ייבוא הטאבים
import TasksTab from './TasksTab';
import TeamTab from './TeamTab';
import ProfileTab from './ProfileTab'; 
import ConfigurationTab from './ConfigurationTab'; 

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  
  // הגדרת שפה: ברירת מחדל אנגלית
  const [lang, setLang] = useState('en'); 
  const t = translations[lang]; // המילון הנוכחי

  const [activeTab, setActiveTab] = useState(1);

  // מודאלים
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { setUser(null); return; }
      const data = await res.json();
      setTasks(data);
    } catch (e) { console.error(e); }
  };

  const handleCompleteTask = async (taskId) => {
      // תרגום: עודכן בהצלחה
      alert(t.alert_update_success || "Task Updated!"); 
      fetchTasks();
  };

  const handleUserUpdate = (updatedUser) => {
      setUser(prevUser => ({
          ...prevUser,
          ...updatedUser
      }));
  };

  // --- הקוד החדש (רענון כל 30 שניות) ---
  useEffect(() => {
    // 1. קריאה ראשונית מיד כשהמשתמש מתחבר
    if (user) fetchTasks();

    // 2. הגדרת טיימר שרץ כל 30 שניות
    const interval = setInterval(() => {
      if (user) {
          // אופציונלי: הודעה לקונסול כדי שתראי שזה עובד
          // console.log("🔄 Auto-refreshing tasks..."); 
          fetchTasks(); 
      }
    }, 30000); // 30,000 מילישניות = 30 שניות

    // 3. ניקוי הטיימר ביציאה
    return () => clearInterval(interval);
  }, [user]);

  // לוגיקה לכיוון הטקסט (RTL/LTR)
  const isRTL = lang === 'he';
  const dir = isRTL ? 'rtl' : 'ltr';

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

  const isEmployee = user.role === 'EMPLOYEE';

  const renderContent = () => {
      const token = localStorage.getItem('token');
      switch (activeTab) {
          case 1: 
            return <TasksTab tasks={tasks} t={t} token={token} user={user} onRefresh={fetchTasks} onComplete={handleCompleteTask} lang={lang} />;
          case 2: 
            if (isEmployee) return null;
            return <TeamTab 
                        user={user} 
                        token={token} 
                        t={t} 
                        onAddUser={() => setIsUserFormOpen(true)} 
                        refreshTrigger={refreshTrigger} 
                    />;
          case 3: 
            if (isEmployee) return null;
            return <ConfigurationTab token={token} t={t} />;
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

  return (
    <div className={`min-h-screen bg-gray-50 font-sans`} dir={dir}>
      
      {/* כותרת עליונה - מעודכנת */}
      <header className="bg-white shadow-sm p-4 flex items-center justify-between sticky top-0 z-30 relative">
          
          {/* צד שמאל: לוגו בלבד */}
          <div className="flex-shrink-0 z-10">
              <img 
                  src={logoImg} 
                  alt="App Logo" 
                  className="h-10 w-auto object-contain" 
              />
          </div>

          {/* מרכז: כותרת האפליקציה (ממורכזת אבסולוטית וצבועה בשחור) */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-xl font-bold text-black hidden sm:block">
                  {t.app_name}
              </h1>
          </div>

          {/* צד ימין: בחירת שפה */}
          <div className="z-10">
              <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="p-1 border rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  dir="ltr"
              >
                  <option value="en">🇺🇸 EN</option>
                  <option value="he">🇮🇱 HE</option>
                  <option value="th">🇹🇭 TH</option>
              </select>
          </div>
      </header>

      <main className="max-w-3xl mx-auto min-h-[80vh]">
          {renderContent()}
      </main>

      {/* כפתור צף לפעולה מהירה */}
      {activeTab === 1 && (
        <button onClick={() => setIsTaskFormOpen(true)} 
            className={`fixed bottom-24 w-14 h-14 bg-[#6A0DAD] text-white rounded-full shadow-lg flex items-center justify-center z-40 transition transform hover:scale-110 ${isRTL ? 'left-6' : 'right-6'}`}>
            <Plus size={30} />
        </button>
      )}

      {/* תפריט ניווט תחתון */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-50 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-3xl mx-auto">
            
            <button onClick={() => setActiveTab(1)} className={`flex flex-col items-center w-full ${activeTab === 1 ? 'text-[#6A0DAD]' : 'text-gray-400'}`}>
                <LayoutDashboard size={24} strokeWidth={activeTab === 1 ? 2.5 : 2} />
                <span className="text-[10px] mt-1 font-medium">{t.nav_tasks}</span>
            </button>

            {!isEmployee && (
                <button onClick={() => setActiveTab(2)} className={`flex flex-col items-center w-full ${activeTab === 2 ? 'text-[#6A0DAD]' : 'text-gray-400'}`}>
                    <Users size={24} strokeWidth={activeTab === 2 ? 2.5 : 2} />
                    <span className="text-[10px] mt-1 font-medium">{t.nav_team}</span>
                </button>
            )}

            {!isEmployee && (
                <button onClick={() => setActiveTab(3)} className={`flex flex-col items-center w-full ${activeTab === 3 ? 'text-[#6A0DAD]' : 'text-gray-400'}`}>
                    <Settings size={24} strokeWidth={activeTab === 3 ? 2.5 : 2} />
                    {/* תרגום: הגדרות */}
                    <span className="text-[10px] mt-1 font-medium">{t.nav_config}</span> 
                </button>
            )}

            <button onClick={() => setActiveTab(4)} className={`flex flex-col items-center w-full ${activeTab === 4 ? 'text-[#6A0DAD]' : 'text-gray-400'}`}>
                <UserCircle size={24} strokeWidth={activeTab === 4 ? 2.5 : 2} />
                <span className="text-[10px] mt-1 font-medium">{t.nav_profile}</span>
            </button>

        </div>
      </nav>

      {/* --- החלונות הקופצים --- */}
      
      {isTaskFormOpen && <CreateTaskForm 
          onTaskCreated={() => { setIsTaskFormOpen(false); fetchTasks(); }} 
          onCancel={() => setIsTaskFormOpen(false)} 
          currentUser={user} 
          token={localStorage.getItem('token')}
          t={t} 
      />}
      
      {isUserFormOpen && <AddUserForm 
          currentUser={user} 
          onClose={() => { 
              setIsUserFormOpen(false); 
              setRefreshTrigger(prev => prev + 1); 
          }} 
          t={t}
      />}
      
    </div>
  );
}

export default App;