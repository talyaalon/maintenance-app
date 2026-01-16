import React from 'react';
import TaskCard from './TaskCard';
import { Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const TasksTab = ({ tasks, t, onComplete, onRefresh, token, user }) => {

  // ייצוא לאקסל
  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(tasks);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, "MyTasks.xlsx");
  };

  // ייבוא מאקסל
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        await fetch('http://localhost:3001/tasks/import', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        alert("הייבוא הושלם בהצלחה!");
        onRefresh(); // רענון הרשימה כדי לראות את המשימות החדשות
    } catch (err) {
        alert("שגיאה בייבוא הקובץ");
    }
  };

  return (
    <div className="p-4 pb-24">
       <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{t.nav_tasks}</h2>
            
            {/* כפתורי אקסל - רק למנהלים */}
            {(user.role === 'BIG_BOSS' || user.role === 'MANAGER') && (
                <div className="flex gap-2">
                    <button onClick={handleExport} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title={t.export_excel}>
                        <Download size={20} />
                    </button>
                    <label className="p-2 bg-blue-100 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-200" title={t.import_excel}>
                        <Upload size={20} />
                        <input type="file" hidden onChange={handleImport} accept=".xlsx, .xls" />
                    </label>
                </div>
            )}
       </div>

       {tasks.length === 0 ? (
           <div className="text-center text-gray-500 mt-10 p-10 bg-white rounded-xl shadow-sm">
               <p>{t.no_tasks}</p>
           </div>
       ) : (
           tasks.map(task => (
               <TaskCard 
                 key={task.id} 
                 task={task} 
                 onComplete={onComplete} 
                 language={t === 'he' ? 'he' : 'en'} // העברת השפה לכרטיס
               />
           ))
       )}
    </div>
  );
};

export default TasksTab;