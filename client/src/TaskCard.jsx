import { Clock, MapPin, Box, Image as ImageIcon, Video, User } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';

// 🚀 פונקציה חכמה שממירה כל שעה לשעון בנגקוק
const getBkkTime = (dateInput) => {
    if (!dateInput) return new Date();
    const d = new Date(dateInput);
    return new Date(d.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
};

const TaskCard = ({ task, onClick, t, lang = 'en' }) => {
  const getTaskName = (base) => task[base + '_' + lang] || task[base + '_en'] || task[base] || '';

  const taskBkkDate = getBkkTime(task.due_date);
  const todayBkk = getBkkTime(new Date());
  
  const isOverdue = task.status === 'PENDING' && isBefore(taskBkkDate, startOfDay(todayBkk));
  
  const urgencyColor = task.urgency === 'High' ? 'bg-red-50 text-red-700 border-red-100' 
                     : task.urgency === 'Low' ? 'bg-blue-50 text-blue-600 border-blue-100'
                     : 'bg-gray-50 text-gray-600 border-gray-100';

  const hasMedia = task.images && task.images.length > 0;
  const isVideo = hasMedia && (task.images[0].includes('mp4') || task.images[0].includes('video'));
  const displayCode = task.asset_code || '';

  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all relative overflow-hidden group mb-2">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOverdue ? 'bg-red-500' : task.status === 'COMPLETED' ? 'bg-green-500' : task.status === 'WAITING_APPROVAL' ? 'bg-orange-400' : 'bg-[#714B67]'}`}></div>
        
        <div className="p-3 pl-4">
            <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md border border-gray-100">
                    <Box size={10} />
                    <span className="uppercase tracking-wide truncate max-w-[120px]">
                        {getTaskName('asset_name') || getTaskName('category_name') || t.general_task || "General"}
                    </span>
                </div>
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${urgencyColor}`}>
                    {task.urgency === 'High' ? t.urgency_high || t.urgent_label : task.urgency === 'Low' ? t.urgency_low || t.low_label : t.urgency_normal || t.normal_label}
                </div>
            </div>

            <div className="flex justify-between items-start gap-2">
                <h4 className="font-semibold text-slate-800 text-sm sm:text-base leading-tight mb-1.5 flex-1">
                    {task.title && task.title.endsWith(' (Recurring)')
                        ? task.title.replace(' (Recurring)', '') + ` (${t.recurring_task_suffix || 'Recurring'})`
                        : task.title}
                    {displayCode && <span className="text-gray-400 font-normal ml-1.5 text-xs sm:text-sm">- {displayCode}</span>}
                </h4>
                {hasMedia && <div className="text-gray-400">{isVideo ? <Video size={14}/> : <ImageIcon size={14}/>}</div>}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 mt-2 border-t border-gray-100 pt-1.5">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 truncate max-w-[100px]">
                        <MapPin size={12} className="text-[#714B67]"/>
                        <span>{getTaskName('location_name') || t.no_location || "No Loc"}</span>
                    </div>
                    {task.worker_name && (
                        <div className="flex items-center gap-1 text-slate-600 font-medium bg-slate-50 px-1.5 py-0.5 rounded-md text-xs border border-slate-100">
                            <User size={10}/> {task.worker_name.split(' ')[0]}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                        <Clock size={12}/>
                        <span>{format(taskBkkDate, 'dd/MM HH:mm')}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
export default TaskCard;