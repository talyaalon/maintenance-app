import React from 'react';

const TaskCard = ({ task, onComplete, t }) => { // הוספנו את t כאן
  const isDone = task.status === 'Done' || task.status === 'COMPLETED';
  const isUrgent = task.urgency === 'High';

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md mb-4 border-l-4 transition-all ${isDone ? 'opacity-60' : 'opacity-100'}`}
         style={{ borderColor: isUrgent ? 'red' : '#6A0DAD' }}>
      
      <div className="flex justify-between items-start">
        <div>
          <h3 className={`font-bold text-lg ${isDone ? 'line-through text-gray-500' : 'text-gray-800'}`}>
            {task.title}
          </h3>
          {/* הוחלף: סטטוס */}
          <p className="text-sm text-gray-500">{t.status_label}: {task.status}</p>
        </div>
        {isUrgent && (
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded animate-pulse">
            {t.urgent} {/* הוחלף: דחוף */}
          </span>
        )}
      </div>

      {!isDone && (
        <div className="mt-4">
          <button 
            onClick={() => onComplete(task.id)}
            className="w-full py-2 rounded text-white text-sm font-medium hover:bg-purple-800 transition"
            style={{ backgroundColor: '#6A0DAD' }}
          >
            {t.complete_task} {/* הוחלף: סיים משימה */}
          </button>
        </div>
      )}
      
      {/* הוחלף: הושלם */}
      {isDone && <div className="mt-2 text-green-600 font-bold">✓ {t.task_done}</div>}
    </div>
  );
};

export default TaskCard;