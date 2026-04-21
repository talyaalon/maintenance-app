import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, addDays, startOfDay, isBefore } from 'date-fns';
import { CheckCircle, Clock, AlertCircle, X, FileSpreadsheet, Check, Plus, AlertTriangle, Search, SlidersHorizontal, Trash2, ListChecks, Pencil, LayoutList } from 'lucide-react';
import ConfigExcelPanel from './ConfigExcelPanel';
import CreateTaskForm from './CreateTaskForm';
import EditTaskModal from './EditTaskModal';
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
  .react-calendar { width: 100%; border: none; font-family: inherit; background: white; border-radius: 0.75rem; padding: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04); border: 1px solid #e5e7eb; }
  .react-calendar__navigation button { font-size: 1rem; font-weight: 700; color: #1e293b; }
  .react-calendar__month-view__weekdays { text-align: center; font-size: 0.75em; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .react-calendar__tile { height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 5px; border-radius: 6px; font-size: 0.875rem; transition: background 0.15s; color: #374151; }
  .react-calendar__tile:hover { background-color: #f8fafc; }
  .react-calendar__tile--now { background: #f5f3ff !important; color: #714B67; border: 1px solid #e9d5ff; }
  .react-calendar__tile--active { background: #714B67 !important; color: white !important; border-radius: 6px; }
  .task-count-badge { font-size: 9px; background-color: #e5e7eb; color: #374151; padding: 1px 6px; border-radius: 99px; margin-top: 2px; white-space: nowrap; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .react-calendar__tile--active .task-count-badge { background-color: rgba(255,255,255,0.25); color: white; }
`;

const TasksTab = ({ tasks, t, token, user, onRefresh, lang, subordinates, scopedCompanyId }) => {
  const [mainTab, setMainTab] = useState('todo');
  const [viewMode, setViewMode] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showExcel, setShowExcel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isTeamView = Array.isArray(subordinates);
  const isBulkRole = ['BIG_BOSS', 'COMPANY_MANAGER'].includes(user.role);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [loadingTaskId, setLoadingTaskId] = useState(null);

  // ── Admin "List View" pagination state (BIG_BOSS / COMPANY_MANAGER only) ──
  const ADMIN_LIMIT = 50;
  const [adminTasks, setAdminTasks] = useState([]);
  const [adminTotalCount, setAdminTotalCount] = useState(0);
  const [adminOffset, setAdminOffset] = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);

  // Fetch the full task (images, description, etc.) only when the user taps to open it.
  // The list payload is intentionally lightweight — no blobs until needed.
  const handleTaskClick = useCallback(async (task) => {
      setLoadingTaskId(task.id);
      try {
          const res = await fetch(`${BASE}/tasks/${task.id}`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
              const fullTask = await res.json();
              setSelectedTask(fullTask);
          } else {
              setSelectedTask(task); // fallback to lightweight data
          }
      } catch {
          setSelectedTask(task); // fallback on network error
      } finally {
          setLoadingTaskId(null);
      }
  }, [token]);

  // ── Admin list fetch (paginated) ─────────────────────────────────────────
  const fetchAdminList = useCallback(async (offset, append) => {
      setAdminLoading(true);
      try {
          const params = new URLSearchParams({ limit: String(ADMIN_LIMIT), offset: String(offset) });
          const res = await fetch(`${BASE}/tasks/admin/list?${params}`, {
              headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setAdminTasks(prev => append ? [...prev, ...data.tasks] : data.tasks);
              setAdminTotalCount(data.totalCount);
              setAdminOffset(offset);
          }
      } catch (e) { console.error(e); }
      finally { setAdminLoading(false); }
  }, [token]);

  useEffect(() => {
      if (viewMode !== 'list') return;
      setAdminTasks([]);
      setAdminTotalCount(0);
      setAdminOffset(0);
      fetchAdminList(0, false);
  }, [viewMode, fetchAdminList]);
  // ─────────────────────────────────────────────────────────────────────────

  // ── API-fetched filter options (role-scoped) ─────────────────────────────
  const [apiLocations,  setApiLocations]  = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [apiEmployees,  setApiEmployees]  = useState([]);

  const BASE = 'https://maintenance-app-staging.onrender.com';

  useEffect(() => {
    if (!token || !user?.id) return;
    const h = { Authorization: `Bearer ${token}` };

    fetch(`${BASE}/locations`,  { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => setApiLocations(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch(`${BASE}/categories`, { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => setApiCategories(Array.isArray(d) ? d : []))
      .catch(() => {});

    // EMPLOYEE sees no assignee filter — skip the extra request
    if (user.role !== 'EMPLOYEE') {
      // MANAGER: only their M:M-assigned employees
      const empUrl = user.role === 'MANAGER'
        ? `${BASE}/users?manager_id=${user.id}`
        : `${BASE}/users`;
      fetch(empUrl, { headers: h })
        .then(r => r.ok ? r.json() : [])
        .then(d => {
          const arr = Array.isArray(d) ? d : [];
          setApiEmployees(arr.filter(u => u.role === 'EMPLOYEE'));
        })
        .catch(() => {});
    }
  }, [token, user?.id, user?.role]);

  // Localized name helpers
  const localName = (item) => {
    if (!item) return '';
    if (lang === 'he') return item.name_he || item.name_en || item.name || '';
    if (lang === 'th') return item.name_th || item.name_en || item.name || '';
    return item.name_en || item.name || '';
  };
  const localEmpName = (emp) => {
    if (!emp) return '';
    if (lang === 'he') return emp.full_name_he || emp.full_name_en || emp.full_name || '';
    if (lang === 'th') return emp.full_name_th || emp.full_name_en || emp.full_name || '';
    return emp.full_name_en || emp.full_name || '';
  };
  // ─────────────────────────────────────────────────────────────────────────

  const showAssigneeFilter = ['BIG_BOSS', 'COMPANY_MANAGER', 'MANAGER'].includes(user.role);
  const hasActiveFilters = !!(filterPriority || filterLocation || filterCategory || filterAssignee);

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

  // Attribute filter helper — location/category compared by ID for accuracy
  const applyFilters = (list) => list.filter(tk => {
      if (filterPriority && tk.urgency !== filterPriority) return false;
      if (filterLocation && String(tk.location_id) !== String(filterLocation)) return false;
      if (filterCategory && String(tk.category_id) !== String(filterCategory)) return false;
      if (filterAssignee && String(tk.worker_id) !== String(filterAssignee)) return false;
      return true;
  });

  const clearFilters = () => {
      setFilterPriority('');
      setFilterLocation('');
      setFilterCategory('');
      setFilterAssignee('');
  };

  // Clear selection when the user switches tabs or view modes
  useEffect(() => {
      setSelectedIds(new Set());
  }, [mainTab, viewMode, isSelectionMode]);

  // ── Bulk helpers (BIG_BOSS / COMPANY_MANAGER only) ────────────────────────
  const getVisibleTasks = () => {
      if (mainTab === 'overdue') return applyFilters(applySearch(overdueTasks));
      if (mainTab === 'todo') {
          if (viewMode === 'daily') {
              const searchSource = searchQuery.trim()
                  ? tasks.filter(tk => tk.status === 'PENDING' && !isBefore(getBkkDateObj(tk.due_date), startOfDay(todayBkk)))
                  : todayTasks;
              return applyFilters(applySearch(searchSource));
          }
          if (viewMode === 'weekly') {
              const next7Days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(todayBkk), i));
              return applyFilters(tasks.filter(tk => tk.status === 'PENDING' && next7Days.some(d => isSameDay(getBkkDateObj(tk.due_date), d))));
          }
          if (viewMode === 'calendar') return calendarTasks;
          if (viewMode === 'list') return applyFilters(applySearch(adminTasks));
      }
      if (mainTab === 'waiting') return applyFilters(applySearch(waitingTasks));
      if (mainTab === 'completed') return applyFilters(applySearch(completedTasks));
      return [];
  };

  const toggleSelect = (id) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id); else next.add(id);
          return next;
      });
  };

  const handleSelectAll = () => {
      const visible = getVisibleTasks();
      const allSelected = visible.length > 0 && visible.every(tk => selectedIds.has(tk.id));
      setSelectedIds(allSelected ? new Set() : new Set(visible.map(tk => tk.id)));
  };

  const handleBulkDelete = async () => {
      setBulkLoading(true);
      try {
          const res = await fetch(`${BASE}/tasks/bulk-delete`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ task_ids: [...selectedIds] }),
          });
          if (res.ok) { setSelectedIds(new Set()); setShowBulkDeleteConfirm(false); onRefresh(); }
      } catch (e) { console.error(e); }
      finally { setBulkLoading(false); }
  };

  const handleBulkMarkDone = async () => {
      setBulkLoading(true);
      try {
          const res = await fetch(`${BASE}/tasks/bulk-update-status`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ task_ids: [...selectedIds], status: 'COMPLETED' }),
          });
          if (res.ok) { setSelectedIds(new Set()); onRefresh(); }
      } catch (e) { console.error(e); }
      finally { setBulkLoading(false); }
  };

  // Wraps a TaskCard with a selection checkbox for BIG_BOSS / COMPANY_MANAGER
  const renderTaskCard = (task, prefixContent = null) => {
      const isLoading = loadingTaskId === task.id;
      if (!isBulkRole || !isSelectionMode) {
          return (
              <div key={task.id} className={isLoading ? 'opacity-60 pointer-events-none' : ''}>
                  {prefixContent}
                  <TaskCard task={task} t={t} lang={lang} onClick={() => handleTaskClick(task)} />
              </div>
          );
      }
      const isSelected = selectedIds.has(task.id);
      return (
          <div key={task.id} className={`flex items-start gap-2 rounded-xl transition-colors ${isSelected ? 'bg-[#714B67]/5' : ''} ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}>
              <label
                  className="flex items-center pt-3.5 pl-0.5 cursor-pointer shrink-0"
                  onClick={e => e.stopPropagation()}
              >
                  <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(task.id)}
                      className="w-4 h-4 cursor-pointer"
                      style={{ accentColor: '#714B67' }}
                  />
              </label>
              <div className="flex-1 min-w-0">
                  {prefixContent}
                  <TaskCard task={task} t={t} lang={lang} onClick={() => handleTaskClick(task)} />
              </div>
          </div>
      );
  };

  const waitingTasks = tasks.filter(t => t.status === 'WAITING_APPROVAL');
  // Only hide the Waiting Approval tab for MANAGERs who have auto-approve enabled.
  // EMPLOYEEs (and all other roles) always see the tab — data scoping handles what they see.
  const hideWaitingTab = user.role === 'MANAGER' && !!user.auto_approve_tasks;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  // Filtered counts — tab badges reflect the currently active search/filter state
  const filteredOverdueCount   = applyFilters(applySearch(overdueTasks)).length;
  const filteredTodayCount     = applyFilters(applySearch(todayTasks)).length;
  const filteredWaitingCount   = applyFilters(applySearch(waitingTasks)).length;
  const filteredCompletedCount = applyFilters(applySearch(completedTasks)).length;
  // Pre-compute date → pending task count once per tasks/filter change.
  // This makes each calendar tile an O(1) Map lookup instead of O(n) filter.
  const calendarTaskCounts = useMemo(() => {
      const counts = new Map();
      const pending = applyFilters(tasks.filter(t => t.status === 'PENDING'));
      pending.forEach(task => {
          const d = getBkkDateObj(task.due_date);
          // Key by year-month-day so midnight boundary differences don't matter
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          counts.set(key, (counts.get(key) || 0) + 1);
      });
      return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, filterPriority, filterLocation, filterCategory, filterAssignee]);

  // Stable tileContent callback — only recreates when counts or locale strings change.
  const calendarTileContent = useCallback(({ date, view }) => {
      if (view !== 'month') return null;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const count = calendarTaskCounts.get(key) || 0;
      if (count === 0) return null;
      return (
          <div className="flex flex-col items-center">
              <span className="task-count-badge">
                  {count} {count === 1 ? (t.task_singular || 'Task') : (t.tasks_plural || 'Tasks')}
              </span>
          </div>
      );
  }, [calendarTaskCounts, t]);

  const calendarTasks = applyFilters(tasks.filter(t => t.status === 'PENDING' && isSameDay(getBkkDateObj(t.due_date), selectedDate)));

  const renderOverdueView = () => {
      const filtered = applyFilters(applySearch(overdueTasks));
      return (
          <div className="space-y-4 animate-fade-in max-w-2xl mx-auto pb-28">
              {filtered.length === 0 ? (
                  <div className="text-center py-10 opacity-70">
                      <CheckCircle size={60} className="mx-auto text-green-300 mb-3"/>
                      <p className="text-gray-500 text-lg">{overdueTasks.length === 0 ? (t.no_overdue_tasks || 'No overdue tasks!') : (t.no_search_results || 'No matching tasks.')}</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                      {filtered.map(task => renderTaskCard(task,
                          <div className="text-xs text-red-500 font-bold mb-1 mr-1 flex items-center gap-1">
                              <AlertTriangle size={12}/> {t.overdue} — {formatBkkDate(task.due_date)}
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  const renderTodoView = () => {
      if (viewMode === 'daily') {
          const isSearching = !!searchQuery.trim();
          const searchSource = isSearching
              ? tasks.filter(task => task.status === 'PENDING' && !isBefore(getBkkDateObj(task.due_date), startOfDay(todayBkk)))
              : todayTasks;
          const urgencyWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
          const filtered = applyFilters(applySearch(searchSource))
              .slice()
              .sort((a, b) => (urgencyWeight[b.urgency] ?? 0) - (urgencyWeight[a.urgency] ?? 0));
          return (
              <div className="space-y-4 animate-fade-in max-w-2xl mx-auto pb-28">
                  <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 text-center mb-5">
                      <h3 className="text-base sm:text-lg font-bold text-slate-800">{t.tab_todo}</h3>
                      <p className="text-[#714B67] font-semibold text-sm">{isSearching ? (t.all_upcoming || 'All Upcoming') : format(todayBkk, 'dd/MM/yyyy')}</p>
                  </div>
                  {filtered.length === 0 ? (
                      <div className="text-center py-10 opacity-70">
                          <CheckCircle size={60} className="mx-auto text-green-300 mb-3"/>
                          <p className="text-gray-500 text-lg">{searchSource.length === 0 ? t.no_tasks_today : (t.no_search_results || 'No matching tasks.')}</p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          {filtered.map(task => renderTaskCard(task))}
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
                      const dayTasks = applyFilters(tasks.filter(t => t.status === 'PENDING' && isSameDay(getBkkDateObj(t.due_date), day)));
                      const isToday = isSameDay(day, todayBkk);
                      return (
                          <div key={day.toString()} className={`rounded-xl border transition-all ${isToday ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200 bg-white'}`}>
                              <div className={`p-3 font-semibold flex justify-between items-center ${isToday ? 'text-[#714B67]' : 'text-slate-600'}`}>
                                  <span>{format(day, 'EEEE')}</span>
                                  <span className="text-sm opacity-70">{format(day, 'dd/MM')}</span>
                              </div>
                              <div className="p-2 pt-0 space-y-2">
                                  {dayTasks.length > 0 ? (
                                      dayTasks.map(task => renderTaskCard(task))
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
                  <div className="w-full max-w-3xl mx-auto">
                      <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        locale={getLocale(lang)}
                        tileContent={calendarTileContent}
                      />
                  </div>
                  <div className="mt-8 w-full max-w-[800px] pb-28">
                      <h4 className="font-semibold mb-4 text-slate-700 text-base border-b border-gray-200 pb-2">{t.tasks_for_date} {format(selectedDate, 'dd/MM/yyyy')}:</h4>
                      {calendarTasks.length === 0 && <p className="text-gray-400 text-sm p-2">No tasks for this date.</p>}
                      <div className="space-y-2">
                          {calendarTasks.map(task => renderTaskCard(task))}
                      </div>
                  </div>
              </div>
          );
      }

      if (viewMode === 'list') {
          const filtered = applyFilters(applySearch(adminTasks));
          const hasMore = adminTasks.length < adminTotalCount;
          return (
              <div className="animate-fade-in max-w-2xl mx-auto pb-28">
                  <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-sm font-semibold text-slate-500">
                          {adminTasks.length}/{adminTotalCount}
                      </span>
                  </div>
                  {adminLoading && adminTasks.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">Loading...</div>
                  ) : (
                      <>
                          <div className="space-y-3">
                              {filtered.map(task => renderTaskCard(task))}
                          </div>
                          {hasMore && (
                              <button
                                  onClick={() => fetchAdminList(adminOffset + ADMIN_LIMIT, true)}
                                  disabled={adminLoading}
                                  className="w-full mt-4 py-3 bg-white border border-gray-200 text-[#714B67] font-semibold rounded-xl hover:bg-purple-50 transition disabled:opacity-60 shadow-sm"
                              >
                                  {adminLoading ? '...' : `${t.load_more || 'Load More'} (${adminTotalCount - adminTasks.length} ${t.remaining || 'remaining'})`}
                              </button>
                          )}
                      </>
                  )}
              </div>
          );
      }
  };

  const renderApprovalView = () => {
      const filtered = applyFilters(applySearch(waitingTasks));
      return (
          <div className="space-y-4 animate-fade-in max-w-3xl mx-auto pb-28">
              {filtered.length === 0 && <div className="text-center py-10 text-gray-400"><p>{waitingTasks.length === 0 ? t.no_tasks_waiting : (t.no_search_results || 'No matching tasks.')}</p></div>}
              {filtered.map(task => renderTaskCard(task))}
          </div>
      );
  };

  const renderCompletedView = () => {
      const filtered = applyFilters(applySearch(completedTasks));
      return (
          <div className="space-y-3 animate-fade-in max-w-3xl mx-auto pb-28">
              {filtered.length === 0 && <p className="text-center text-gray-500 mt-10">{completedTasks.length === 0 ? t.no_tasks_completed : (t.no_search_results || 'No matching tasks.')}</p>}
              {filtered.map(task => renderTaskCard(task))}
          </div>
      );
  };

  return (
    <div className="px-3 sm:px-4 pt-3 pb-24 min-h-screen bg-slate-50 relative">
      <style>{calendarStyles}</style>

      <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{t.nav_tasks || 'Tasks'}</h1>
          <div className="flex gap-2">
                <button
                    onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}
                    className={`p-2 rounded-full transition shadow-sm ${showSearch ? 'bg-[#714B67] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    title={t.search_placeholder || 'Search tasks'}
                >
                    <Search size={20} />
                </button>
                {isBulkRole && (
                    <button
                        onClick={() => {
                            setIsSelectionMode(m => {
                                if (m) setSelectedIds(new Set());
                                return !m;
                            });
                        }}
                        className={`p-2 rounded-full transition shadow-sm ${isSelectionMode ? 'bg-[#714B67] text-white shadow-[0_0_0_3px_rgba(113,75,103,0.25)]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        title="Bulk Select"
                    >
                        <ListChecks size={20} />
                    </button>
                )}
                {['BIG_BOSS', 'COMPANY_MANAGER', 'MANAGER'].includes(user.role) && (
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
          <div className="mb-3 animate-fade-in">
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

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="mb-4 max-w-3xl mx-auto">
          {/* Toggle row */}
          <div className="flex items-center gap-2">
              <button
                  onClick={() => setIsFilterOpen(p => !p)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition shadow-sm ${isFilterOpen || hasActiveFilters ? 'bg-[#714B67] text-white border-[#714B67]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#714B67]/40 hover:text-[#714B67]'}`}
              >
                  <SlidersHorizontal size={13} />
                  <span>{t.filter || 'Filter'}</span>
                  {hasActiveFilters && !isFilterOpen && (
                      <span className="ml-1 bg-white text-[#714B67] rounded-full px-1.5 py-0 text-[10px] font-bold leading-4">
                          {[filterPriority, filterLocation, filterCategory, filterAssignee].filter(Boolean).length}
                      </span>
                  )}
              </button>
              {hasActiveFilters && (
                  <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#714B67]/10 text-[#714B67] font-semibold hover:bg-[#714B67]/20 transition"
                  >
                      <X size={11} /> {t.clear_filters || 'Clear'}
                  </button>
              )}
          </div>

          {/* Collapsible dropdowns */}
          <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: isFilterOpen ? '120px' : '0px', opacity: isFilterOpen ? 1 : 0 }}
          >
              <div className="flex flex-wrap gap-2 items-center pt-2">
                  {/* Priority */}
                  <select
                      value={filterPriority}
                      onChange={e => setFilterPriority(e.target.value)}
                      className={`flex-1 min-w-[100px] text-xs rounded-lg border px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 shadow-sm cursor-pointer ${filterPriority ? 'border-[#714B67] text-[#714B67] font-semibold' : 'border-gray-200'}`}
                  >
                      <option value="">{t.urgency_label || 'Priority'}</option>
                      <option value="High">{t.urgency_high || 'High'}</option>
                      <option value="Normal">{t.urgency_normal || 'Normal'}</option>
                  </select>

                  {/* Location — API-fetched, company_id scoped per role */}
                  {apiLocations.length > 0 && (
                      <select
                          value={filterLocation}
                          onChange={e => setFilterLocation(e.target.value)}
                          className={`flex-1 min-w-[100px] text-xs rounded-lg border px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 shadow-sm cursor-pointer ${filterLocation ? 'border-[#714B67] text-[#714B67] font-semibold' : 'border-gray-200'}`}
                      >
                          <option value="">{t.location || 'Location'}</option>
                          {apiLocations.map(loc => <option key={loc.id} value={loc.id}>{localName(loc)}</option>)}
                      </select>
                  )}

                  {/* Category — API-fetched, company_id scoped per role */}
                  {apiCategories.length > 0 && (
                      <select
                          value={filterCategory}
                          onChange={e => setFilterCategory(e.target.value)}
                          className={`flex-1 min-w-[100px] text-xs rounded-lg border px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 shadow-sm cursor-pointer ${filterCategory ? 'border-[#714B67] text-[#714B67] font-semibold' : 'border-gray-200'}`}
                      >
                          <option value="">{t.category_label || 'Category'}</option>
                          {apiCategories.map(cat => <option key={cat.id} value={cat.id}>{localName(cat)}</option>)}
                      </select>
                  )}

                  {/* Assignee — hidden for EMPLOYEE; MANAGER sees only their M:M employees */}
                  {showAssigneeFilter && apiEmployees.length > 0 && (
                      <select
                          value={filterAssignee}
                          onChange={e => setFilterAssignee(e.target.value)}
                          className={`flex-1 min-w-[100px] text-xs rounded-lg border px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 shadow-sm cursor-pointer ${filterAssignee ? 'border-[#714B67] text-[#714B67] font-semibold' : 'border-gray-200'}`}
                      >
                          <option value="">{t.assigned_to || 'Assignee'}</option>
                          {apiEmployees.map(emp => <option key={emp.id} value={emp.id}>{localEmpName(emp)}</option>)}
                      </select>
                  )}
              </div>
          </div>
      </div>

      {showExcel && <ConfigExcelPanel section="tasks" token={token} t={t} onClose={() => setShowExcel(false)} onSuccess={onRefresh} />}
      {showCreateModal && <CreateTaskForm token={token} t={t} user={user} subordinates={subordinates} onRefresh={onRefresh} onClose={() => setShowCreateModal(false)} lang={lang} scopedCompanyId={scopedCompanyId} />}

      <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 mb-5 mx-auto max-w-3xl">
          <TabButton active={mainTab === 'overdue'} onClick={() => setMainTab('overdue')} label={t.tab_overdue || 'Overdue'} icon={<AlertTriangle size={18}/>} count={filteredOverdueCount} color="red" />
          <TabButton active={mainTab === 'todo'} onClick={() => { setMainTab('todo'); setViewMode('daily'); }} label={t.tab_todo} icon={<Clock size={18}/>} count={filteredTodayCount} color="purple" />
          {!hideWaitingTab && <TabButton active={mainTab === 'waiting'} onClick={() => setMainTab('waiting')} label={t.tab_waiting} icon={<AlertCircle size={18}/>} count={filteredWaitingCount} color="orange" />}
          <TabButton active={mainTab === 'completed'} onClick={() => setMainTab('completed')} label={t.tab_completed} icon={<CheckCircle size={18}/>} count={filteredCompletedCount} color="green" />
      </div>

      {mainTab === 'todo' && (
          <div className="flex justify-center mb-5"><div className="flex bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
              <ViewBtn active={viewMode === 'daily'} onClick={() => setViewMode('daily')} label={t.view_daily} />
              <ViewBtn active={viewMode === 'weekly'} onClick={() => setViewMode('weekly')} label={t.view_weekly} />
              <ViewBtn active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')} label={t.view_calendar} />
              {isBulkRole && (
                  <ViewBtn active={viewMode === 'list'} onClick={() => setViewMode('list')} label={t.view_list || 'List'} icon={<LayoutList size={13} />} />
              )}
          </div></div>
      )}

      {/* ── Bulk Select All bar (BIG_BOSS / COMPANY_MANAGER only) ──────────── */}
      {isBulkRole && isSelectionMode && (() => {
          const visible = getVisibleTasks();
          if (visible.length === 0) return null;
          const allSelected = visible.every(tk => selectedIds.has(tk.id));
          const someSelected = !allSelected && visible.some(tk => selectedIds.has(tk.id));
          return (
              <div className="flex items-center justify-between max-w-3xl mx-auto mb-3 px-1">
                  <div className="flex items-center gap-2 cursor-pointer select-none" onClick={handleSelectAll}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${allSelected ? 'bg-[#714B67] border-[#714B67]' : someSelected ? 'border-[#714B67] bg-white' : 'bg-white border-gray-300 hover:border-[#714B67]'}`}>
                          {allSelected && <Check size={10} className="text-white" />}
                          {someSelected && <div className="w-2 h-0.5 bg-[#714B67]" />}
                      </div>
                      <span className="text-xs text-gray-500">{t.select_all || 'Select All'} ({visible.length})</span>
                  </div>
                  {selectedIds.size > 0 && (
                      <span className="text-xs font-semibold text-[#714B67]">{selectedIds.size} {t.selected || 'selected'}</span>
                  )}
              </div>
          );
      })()}

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
              lang={lang}
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

      {/* ── Bulk Action Bar ──────────────────────────────────────────────────── */}
      {isBulkRole && isSelectionMode && selectedIds.size > 0 && (
          <div
              className="fixed bottom-20 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md bg-[#714B67] animate-fade-in"
              style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
              <span className="text-white text-sm font-bold opacity-90 mr-1">
                  {selectedIds.size} {t.selected || 'selected'}
              </span>
              <div className="w-px h-5 bg-white/30 mx-1" />
              <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-white text-sm font-semibold transition"
              >
                  <Trash2 size={14} /> {t.delete_selected || 'Delete'}
              </button>
              <button
                  onClick={handleBulkMarkDone}
                  disabled={bulkLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60"
              >
                  <CheckCircle size={14} /> {t.mark_as_done || 'Mark Done'}
              </button>
              <button
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-1 p-1.5 hover:bg-white/20 rounded-lg transition text-white"
              >
                  <X size={14} />
              </button>
          </div>
      )}

      {/* ── Bulk Delete Confirmation Modal ───────────────────────────────────── */}
      {showBulkDeleteConfirm && (
          <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="p-5 pb-3">
                      <h3 className="text-lg font-bold text-slate-800 mb-2">
                          {t.confirm_bulk_delete_title || 'Delete Tasks'}
                      </h3>
                      <p className="text-sm text-gray-600">
                          {`Are you sure you want to permanently delete ${selectedIds.size} task(s)? This cannot be undone.`}
                      </p>
                  </div>
                  <div className="flex gap-2 p-4 pt-2">
                      <button
                          onClick={() => setShowBulkDeleteConfirm(false)}
                          className="flex-1 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition"
                      >
                          {t.cancel || 'Cancel'}
                      </button>
                      <button
                          onClick={handleBulkDelete}
                          disabled={bulkLoading}
                          className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-60"
                      >
                          {bulkLoading ? '...' : (t.delete_selected || 'Delete')}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

const TabButton = ({ active, onClick, label, icon, count, color }) => {
    let activeClass, badgeClass;
    if (color === 'purple') {
        activeClass = active ? 'bg-white text-[#714B67] shadow-sm' : 'text-slate-400 hover:text-slate-600';
        badgeClass  = active ? 'bg-purple-100 text-[#714B67]' : 'bg-gray-200 text-slate-500';
    } else if (color === 'red') {
        activeClass = active ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600';
        badgeClass  = active ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-slate-500';
    } else if (color === 'orange') {
        activeClass = active ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600';
        badgeClass  = active ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-slate-500';
    } else {
        activeClass = active ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400 hover:text-slate-600';
        badgeClass  = active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-slate-500';
    }

    return (
        <button onClick={onClick} className={`flex-1 flex flex-col items-center py-1.5 sm:py-2 px-1 rounded-lg transition-all ${activeClass}`}>
            <div className={`flex flex-col items-center gap-0.5 mb-1`}>
                {icon}
                <span className={`text-[9px] sm:text-[10px] leading-tight text-center font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${badgeClass}`}>{count}</span>
        </button>
    );
};

const ViewBtn = ({ active, onClick, label, icon }) => (
    <button onClick={onClick} className={`flex items-center gap-1 px-3 sm:px-5 py-1.5 text-xs sm:text-sm rounded-md transition-all font-medium ${active ? 'bg-[#714B67] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-gray-50'}`}>
        {icon}{label}
    </button>
);

// ─── Branded inline confirm for task actions ──────────────────────────────────
const InlineAlert = ({ message, onClose }) => (
    <div className="bg-red-50 border border-red-100 text-red-700 text-sm p-3 rounded-xl flex items-start justify-between gap-2 animate-fade-in">
        <span>{message}</span>
        <button onClick={onClose} className="shrink-0 text-red-400 hover:text-red-600"><X size={14}/></button>
    </div>
);

const TaskDetailModal = ({ task, onClose, token, user, onRefresh, t, lang = 'en' }) => {
    const BASE = 'https://maintenance-app-staging.onrender.com';
    const [note, setNote] = useState('');
    const [file, setFile] = useState(null);
    const [followUpDate, setFollowUpDate] = useState(getCurrentBkkTimeForInput);
    const [mode, setMode] = useState('view');
    const [showSuccess, setShowSuccess] = useState(false);
    const [modalError, setModalError] = useState('');
    const [showStuck, setShowStuck] = useState(false);

    const canApprove = (user.role === 'MANAGER' || user.role === 'BIG_BOSS' || user.role === 'COMPANY_MANAGER') && task.status === 'WAITING_APPROVAL';
    const canComplete = task.status === 'PENDING' && (user.id === task.worker_id || user.role !== 'EMPLOYEE');
    const canShowStuck = task.status === 'PENDING' && !task.is_stuck && canComplete;
    const canDelete = user.role === 'BIG_BOSS' || user.role === 'COMPANY_MANAGER';
    const canEdit = user.role === 'BIG_BOSS' || user.id === task.created_by;
    const isRecurringSeries = task.title && task.title.endsWith(' (Recurring)');
    const [showEdit, setShowEdit] = useState(false);

    const handleDeleteSeries = async () => {
        const msg = isRecurringSeries
            ? (t.delete_series_confirm || 'Delete this task and all future recurring instances in this series?')
            : (t.delete_task_confirm || 'Delete this task permanently?');
        if (!window.confirm(msg)) return;
        try {
            const res = await fetch(`${BASE}/tasks/${task.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { onRefresh(); onClose(); return; }
            if (res.status === 403) {
                const body = await res.json().catch(() => ({}));
                if (body.error === 'ERR_NOT_CREATOR') {
                    alert(t.err_not_creator || 'You cannot delete this task because it was created by another user or higher management.');
                    return;
                }
            }
        } catch(e) { console.error('Delete task error:', e); }
    };

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
            const res = await fetch(`https://maintenance-app-staging.onrender.com/tasks/${task.id}/complete`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) { setShowSuccess(true); setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500); }
        } catch(e) { setModalError(t.error_completing_task || "Error completing task."); }
    };

    const handleApprove = async () => {
        await fetch(`https://maintenance-app-staging.onrender.com/tasks/${task.id}/approve`, {
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
        await fetch(`https://maintenance-app-staging.onrender.com/tasks/${task.id}/follow-up`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ due_date: followUpDate, description: note || 'Follow up' })
        });
        setShowSuccess(true);
        setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500);
    };

    const isVideo = (url) => url && (url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video'));
    const openMedia = (url) => window.open(url, '_blank');

    if (showSuccess) return createPortal(
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999]">
            <div className="bg-white p-8 rounded-3xl animate-scale-in flex flex-col items-center">
                <Check size={40} className="text-green-600 mb-2"/>
                <h2 className="text-xl font-bold">{t.alert_sent || "Success!"}</h2>
            </div>
        </div>,
        document.body
    );

    const displayCreatorName = task.creator_name || '—';

    return createPortal(
        <>
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
            <div className="bg-white w-full sm:w-[95%] max-w-lg rounded-2xl p-0 overflow-hidden shadow-xl border border-gray-200 animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-start sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                            {(() => {
                                const localTitle = task['title_' + lang] || task.title_en || task.title || '';
                                return isRecurringSeries
                                    ? localTitle.replace(' (Recurring)', '') + ` (${t.recurring_task_suffix || 'Recurring'})`
                                    : localTitle;
                            })()}
                            {task.asset_code && <span className="text-gray-400 font-normal ml-2 text-base"> - {task.asset_code}</span>}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"><X size={18}/></button>
                </div>

                <div className="p-6 space-y-6 pb-32">
                    {(task.asset_name || task.asset_code) && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-[#714B67] uppercase">{t.assets_title || "Asset Info"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{task.asset_name || "N/A"}</h3>
                                    {task.category_name && <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">{task.category_name}</span>}
                                </div>
                                {task.asset_code && (
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200 text-slate-700 font-mono font-bold text-sm">
                                        {task.asset_code}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.date_label}</span><span className="font-medium">{formatBkkDate(task.due_date)}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.urgency_label || "Urgency"}</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${task.urgency === 'High' ? 'bg-orange-100 text-orange-700' : task.urgency === 'Low' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{task.urgency === 'High' ? t.urgency_high : task.urgency === 'Low' ? t.urgency_low : t.urgency_normal}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.location}</span><span className="font-medium">{task.location_name || '-'}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.category_label || "Category"}</span><span className="font-medium">{task.category_name || '-'}</span></div>
                        <div className="col-span-2 border-t pt-2 mt-2"></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.assigned_to}</span><span className="font-medium">{task.worker_name}</span></div>
                        <div><span className="block text-xs text-gray-400 uppercase font-bold">{t.created_by_label || "Created By"}</span><span className="font-medium">{displayCreatorName}</span></div>
                    </div>

                    {task.description && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-gray-200">
                            <span className="block text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">{t.manager_notes}:</span>
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

                    {task.is_stuck && (
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <span className="block text-xs text-purple-700 font-bold mb-1">⚠️ {t.stuck_task_btn || 'Stuck Task'}:</span>
                            {task.stuck_description && <p className="text-sm text-purple-900 mb-2">{task.stuck_description}</p>}
                            {task.stuck_file_url && (
                                isVideo(task.stuck_file_url)
                                    ? <video src={task.stuck_file_url} className="w-full h-32 object-cover rounded-lg border bg-black cursor-pointer" onClick={() => openMedia(task.stuck_file_url)} />
                                    : <img src={task.stuck_file_url} onClick={() => openMedia(task.stuck_file_url)} className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition" alt="stuck evidence" />
                            )}
                        </div>
                    )}

                    <div className="pt-4 space-y-3">
                        {canComplete && mode === 'view' && (
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => { setMode('complete'); setModalError(''); }} className="flex-1 min-w-[120px] bg-[#714B67] text-white px-3 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#5a3b52] transition active:scale-95">{t.complete_task_btn}</button>
                                <button onClick={() => { setMode('followup'); setModalError(''); }} className="flex-1 min-w-[120px] bg-white text-[#714B67] border border-[#714B67]/40 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-50 transition active:scale-95">{t.followup_task_btn}</button>
                                {canShowStuck && (
                                    <button onClick={() => setShowStuck(true)} className="flex-1 min-w-[120px] bg-white text-slate-600 border border-gray-200 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition active:scale-95">{t.stuck_task_btn || 'דיווח על משימה תקועה'}</button>
                                )}
                            </div>
                        )}
                        {mode === 'complete' && (
                            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-gray-200">
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
                            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-gray-200">
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
                            <button onClick={handleApprove} className="w-full bg-[#714B67] text-white py-3 rounded-xl font-bold shadow-sm hover:bg-[#5a3b52] transition">
                                {t.approve_close_btn}
                            </button>
                        )}
                        {canEdit && mode === 'view' && (
                            <button onClick={() => setShowEdit(true)} className="w-full flex items-center justify-center gap-2 border border-[#714B67]/30 text-[#714B67] py-2.5 rounded-xl font-bold hover:bg-purple-50 transition text-sm">
                                <Pencil size={14}/> {t.edit_task_btn || 'Edit Task'}
                            </button>
                        )}
                        {canDelete && (
                            <button onClick={handleDeleteSeries} className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl font-bold hover:bg-red-50 transition text-sm">
                                {isRecurringSeries ? (t.delete_series_btn || 'Delete Entire Series') : (t.delete_task_btn || 'Delete Task')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
        {showStuck && (
            <StuckModal
                task={task}
                onClose={() => setShowStuck(false)}
                token={token}
                user={user}
                onRefresh={onRefresh}
                t={t}
                lang={lang}
            />
        )}
        {showEdit && (
            <EditTaskModal
                task={task}
                onClose={() => setShowEdit(false)}
                token={token}
                t={t}
                onRefresh={() => { onRefresh(); onClose(); }}
                user={user}
                lang={lang}
            />
        )}
        </>,
        document.body
    );
};

const StuckModal = ({ task, onClose, token, user: _user, onRefresh, t, lang = 'en' }) => {
    const [note, setNote] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!note.trim()) {
            setError(t.alert_required || 'A reason is required.');
            return;
        }
        setLoading(true);
        setError('');
        const formData = new FormData();
        formData.append('stuck_description', note);
        if (file) formData.append('stuck_file', file);
        try {
            const res = await fetch(`https://maintenance-app-staging.onrender.com/tasks/${task.id}/stuck`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                setShowSuccess(true);
                setTimeout(() => { setShowSuccess(false); onRefresh(); onClose(); }, 1500);
            } else {
                setError(t.server_error || 'Error reporting stuck task.');
            }
        } catch {
            setError(t.server_error || 'Error reporting stuck task.');
        } finally {
            setLoading(false);
        }
    };

    if (showSuccess) return createPortal(
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999]">
            <div className="bg-white p-8 rounded-3xl animate-scale-in flex flex-col items-center">
                <Check size={40} className="text-[#714B67] mb-2"/>
                <h2 className="text-xl font-bold">{t.stuck_sent || 'Reported!'}</h2>
            </div>
        </div>,
        document.body
    );

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999] backdrop-blur-sm p-4">
            <div className="bg-white w-full sm:w-[95%] max-w-md rounded-2xl overflow-hidden shadow-xl border border-gray-200 animate-slide-up">
                <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-base font-bold text-slate-800">{t.stuck_task_modal_title || 'Report Stuck Task'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"><X size={18}/></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">{task['title_' + lang] || task.title_en || task.title}</p>
                    </div>
                    {error && <InlineAlert message={error} onClose={() => setError('')} />}
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder={t.stuck_description_placeholder || 'Describe the problem or obstacle...'}
                        rows={4}
                        className="w-full p-3 border border-[#714B67]/30 rounded-xl focus:ring-2 focus:ring-[#714B67]/30 outline-none text-sm resize-none"
                    />
                    <input
                        type="file"
                        onChange={e => setFile(e.target.files[0])}
                        className="text-xs file:bg-[#fdf4ff] file:text-[#714B67] file:border-0 file:px-4 file:py-2 file:rounded-lg file:font-bold hover:file:bg-[#714B67]/10 cursor-pointer w-full"
                    />
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 border rounded-xl bg-white text-gray-600 hover:bg-gray-50 font-medium">{t.cancel}</button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-2.5 bg-[#714B67] hover:bg-[#5a3b52] text-white rounded-xl font-bold transition disabled:opacity-60"
                        >
                            {loading ? '...' : (t.stuck_send_btn || 'Report Stuck Task')}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TasksTab;
