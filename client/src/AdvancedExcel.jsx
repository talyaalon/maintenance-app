import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; 
import { Download, Upload, FileSpreadsheet, Filter, Trash2, AlertTriangle, X, CheckCircle, Info, ArrowRight, Plus, Play, Save, AlertCircle } from 'lucide-react';

const AdvancedExcel = ({ token, t, onRefresh, onClose }) => {
    const [activeTab, setActiveTab] = useState('import'); 
    const [users, setUsers] = useState([]);
    
    // --- EXPORT STATE ---
    const allFields = [
        { id: 'id', label: 'ID (Required for Update)' },
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
    const [filterWorker, setFilterWorker] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isUpdateMode, setIsUpdateMode] = useState(false);

    // --- IMPORT STATE ---
    const [importFile, setImportFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [headers, setHeaders] = useState([]); 
    const [fileName, setFileName] = useState("");
    const [validationStatus, setValidationStatus] = useState("idle"); 
    const [errorList, setErrorList] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false); 

    useEffect(() => {
        fetch('https://maintenance-app-h84v.onrender.com/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(setUsers)
        .catch(console.error);
    }, [token]);

    // --- Template Generation (Updated) ---
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Task Title": "Clean Air Filters", // כותרת ברורה
                "Description": "Check and clean filters in the main lobby",
                "Urgency": "Normal",
                "Due Date": "2024-12-31",
                "Worker Name": "John Doe", // שם עובד (חייב להיות קיים במערכת)
                "Location Name": "Lobby",  // שם מיקום (חייב להיות קיים במערכת)
                "Asset Code": "AC-001",    // קוד נכס (אופציונלי)
                "Asset Name": "",          
                "Category": ""
            },
            {
                "Task Title": "Weekly Inspection",
                "Description": "",
                "Urgency": "High",
                "Due Date": "2024-11-20",
                "Worker Name": "",
                "Location Name": "",
                "Asset Code": "",
                "Asset Name": "",
                "Category": ""
            }
        ];
        
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        // קצת רוחב לעמודות שיהיה קריא
        worksheet['!cols'] = [ {wch: 20}, {wch: 30}, {wch: 10}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 15} ];
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Import_Tasks_Template.xlsx");
    };


    // --- EXPORT LOGIC ---
    const moveToSelected = (field) => {
        setSelectedFields([...selectedFields, field]);
        setAvailableFields(availableFields.filter(f => f.id !== field.id));
    };

    const moveToAvailable = (field) => {
        if (isUpdateMode && field.id === 'id') return; 
        setAvailableFields([...availableFields, field]);
        setSelectedFields(selectedFields.filter(f => f.id !== field.id));
    };

    const handleUpdateModeChange = (e) => {
        const checked = e.target.checked;
        setIsUpdateMode(checked);
        if (checked) {
            const idField = availableFields.find(f => f.id === 'id');
            if (idField) moveToSelected(idField);
        }
    };

    const handleExport = async () => {
        if (selectedFields.length === 0) return alert("Please select fields to export");
        setIsExporting(true);
        try {
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

            const excelData = rawData.map(task => {
                const row = {};
                selectedFields.forEach(field => {
                    let value = task[field.id];
                    if (field.id === 'due_date' && value) {
                        value = new Date(value).toISOString().split('T')[0];
                    }
                    row[field.label] = value || "";
                });
                return row;
            });

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

    // --- IMPORT LOGIC ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setImportFile(file);
        setFileName(file.name);
        setValidationStatus("idle");
        setErrorList([]);
        setPreviewData([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { defval: "" }); 
            
            if (data.length > 0) {
                setHeaders(Object.keys(data[0]));
                setPreviewData(data);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processFile = async (isDryRun) => {
        setIsProcessing(true);
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks/import-process', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ tasks: previewData, isDryRun: isDryRun })
            });

            const result = await res.json();

            if (result.success) {
                if (isDryRun) {
                    setValidationStatus("valid"); 
                    setErrorList([]);
                } else {
                    alert(t.alert_created || "Import successful!");
                    onRefresh();
                    onClose();
                }
            } else {
                setValidationStatus("error");
                setErrorList(result.errors || (result.details ? result.details : [result.error]));
            }
        } catch (err) {
            console.error(err);
            setValidationStatus("error");
            setErrorList(["Server communication error"]);
        } finally {
            setIsProcessing(false);
        }
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-[#6A0DAD] p-4 flex justify-between items-center text-white shadow-md shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileSpreadsheet /> {t.excel_center || "Excel Center"}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-purple-600 rounded-full transition"><X /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-gray-50 shrink-0">
                    <button onClick={() => setActiveTab('import')} className={`flex-1 py-3 font-bold text-sm transition-all ${activeTab === 'import' ? 'text-purple-700 border-b-4 border-purple-700 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {t.import_data || "📥 Import / Update"}
                    </button>
                    <button onClick={() => setActiveTab('export')} className={`flex-1 py-3 font-bold text-sm transition-all ${activeTab === 'export' ? 'text-purple-700 border-b-4 border-purple-700 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        {t.export_data || "📤 Export Data"}
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                    
                    {/* --- EXPORT TAB --- */}
                    {activeTab === 'export' && (
                        <div className="p-6 flex flex-col h-full space-y-4">
                            {/* ... Export UI (נשאר אותו דבר) ... */}
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

                            <div className="flex items-center gap-2 px-2">
                                <input type="checkbox" id="upd" checked={isUpdateMode} onChange={handleUpdateModeChange} className="w-4 h-4 text-purple-600"/>
                                <label htmlFor="upd" className="text-sm font-bold text-gray-700 cursor-pointer">
                                    {t.export_for_update || "I want to update data (Includes ID)"}
                                </label>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-[300px]">
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

                                <div className="flex items-center justify-center text-gray-300 md:rotate-0 rotate-90"><ArrowRight size={24} /></div>

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

                            <button onClick={handleExport} disabled={isExporting} className="w-full py-3 bg-[#6A0DAD] text-white rounded-xl font-bold shadow-lg hover:bg-purple-800 transition flex justify-center items-center gap-2">
                                {isExporting ? "Exporting..." : <><Download size={20}/> {t.download_excel || "Download Excel"}</>}
                            </button>
                        </div>
                    )}

                    {/* --- IMPORT TAB --- */}
                    {activeTab === 'import' && (
                        <div className="flex flex-col h-full">
                            
                            {/* Toolbar */}
                            <div className="bg-gray-50 p-4 border-b flex justify-between items-center px-6">
                                <div className="flex gap-2">
                                    <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition flex items-center gap-2 shadow-sm">
                                        <Upload size={18} />
                                        {fileName || "Load File"}
                                        <input type="file" hidden accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                                    </label>

                                    {previewData.length > 0 && (
                                        <button 
                                            onClick={() => processFile(true)}
                                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 hover:text-purple-600 transition flex items-center gap-2 shadow-sm"
                                        >
                                            {isProcessing ? "Testing..." : <><Play size={18} /> Test</>}
                                        </button>
                                    )}

                                    {previewData.length > 0 && (
                                        <button 
                                            onClick={() => processFile(false)}
                                            disabled={validationStatus !== "valid"} 
                                            className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition ${
                                                validationStatus === "valid" 
                                                ? "bg-[#6A0DAD] text-white hover:bg-purple-800" 
                                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            }`}
                                        >
                                            <Save size={18} /> Import
                                        </button>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <button onClick={handleDownloadTemplate} className="text-sm text-purple-600 hover:underline flex items-center gap-1 font-bold">
                                        <Download size={14}/> Download Template
                                    </button>
                                    <button onClick={handleDeleteAll} className="text-red-500 p-2 hover:bg-red-50 rounded-full" title="Delete All Tasks">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>

                            {/* Status Messages */}
                            {validationStatus === "valid" && (
                                <div className="bg-green-50 border-b border-green-200 p-4 flex items-center gap-3 animate-fade-in">
                                    <CheckCircle className="text-green-600" size={24} />
                                    <div>
                                        <h4 className="text-green-800 font-bold">Everything seems valid.</h4>
                                        <p className="text-green-700 text-sm">You can now click the 'Import' button to save the tasks.</p>
                                    </div>
                                </div>
                            )}

                            {validationStatus === "error" && (
                                <div className="bg-red-50 border-b border-red-200 p-4 animate-fade-in max-h-40 overflow-y-auto">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
                                        <div>
                                            <h4 className="text-red-800 font-bold mb-1">The file contains blocking errors:</h4>
                                            <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                                                {errorList.map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Data Preview Table */}
                            <div className="flex-1 overflow-auto bg-gray-100 p-6">
                                {previewData.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-white/50">
                                        <FileSpreadsheet size={64} className="mb-4 opacity-50"/>
                                        <p className="text-lg">No file loaded</p>
                                        <p className="text-sm">Upload an Excel file to see a preview</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow border overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b">
                                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-16">#</th>
                                                        {headers.map(h => (
                                                            <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {previewData.slice(0, 50).map((row, i) => (
                                                        <tr key={i} className="hover:bg-gray-50 transition">
                                                            <td className="p-3 text-xs text-gray-400 font-mono border-r">{i + 1}</td>
                                                            {headers.map((h, j) => (
                                                                <td key={j} className="p-3 text-sm text-gray-700 whitespace-nowrap border-r last:border-r-0">
                                                                    {row[h]}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {previewData.length > 50 && (
                                            <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t">
                                                Showing first 50 rows of {previewData.length}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedExcel;