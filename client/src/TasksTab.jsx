import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, parseISO, addDays, startOfDay, isBefore } from 'date-fns'; // שיניתי את הייבוא כדי לתמוך ב-7 ימים קדימה
import { CheckCircle, Clock, AlertCircle, Camera, ArrowRight, X, FileSpreadsheet, Check, Plus, User, MapPin, Hash, Tag, AlertTriangle } from 'lucide-react';
import AdvancedExcel from './AdvancedExcel';
import CreateTaskForm from './CreateTaskForm'; // הנחתי שיש לך קובץ כזה (אם אין, תגידי לי)

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
  .task-count-badge { font-size: 10px; background-color: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 99px; margin-top: 4px; font-weight: bold; }
  .react-calendar__tile--active .task-count-badge { background-color: rgba(255,255,255,0.2); color: white; }
`;

const TasksTab = ({ tasks, t, token, user, onRefresh, lang }) => {
  const [mainTab, setMainTab] = useState('todo'); 
  const [viewMode, setViewMode] = useState('daily'); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null); 
  const [showExcel, setShowExcel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false); // הוספתי למודל יצירה

  // --- Filtering Logic ---
  const pendingTasks = tasks.filter(task => {
      if (task.status !== 'PENDING') return false;
      const taskDate = parseISO(task.due_date);
      // מציג משימות להיום או משימות שעבר זמנן (Overdue)
      return isSameDay(taskDate, new Date()) || isBefore(taskDate, startOfDay(new Date()));
  });

  const waitingTasks = tasks.filter(t => t.status === 'WAITING_APPROVAL');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  const calendarTasks = tasks.filter(t => t.status === 'PENDING' && isSameDay(parseISO(t.due_date), selectedDate));

  // --- Render Daily View ---
  const renderTodoView = () => {
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
                                      {isOverdue && <div className="text-xs text-red-500 font-bold mb-1 mr-1 flex items-center gap-1"><AlertTriangle size={12}/> {t.overdue} {format(parseISO(task.due_date), 'dd/MM')}</div>}
                                      <TaskCard task={task} t={t} onClick={() => setSelectedTask(task)} statusColor={isOverdue ? 'border-red-500' : (task.urgency === 'High' ? 'border-orange-500' : 'border-purple-500')} />
                                  </div>
                              )
                          })}
                      </div>
                  )}
              </div>
          );
      }
      
      // --- Render Weekly View (7 Days from Today) ---
      if (viewMode === 'weekly') {
          // יצירת מערך של 7 הימים הבאים החל מהיום
          const next7Days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));
          
          return (
              <div className="space-y-4 animate-fade-in h-[65vh] overflow-y-auto max-w-2xl mx-auto pr-1">
                  {next7Days.map(day => {
                      const dayTasks = tasks.filter(t => t.status === 'PENDING' && isSameDay(parseISO(t.due_date), day));
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                          <div key={day.toString()} className={`rounded-xl border transition-all ${isToday ? 'border-purple-300 shadow-md bg-purple-50' : 'border-gray-200 bg-white'}`}>
                              <div className={`p-3 font-bold flex justify-between items-center ${isToday ? 'text-purple-800' : 'text-gray-600'}`}>
                                  <span>{format(day, 'EEEE')}</span> {/* שם היום */}
                                  <span className="text-sm opacity-70">{format(day, 'dd/MM')}</span>
                              </div>
                              <div className="p-2 pt-0 space-y-2">
                                  {dayTasks.length > 0 ? (
                                      dayTasks.map(task => (
                                          <TaskCard key={task.id} task={task} t={t} onClick={() => setSelectedTask(task)} statusColor={task.urgency === 'High' ? 'border-orange-500' : 'border-green-500'} compact={true} />
                                      ))
                                  ) : (
                                      <div className="p-3 pt-0 text-xs text-gray-400 text-center">No tasks</div>
                                  )}
                              </div>
                          </div>
                      )
                  })}
              </div>
          );
      }

      // --- Render Yearly/Monthly Calendar View ---
      if (viewMode === 'calendar') {
          return (
              <div className="animate-fade-in flex flex-col items-center">
                  <Calendar 
                    onChange={setSelectedDate} 
                    value={selectedDate} 
                    locale={getLocale(lang)} 
                    tileContent={({ date, view }) => {
                        if (view === 'month') {
                            // ספירת משימות ליום זה
                            const count = tasks.filter(t => t.status === 'PENDING' && isSameDay(parseISO(t.due_date), date)).length;
                            if (count > 0) {
                                return (
                                    <div className="flex flex-col items-center">
                                        {/* תצוגה "3 משימות" */}
                                        <span className="task-count-badge">
                                            {count} {count === 1 ? (t.task_singular || "Task") : (t.tasks_plural || "Tasks")}
                                        </span>
                                    </div>
                                );
                            }
                        }
                    }}
                  />
                  <div className="mt-8 w-full max-w-[800px]">
                      <h4 className="font-bold mb-4 text-gray-700 text-lg border-b pb-2">{t.tasks_for_date} {format(selectedDate, 'dd/MM/yyyy')}:</h4>
                      {calendarTasks.length === 0 && <p className="text-gray-400 text-sm p-2">No tasks for this date.</p>}
                      <div className="space-y-2">
                          {calendarTasks.map(task => (
                              <TaskCard key={task.id} task={task} t={t} onClick={() => setSelectedTask(task)} />
                          ))}
                      </div>
                  </div>
              </div>
          );
      }
  };

  const renderApprovalView = () => {
      return (
          <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
              {waitingTasks.length === 0 && <div className="text-center py-10 text-gray-400"><p>{t.no_tasks_waiting}</p></div>}
              {waitingTasks.map(task => <TaskCard key={task.id} task={task} t={t} onClick={() => setSelectedTask(task)} statusColor="border-orange-400" />)}
          </div>
      );
  };

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
      
      {/* --- Header with Actions (Export & Add) --- */}
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">{t.task_management_title}</h2>
          <div className="flex gap-2">
                {/* כפתור אקסל */}
                {(user.role === 'MANAGER' || user.role === 'BIG_BOSS') && (
                    <button onClick={() => setShowExcel(!showExcel)} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition shadow-sm">
                        <FileSpreadsheet size={20} />
                    </button>
                )}
                {/* כפתור הוספת משימה */}
                <button onClick={() => setShowCreateModal(true)} className="p-2 bg-[#6A0DAD] text-white rounded-full hover:bg-purple-800 transition shadow-sm">
                    <Plus size={20} />
                </button>
          </div>
      </div>
      
      {/* Modals */}
      {showExcel && <AdvancedExcel token={token} t={t} onRefresh={onRefresh} onClose={() => setShowExcel(false)} />}
      
      {/* Create Task Modal - הנחתי שיש לך CreateTaskForm */}
      {showCreateModal && (
          <CreateTaskForm 
              token={token} 
              t={t} 
              user={user} // אם אנחנו בסימולציה (צוות), ה-User הזה הוא העובד שנבחר!
              onRefresh={onRefresh} 
              onClose={() => setShowCreateModal(false)} 
          />
      )}

      {/* Tabs */}
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

// --- Sub Components ---

const TabButton = ({ active, onClick, label, icon, count, color = 'purple' }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${active ? `bg-${color}-50 text-${color}-700 shadow-inner` : 'text-gray-400 hover:bg-gray-50'}`}>
        <div className={`flex items-center gap-2 mb-1 ${active ? 'font-bold' : ''}`}>{icon}<span className="text-sm">{label}</span></div>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${active ? `bg-${color}-200 text-${color}-800` : 'bg-gray-100 text-gray-500'}`}>{count}</span>
    </button>
);

const ViewBtn = ({ active, onClick, label }) => (
    <button onClick={onClick} className={`px-6 py-2 text-sm rounded-lg transition-all ${active ? 'bg-white shadow text-purple-700 font-bold transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
);

// --- Task Card (העיצוב החדש והמשופר) ---
const TaskCard = ({ task, onClick, t, statusColor = 'border-purple-500', compact = false }) => {
    // שם התצוגה: שם הנכס (עדיפות) או הכותרת
    const displayName = task.asset_name || task.title;
    
    return (
        <div onClick={onClick} className={`bg-white p-3 rounded-xl shadow-sm border-r-4 ${statusColor} cursor-pointer hover:shadow-md transition-all flex flex-col gap-1 relative overflow-hidden`}>
            {/* Header Row */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <h4 className={`font-bold text-gray-800 ${compact ? 'text-sm' : 'text-base'}`}>
                        {displayName} 
                        {task.asset_code && <span className="text-gray-400 text-xs font-normal ml-2">#{task.asset_code}</span>}
                    </h4>
                    
                    {/* Location & Category Subtitle */}
                    {!compact && (
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                            {task.location_name && <span className="flex items-center gap-1"><MapPin size={10}/> {task.location_name}</span>}
                            {task.category_name && <span className="flex items-center gap-1 bg-gray-50 px-1.5 rounded"><Tag size={10}/> {task.category_name}</span>}
                        </div>
                    )}
                </div>

                {/* Urgency Badge (Top Right) */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${task.urgency === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                    {task.urgency === 'High' ? (t.urgent || "Urgent") : (t.normal || "Normal")}
                </span>
            </div>

            {/* Bottom Row (Worker Icon, etc) */}
            {!compact && (
                <div className="flex justify-between items-center mt-1 pt-1 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                        {task.worker_name && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <User size={12}/> {task.worker_name}
                            </div>
                        )}
                    </div>
                    <ArrowRight size={16} className="text-gray-300"/>
                </div>
            )}
        </div>
    );
};

// --- Task Detail Modal (המלא והמפורט) ---
const TaskDetailModal = ({ task, onClose, token, user, onRefresh, t }) => {
    const [note, setNote] = useState('');
    const [file, setFile] = useState(null);
    const [followUpDate, setFollowUpDate] = useState('');
    const [mode, setMode] = useState('view'); 
    const [showSuccess, setShowSuccess] = useState(false);

    const canApprove = (user.role === 'MANAGER' || user.role === 'BIG_BOSS') && task.status === 'WAITING_APPROVAL';
    const canComplete = task.status === 'PENDING' && (user.id === task.worker_id || user.role !== 'EMPLOYEE');

    const handleComplete = async () => {
        if (!note && !file) return alert(t.alert_required || "Required field");
        const formData = new FormData();
        formData.append('completion_note', note);
        if (file) formData.append('completion_image', file);
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/tasks/${task.id}/complete`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if(res.ok) {
                setShowSuccess(true);
                setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500);
            }
        } catch(e) { alert("Error"); }
    };

    const handleApprove = async () => {
        await fetch(`https://maintenance-app-h84v.onrender.com/tasks/${task.id}/approve`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500);
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

    if(showSuccess) return <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50"><div className="bg-white p-8 rounded-3xl animate-scale-in flex flex-col items-center"><Check size={40} className="text-green-600 mb-2"/><h2 className="text-xl font-bold">{t.alert_sent || "Success!"}</h2></div></div>;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-end sm:items-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white w-full sm:w-[95%] max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gray-50 p-4 border-b flex justify-between items-start sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{task.asset_name || task.title}</h2>
                        {task.asset_code && <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">#{task.asset_code}</span>}
                    </div>
                    <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.date_label}</span><span className="font-medium">{format(parseISO(task.due_date), 'dd/MM/yyyy')}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.urgency_label || "Urgency"}</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${task.urgency === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>{task.urgency}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.location}</span><span className="font-medium">{task.location_name || '-'}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.category_label || "Category"}</span><span className="font-medium">{task.category_name || '-'}</span></div>
                        <div className="col-span-2 border-t pt-2 mt-2"></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.assigned_to}</span><span className="font-medium">{task.worker_name}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.manager_label || "Manager"}</span><span className="font-medium">{task.manager_name || 'System'}</span></div>
                    </div>

                    {/* Description Box */}
                    {task.description && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <span className="block text-xs text-blue-600 font-bold mb-1">{t.manager_notes}:</span>
                            <p className="text-sm text-blue-900 whitespace-pre-wrap">{task.description}</p>
                        </div>
                    )}

                    {/* Image */}
                    {task.creation_image_url && (
                        <div>
                            <span className="block text-xs text-gray-400 uppercase font-bold mb-2">{t.has_image}</span>
                            <img src={task.creation_image_url} className="w-full h-48 object-cover rounded-xl border" />
                        </div>
                    )}

                    {/* Worker Report (If Waiting/Completed) */}
                    {task.completion_note && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <span className="block text-xs text-orange-600 font-bold mb-1">{t.worker_report}:</span>
                            <p className="text-sm text-orange-900">{task.completion_note}</p>
                            {task.completion_image_url && <img src={task.completion_image_url} className="w-full h-32 object-cover rounded-lg mt-2 border" />}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-4">
                        {canComplete && mode === 'view' && (
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setMode('complete')} className="bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700">{t.complete_task_btn}</button>
                                <button onClick={() => setMode('followup')} className="bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700">{t.followup_task_btn}</button>
                            </div>
                        )}

                        {mode === 'complete' && (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-gray-700">{t.report_execution}</h4>
                                <textarea placeholder={t.what_was_done} className="w-full p-3 border rounded-lg" value={note} onChange={e => setNote(e.target.value)} />
                                <input type="file" onChange={e => setFile(e.target.files[0])} className="text-xs"/>
                                <div className="flex gap-2"><button onClick={() => setMode('view')} className="flex-1 py-2 border rounded-lg bg-white">{t.cancel}</button><button onClick={handleComplete} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold">{t.send_for_approval}</button></div>
                            </div>
                        )}

                        {mode === 'followup' && (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-gray-700">{t.followup_task_btn}</h4>
                                <input type="date" className="w-full p-2 border rounded" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                                <textarea placeholder={t.description_placeholder} className="w-full p-2 border rounded" value={note} onChange={e => setNote(e.target.value)} />
                                <div className="flex gap-2"><button onClick={() => setMode('view')} className="flex-1 py-2 border rounded bg-white">{t.cancel}</button><button onClick={handleFollowUp} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold">{t.save}</button></div>
                            </div>
                        )}

                        {canApprove && (
                            <button onClick={handleApprove} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700">{t.approve_close_btn}</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TasksTab;