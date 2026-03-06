import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; 
import { Download, Upload, FileSpreadsheet, Filter, Trash2, AlertTriangle, X, CheckCircle, Search, Plus, Calendar, ListFilter } from 'lucide-react';

const AdvancedExcel = ({ token, t, onRefresh, onClose, user }) => {
    const [activeTab, setActiveTab] = useState('import'); 
    const [searchTerm, setSearchTerm] = useState(''); 

    // --- SHARED STATE (Data for Validation & Filters) ---
    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);

    // --- EXPORT STATE ---
    const allFields = [
        { id: 'id', label: 'ID (Required for Update)' },
        { id: 'title', label: t.task_title_label || 'Title' },
        { id: 'description', label: t.description_label || 'Description' },
        { id: 'urgency', label: t.urgency_label || 'Urgency' },
        { id: 'status', label: t.status_label || 'Status' },
        { id: 'due_date', label: t.date_label || 'Due Date' },
        { id: 'worker_name', label: t.assigned_to || 'Worker Name' },
        { id: 'manager_name', label: 'Manager Name' }, 
        { id: 'location_name', label: t.location || 'Location' },
        { id: 'asset_code', label: 'Asset Code' },
        { id: 'asset_name', label: 'Asset Name' },
        { id: 'category_name', label: 'Category' },
        { id: 'completion_note', label: 'Completion Note' },
        { id: 'images', label: 'Images (URLs)' }
    ];

    const [availableFields, setAvailableFields] = useState(allFields);
    const [selectedFields, setSelectedFields] = useState([]);
    const [filterWorker, setFilterWorker] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState(''); 
    const [isExporting, setIsExporting] = useState(false);
    const [isUpdateMode, setIsUpdateMode] = useState(false);
    const [exportFormat, setExportFormat] = useState('XLSX'); 

    // --- IMPORT STATE ---
    const [importFile, setImportFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [mappedTasks, setMappedTasks] = useState([]); 
    const [fileName, setFileName] = useState("");
    const [validationStatus, setValidationStatus] = useState("idle"); 
    const [errorList, setErrorList] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false); 

    useEffect(() => {
        const fetchAllData = async () => {
            const headers = { 'Authorization': `Bearer ${token}` };
            try {
                const [uRes, lRes, cRes, aRes] = await Promise.all([
                    fetch('https://maintenance-app-h84v.onrender.com/users', { headers }),
                    fetch('https://maintenance-app-h84v.onrender.com/locations', { headers }),
                    fetch('https://maintenance-app-h84v.onrender.com/categories', { headers }),
                    fetch('https://maintenance-app-h84v.onrender.com/assets', { headers })
                ]);
                
                if (uRes.ok) {
                    const data = await uRes.json();
                    setUsers(data);
                    if (user.role === 'EMPLOYEE') setFilterWorker(user.id);
                }
                if (lRes.ok) setLocations(await lRes.json());
                if (cRes.ok) setCategories(await cRes.json());
                if (aRes.ok) setAssets(await aRes.json());
            } catch (err) { console.error("Error fetching data:", err); }
        };
        fetchAllData();
    }, [token, user]);

    const getRelevantUsers = () => {
        if (!users.length) return [];
        if (user.role === 'BIG_BOSS') return users;
        if (user.role === 'MANAGER') return users.filter(u => u.id === user.id || u.parent_manager_id === user.id);
        return users.filter(u => u.id === user.id);
    };

    const relevantUsers = getRelevantUsers();

    // --- IMPORT LOGIC ---
    const handleDownloadTemplate = () => {
        const templateData = [{
            "שם העובד": user.full_name || "ישראל ישראלי", 
            "מנהל ישיר": "שם המנהל",
            "שם המשימה": "בדיקת מערכות",
            "מיקום": "לובי",  
            "תדירות": "שבועי", 
            "תאריך או ימים": "1, 3, 5", 
            "דחיפות": "רגילה", 
            "קטגוריה": "", 
            "נכס": "", 
            "הערות": ""
        }];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "תבנית העלאה");
        XLSX.writeFile(workbook, "Import_Template.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file); setFileName(file.name); setValidationStatus("idle"); setErrorList([]); setPreviewData([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }); 
            if (data.length > 0) setPreviewData(data);
        };
        reader.readAsBinaryString(file);
    };

    const validateAndMapData = () => {
        const errors = [];
        const validMappedTasks = [];
        const requiredCols = ['שם העובד', 'מנהל ישיר', 'שם המשימה', 'מיקום', 'תדירות', 'תאריך או ימים'];

        if (previewData.length === 0) return { errors: ["הקובץ ריק."], mapped: [] };

        const fileCols = Object.keys(previewData[0]);
        const missing = requiredCols.filter(col => !fileCols.includes(col));
        if (missing.length > 0) return { errors: [`שגיאה קריטית: חסרות עמודות חובה (${missing.join(', ')})`], mapped: [] };

        previewData.forEach((row, index) => {
            const rowNum = index + 2;
            const empName = String(row['שם העובד'] || '').trim();
            const mgrName = String(row['מנהל ישיר'] || '').trim();
            const taskName = String(row['שם המשימה'] || '').trim();
            const locName = String(row['מיקום'] || '').trim();
            const freq = String(row['תדירות'] || '').trim();
            const datesValue = String(row['תאריך או ימים'] || '').trim();
            
            if (!empName || !mgrName || !taskName || !locName || !freq || !datesValue) {
                errors.push(`שורה ${rowNum}: אחד או יותר משדות החובה ריקים.`);
                return;
            }

            const employee = users.find(u => u.full_name === empName && u.role === 'EMPLOYEE');
            const manager = users.find(u => u.full_name === mgrName && ['MANAGER', 'BIG_BOSS'].includes(u.role));

            if (!employee) errors.push(`שורה ${rowNum}: העובד "${empName}" לא קיים במערכת.`);
            if (!manager) errors.push(`שורה ${rowNum}: המנהל "${mgrName}" לא קיים.`);
            if (employee && manager && employee.parent_manager_id !== manager.id && manager.role !== 'BIG_BOSS') {
                errors.push(`שורה ${rowNum}: העובד "${empName}" אינו מוגדר תחת המנהל "${mgrName}".`);
            }

            const location = locations.find(l => l.name === locName);
            if (!location) errors.push(`שורה ${rowNum}: המיקום "${locName}" לא מוגדר במערכת.`);

            let recurringType = 'once';
            let parsedDays = [];
            let recurringDate = null;
            let finalDate = new Date();

            if (freq === 'חד פעמי' || freq === 'שנתי') {
                recurringType = freq === 'חד פעמי' ? 'once' : 'yearly';
                const parsed = Date.parse(datesValue);
                if (isNaN(parsed)) errors.push(`שורה ${rowNum}: תאריך לא חוקי. יש לכתוב בפורמט YYYY-MM-DD.`);
                else finalDate = new Date(parsed);
            } 
            else if (freq === 'שבועי') {
                recurringType = 'weekly';
                const days = datesValue.split(',').map(d => parseInt(d.trim()));
                const invalidDays = days.filter(d => isNaN(d) || d < 1 || d > 7);
                if (invalidDays.length > 0) errors.push(`שורה ${rowNum}: בתדירות שבועית מותר להזין רק ספרות 1 עד 7. שגיאות: ${invalidDays.join(', ')}`);
                parsedDays = days.map(d => d === 1 ? 0 : d === 2 ? 1 : d === 3 ? 2 : d === 4 ? 3 : d === 5 ? 4 : d === 6 ? 5 : 6);
            } 
            else if (freq === 'חודשי') {
                recurringType = 'monthly';
                const day = parseInt(datesValue);
                if (isNaN(day) || day < 1 || day > 31) errors.push(`שורה ${rowNum}: בתדירות חודשית יש להזין יום בין 1 ל-31.`);
                recurringDate = day;
            } else {
                errors.push(`שורה ${rowNum}: תדירות "${freq}" אינה חוקית.`);
            }

            let catId = null, assetId = null;
            const catName = String(row['קטגוריה'] || '').trim();
            const assetName = String(row['נכס'] || '').trim();

            if (catName) {
                const cat = categories.find(c => c.name === catName);
                if (cat) catId = cat.id; else errors.push(`שורה ${rowNum}: קטגוריה "${catName}" לא קיימת.`);
            }
            if (assetName && catId) {
                const as = assets.find(a => a.name === assetName && a.category_id === catId);
                if (as) assetId = as.id; else errors.push(`שורה ${rowNum}: הנכס "${assetName}" לא נמצא תחת קטגוריה זו.`);
            }

            if (errors.length === 0) {
                validMappedTasks.push({
                    title: taskName,
                    urgency: (row['דחיפות'] || '').trim() === 'גבוהה' ? 'High' : 'Normal',
                    description: (row['הערות'] || '').trim(),
                    location_id: location?.id,
                    worker_id: employee?.id,
                    asset_id: assetId,
                    is_recurring: recurringType !== 'once',
                    recurring_type: recurringType !== 'once' ? recurringType : null,
                    due_date: finalDate.toISOString(),
                    selected_days: parsedDays,
                    recurring_date: recurringDate
                });
            }
        });

        return { errors, mapped: validMappedTasks };
    };

    const processFile = async (isDryRun) => {
        setIsProcessing(true);
        setValidationStatus("idle");
        setErrorList([]);

        const { errors, mapped } = validateAndMapData();

        if (errors.length > 0) {
            setValidationStatus("error");
            setErrorList(errors);
            setIsProcessing(false);
            return;
        }

        if (isDryRun) {
            setValidationStatus("valid");
            setMappedTasks(mapped);
            setIsProcessing(false);
            return;
        }

        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks/bulk-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ tasks: mappedTasks })
            });

            const result = await res.json();
            if (res.ok) {
                alert(t.alert_created || "יבוא המשימות הושלם בהצלחה!");
                onRefresh();
                onClose();
            } else {
                setValidationStatus("error");
                setErrorList([result.error || "שגיאת שרת בהעלאה"]);
            }
        } catch (err) {
            setValidationStatus("error");
            setErrorList(["שגיאת תקשורת מול השרת"]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteAll = async () => {
        if(!window.confirm("⚠️ Delete ALL tasks?")) return;
        try {
            await fetch('https://maintenance-app-h84v.onrender.com/tasks/delete-all', {
                method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
            });
            alert("Deleted."); onRefresh(); onClose();
        } catch(e) { alert("Error."); }
    };

    // --- EXPORT LOGIC ---
    const moveToSelected = (field) => { setSelectedFields([...selectedFields, field]); setAvailableFields(availableFields.filter(f => f.id !== field.id)); };
    const moveToAvailable = (field) => { if (isUpdateMode && field.id === 'id') return; setAvailableFields([...availableFields, field]); setSelectedFields(selectedFields.filter(f => f.id !== field.id)); };
    const handleUpdateModeChange = (e) => { const checked = e.target.checked; setIsUpdateMode(checked); if (checked) { const idField = availableFields.find(f => f.id === 'id'); if (idField) moveToSelected(idField); } };
    const filteredAvailableFields = availableFields.filter(f => f.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleExport = async () => {
        if (selectedFields.length === 0) return alert("Please select fields to export");
        setIsExporting(true);
        try {
            const params = new URLSearchParams();
            if (user.role === 'EMPLOYEE') params.append('worker_id', user.id);
            else if (filterWorker) params.append('worker_id', filterWorker);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (filterStatus) params.append('status', filterStatus);

            const res = await fetch(`https://maintenance-app-h84v.onrender.com/tasks/export/advanced?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (!res.ok) throw new Error("Export failed");
            const rawData = await res.json();
            if (rawData.length === 0) { alert("No tasks found matching filters."); setIsExporting(false); return; }

            const excelData = rawData.map(task => {
                const row = {};
                selectedFields.forEach(field => {
                    let value = task[field.id];
                    if (field.id === 'due_date' && value) value = new Date(value).toISOString().split('T')[0];
                    if (field.id === 'images' && Array.isArray(value)) value = value.join(', ');
                    row[field.label] = value || "";
                });
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
            XLSX.writeFile(workbook, `Tasks_Export.${exportFormat === 'CSV' ? 'csv' : 'xlsx'}`);
        } catch (e) { alert("Error exporting: " + e.message); } 
        finally { setIsExporting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm font-sans">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[600px] max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="bg-white border-b px-6 py-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#714B67] p-2 rounded text-white">
                            <FileSpreadsheet size={20}/>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{activeTab === 'export' ? t.export_data || "Export Data" : t.import_data || "Import Data"}</h2>
                    </div>
                    
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('import')} className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'import' ? 'bg-white shadow text-[#714B67]' : 'text-gray-500 hover:text-gray-700'}`}>Import / ייבוא חכם</button>
                        <button onClick={() => setActiveTab('export')} className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'export' ? 'bg-white shadow text-[#714B67]' : 'text-gray-500 hover:text-gray-700'}`}>Export / ייצוא</button>
                    </div>

                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20}/></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-gray-50 p-5">
                    
                    {/* --- EXPORT VIEW (המקורי שלך, בשלמותו) --- */}
                    {activeTab === 'export' && (
                        <div className="flex flex-col h-full gap-4">
                            <div className="flex flex-wrap gap-4 items-center text-sm p-3 bg-white rounded-lg border shadow-sm">
                                <div className="flex items-center gap-4 border-r pr-4">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="update_data" checked={isUpdateMode} onChange={handleUpdateModeChange} className="w-4 h-4 text-[#714B67] focus:ring-[#714B67] border-gray-300 rounded cursor-pointer"/>
                                        <label htmlFor="update_data" className="text-gray-700 font-medium cursor-pointer">{t.export_for_update || "Update Mode"}</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" name="format" checked={exportFormat === 'XLSX'} onChange={() => setExportFormat('XLSX')} className="text-[#714B67] focus:ring-[#714B67]"/>
                                            <span className="text-gray-600">XLSX</span>
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input type="radio" name="format" checked={exportFormat === 'CSV'} onChange={() => setExportFormat('CSV')} className="text-[#714B67] focus:ring-[#714B67]"/>
                                            <span className="text-gray-600">CSV</span>
                                        </label>
                                    </div>
                                </div>

                                {user.role !== 'EMPLOYEE' && (
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} className="text-gray-500"/>
                                        <select className="border border-gray-200 rounded p-1 text-gray-700 text-xs focus:ring-[#714B67] focus:border-[#714B67]" value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
                                            <option value="">{user.role === 'BIG_BOSS' ? "All Employees" : "My Team"}</option>
                                            {relevantUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 border-l pl-4">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={14} className="text-gray-500"/>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-200 rounded p-1 text-xs text-gray-700 outline-none focus:border-[#714B67] w-28" title="Start Date"/>
                                        <span className="text-gray-400">-</span>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-200 rounded p-1 text-xs text-gray-700 outline-none focus:border-[#714B67] w-28" title="End Date"/>
                                    </div>

                                    <div className="flex items-center gap-1 ml-2">
                                        <ListFilter size={14} className="text-gray-500"/>
                                        <select className="border border-gray-200 rounded p-1 text-gray-700 text-xs focus:ring-[#714B67] focus:border-[#714B67]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                            <option value="">All Statuses</option>
                                            <option value="PENDING">Pending (Not Performed)</option>
                                            <option value="WAITING_APPROVAL">Waiting Approval</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="mb-2">
                                        <h4 className="text-xs font-bold text-gray-800 mb-1 uppercase">Available fields</h4>
                                        <div className="relative">
                                            <Search size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                                            <input type="text" placeholder="Search..." className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#714B67]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded bg-white shadow-sm">
                                        {filteredAvailableFields.map(field => (
                                            <div key={field.id} onClick={() => moveToSelected(field)} className="flex justify-between items-center px-3 py-2 border-b border-gray-50 hover:bg-purple-50 cursor-pointer group transition-colors text-sm text-gray-600">
                                                <span>{field.label}</span>
                                                <Plus size={14} className="text-gray-300 group-hover:text-[#714B67]"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="mb-2 h-[58px] flex items-end"> 
                                        <h4 className="text-xs font-bold text-gray-800 mb-1 uppercase">Fields to export</h4>
                                    </div>
                                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded bg-white shadow-sm">
                                        {selectedFields.map((field) => (
                                            <div key={field.id} className={`flex justify-between items-center px-3 py-2 border-b border-gray-50 group text-sm ${field.id === 'id' && isUpdateMode ? 'bg-gray-100 text-gray-400' : 'hover:bg-red-50 text-gray-800 cursor-pointer'}`}>
                                                <span className="font-medium">{field.label}</span>
                                                {!(field.id === 'id' && isUpdateMode) ? (
                                                    <Trash2 size={14} onClick={() => moveToAvailable(field)} className="text-gray-300 group-hover:text-red-500"/>
                                                ) : <span className="text-[10px] italic">Req</span>}
                                            </div>
                                        ))}
                                        {selectedFields.length === 0 && <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">No fields selected</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- IMPORT VIEW (התצוגה החכמה החדשה) --- */}
                    {activeTab === 'import' && (
                        <div className="h-full flex flex-col gap-4">
                            <div className="bg-white p-6 rounded border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition cursor-pointer relative flex-1">
                                <Upload size={32} className="text-gray-400"/>
                                <p className="text-gray-600 font-medium text-sm">{fileName || "Drag & Drop Excel File / גרור לפה קובץ אקסל"}</p>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                            </div>

                            <div className="flex justify-between items-center">
                                <button onClick={handleDownloadTemplate} className="text-[#714B67] text-xs font-bold hover:underline flex items-center gap-1">
                                    <Download size={12}/> הורד תבנית לאקסל
                                </button>
                                {user.role === 'BIG_BOSS' && <button onClick={handleDeleteAll} className="text-red-500 text-xs hover:underline">Delete All Tasks</button>}
                            </div>

                            {validationStatus === 'valid' && (
                                <div className="bg-green-50 border border-green-200 p-3 rounded flex gap-2 text-green-800 items-start animate-fade-in">
                                    <CheckCircle size={18} className="mt-0.5"/>
                                    <div>
                                        <p className="font-bold text-sm">הקובץ נבדק ותקין לחלוטין!</p>
                                        <p className="text-xs">{mappedTasks.length} משימות מוכנות להעלאה למערכת.</p>
                                    </div>
                                </div>
                            )}

                            {validationStatus === 'error' && (
                                <div className="bg-red-50 border border-red-200 p-3 rounded flex gap-2 text-red-800 items-start animate-fade-in overflow-y-auto max-h-40">
                                    <AlertTriangle size={18} className="mt-0.5 shrink-0"/>
                                    <div>
                                        <p className="font-bold text-sm text-red-700 mb-1">נמצאו שגיאות בקובץ! (לא ניתן להעלות)</p>
                                        <ul className="list-disc list-inside text-xs mt-1 text-red-600 space-y-1">
                                            {errorList.map((e, i) => <li key={i}>{e}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white border-t p-4 flex justify-start gap-3 shrink-0">
                    {activeTab === 'export' ? (
                        <>
                            <button onClick={handleExport} disabled={isExporting} className="bg-[#714B67] text-white px-5 py-2 rounded font-bold hover:bg-[#5a3b52] transition shadow-sm disabled:opacity-50 text-sm">
                                {isExporting ? "Exporting..." : "Export"}
                            </button>
                            <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded font-medium hover:bg-gray-50 transition text-sm">Close</button>
                        </>
                    ) : (
                        <>
                            {previewData.length > 0 && validationStatus !== 'valid' && (
                                <button onClick={() => processFile(true)} disabled={isProcessing} className="bg-blue-600 text-white px-5 py-2 rounded font-bold hover:bg-blue-700 transition text-sm">
                                    {isProcessing ? "בודק..." : "1. בצע בדיקת תקינות"}
                                </button>
                            )}
                            <button onClick={() => processFile(false)} disabled={validationStatus !== 'valid' || isProcessing} className="bg-green-600 text-white px-5 py-2 rounded font-bold hover:bg-green-700 transition shadow-sm disabled:opacity-50 disabled:bg-gray-300 text-sm">
                                {isProcessing ? "מעלה..." : "2. העלה נתונים מאושרים"}
                            </button>
                            <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded hover:bg-gray-50 transition text-sm">Close</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedExcel;