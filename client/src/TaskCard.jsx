// client/src/TaskCard.jsx
import React from 'react';

const TaskCard = ({ task, onComplete }) => {
  const isDone = task.status === 'Done';
  const isUrgent = task.urgency === 'High';

  return (
    <div className={`bg-white p-4 rounded-lg shadow-md mb-4 border-l-4 transition-all ${isDone ? 'opacity-60' : 'opacity-100'}`}
         style={{ borderColor: isUrgent ? 'red' : '#6A0DAD' }}>
      
      <div className="flex justify-between items-start">
        <div>
          <h3 className={`font-bold text-lg ${isDone ? 'line-through text-gray-500' : 'text-gray-800'}`}>
            {task.title}
          </h3>
          <p className="text-sm text-gray-500">סטטוס: {task.status}</p>
        </div>
        {isUrgent && (
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded animate-pulse">
            דחוף
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
            סיים משימה
          </button>
        </div>
      )}
      
      {isDone && <div className="mt-2 text-green-600 font-bold">✓ הושלם</div>}
    </div>
  );
};

export default TaskCard;