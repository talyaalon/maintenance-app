import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; 
import { Download, Upload, FileSpreadsheet, Filter, Trash2, AlertTriangle, X, CheckCircle, Info, RefreshCw, ArrowRight, Plus } from 'lucide-react';

const AdvancedExcel = ({ token, t, onRefresh, onClose }) => {
    const [activeTab, setActiveTab] = useState('export'); // export / import
    const [users, setUsers] = useState([]);
    
    // --- 1. הגדרת שדות לייצוא ---
    const allFields = [
        { id: 'id', label: 'ID (חובה לעדכון)' },
        { id: 'title', label: t.task_title_label || 'Title' },
        { id: 'description', label: t.description_label || 'Description' },
        { id: 'urgency', label: t.urgency_label || 'Urgency' },
        { id: 'status', label: t.status_label || 'Status' },
        { id: 'due_date', label: t.date_label || 'Due Date' },
        { id: 'worker_name', label: t.assigned_to || 'Worker Name' },
        { id: 'location_name', label: t.location || 'Location' },
        { id: 'asset_code', label: 'Asset Code' },
        { id: 'asset_name', label: 'Asset Name' },
        { id: 'category_name', label: 'Category' }
    ];

    const [availableFields, setAvailableFields] = useState(allFields);
    const [selectedFields, setSelectedFields] = useState([]);
    
    // סטייטים לפילטרים (ייצוא)
    const [filterWorker, setFilterWorker] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isUpdateMode, setIsUpdateMode] = useState(false); // מצב עדכון (ID חובה)

    // סטייטים לייבוא
    const [importFile, setImportFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    // טעינת עובדים
    useEffect(() => {
        fetch('https://maintenance-app-h84v.onrender.com/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(setUsers)
        .catch(console.error);
    }, [token]);

    // --- לוגיקה לבחירת שדות (Drag & Drop UI) ---
    const moveToSelected = (field) => {
        setSelectedFields([...selectedFields, field]);
        setAvailableFields(availableFields.filter(f => f.id !== field.id));
    };

    const moveToAvailable = (field) => {
        if (isUpdateMode && field.id === 'id') return; // לא ניתן להסיר ID במצב עדכון
        setAvailableFields([...availableFields, field]);
        setSelectedFields(selectedFields.filter(f => f.id !== field.id));
    };

    const handleUpdateModeChange = (e) => {
        const checked = e.target.checked;
        setIsUpdateMode(checked);
        if (checked) {
            // אם סומן מצב עדכון - מעבירים את ID אוטומטית לנבחרים
            const idField = availableFields.find(f => f.id === 'id');
            if (idField) moveToSelected(idField);
        }
    };

    // --- 2. ביצוע הייצוא (המשולב) ---
    const handleExport = async () => {
        if (selectedFields.length === 0) return alert("Please select fields to export");
        setIsExporting(true);
        
        try {
            // שלב א: משיכת הנתונים מהשרת עם הפילטרים (תאריך/עובד)
            const params = new URLSearchParams();
            if (filterWorker) params.append('worker_id', filterWorker);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const res = await fetch(`https://maintenance-app-h84v.onrender.com/tasks/export/advanced?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) throw new Error("Export failed");
            const rawData = await res.json();
            
            if (rawData.length === 0) {
                alert("No tasks found matching filters.");
                setIsExporting(false);
                return;
            }

            // שלב ב: סינון העמודות באקסל לפי מה שהמשתמש בחר
            const excelData = rawData.map(task => {
                const row = {};
                selectedFields.forEach(field => {
                    let value = task[field.id];
                    // פירמוט תאריך אם צריך
                    if (field.id === 'due_date' && value) {
                        value = new Date(value).toISOString().split('T')[0];
                    }
                    // המפתח באקסל יהיה ה-Label (השם היפה) שהמשתמש רואה
                    row[field.label] = value || "";
                });
                return row;
            });

            // יצירת הקובץ
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
            XLSX.writeFile(workbook, `Tasks_Export_${new Date().toISOString().slice(0,10)}.xlsx`);

        } catch (e) {
            alert("Error exporting: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

    // --- 3. לוגיקה לייבוא (נשאר אותו דבר - עובד מצוין) ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            setPreviewData(data);
        };
        reader.readAsBinaryString(file);
    };

    const handleExecuteImport = async () => {
        if (!importFile || previewData.length === 0) return;
        if (!window.confirm(`Import ${previewData.length} tasks?`)) return;
        setIsImporting(true);
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks/import-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ tasks: previewData })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed");
            alert(result.message);
            onRefresh(); onClose();
        } catch (e) { alert("Error: " + e.message); } 
        finally { setIsImporting(false); }
    };

    const handleDeleteAll = async () => {
        if(!window.confirm("⚠️ Delete ALL tasks? This cannot be undone!")) return;
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks/delete-all', {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) { alert("Deleted."); onRefresh(); onClose(); }
            else alert("Error.");
        } catch(e) { alert("Error."); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-[#6A0DAD] p-4 flex justify-between items-center text-white shadow-md shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileSpreadsheet /> {t.excel_center || "Excel Center"}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-purple-600 rounded-full"><X /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-gray-50 shrink-0">
                    <button onClick={() => setActiveTab('export')} className={`flex-1 py-3 font-bold text-sm transition-all ${activeTab === 'export' ? 'text-purple-700 border-b-4 border-purple-700 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {t.export_data || "📤 Export Data"}
                    </button>
                    <button onClick={() => setActiveTab('import')} className={`flex-1 py-3 font-bold text-sm transition-all ${activeTab === 'import' ? 'text-purple-700 border-b-4 border-purple-700 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {t.import_data || "📥 Import / Update"}
                    </button>
                </div>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    
                    {/* --- EXPORT TAB --- */}
                    {activeTab === 'export' && (
                        <div className="flex flex-col h-full space-y-4">
                            
                            {/* 1. Filters Section */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                    <Filter size={18}/> {t.filters || "Filters"}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">{t.employee}</label>
                                        <select className="w-full p-2 border rounded-lg bg-white" value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
                                            <option value="">-- All Employees --</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">{t.date_range}</label>
                                        <div className="flex gap-2 items-center">
                                            <input type="date" className="w-full p-2 border rounded-lg" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                            <span className="text-gray-400">➝</span>
                                            <input type="date" className="w-full p-2 border rounded-lg" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Checkbox: Update Mode */}
                            <div className="flex items-center gap-2 px-2">
                                <input type="checkbox" id="upd" checked={isUpdateMode} onChange={handleUpdateModeChange} className="w-4 h-4 text-purple-600"/>
                                <label htmlFor="upd" className="text-sm font-bold text-gray-700 cursor-pointer">
                                    {t.export_for_update || "I want to update data (Includes ID)"}
                                </label>
                            </div>

                            {/* 3. Field Selector (Left/Right Lists) */}
                            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-[300px]">
                                {/* Available Fields */}
                                <div className="flex-1 border rounded-lg p-3 bg-white shadow-sm flex flex-col">
                                    <h4 className="font-bold text-gray-700 border-b pb-2 mb-2 text-xs uppercase">Available Fields</h4>
                                    <div className="overflow-y-auto flex-1 space-y-1">
                                        {availableFields.map(f => (
                                            <div key={f.id} onClick={() => moveToSelected(f)} className="p-2 bg-gray-50 border rounded cursor-pointer hover:bg-purple-50 flex justify-between items-center group">
                                                <span className="text-sm">{f.label}</span>
                                                <Plus size={14} className="text-gray-400 group-hover:text-purple-600"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Arrow Icon */}
                                <div className="flex items-center justify-center text-gray-300 md:rotate-0 rotate-90">
                                    <ArrowRight size={24} />
                                </div>

                                {/* Selected Fields */}
                                <div className="flex-1 border border-purple-200 rounded-lg p-3 bg-white shadow-md flex flex-col">
                                    <h4 className="font-bold text-purple-700 border-b pb-2 mb-2 text-xs uppercase">Fields to Export</h4>
                                    <div className="overflow-y-auto flex-1 space-y-1">
                                        {selectedFields.map(f => (
                                            <div key={f.id} onClick={() => moveToAvailable(f)} className={`p-2 border rounded cursor-pointer flex justify-between items-center group ${f.id === 'id' && isUpdateMode ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'bg-purple-50 border-purple-100 hover:bg-red-50'}`}>
                                                <span className="text-sm font-medium">{f.label}</span>
                                                {!(f.id === 'id' && isUpdateMode) && <Trash2 size={14} className="text-purple-400 group-hover:text-red-500"/>}
                                            </div>
                                        ))}
                                        {selectedFields.length === 0 && <p className="text-gray-400 text-xs text-center mt-10">Select fields...</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Export Button */}
                            <button onClick={handleExport} disabled={isExporting} className="w-full py-3 bg-[#6A0DAD] text-white rounded-xl font-bold shadow-lg hover:bg-purple-800 transition flex justify-center items-center gap-2">
                                {isExporting ? "Exporting..." : <><Download size={20}/> {t.download_excel || "Download Excel"}</>}
                            </button>
                        </div>
                    )}

                    {/* --- IMPORT TAB --- */}
                    {activeTab === 'import' && (
                        <div className="space-y-6">
                            <div className="flex justify-end">
                                <button onClick={handleDeleteAll} className="text-red-600 text-xs font-bold border border-red-200 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 flex items-center gap-1 transition">
                                    <Trash2 size={14}/> {t.delete_all_tasks || "Delete All Tasks"}
                                </button>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-sm text-orange-900">
                                <p className="font-bold flex items-center gap-2 mb-2"><Info size={18}/> Instructions:</p>
                                <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                                    <li><b>To Update:</b> Include <code>ID</code> column.</li>
                                    <li><b>To Create:</b> Leave <code>ID</code> empty.</li>
                                    <li><b>Required:</b> <code>Title</code></li>
                                </ul>
                            </div>

                            {!previewData.length ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-white bg-gray-50 transition relative">
                                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <Upload size={32} className="text-gray-400 mb-2" />
                                    <span className="text-gray-600 font-bold">{t.click_upload || "Click to Upload"}</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-gray-700">Preview ({previewData.length} rows)</h4>
                                        <button onClick={() => {setPreviewData([]); setImportFile(null);}} className="text-red-500 text-xs hover:underline">Change File</button>
                                    </div>
                                    <div className="bg-white border rounded-lg overflow-x-auto max-h-60">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-100 font-bold text-gray-600 sticky top-0">
                                                <tr><th className="p-2">Action</th><th className="p-2">Title</th><th className="p-2">Worker</th></tr>
                                            </thead>
                                            <tbody>
                                                {previewData.slice(0, 5).map((row, i) => (
                                                    <tr key={i} className="border-b">
                                                        <td className="p-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.ID ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{row.ID ? 'UPDATE' : 'NEW'}</span></td>
                                                        <td className="p-2 truncate max-w-[150px]">{row['Title'] || row['title']}</td>
                                                        <td className="p-2">{row['Worker Name'] || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button onClick={handleExecuteImport} disabled={isImporting} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow hover:bg-green-700 flex justify-center items-center gap-2">
                                        {isImporting ? "Processing..." : <><CheckCircle size={20}/> {t.execute_import || "Import Now"}</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedExcel;