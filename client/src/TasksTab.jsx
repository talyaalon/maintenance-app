import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, parseISO, startOfWeek, endOfWeek, addDays, isBefore, startOfDay } from 'date-fns';
import { CheckSquare, Clock, CheckCircle, Calendar as CalIcon, List, AlertCircle, Camera, ArrowRight, X, FileSpreadsheet } from 'lucide-react';
import AdvancedExcel from './AdvancedExcel';

// --- Helper for Calendar Language ---
const getLocale = (lang) => {
    if (lang === 'he') return 'he-IL';
    if (lang === 'th') return 'th-TH';
    return 'en-US';
};

// --- CSS Styles ---
const calendarStyles = `
  .react-calendar { width: 95%; max-width: 800px; margin: 0 auto; border: none; font-family: inherit; background: white; border-radius: 1.5rem; padding: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
  .react-calendar__navigation button { font-size: 1.2rem; font-weight: bold; color: #4c1d95; }
  .react-calendar__month-view__weekdays { text-align: center; text-transform: uppercase; font-weight: bold; font-size: 0.85em; color: #6b7280; margin-bottom: 10px; }
  .react-calendar__tile { height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 10px; border-radius: 12px; font-size: 1rem; }
  .react-calendar__tile:hover { background-color: #f3f4f6; }
  .react-calendar__tile--now { background: #f3e8ff !important; color: #6A0DAD; font-weight: bold; border: 1px solid #d8b4fe; }
  .react-calendar__tile--active { background: #6A0DAD !important; color: white !important; }
  .task-dots-container { display: flex; gap: 3px; margin-top: 6px; }
  .task-dot { width: 6px; height: 6px; background-color: #10B981; border-radius: 50%; }
  .task-dot.urgent { background-color: #EF4444; }
  .task-count-badge { font-size: 10px; background-color: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 99px; margin-top: 4px; font-weight: bold; }
  .react-calendar__tile--active .task-count-badge { background-color: rgba(255,255,255,0.2); color: white; }
`;

const TasksTab = ({ tasks, t, token, user, onRefresh, lang }) => { // Added 'lang' prop
  const [mainTab, setMainTab] = useState('todo'); 
  const [viewMode, setViewMode] = useState('daily'); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null); 
  const [showExcel, setShowExcel] = useState(false); // State for Excel toggle

  // --- Filtering Logic ---
  
  // 1. Pending (To Do): Includes Today AND Overdue tasks
  const pendingTasks = tasks.filter(task => {
      if (task.status !== 'PENDING') return false;
      const taskDate = parseISO(task.due_date);
      // Show if it is today OR in the past (overdue)
      return isSameDay(taskDate, new Date()) || isBefore(taskDate, startOfDay(new Date()));
  });

  // 2. Waiting: Show ALL waiting tasks (No date filter - see entire history)
  const waitingTasks = tasks.filter(t => t.status === 'WAITING_APPROVAL');

  // 3. Completed: Show ALL completed tasks (No date filter - see entire history)
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  // Helper for Calendar View (Only tasks for the specific selected date)
  const calendarTasks = tasks.filter(t => t.status === 'PENDING' && isSameDay(parseISO(t.due_date), selectedDate));

  const renderTodoView = () => {
      // Daily View
      if (viewMode === 'daily') {
          return (
              <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-100 text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">{t.tab_todo}</h3>
                      <p className="text-purple-600 font-medium">{format(new Date(), 'dd/MM/yyyy')}</p>
                  </div>
                  {pendingTasks.length === 0 ? (
                      <div className="text-center py-10 opacity-70">
                          <CheckCircle size={60} className="mx-auto text-green-300 mb-3"/>
                          <p className="text-gray-500 text-lg">{t.no_tasks_today}</p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          {pendingTasks.map(task => {
                              const isOverdue = isBefore(parseISO(task.due_date), startOfDay(new Date()));
                              return (
                                  <div key={task.id}>
                                      {isOverdue && <div className="text-xs text-red-500 font-bold mb-1 mr-1">{t.overdue} {format(parseISO(task.due_date), 'dd/MM')}</div>}
                                      <TaskCard task={task} t={t} onClick={() => setSelectedTask(task)} statusColor={isOverdue ? 'border-red-500' : 'border-purple-500'} />
                                  </div>
                              )
                          })}
                      </div>
                  )}
              </div>
          );
      }
      // Weekly View
      if (viewMode === 'weekly') {
          const start = startOfWeek(new Date(), { weekStartsOn: 0 }); 
          const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
          return (
              <div className="space-y-4 animate-fade-in h-[65vh] overflow-y-auto max-w-2xl mx-auto pr-1">
                  {weekDays.map(day => {
                      // Show tasks for this specific day (Future tasks included)
                      const dayTasks = tasks.filter(t => t.status === 'PENDING' && isSameDay(parseISO(t.due_date), day));
                      const isToday = isSameDay(day, new Date());
                      return (
                          <div key={day.toString()} className={`rounded-xl border transition-all ${isToday ? 'border-purple-300 shadow-md bg-purple-50' : 'border-gray-200 bg-white'}`}>
                              <div className={`p-3 font-bold flex justify-between items-center ${isToday ? 'text-purple-800' : 'text-gray-600'}`}>
                                  <span>{getDayName(day, t)}</span>
                                  <span className="text-sm opacity-70">{format(day, 'dd/MM')}</span>
                              </div>
                              {dayTasks.length > 0 ? (
                                  <div className="p-2 pt-0 space-y-2">
                                      {dayTasks.map(task => (
                                          <div key={task.id} onClick={() => setSelectedTask(task)} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50">
                                              <span className="text-sm font-medium">{task.title}</span>
                                              <div className={`w-2 h-2 rounded-full ${task.urgency === 'High' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                          </div>
                                      ))}
                                  </div>
                              ) : <div className="p-3 pt-0 text-xs text-gray-400">{t.no_tasks_today.split('!')[0]}</div>}
                          </div>
                      )
                  })}
              </div>
          );
      }
      // Calendar View
      if (viewMode === 'calendar') {
          return (
              <div className="animate-fade-in flex flex-col items-center">
                  <Calendar 
                    onChange={setSelectedDate} 
                    value={selectedDate} 
                    locale={getLocale(lang)} // Fixed: Dynamic Language
                    tileContent={({ date, view }) => {
                        if (view === 'month') {
                            const dayTasks = tasks.filter(t => t.status === 'PENDING' && isSameDay(parseISO(t.due_date), date));
                            if (dayTasks.length > 0) {
                                return (
                                    <div className="flex flex-col items-center">
                                        <div className="task-dots-container">
                                            {dayTasks.slice(0, 3).map((_, i) => <div key={i} className={`task-dot ${dayTasks[i].urgency === 'High' ? 'urgent' : ''}`}></div>)}
                                            {dayTasks.length > 3 && <div className="task-dot bg-gray-300"></div>}
                                        </div>
                                        <span className="task-count-badge">{dayTasks.length}</span>
                                    </div>
                                );
                            }
                        }
                    }}
                  />
                  <div className="mt-8 w-full max-w-[800px]">
                      <h4 className="font-bold mb-4 text-gray-700 text-lg border-b pb-2">{t.tasks_for_date} {format(selectedDate, 'dd/MM/yyyy')}:</h4>
                      {calendarTasks.length === 0 && <p className="text-gray-400 text-sm p-2">No tasks for this date.</p>}
                      {calendarTasks.map(task => (
                          <TaskCard key={task.id} task={task} t={t} onClick={() => setSelectedTask(task)} />
                      ))}
                  </div>
              </div>
          );
      }
  };

  // Approval View
  const renderApprovalView = () => {
      const grouped = waitingTasks.reduce((acc, task) => {
          const name = task.worker_name || 'Unknown';
          if (!acc[name]) acc[name] = []; acc[name].push(task); return acc;
      }, {});
      return (
          <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
              {Object.keys(grouped).length === 0 && <div className="text-center py-10 text-gray-400"><p>{t.no_tasks_waiting}</p></div>}
              {Object.entries(grouped).map(([workerName, tasks]) => (
                  <div key={workerName} className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                      <div className="bg-orange-50 p-3 font-bold text-orange-800 flex justify-between items-center px-4">
                          <span>👤 {workerName}</span><span className="bg-white px-3 py-1 rounded-full text-xs font-bold">{tasks.length}</span>
                      </div>
                      <div className="p-3 space-y-2">{tasks.map(task => <TaskCard key={task.id} task={task} t={t} onClick={() => setSelectedTask(task)} statusColor="border-orange-400" />)}</div>
                  </div>
              ))}
          </div>
      );
  };

  // History View
  const renderCompletedView = () => {
      return (
          <div className="space-y-3 animate-fade-in max-w-3xl mx-auto">
              {completedTasks.length === 0 && <p className="text-center text-gray-500 mt-10">{t.no_tasks_completed}</p>}
              {completedTasks.map(task => <TaskCard key={task.id} task={task} t={t} onClick={() => setSelectedTask(task)} statusColor="border-green-500" />)}
          </div>
      );
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-gray-50">
      <style>{calendarStyles}</style>
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#6A0DAD]">{t.task_management_title}</h2>
          
          {/* Excel Button (Visible for Managers) */}
          {(user.role === 'MANAGER' || user.role === 'BIG_BOSS') && (
            <button onClick={() => setShowExcel(!showExcel)} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition shadow-sm">
                <FileSpreadsheet size={20} />
            </button>
          )}
      </div>
      
      {/* Excel Modal */}
        {showExcel && (
            <AdvancedExcel 
                token={token} 
                t={t} 
                onRefresh={onRefresh} 
                onClose={() => setShowExcel(false)} // הוספנו כפתור סגירה
            />
        )}  

      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-8 mx-auto max-w-3xl">
          <TabButton active={mainTab === 'todo'} onClick={() => { setMainTab('todo'); setViewMode('daily'); }} label={t.tab_todo} icon={<Clock size={18}/>} count={pendingTasks.length} />
          <TabButton active={mainTab === 'waiting'} onClick={() => setMainTab('waiting')} label={t.tab_waiting} icon={<AlertCircle size={18}/>} count={waitingTasks.length} color="orange" />
          <TabButton active={mainTab === 'completed'} onClick={() => setMainTab('completed')} label={t.tab_completed} icon={<CheckCircle size={18}/>} count={completedTasks.length} color="green" />
      </div>

      {mainTab === 'todo' && (
          <div className="flex justify-center mb-8"><div className="flex bg-gray-200 p-1 rounded-xl">
              <ViewBtn active={viewMode === 'daily'} onClick={() => setViewMode('daily')} label={t.view_daily} />
              <ViewBtn active={viewMode === 'weekly'} onClick={() => setViewMode('weekly')} label={t.view_weekly} />
              <ViewBtn active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')} label={t.view_calendar} />
          </div></div>
      )}

      {mainTab === 'todo' && renderTodoView()}
      {mainTab === 'waiting' && renderApprovalView()}
      {mainTab === 'completed' && renderCompletedView()}

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} token={token} user={user} onRefresh={onRefresh} t={t} />}
    </div>
  );
};

// --- Components ---
const TabButton = ({ active, onClick, label, icon, count, color = 'purple' }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${active ? `bg-${color}-50 text-${color}-700 shadow-inner` : 'text-gray-400 hover:bg-gray-50'}`}>
        <div className={`flex items-center gap-2 mb-1 ${active ? 'font-bold' : ''}`}>{icon}<span className="text-sm">{label}</span></div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${active ? `bg-${color}-200 text-${color}-800` : 'bg-gray-100 text-gray-500'}`}>{count}</span>
    </button>
);
const ViewBtn = ({ active, onClick, label }) => (
    <button onClick={onClick} className={`px-6 py-2 text-sm rounded-lg transition-all ${active ? 'bg-white shadow text-purple-700 font-bold transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
);
const TaskCard = ({ task, onClick, t, statusColor = 'border-purple-500', compact = false }) => (
    <div onClick={onClick} className={`bg-white p-4 rounded-xl shadow-sm border-r-4 ${statusColor} cursor-pointer hover:shadow-md transition-all flex justify-between items-center`}>
        <div>
            <h4 className={`font-bold text-gray-800 ${compact ? 'text-sm' : 'text-base'}`}>{task.title}</h4>
            {!compact && <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-2">
                <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">📍 {task.location_name}</span>
                {task.description && <span className="flex items-center gap-1 text-blue-600">📝 {t.has_notes}</span>}
                {task.creation_image_url && <span className="flex items-center gap-1 text-purple-600">📷 {t.has_image}</span>}
            </div>}
        </div>
        <ArrowRight size={18} className="text-gray-300"/>
    </div>
);
const getDayName = (date, t) => {
    const days = [t.day_0, t.day_1, t.day_2, t.day_3, t.day_4, t.day_5, t.day_6];
    return days[date.getDay()];
};

// --- Modal ---
const TaskDetailModal = ({ task, onClose, token, user, onRefresh, t }) => {
    const [note, setNote] = useState('');
    const [file, setFile] = useState(null);
    const [followUpDate, setFollowUpDate] = useState('');
    const [mode, setMode] = useState('view'); 
    const canApprove = (user.role === 'MANAGER' || user.role === 'BIG_BOSS') && task.status === 'WAITING_APPROVAL';
    const canComplete = task.status === 'PENDING' && (user.id === task.worker_id || user.role !== 'EMPLOYEE');

    const handleComplete = async () => {
        if (!note && !file) return alert(t.alert_required || "Required field");
        const formData = new FormData();
        formData.append('completion_note', note);
        if (file) formData.append('completion_image', file);
        await fetch(`https://maintenance-app-h84v.onrender.com/tasks/${task.id}/complete`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        alert(t.alert_sent || "Sent successfully!"); 
        onRefresh(); onClose();
    };
    const handleApprove = async () => {
        await fetch(`https://maintenance-app-h84v.onrender.com/tasks/${task.id}/approve`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        alert(t.alert_approved || "Approved successfully!"); 
        onRefresh(); onClose();
    };
    const handleFollowUp = async () => {
        if (!followUpDate) return alert(t.alert_required || "Date required");
        await fetch(`https://maintenance-app-h84v.onrender.com/tasks/${task.id}/follow-up`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ due_date: followUpDate, description: note || 'Follow up' })
        });
        alert(t.alert_created || "Created successfully!"); 
        onRefresh(); onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-end sm:items-center z-50 backdrop-blur-sm">
            <div className="bg-white w-full sm:w-[90%] max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
                <div className="mt-2 text-center">
                    <h2 className="text-2xl font-bold text-gray-800">{task.title}</h2>
                    <p className={`text-sm font-bold mt-1 inline-block px-3 py-1 rounded-full ${task.urgency === 'High' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {task.urgency === 'High' ? t.urgent_label : t.normal_label}
                    </p>
                </div>
                <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 text-sm text-gray-700">
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">{t.date_label}:</span><span className="font-bold">{format(parseISO(task.due_date), 'dd/MM/yyyy')}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">{t.location}:</span><span className="font-bold">{task.location_name}</span></div>
                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">{t.assigned_to}:</span><span className="font-bold">{task.worker_name}</span></div>
                    {task.description && <div className="pt-2"><span className="text-gray-500 block mb-1">{t.manager_notes}:</span><p className="bg-white p-2 rounded border text-gray-600">{task.description}</p></div>}
                </div>
                {task.creation_image_url && <div className="mt-4"><p className="font-bold text-xs mb-2 text-gray-500">{t.has_image}:</p><img src={task.creation_image_url} className="w-full h-48 object-cover rounded-xl border" /></div>}
                <div className="mt-6">
                    {canComplete && mode === 'view' && (
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setMode('complete')} className="bg-green-600 text-white py-3.5 rounded-xl font-bold shadow-lg">{t.complete_task_btn}</button>
                            <button onClick={() => setMode('followup')} className="bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg">{t.followup_task_btn}</button>
                        </div>
                    )}
                    {mode === 'complete' && (
                        <div className="space-y-4 bg-green-50 p-4 rounded-xl">
                            <h4 className="font-bold text-green-800">{t.report_execution}</h4>
                            <textarea placeholder={t.what_was_done} className="w-full p-3 border rounded-lg" value={note} onChange={e => setNote(e.target.value)} />
                            <div className="border-2 border-dashed border-green-300 p-4 text-center rounded-lg cursor-pointer relative"><input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"/><Camera className="mx-auto text-green-600 mb-1"/><span className="text-xs text-green-700 font-medium">{file ? file.name : t.upload_proof}</span></div>
                            <div className="flex gap-2"><button onClick={() => setMode('view')} className="flex-1 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg">{t.cancel}</button><button onClick={handleComplete} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold">{t.send_for_approval}</button></div>
                        </div>
                    )}
                    {mode === 'followup' && (
                        <div className="space-y-4 bg-blue-50 p-4 rounded-xl">
                            <h4 className="font-bold text-blue-800">{t.followup_task_btn}</h4>
                            <div><label className="text-xs text-blue-600 font-bold block mb-1">{t.new_date}</label><input type="date" className="w-full p-3 border rounded-lg" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} /></div>
                            <textarea placeholder={t.description_placeholder} className="w-full p-3 border rounded-lg" value={note} onChange={e => setNote(e.target.value)} />
                            <div className="flex gap-2"><button onClick={() => setMode('view')} className="flex-1 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg">{t.cancel}</button><button onClick={handleFollowUp} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">{t.save}</button></div>
                        </div>
                    )}
                    {canApprove && (
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                            <h4 className="font-bold mb-3 text-orange-800">{t.approve_close_btn}</h4>
                            {task.completion_note && <div className="bg-white p-3 rounded-lg border border-orange-100 mb-3 text-sm text-gray-700">💬 <span className="font-bold">{t.worker_report}:</span> {task.completion_note}</div>}
                            {task.completion_image_url && <img src={task.completion_image_url} className="w-full h-48 object-cover rounded-lg border mb-4 shadow-sm" />}
                            <button onClick={handleApprove} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold shadow-lg">{t.approve_close_btn}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default TasksTab;