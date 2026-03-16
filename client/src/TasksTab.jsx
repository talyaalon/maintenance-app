import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, addDays, startOfDay, isBefore } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, X, FileSpreadsheet, Check, Plus, AlertTriangle, Search } from 'lucide-react';
import AdvancedExcel from './AdvancedExcel';
import CreateTaskForm from './CreateTaskForm';
import TaskCard from './TaskCard';

const getLocale = (lang) => {
    if (lang === 'he') return 'he-IL';
    if (lang === 'th') return 'th-TH';
    return 'en-US';
};

// ─── Bangkok timezone helpers ────────────────────────────────────────────────
const getBkkParts = (dateString) => {
    const parts = {};
    new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(new Date(dateString)).forEach(p => { parts[p.type] = p.value; });
    return parts;
};

const getBkkDateObj = (dateString) => {
    if (!dateString) return new Date();
    const p = getBkkParts(dateString);
    const h = parseInt(p.hour, 10);
    return new Date(
        parseInt(p.year,   10),
        parseInt(p.month,  10) - 1,
        parseInt(p.day,    10),
        h === 24 ? 0 : h,
        parseInt(p.minute, 10),
        parseInt(p.second, 10)
    );
};

const formatBkkDate = (dateString) => {
    if (!dateString) return '';
    const p = getBkkParts(dateString);
    const h = p.hour === '24' ? '00' : p.hour;
    return `${p.day}/${p.month} ${h}:${p.minute}`;
};

const getCurrentBkkTimeForInput = () => {
    const parts = {};
    new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date()).forEach(p => { parts[p.type] = p.value; });
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
// ─────────────────────────────────────────────────────────────────────────────

const calendarStyles = `
  .react-calendar { width: 100%; border: none; font-family: inherit; background: white; border-radius: 1rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
  .react-calendar__navigation button { font-size: 1.1rem; font-weight: bold; color: #714B67; }
  .react-calendar__month-view__weekdays { text-align: center; font-size: 0.8em; color: #6b7280; }
  .react-calendar__tile { height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 5px; border-radius: 8px; font-size: 0.9rem; transition: background 0.2s;}
  .react-calendar__tile:hover { background-color: #fdf4ff; }
  .react-calendar__tile--now { background: #fdf4ff !important; color: #714B67; border: 1px solid #714B67; }
  .react-calendar__tile--active { background: #714B67 !important; color: white !important; }
  .task-count-badge { font-size: 9px; background-color: #e5e7eb; color: #374151; padding: 1px 5px; border-radius: 99px; margin-top: 2px; }
  .react-calendar__tile--active .task-count-badge { background-color: rgba(255,255,255,0.3); color: white; }
`;

const TasksTab = ({ tasks, t, token, user, onRefresh, lang, subordinates }) => {
  const [mainTab, setMainTab] = useState('overdue');
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showExcel, setShowExcel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isTeamView = Array.isArray(subordinates);

  const todayBkk = getBkkDateObj(new Date());

  // Today-only: tasks due exactly today
  const todayTasks = tasks.filter(task => {
      if (task.status !== 'PENDING') return false;
      const taskDate = getBkkDateObj(task.due_date);
      return isSameDay(taskDate, todayBkk);
  });

  // Overdue: PENDING tasks with due_date strictly before today
  const overdueTasks = tasks.filter(task => {
      if (task.status !== 'PENDING') return false;
      const taskDate = getBkkDateObj(task.due_date);
      return isBefore(taskDate, startOfDay(todayBkk));
  });

  // Search filter helper
  const applySearch = (list) => {
      if (!searchQuery.trim()) return list;
      const q = searchQuery.toLowerCase();
      return list.filter(task =>
          (task.title || '').toLowerCase().includes(q) ||
          (task.description || '').toLowerCase().includes(q)
      );
  };

  const waitingTasks = tasks.filter(t => t.status === 'WAITING_APPROVAL');
  const hideWaitingTab = user.role === 'MANAGER'
      ? !!user.auto_approve_tasks
      : !!user.manager_auto_approve_tasks;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  const calendarTasks = tasks.filter(t => t.status === 'PENDING' && isSameDay(getBkkDateObj(t.due_date), selectedDate));

  const renderOverdueView = () => {
      const filtered = applySearch(overdueTasks);
      return (
          <div className="space-y-4 animate-fade-in max-w-2xl mx-auto pb-28">
              {filtered.length === 0 ? (
                  <div className="text-center py-10 opacity-70">
                      <CheckCircle size={60} className="mx-auto text-green-300 mb-3"/>
                      <p className="text-gray-500 text-lg">{overdueTasks.length === 0 ? (t.no_overdue_tasks || 'No overdue tasks!') : (t.no_search_results || 'No matching tasks.')}</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {filtered.map(task => (
                          <div key={task.id}>
                              <div className="text-xs text-red-500 font-bold mb-1 mr-1 flex items-center gap-1">
                                  <AlertTriangle size={12}/> {t.overdue} — {formatBkkDate(task.due_date)}
                              </div>
                              <TaskCard task={task} t={t} lang={lang} onClick={() => setSelectedTask(task)} />
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  const renderTodoView = () => {
      if (viewMode === 'daily') {
          const filtered = applySearch(todayTasks);
          return (
              <div className="space-y-4 animate-fade-in max-w-2xl mx-auto pb-28">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#714B67]/20 text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">{t.tab_todo}</h3>
                      <p className="text-[#714B67] font-medium">{format(todayBkk, 'dd/MM/yyyy')}</p>
                  </div>
                  {filtered.length === 0 ? (
                      <div className="text-center py-10 opacity-70">
                          <CheckCircle size={60} className="mx-auto text-green-300 mb-3"/>
                          <p className="text-gray-500 text-lg">{todayTasks.length === 0 ? t.no_tasks_today : (t.no_search_results || 'No matching tasks.')}</p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          {filtered.map(task => (
                              <div key={task.id}>
                                  <TaskCard task={task} t={t} lang={lang} onClick={() => setSelectedTask(task)} />
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          );
      }

      if (viewMode === 'weekly') {
          const next7Days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(todayBkk), i));
          return (
              <div className="space-y-4 animate-fade-in max-h-[65vh] overflow-y-auto max-w-2xl mx-auto pr-1 pb-28">
                  {next7Days.map(day => {
                      const dayTasks = tasks.filter(t => t.status === 'PENDING' && isSameDay(getBkkDateObj(t.due_date), day));
                      const isToday = isSameDay(day, todayBkk);
                      return (
                          <div key={day.toString()} className={`rounded-xl border transition-all ${isToday ? 'border-[#714B67]/40 shadow-md bg-[#fdf4ff]' : 'border-gray-200 bg-white'}`}>
                              <div className={`p-3 font-bold flex justify-between items-center ${isToday ? 'text-[#714B67]' : 'text-gray-600'}`}>
                                  <span>{format(day, 'EEEE')}</span>
                                  <span className="text-sm opacity-70">{format(day, 'dd/MM')}</span>
                              </div>
                              <div className="p-2 pt-0 space-y-2">
                                  {dayTasks.length > 0 ? (
                                      dayTasks.map(task => <TaskCard key={task.id} task={task} t={t} lang={lang} onClick={() => setSelectedTask(task)} />)
                                  ) : (
                                      <div className="p-3 pt-0 text-xs text-gray-400 text-center">No tasks</div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          );
      }

      if (viewMode === 'calendar') {
          return (
              <div className="animate-fade-in flex flex-col items-center">
                  <div className="w-full overflow-x-auto">
                      <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        locale={getLocale(lang)}
                        tileContent={({ date, view }) => {
                            if (view === 'month') {
                                const count = tasks.filter(t => t.status === 'PENDING' && isSameDay(getBkkDateObj(t.due_date), date)).length;
                                if (count > 0) return <div className="flex flex-col items-center"><span className="task-count-badge">{count} {count === 1 ? (t.task_singular || "Task") : (t.tasks_plural || "Tasks")}</span></div>;
                            }
                        }}
                      />
                  </div>
                  <div className="mt-8 w-full max-w-[800px] pb-28">
                      <h4 className="font-bold mb-4 text-[#714B67] text-lg border-b pb-2">{t.tasks_for_date} {format(selectedDate, 'dd/MM/yyyy')}:</h4>
                      {calendarTasks.length === 0 && <p className="text-gray-400 text-sm p-2">No tasks for this date.</p>}
                      <div className="space-y-2">
                          {calendarTasks.map(task => <TaskCard key={task.id} task={task} t={t} lang={lang} onClick={() => setSelectedTask(task)} />)}
                      </div>
                  </div>
              </div>
          );
      }
  };

  const renderApprovalView = () => {
      const filtered = applySearch(waitingTasks);
      return (
          <div className="space-y-4 animate-fade-in max-w-3xl mx-auto pb-28">
              {filtered.length === 0 && <div className="text-center py-10 text-gray-400"><p>{waitingTasks.length === 0 ? t.no_tasks_waiting : (t.no_search_results || 'No matching tasks.')}</p></div>}
              {filtered.map(task => <TaskCard key={task.id} task={task} t={t} lang={lang} onClick={() => setSelectedTask(task)} />)}
          </div>
      );
  };

  const renderCompletedView = () => {
      const filtered = applySearch(completedTasks);
      return (
          <div className="space-y-3 animate-fade-in max-w-3xl mx-auto pb-28">
              {filtered.length === 0 && <p className="text-center text-gray-500 mt-10">{completedTasks.length === 0 ? t.no_tasks_completed : (t.no_search_results || 'No matching tasks.')}</p>}
              {filtered.map(task => <TaskCard key={task.id} task={task} t={t} lang={lang} onClick={() => setSelectedTask(task)} />)}
          </div>
      );
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-gray-50 relative">
      <style>{calendarStyles}</style>

      <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-black">{t.task_management_title}</h2>
          <div className="flex gap-2">
                <button
                    onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}
                    className={`p-2 rounded-full transition shadow-sm ${showSearch ? 'bg-[#714B67] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={t.search_placeholder || 'Search tasks'}
                >
                    <Search size={20} />
                </button>
                {(user.role === 'MANAGER' || user.role === 'BIG_BOSS') && (
                    <button onClick={() => setShowExcel(!showExcel)} className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition shadow-sm">
                        <FileSpreadsheet size={20} />
                    </button>
                )}
                {isTeamView && (
                    <button onClick={() => setShowCreateModal(true)} className="p-2 bg-[#714B67] text-white rounded-full hover:bg-[#5a3b52] transition shadow-sm">
                        <Plus size={20} />
                    </button>
                )}
          </div>
      </div>

      {showSearch && (
          <div className="mb-4 animate-fade-in">
              <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.search_tasks_placeholder || 'Search by title or description...'}
                  className="w-full p-3 rounded-xl border border-[#714B67]/30 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 text-gray-800"
              />
          </div>
      )}

      {showExcel && <AdvancedExcel token={token} t={t} user={user} onRefresh={onRefresh} onClose={() => setShowExcel(false)} />}
      {showCreateModal && <CreateTaskForm token={token} t={t} user={user} subordinates={subordinates} onRefresh={onRefresh} onClose={() => setShowCreateModal(false)} lang={lang} />}

      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm mb-8 mx-auto max-w-3xl">
          <TabButton active={mainTab === 'overdue'} onClick={() => setMainTab('overdue')} label={t.tab_overdue || 'Overdue'} icon={<AlertTriangle size={18}/>} count={overdueTasks.length} color="red" />
          <TabButton active={mainTab === 'todo'} onClick={() => { setMainTab('todo'); setViewMode('daily'); }} label={t.tab_todo} icon={<Clock size={18}/>} count={todayTasks.length} color="purple" />
          {!hideWaitingTab && <TabButton active={mainTab === 'waiting'} onClick={() => setMainTab('waiting')} label={t.tab_waiting} icon={<AlertCircle size={18}/>} count={waitingTasks.length} color="orange" />}
          <TabButton active={mainTab === 'completed'} onClick={() => setMainTab('completed')} label={t.tab_completed} icon={<CheckCircle size={18}/>} count={completedTasks.length} color="green" />
      </div>

      {mainTab === 'todo' && (
          <div className="flex justify-center mb-8"><div className="flex bg-gray-200 p-1 rounded-xl">
              <ViewBtn active={viewMode === 'daily'} onClick={() => setViewMode('daily')} label={t.view_daily} />
              <ViewBtn active={viewMode === 'weekly'} onClick={() => setViewMode('weekly')} label={t.view_weekly} />
              <ViewBtn active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')} label={t.view_calendar} />
          </div></div>
      )}

      {mainTab === 'overdue' && renderOverdueView()}
      {mainTab === 'todo' && renderTodoView()}
      {mainTab === 'waiting' && !hideWaitingTab && renderApprovalView()}
      {mainTab === 'completed' && renderCompletedView()}

      {selectedTask && (
          <TaskDetailModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              token={token}
              user={user}
              onRefresh={onRefresh}
              t={t}
              allUsers={subordinates}
          />
      )}

      {!isTeamView && (
        <button
            onClick={() => setShowCreateModal(true)}
            className={`fixed bottom-24 ${lang === 'he' ? 'left-6' : 'right-6'} w-14 h-14 bg-[#714B67] text-white rounded-full shadow-2xl flex items-center justify-center z-40 hover:bg-[#5a3b52] transition transform hover:scale-105 active:scale-95`}
        >
            <Plus size={32} />
        </button>
      )}

    </div>
  );
};

const TabButton = ({ active, onClick, label, icon, count, color }) => {
    let activeClass, badgeClass;
    if (color === 'purple') {
        activeClass = active ? 'bg-[#fdf4ff] text-[#714B67] shadow-inner' : 'text-gray-400 hover:bg-gray-50';
        badgeClass  = active ? 'bg-[#714B67]/20 text-[#714B67]' : 'bg-gray-100 text-gray-500';
    } else if (color === 'red') {
        activeClass = active ? 'bg-red-50 text-red-700 shadow-inner' : 'text-gray-400 hover:bg-gray-50';
        badgeClass  = active ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-500';
    } else {
        activeClass = active ? `bg-${color}-50 text-${color}-700 shadow-inner` : 'text-gray-400 hover:bg-gray-50';
        badgeClass  = active ? `bg-${color}-200 text-${color}-800` : 'bg-gray-100 text-gray-500';
    }

    return (
        <button onClick={onClick} className={`flex-1 flex flex-col items-center py-3 rounded-xl transition-all ${activeClass}`}>
            <div className={`flex items-center gap-2 mb-1 ${active ? 'font-bold' : ''}`}>
                {icon}
                <span className="hidden sm:inline text-sm">{label}</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${badgeClass}`}>{count}</span>
        </button>
    );
};

const ViewBtn = ({ active, onClick, label }) => (
    <button onClick={onClick} className={`px-6 py-2 text-sm rounded-lg transition-all ${active ? 'bg-white shadow text-[#714B67] font-bold transform scale-105' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
);

// ─── Branded inline confirm for task actions ──────────────────────────────────
const InlineAlert = ({ message, onClose }) => (
    <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-xl flex items-start justify-between gap-2 animate-fade-in">
        <span>{message}</span>
        <button onClick={onClose} className="shrink-0 text-red-400 hover:text-red-600"><X size={14}/></button>
    </div>
);

const TaskDetailModal = ({ task, onClose, token, user, onRefresh, t, allUsers }) => {
    const [note, setNote] = useState('');
    const [file, setFile] = useState(null);
    const [followUpDate, setFollowUpDate] = useState(getCurrentBkkTimeForInput);
    const [mode, setMode] = useState('view');
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalError, setModalError] = useState('');

    const canApprove = (user.role === 'MANAGER' || user.role === 'BIG_BOSS') && task.status === 'WAITING_APPROVAL';
    const canComplete = task.status === 'PENDING' && (user.id === task.worker_id || user.role !== 'EMPLOYEE');

    const handleComplete = async () => {
        if (!note && !file) {
            setModalError(t.alert_required || "A note or photo is required.");
            return;
        }
        setModalError('');
        const formData = new FormData();
        formData.append('completion_note', note);
        if (file) formData.append('completion_image', file);
        try {
            const res = await fetch(`https://maintenance-app-h84v.onrender.com/tasks/${task.id}/complete`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) { setShowSuccess(true); setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500); }
        } catch(e) { setModalError("Error completing task."); }
    };

    const handleApprove = async () => {
        await fetch(`https://maintenance-app-h84v.onrender.com/tasks/${task.id}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500);
    };

    const handleFollowUp = async () => {
        if (!followUpDate) {
            setModalError(t.alert_required || "A date is required.");
            return;
        }
        setModalError('');
        await fetch(`https://maintenance-app-h84v.onrender.com/tasks/${task.id}/follow-up`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ due_date: followUpDate, description: note || 'Follow up' })
        });
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500);
    };

    const isVideo = (url) => url && (url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video'));
    const openMedia = (url) => window.open(url, '_blank');

    if (showSuccess) return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[120]">
            <div className="bg-white p-8 rounded-3xl animate-scale-in flex flex-col items-center">
                <Check size={40} className="text-green-600 mb-2"/>
                <h2 className="text-xl font-bold">{t.alert_sent || "Success!"}</h2>
            </div>
        </div>
    );

    let displayManagerName = task.manager_name;
    if (!displayManagerName && allUsers) {
        const workerInfo = allUsers.find(u => String(u.id) === String(task.worker_id));
        if (workerInfo) {
            const managerInfo = allUsers.find(u => String(u.id) === String(workerInfo.parent_manager_id));
            if (managerInfo) {
                displayManagerName = managerInfo.full_name;
            } else if (String(workerInfo.parent_manager_id) === String(user.id)) {
                displayManagerName = user.full_name || user.name;
            }
        }
    }
    if (!displayManagerName && (user.role === 'MANAGER' || user.role === 'BIG_BOSS')) {
        displayManagerName = user.full_name || user.name;
    }
    if (!displayManagerName) {
        displayManagerName = task.manager_name || t.management || t.manager_label || 'Manager';
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-end sm:items-center z-[100] backdrop-blur-sm p-4">
            <div className="bg-white w-full sm:w-[95%] max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="bg-gray-50 p-4 border-b flex justify-between items-start sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            {task.title}
                            {task.asset_code && <span className="text-gray-400 font-normal ml-2 text-base"> - {task.asset_code}</span>}
                        </h2>
                    </div>
                    <button onClick={onClose} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                <div className="p-6 space-y-6 pb-32">
                    {(task.asset_name || task.asset_code) && (
                        <div className="bg-[#fdf4ff] p-3 rounded-xl border border-[#714B67]/20 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-[#714B67] uppercase">{t.assets_title || "Asset Info"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{task.asset_name || "N/A"}</h3>
                                    {task.category_name && <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">{task.category_name}</span>}
                                </div>
                                {task.asset_code && (
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#714B67]/30 text-[#714B67] font-mono font-bold text-sm">
                                        {task.asset_code}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.date_label}</span><span className="font-medium">{formatBkkDate(task.due_date)}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.urgency_label || "Urgency"}</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${task.urgency === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>{task.urgency}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.location}</span><span className="font-medium">{task.location_name || '-'}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.category_label || "Category"}</span><span className="font-medium">{task.category_name || '-'}</span></div>
                        <div className="col-span-2 border-t pt-2 mt-2"></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.assigned_to}</span><span className="font-medium">{task.worker_name}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.manager_label || "Manager"}</span><span className="font-medium">{displayManagerName}</span></div>
                    </div>

                    {task.description && (
                        <div className="bg-[#fdf4ff] p-3 rounded-lg border border-[#714B67]/20">
                            <span className="block text-xs text-[#714B67] font-bold mb-1">{t.manager_notes}:</span>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{task.description}</p>
                        </div>
                    )}

                    {task.images && task.images.length > 0 && (
                        <div>
                            <span className="block text-xs text-gray-400 uppercase font-bold mb-2">{t.has_image || "Media"}</span>
                            <div className="grid grid-cols-2 gap-2">
                                {task.images.map((url, i) => (
                                    isVideo(url) ? (
                                        <div key={i} className="relative group cursor-pointer" onClick={() => openMedia(url)}>
                                            <video src={url} className="w-full h-32 object-cover rounded-lg border bg-black" />
                                        </div>
                                    ) : (
                                        <img key={i} src={url} onClick={() => openMedia(url)} className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition" alt="task media" />
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {task.completion_note && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <span className="block text-xs text-orange-600 font-bold mb-1">{t.worker_report}:</span>
                            <p className="text-sm text-orange-900">{task.completion_note}</p>
                            {task.completion_image_url && (
                                <img src={task.completion_image_url} onClick={() => openMedia(task.completion_image_url)} className="w-full h-32 object-cover rounded-lg mt-2 border cursor-pointer" alt="completion" />
                            )}
                        </div>
                    )}

                    <div className="pt-4 space-y-3">
                        {canComplete && mode === 'view' && (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={() => { setMode('complete'); setModalError(''); }} className="flex-1 bg-[#714B67] text-white py-3 rounded-xl font-bold shadow-md hover:bg-[#5a3b52] transition transform active:scale-95">{t.complete_task_btn}</button>
                                <button onClick={() => { setMode('followup'); setModalError(''); }} className="flex-1 bg-white text-[#714B67] border-2 border-[#714B67] py-3 rounded-xl font-bold shadow-sm hover:bg-[#fdf4ff] transition transform active:scale-95">{t.followup_task_btn}</button>
                            </div>
                        )}
                        {mode === 'complete' && (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-[#714B67]">{t.report_execution}</h4>
                                {modalError && <InlineAlert message={modalError} onClose={() => setModalError('')} />}
                                <textarea placeholder={t.what_was_done} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#714B67]/30 outline-none" value={note} onChange={e => setNote(e.target.value)} />
                                <input type="file" onChange={e => setFile(e.target.files[0])} className="text-xs file:bg-[#fdf4ff] file:text-[#714B67] file:border-0 file:px-4 file:py-2 file:rounded-lg file:font-bold hover:file:bg-[#714B67]/10 cursor-pointer w-full"/>
                                <div className="flex gap-2">
                                    <button onClick={() => { setMode('view'); setModalError(''); }} className="flex-1 py-2 border rounded-lg bg-white text-gray-600 hover:bg-gray-100">{t.cancel}</button>
                                    <button onClick={handleComplete} className="flex-1 py-2 bg-[#714B67] text-white rounded-lg font-bold hover:bg-[#5a3b52]">{t.send_for_approval}</button>
                                </div>
                            </div>
                        )}
                        {mode === 'followup' && (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-[#714B67]">{t.followup_task_btn}</h4>
                                {modalError && <InlineAlert message={modalError} onClose={() => setModalError('')} />}
                                <input type="datetime-local" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#714B67]/30 outline-none" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                                <textarea placeholder={t.description_placeholder} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#714B67]/30 outline-none" value={note} onChange={e => setNote(e.target.value)} />
                                <div className="flex gap-2">
                                    <button onClick={() => { setMode('view'); setModalError(''); }} className="flex-1 py-2 border rounded-lg bg-white text-gray-600 hover:bg-gray-100">{t.cancel}</button>
                                    <button onClick={handleFollowUp} className="flex-1 py-2 bg-[#714B67] text-white rounded-lg font-bold hover:bg-[#5a3b52]">{t.save}</button>
                                </div>
                            </div>
                        )}
                        {canApprove && (
                            <button onClick={handleApprove} className="w-full bg-[#714B67] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-[#5a3b52] transition">
                                {t.approve_close_btn}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TasksTab;
