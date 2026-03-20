import { requestForToken, onMessageListener } from './firebase';
import { Toaster, toast } from 'react-hot-toast'; // אם אין לך react-hot-toast, תוכלי להשתמש ב-alert רגיל
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, UserCircle, Settings, Building2 } from 'lucide-react';
import Login from './Login';
import AddUserForm from './AddUserForm';
import { translations } from './translations'; 
import logoImg from './app-logo.png';

// ייבוא הטאבים
import TasksTab from './TasksTab';
import TeamTab from './TeamTab';
import ProfileTab from './ProfileTab';
import ConfigurationTab from './ConfigurationTab';
import CompaniesTab from './CompaniesTab';
import CompanyManagerSettingsTab from './CompanyManagerSettingsTab';

function App() {
  const [user, setUser] = useState(null);
  // 🚀 מנגנון התחברות אוטומטי וזכירת משתמש (Persistent Login)
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        // מפענחים את הטוקן השמור בטלפון כדי להוציא ממנו את פרטי המשתמש
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const decodedUser = JSON.parse(jsonPayload);

        // בודקים שהטוקן לא פג תוקף (הוא מוגדר ל-24 שעות)
        if (decodedUser.exp * 1000 > Date.now()) {
            // 🚀 FIX: Merge JWT (auth fields) with full localStorage user object
            // so email, profile_picture_url, phone etc. survive page refresh
            let storedUser = {};
            try {
                const raw = localStorage.getItem('user');
                if (raw) storedUser = JSON.parse(raw);
            } catch (e) {}

            setUser({
                ...storedUser,             // extended profile fields from localStorage
                id:   decodedUser.id,      // JWT auth fields always take priority
                role: decodedUser.role,
                name: decodedUser.name,
            });
        } else {
            // Token expired — clear both token and cached user
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
      } catch (e) {
        console.error("Token decoding failed", e);
      }
    }
  }, []);

  const [tasks, setTasks] = useState([]);
  
  // הגדרת שפה: ברירת מחדל אנגלית
  // שואב את השפה מהזיכרון כדי שלא תתאפס ברענון
  const [lang, setLang] = useState(() => {
      return localStorage.getItem('appLang') || 'he'; // ברירת מחדל לעברית
  });

  // ברגע שהשפה משתנה, נשמור אותה לזיכרון
  useEffect(() => {
      localStorage.setItem('appLang', lang);
  }, [lang]);

  // כשהמשתמש מתחבר, נעדכן את השפה לשפה שהגדיר בפרופיל
  useEffect(() => {
      if (user && user.preferred_language) {
          setLang(user.preferred_language);
      }
  }, [user]);

  // Derive allowed languages for the current user
  // Manager/BIG_BOSS: their own allowed_lang_* flags
  // EMPLOYEE: their manager's allowed_lang_* flags
  const allowedLangs = React.useMemo(() => {
      if (!user) return ['he', 'en', 'th'];
      const isEmployee = user.role === 'EMPLOYEE';
      const he = isEmployee ? user.manager_allowed_lang_he !== false : user.allowed_lang_he !== false;
      const en = isEmployee ? user.manager_allowed_lang_en !== false : user.allowed_lang_en !== false;
      const th = isEmployee ? user.manager_allowed_lang_th !== false : user.allowed_lang_th !== false;
      const list = [];
      if (he) list.push('he');
      if (en) list.push('en');
      if (th) list.push('th');
      return list.length > 0 ? list : ['he']; // always keep at least one
  }, [user]);

  // Auto-switch language if the current one is no longer allowed
  useEffect(() => {
      if (!allowedLangs.includes(lang)) {
          setLang(allowedLangs[0]);
      }
  }, [allowedLangs, lang]);
  
  const t = translations[lang]; // המילון הנוכחי

  // שואב את הטאב האחרון מהזיכרון (אם אין, יפתח את tasks)
  const [activeTab, setActiveTab] = useState(() => {
      return localStorage.getItem('appActiveTab') || 'tasks';
  });

  // שומר את הטאב לזיכרון בכל פעם שאת עוברת עמוד
  useEffect(() => {
      localStorage.setItem('appActiveTab', activeTab);
  }, [activeTab]);

  // Reset to Tasks tab on login so a stale tab (e.g. Settings saved by a
  // previous session) never lands the new user on a blank screen.
  useEffect(() => {
      if (user) setActiveTab('tasks');
  }, [user?.id]);

  // מודאלים
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('https://maintenance-app-staging.onrender.com/tasks', {
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
      setUser(prevUser => {
          const merged = { ...prevUser, ...updatedUser };
          // 🚀 FIX: Keep localStorage in sync so the merged user survives refresh
          localStorage.setItem('user', JSON.stringify(merged));
          return merged;
      });
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

  // 👇 הוספת הקוד הזה בתוך App.jsx
  
  useEffect(() => {
    // 1. קודם כל שולפים את הטוקן מהזיכרון של הדפדפן!
    const token = localStorage.getItem('token');

    // 2. עכשיו כשהוא מוגדר, אפשר לבדוק אם יש משתמש וטוקן
    if (user && token) {
        requestForToken(user.id, token);
        
        onMessageListener().then(payload => {
            alert(`הודעה חדשה: ${payload.notification.title}\n${payload.notification.body}`);
            console.log("הודעה התקבלה:", payload);
        }).catch(err => console.log('failed: ', err));
    }
  }, [user]); // שימי לב שמחקתי פה את המילה token מהסוגריים המרובעים!

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

  const isBigBoss        = user.role === 'BIG_BOSS';
  const isCompanyManager = user.role === 'COMPANY_MANAGER';

  // Role-based tab configuration
  const tabsConfig = React.useMemo(() => {
      switch (user.role) {
          case 'BIG_BOSS':
              return [
                  { key: 'tasks',     label: t.nav_tasks,               Icon: LayoutDashboard },
                  { key: 'companies', label: t.nav_companies,            Icon: Building2 },
                  { key: 'settings',  label: t.nav_config,               Icon: Settings },
                  { key: 'profile',   label: t.nav_profile,              Icon: UserCircle },
              ];
          case 'COMPANY_MANAGER':
              return [
                  { key: 'tasks',     label: t.nav_tasks,               Icon: LayoutDashboard },
                  { key: 'settings',  label: t.nav_config,               Icon: Settings },
                  { key: 'profile',   label: t.nav_profile,              Icon: UserCircle },
              ];
          case 'MANAGER':
              return [
                  { key: 'tasks',     label: t.nav_tasks,               Icon: LayoutDashboard },
                  { key: 'team',      label: t.nav_team,                 Icon: Users },
                  { key: 'profile',   label: t.nav_profile,              Icon: UserCircle },
              ];
          default: // EMPLOYEE
              return [
                  { key: 'tasks',     label: t.nav_tasks,               Icon: LayoutDashboard },
                  { key: 'profile',   label: t.nav_profile,              Icon: UserCircle },
              ];
      }
  }, [user.role, t]);

  const renderContent = () => {
      const token = localStorage.getItem('token');
      switch (activeTab) {
          case 'tasks':
              return <TasksTab tasks={tasks} t={t} token={token} user={user} onRefresh={fetchTasks} onComplete={handleCompleteTask} lang={lang} />;
          case 'companies':
              return <CompaniesTab token={token} t={t} user={user} lang={lang} />;
          case 'team':
              return <TeamTab user={user} token={token} t={t} lang={lang} onAddUser={() => setIsUserFormOpen(true)} refreshTrigger={refreshTrigger} />;
          case 'settings':
              if (isBigBoss)        return <ConfigurationTab token={token} t={t} user={user} lang={lang} />;
              if (isCompanyManager) return <CompanyManagerSettingsTab token={token} t={t} user={user} lang={lang} />;
              return null;
          case 'profile':
              return <ProfileTab
                          t={t}
                          user={user}
                          token={token}
                          onLogout={() => { setUser(null); localStorage.removeItem('token'); }}
                          onUpdateUser={handleUserUpdate}
                      />;
          default:
              return <TasksTab tasks={tasks} t={t} token={token} user={user} onRefresh={fetchTasks} onComplete={handleCompleteTask} lang={lang} />;
      }
  };

  return (
    <div className={`min-h-screen bg-slate-50 font-sans`} dir={dir}>

      {/* כותרת עליונה - מעודכנת */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 relative">
          
          {/* צד שמאל: לוגו בלבד */}
          <div className="flex-shrink-0 z-10">
              <img 
                  src={logoImg} 
                  alt="App Logo" 
                  className="h-10 w-auto object-contain" 
              />
          </div>

          {/* מרכז: כותרת האפליקציה */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
              <span className="text-[10px] font-medium tracking-widest uppercase text-gray-300 hidden sm:block select-none">
                  {t.app_name}
              </span>
          </div>

          {/* צד ימין: בחירת שפה */}
          <div className="z-10">
              <select
                  value={lang}
                  onChange={async (e) => {
                      const newLang = e.target.value;
                      // setLang is the single source of truth for UI language —
                      // do NOT call handleUserUpdate here or the useEffect([user])
                      // will fire and fight back against this setLang call.
                      setLang(newLang);
                      // Persist to backend only (no local user-state mutation)
                      if (user) {
                          try {
                              const tok = localStorage.getItem('token');
                              await fetch(`https://maintenance-app-staging.onrender.com/users/${user.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
                                  body: JSON.stringify({
                                      full_name: user.full_name,
                                      email: user.email,
                                      phone: user.phone || '',
                                      role: user.role,
                                      preferred_language: newLang,
                                  }),
                              });
                          } catch (err) { console.error('Failed to save language preference', err); }
                      }
                  }}
                  className="p-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 cursor-pointer text-gray-700"
                  dir="ltr"
              >
                  {allowedLangs.includes('en') && <option value="en">🇺🇸 EN</option>}
                  {allowedLangs.includes('he') && <option value="he">🇮🇱 HE</option>}
                  {allowedLangs.includes('th') && <option value="th">🇹🇭 TH</option>}
              </select>
          </div>
      </header>

      <main className="max-w-3xl mx-auto min-h-[80vh] pb-24">
        {renderContent()}
      </main>

{/* ─── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="pb-16 pt-4 flex justify-center">
        <img src={logoImg} alt="Air Manage" className="h-6 w-auto object-contain opacity-30" />
      </footer>

{/* ─── Bottom navigation ─────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-3xl mx-auto">
            {tabsConfig.map(({ key, label, Icon }) => (
                <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex flex-col items-center w-full ${activeTab === key ? 'text-[#714B67]' : 'text-gray-400'}`}
                >
                    <Icon size={24} strokeWidth={activeTab === key ? 2.5 : 2} />
                    <span className="text-[10px] mt-1 font-medium">{label}</span>
                </button>
            ))}
        </div>
      </nav>

      {/* --- החלונות הקופצים --- */}
      
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