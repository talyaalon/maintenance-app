import React from 'react';
import { Clock, MapPin, Box, Image as ImageIcon, Video } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';

const TaskCard = ({ task, onClick, t, statusColor = 'border-purple-500', compact = false }) => {
  const isOverdue = task.status === 'PENDING' && isBefore(parseISO(task.due_date), startOfDay(new Date()));
  
  const urgencyColor = task.urgency === 'High' ? 'bg-red-100 text-red-700 border-red-200' 
                     : task.urgency === 'Low' ? 'bg-blue-50 text-blue-600 border-blue-100'
                     : 'bg-gray-100 text-gray-600 border-gray-200';

  // בדיקה אם יש תמונות או וידאו למשימה
  const hasMedia = task.images && task.images.length > 0;
  const firstMedia = hasMedia ? task.images[0] : null;
  const isVideo = firstMedia && (firstMedia.endsWith('.mp4') || firstMedia.endsWith('.mov') || firstMedia.includes('video'));

  return (
    <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all relative overflow-hidden group mb-3`}>
        {/* פס צבע בצד לפי סטטוס */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isOverdue ? 'bg-red-500' : task.status === 'COMPLETED' ? 'bg-green-500' : task.status === 'WAITING_APPROVAL' ? 'bg-orange-400' : 'bg-purple-500'}`}></div>
        
        <div className="p-4 pl-5">
            {/* כותרת עליונה: נכס וקטגוריה */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    <Box size={12} />
                    <span className="uppercase tracking-wide">
                        {task.asset_name ? task.asset_name : (task.category_name || t.general_task || "General")}
                    </span>
                    {task.asset_code && <span className="opacity-50">#{task.asset_code}</span>}
                </div>
                {/* תגית דחיפות */}
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColor}`}>
                    {task.urgency === 'High' ? '🔥 ' + t.urgent_label : t.normal_label}
                </div>
            </div>

            {/* גוף המשימה */}
            <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-gray-800 text-lg leading-tight mb-2 flex-1">{task.title}</h4>
                
                {/* אייקון אם יש מדיה */}
                {hasMedia && (
                    <div className="text-gray-400">
                        {isVideo ? <Video size={16}/> : <ImageIcon size={16}/>}
                    </div>
                )}
            </div>

            {/* תצוגה מקדימה של מדיה (אופציונלי - אם רוצים להציג תמונה קטנה בתוך הכרטיס) */}
            {/* {hasMedia && !isVideo && (
                <div className="mb-2 h-20 w-full overflow-hidden rounded-lg">
                    <img src={firstMedia} alt="Preview" className="w-full h-full object-cover"/>
                </div>
            )}
            */}

            {/* שורה תחתונה: מיקום ותאריך */}
            <div className="flex justify-between items-center text-sm text-gray-500 mt-3 border-t pt-2 border-dashed">
                <div className="flex items-center gap-1">
                    <MapPin size={14} className="text-purple-400"/>
                    <span>{task.location_name || t.no_location || "No Location"}</span>
                </div>
                <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                    <Clock size={14}/>
                    <span>{format(parseISO(task.due_date), 'dd/MM')}</span>
                    {isOverdue && <span className="text-[10px] bg-red-100 px-1 rounded ml-1">{t.overdue}</span>}
                </div>
            </div>
        </div>
    </div>
  );
};

export default TaskCard;