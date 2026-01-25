import React from 'react';
import { Clock, MapPin, Box, Image as ImageIcon, Video, User } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';

const TaskCard = ({ task, onClick, t, statusColor = 'border-purple-500', compact = false }) => {
  const isOverdue = task.status === 'PENDING' && isBefore(parseISO(task.due_date), startOfDay(new Date()));
  
  const urgencyColor = task.urgency === 'High' ? 'bg-red-100 text-red-700 border-red-200' 
                     : task.urgency === 'Low' ? 'bg-blue-50 text-blue-600 border-blue-100'
                     : 'bg-gray-100 text-gray-600 border-gray-200';

  const hasMedia = task.images && task.images.length > 0;
  const firstMedia = hasMedia ? task.images[0] : null;
  const isVideo = firstMedia && (firstMedia.endsWith('.mp4') || firstMedia.endsWith('.mov') || firstMedia.includes('video'));

  // קביעת הקוד לתצוגה (Asset Code או מזהה קצר)
  const displayCode = task.asset_code || '';

  return (
    <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all relative overflow-hidden group mb-3`}>
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isOverdue ? 'bg-red-500' : task.status === 'COMPLETED' ? 'bg-green-500' : task.status === 'WAITING_APPROVAL' ? 'bg-orange-400' : 'bg-purple-500'}`}></div>
        
        <div className="p-4 pl-5">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    <Box size={12} />
                    <span className="uppercase tracking-wide">
                        {task.asset_name ? task.asset_name : (task.category_name || t.general_task || "General")}
                    </span>
                </div>
                
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColor}`}>
                    {/* 👇 הורדתי את ה-🔥 לבקשתך */}
                    {task.urgency === 'High' ? t.urgent_label : t.normal_label}
                </div>
            </div>

            {/* 👇 שם המשימה + קוד */}
            <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-gray-800 text-lg leading-tight mb-2 flex-1">
                    {task.title}
                    {displayCode && <span className="text-gray-400 font-normal ml-2 text-base"> - {displayCode}</span>}
                </h4>
                
                {hasMedia && (
                    <div className="text-gray-400">
                        {isVideo ? <Video size={16}/> : <ImageIcon size={16}/>}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-sm text-gray-500 mt-3 border-t pt-2 border-dashed">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-purple-400"/>
                        <span>{task.location_name || t.no_location || "No Loc"}</span>
                    </div>
                    {/* 👇 הוספת שם העובד */}
                    {task.worker_name && (
                        <div className="flex items-center gap-1 text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-md text-xs">
                            <User size={12}/> {task.worker_name}
                        </div>
                    )}
                </div>

                <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                    <Clock size={14}/>
                    {/* 👇 תצוגת תאריך ושעה */}
                    <span>{format(parseISO(task.due_date), 'dd/MM HH:mm')}</span>
                    {isOverdue && <span className="text-[10px] bg-red-100 px-1 rounded ml-1">{t.overdue}</span>}
                </div>
            </div>
        </div>
    </div>
  );
};

export default TaskCard;