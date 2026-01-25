import React from 'react';
import { Clock, MapPin, Box, Image as ImageIcon, Video, User } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';

const TaskCard = ({ task, onClick, t, compact = false }) => {
  const isOverdue = task.status === 'PENDING' && isBefore(parseISO(task.due_date), startOfDay(new Date()));
  
  // צבעים עדינים יותר
  const urgencyColor = task.urgency === 'High' ? 'bg-red-50 text-red-700 border-red-100' 
                     : task.urgency === 'Low' ? 'bg-blue-50 text-blue-600 border-blue-100'
                     : 'bg-gray-50 text-gray-600 border-gray-100';

  const hasMedia = task.images && task.images.length > 0;
  const isVideo = hasMedia && (task.images[0].includes('mp4') || task.images[0].includes('video'));
  const displayCode = task.asset_code || '';

  return (
    <div onClick={onClick} className="bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all relative overflow-hidden group mb-2.5">
        {/* פס צבע צדי בצבע הסגול הנכון */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOverdue ? 'bg-red-500' : task.status === 'COMPLETED' ? 'bg-green-500' : task.status === 'WAITING_APPROVAL' ? 'bg-orange-400' : 'bg-[#714B67]'}`}></div>
        
        <div className="p-3 pl-4"> {/* הקטנו רווחים למובייל */}
            <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-md">
                    <Box size={10} />
                    <span className="uppercase tracking-wide truncate max-w-[120px]">
                        {task.asset_name ? task.asset_name : (task.category_name || t.general_task || "General")}
                    </span>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColor}`}>
                    {/* הורדנו את האימוג'י של האש */}
                    {task.urgency === 'High' ? t.urgent_label : t.normal_label}
                </div>
            </div>

            <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-gray-800 text-sm sm:text-base leading-tight mb-1.5 flex-1">
                    {task.title}
                    {displayCode && <span className="text-gray-400 font-normal ml-1.5 text-xs sm:text-sm">- {displayCode}</span>}
                </h4>
                {hasMedia && <div className="text-gray-400">{isVideo ? <Video size={14}/> : <ImageIcon size={14}/>}</div>}
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 mt-2 border-t pt-1.5 border-dashed">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 truncate max-w-[100px]">
                        <MapPin size={12} className="text-[#714B67]"/>
                        <span>{task.location_name || "No Loc"}</span>
                    </div>
                    {/* הוספת שם העובד */}
                    {task.worker_name && (
                        <div className="flex items-center gap-1 text-[#714B67] font-medium bg-[#fdf4ff] px-1.5 py-0.5 rounded-md text-[10px]">
                            <User size={10}/> {task.worker_name.split(' ')[0]}
                        </div>
                    )}
                </div>

                <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                    <Clock size={12}/>
                    {/* הצגת שעה */}
                    <span>{format(parseISO(task.due_date), 'dd/MM HH:mm')}</span>
                </div>
            </div>
        </div>
    </div>
  );
};
export default TaskCard;