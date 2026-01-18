import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns';
// התיקון כאן: הוספנו את X לרשימת הייבוא
import { CheckSquare, Clock, CheckCircle, Calendar as CalIcon, List, AlertCircle, Camera, ArrowRight, X } from 'lucide-react';

const TasksTab = ({ tasks, t, token, user, onRefresh }) => {
  const [mainTab, setMainTab] = useState('todo'); // 'todo', 'waiting', 'completed'
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'weekly', 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null); // המשימה שנבחרה לפתיחת כרטיסיה

  // --- סינון משימות ראשי ---
  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const waitingTasks = tasks.filter(t => t.status === 'WAITING_APPROVAL');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  // --- תצוגות של "לביצוע" ---
  const renderTodoView = () => {
      // 1. תצוגה יומית
      if (viewMode === 'daily') {
          const todaysTasks = pendingTasks.filter(task => isSameDay(parseISO(task.due_date), new Date()));
          return (
              <div className="space-y-4 animate-fade-in">
                  <h3 className="font-bold text-gray-700 border-b pb-2">משימות להיום ({format(new Date(), 'dd/MM/yyyy')})</h3>
                  {todaysTasks.length === 0 ? <p className="text-gray-400 text-center">אין משימות להיום ✅</p> : 
                   todaysTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />)}
              </div>
          );
      }
      
      // 2. תצוגה שבועית (רשימה נגללת מחולקת לימים)
      if (viewMode === 'weekly') {
          const start = startOfWeek(new Date(), { weekStartsOn: 0 }); // יום ראשון
          const end = endOfWeek(new Date(), { weekStartsOn: 0 });
          
          const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

          return (
              <div className="space-y-6 animate-fade-in h-[65vh] overflow-y-auto">
                  {weekDays.map(day => {
                      const dayTasks = pendingTasks.filter(t => isSameDay(parseISO(t.due_date), day));
                      return (
                          <div key={day.toString()}>
                              <div className={`p-2 rounded-t-lg font-bold ${isSameDay(day, new Date()) ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {format(day, 'dd/MM')} - {getDayName(day)}
                              </div>
                              <div className="bg-white border-x border-b p-2 rounded-b-lg space-y-2 min-h-[50px]">
                                  {dayTasks.length === 0 && <span className="text-xs text-gray-400">אין משימות</span>}
                                  {dayTasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} compact />)}
                              </div>
                          </div>
                      )
                  })}
              </div>
          );
      }

      // 3. תצוגת יומן (חודשית)
      if (viewMode === 'calendar') {
          return (
              <div className="animate-fade-in">
                  <Calendar 
                    onChange={setSelectedDate} 
                    value={selectedDate} 
                    tileContent={({ date, view }) => {
                        if (view === 'month' && pendingTasks.some(t => isSameDay(parseISO(t.due_date), date))) {
                            return <div className="w-2 h-2 bg-purple-500 rounded-full mx-auto mt-1"></div>
                        }
                    }}
                    locale="he-IL"
                  />
                  <div className="mt-4">
                      <h4 className="font-bold mb-2">משימות ל-{format(selectedDate, 'dd/MM')}:</h4>
                      {pendingTasks.filter(t => isSameDay(parseISO(t.due_date), selectedDate)).map(task => (
                          <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                      ))}
                  </div>
              </div>
          );
      }
  };

  // --- תצוגת אישור מנהל (היררכית) ---
  const renderApprovalView = () => {
      const grouped = waitingTasks.reduce((acc, task) => {
          const name = task.worker_name || 'לא ידוע';
          if (!acc[name]) acc[name] = [];
          acc[name].push(task);
          return acc;
      }, {});

      return (
          <div className="space-y-4 animate-fade-in">
              {Object.keys(grouped).length === 0 && <p className="text-center text-gray-500 mt-10">אין משימות שממתינות לאישור</p>}
              {Object.entries(grouped).map(([workerName, tasks]) => (
                  <div key={workerName} className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                      <div className="bg-orange-50 p-3 font-bold text-orange-800 flex justify-between">
                          <span>👤 {workerName}</span>
                          <span className="bg-white px-2 rounded-full text-xs flex items-center">{tasks.length} ממתינות</span>
                      </div>
                      <div className="p-2 space-y-2">
                          {tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} statusColor="border-orange-400" />)}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  // --- תצוגת היסטוריה (הושלמו) ---
  const renderCompletedView = () => {
      return (
          <div className="space-y-3 animate-fade-in">
              {completedTasks.length === 0 && <p className="text-center text-gray-500 mt-10">עדיין אין משימות שהושלמו</p>}
              {completedTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} statusColor="border-green-500" />
              ))}
          </div>
      );
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-gray-50">
      {/* כותרת וניווט עליון */}
      <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[#6A0DAD]">ניהול משימות</h2>
      </div>

      {/* סרגל הניווט המשני */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6">
          <TabButton active={mainTab === 'todo'} onClick={() => setMainTab('todo')} label="לביצוע" icon={<Clock size={16}/>} count={pendingTasks.length} />
          <TabButton active={mainTab === 'waiting'} onClick={() => setMainTab('waiting')} label="לאישור" icon={<AlertCircle size={16}/>} count={waitingTasks.length} color="orange" />
          <TabButton active={mainTab === 'completed'} onClick={() => setMainTab('completed')} label="הושלמו" icon={<CheckCircle size={16}/>} count={completedTasks.length} color="green" />
      </div>

      {/* כפתורי תצוגה (רק בטאב לביצוע) */}
      {mainTab === 'todo' && (
          <div className="flex justify-center gap-2 mb-4 bg-gray-200 p-1 rounded-lg w-fit mx-auto">
              <ViewBtn active={viewMode === 'daily'} onClick={() => setViewMode('daily')} label="היום" />
              <ViewBtn active={viewMode === 'weekly'} onClick={() => setViewMode('weekly')} label="השבוע" />
              <ViewBtn active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')} label="יומן" />
          </div>
      )}

      {/* התוכן המרכזי */}
      {mainTab === 'todo' && renderTodoView()}
      {mainTab === 'waiting' && renderApprovalView()}
      {mainTab === 'completed' && renderCompletedView()}

      {/* מודאל פרטי משימה */}
      {selectedTask && (
          <TaskDetailModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            token={token}
            user={user}
            onRefresh={onRefresh}
          />
      )}
    </div>
  );
};

// --- רכיבים קטנים ---

const TabButton = ({ active, onClick, label, icon, count, color = 'purple' }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center py-2 rounded-lg transition ${active ? `bg-${color}-100 text-${color}-700 font-bold` : 'text-gray-500 hover:bg-gray-50'}`}>
        <div className="flex items-center gap-1">
            {icon}
            <span className="text-sm">{label}</span>
        </div>
        <span className="text-xs bg-white px-2 rounded-full shadow-sm mt-1">{count}</span>
    </button>
);

const ViewBtn = ({ active, onClick, label }) => (
    <button onClick={onClick} className={`px-4 py-1 text-xs rounded-md transition ${active ? 'bg-white shadow text-purple-700 font-bold' : 'text-gray-600 hover:text-gray-800'}`}>
        {label}
    </button>
);

const TaskCard = ({ task, onClick, statusColor = 'border-purple-500', compact = false }) => (
    <div onClick={onClick} className={`bg-white p-3 rounded-lg shadow-sm border-r-4 ${statusColor} cursor-pointer hover:bg-gray-50 transition flex justify-between items-center`}>
        <div>
            <h4 className={`font-bold text-gray-800 ${compact ? 'text-sm' : ''}`}>{task.title}</h4>
            {!compact && <div className="text-xs text-gray-500 flex gap-2 mt-1">
                <span>📍 {task.location_name}</span>
                {task.description && <span>📝 יש הערות</span>}
                {task.creation_image_url && <span>📷 יש תמונה</span>}
            </div>}
        </div>
        <ArrowRight size={16} className="text-gray-300"/>
    </div>
);

const getDayName = (date) => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[date.getDay()];
};

// --- המודאל החכם ---
const TaskDetailModal = ({ task, onClose, token, user, onRefresh }) => {
    const [note, setNote] = useState('');
    const [file, setFile] = useState(null);
    const [followUpDate, setFollowUpDate] = useState('');
    const [mode, setMode] = useState('view'); // 'view', 'complete', 'followup'

    const canApprove = (user.role === 'MANAGER' || user.role === 'BIG_BOSS') && task.status === 'WAITING_APPROVAL';
    const canComplete = task.status === 'PENDING' && (user.id === task.worker_id || user.role !== 'EMPLOYEE');

    const handleComplete = async () => {
        if (!note && !file) return alert("חובה להוסיף תמונה או הערה!");
        const formData = new FormData();
        formData.append('completion_note', note);
        if (file) formData.append('completion_image', file);

        await fetch(`http://192.168.0.106:3001/tasks/${task.id}/complete`, {
            method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }, body: formData
        });
        alert("המשימה הועברה לאישור מנהל!");
        onRefresh(); onClose();
    };

    const handleApprove = async () => {
        await fetch(`http://192.168.0.106:3001/tasks/${task.id}/approve`, {
            method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
        });
        alert("המשימה אושרה ונסגרה!");
        onRefresh(); onClose();
    };

    const handleFollowUp = async () => {
        if (!followUpDate) return alert("בחר תאריך");
        await fetch(`http://192.168.0.106:3001/tasks/${task.id}/follow-up`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ due_date: followUpDate, description: note || 'משימת המשך' })
        });
        alert("משימת המשך נוצרה!");
        onRefresh(); onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-end sm:items-center z-50">
            <div className="bg-white w-full sm:w-[90%] max-w-lg rounded-t-2xl sm:rounded-xl p-5 max-h-[90vh] overflow-y-auto animate-slide-up">
                {/* הנה הכפתור שגרם לבעיה, עכשיו X מיובא למעלה ולכן זה יעבוד */}
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                
                <h2 className="text-xl font-bold mb-2 text-purple-700">{task.title}</h2>
                <div className="text-sm text-gray-600 space-y-2 mb-4 bg-gray-50 p-3 rounded-lg">
                    <p>📅 <strong>תאריך יעד:</strong> {format(parseISO(task.due_date), 'dd/MM/yyyy')}</p>
                    <p>📍 <strong>מיקום:</strong> {task.location_name}</p>
                    <p>👤 <strong>אחראי:</strong> {task.worker_name}</p>
                    <p>🔥 <strong>דחיפות:</strong> {task.urgency}</p>
                    {task.description && <p>📝 <strong>הערות מנהל:</strong> {task.description}</p>}
                </div>

                {task.creation_image_url && (
                    <div className="mb-4">
                        <p className="font-bold text-xs mb-1">תמונת משימה:</p>
                        <img src={task.creation_image_url} alt="Task" className="w-full h-48 object-cover rounded-lg border" />
                    </div>
                )}

                {task.status === 'COMPLETED' && <div className="bg-green-100 p-3 text-green-800 rounded font-bold text-center">✅ המשימה הושלמה ואושרה!</div>}
                
                {task.status === 'WAITING_APPROVAL' && !canApprove && <div className="bg-orange-100 p-3 text-orange-800 rounded font-bold text-center">⏳ ממתין לאישור מנהל</div>}

                {canComplete && mode === 'view' && (
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setMode('complete')} className="bg-green-600 text-white py-3 rounded-lg font-bold">✅ סמן כבוצע</button>
                        <button onClick={() => setMode('followup')} className="bg-blue-600 text-white py-3 rounded-lg font-bold">📅 משימת המשך</button>
                    </div>
                )}

                {mode === 'complete' && (
                    <div className="space-y-3 border-t pt-4">
                        <h4 className="font-bold">דיווח ביצוע</h4>
                        <textarea placeholder="מה בוצע? (חובה)" className="w-full p-2 border rounded" value={note} onChange={e => setNote(e.target.value)} />
                        <div className="border-2 border-dashed p-3 text-center rounded cursor-pointer relative">
                            <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/>
                            <Camera className="mx-auto text-gray-400"/>
                            <span className="text-xs text-gray-500">{file ? file.name : "צרף תמונת ביצוע (אופציונלי)"}</span>
                        </div>
                        <button onClick={handleComplete} className="w-full bg-green-600 text-white py-2 rounded font-bold">שלח לאישור</button>
                        <button onClick={() => setMode('view')} className="w-full text-gray-500 text-sm">ביטול</button>
                    </div>
                )}

                {mode === 'followup' && (
                    <div className="space-y-3 border-t pt-4">
                        <h4 className="font-bold">פתיחת משימת המשך</h4>
                        <input type="date" className="w-full p-2 border rounded" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                        <textarea placeholder="סיבת הדחייה / מה נשאר לעשות?" className="w-full p-2 border rounded" value={note} onChange={e => setNote(e.target.value)} />
                        <button onClick={handleFollowUp} className="w-full bg-blue-600 text-white py-2 rounded font-bold">צור משימה חדשה</button>
                        <button onClick={() => setMode('view')} className="w-full text-gray-500 text-sm">ביטול</button>
                    </div>
                )}

                {canApprove && (
                    <div className="border-t pt-4 mt-4">
                        <h4 className="font-bold mb-2">אישור ביצוע</h4>
                        {task.completion_note && <p className="text-sm bg-gray-50 p-2 rounded mb-2">💬 הערת עובד: {task.completion_note}</p>}
                        {task.completion_image_url && <img src={task.completion_image_url} className="w-full h-40 object-cover rounded mb-3" />}
                        <button onClick={handleApprove} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg">אשר ביצוע</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TasksTab;