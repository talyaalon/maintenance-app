import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; 
import { Download, Upload, FileSpreadsheet, Filter, Trash2, AlertTriangle, X, CheckCircle, Search, Plus, Calendar, ListFilter } from 'lucide-react';

const AdvancedExcel = ({ token, t, onRefresh, onClose, user }) => {
    const [activeTab, setActiveTab] = useState('export'); 
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); 

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
        // 👇 שדה חדש לתמונות
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
        .then(data => {
            setUsers(data);
            if (user.role === 'EMPLOYEE') {
                setFilterWorker(user.id);
            }
        })
        .catch(console.error);
    }, [token, user]);

    const getRelevantUsers = () => {
        if (!users.length) return [];
        if (user.role === 'BIG_BOSS') return users;
        if (user.role === 'MANAGER') {
            return users.filter(u => u.id === user.id || u.parent_manager_id === user.id);
        }
        return users.filter(u => u.id === user.id);
    };

    const relevantUsers = getRelevantUsers();

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Task Title": "Clean Air Filters", 
                "Description": "Check filters in lobby",
                "Urgency": "Normal",
                "Due Date": "2024-12-31",
                "Worker Name": user.full_name, 
                "Location Name": "Lobby",  
                "Asset Code": "AC-001",
                "Images": "https://example.com/img1.jpg, https://example.com/img2.jpg" // 👇 דוגמה
            }
        ];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, "Import_Template.xlsx");
    };

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

    const filteredAvailableFields = availableFields.filter(f => 
        f.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = async () => {
        if (selectedFields.length === 0) return alert("Please select fields to export");
        setIsExporting(true);
        try {
            const params = new URLSearchParams();
            if (user.role === 'EMPLOYEE') {
                params.append('worker_id', user.id);
            } else if (filterWorker) {
                params.append('worker_id', filterWorker);
            }
            
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (filterStatus) params.append('status', filterStatus);

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
                    // 👇 טיפול מיוחד במערך תמונות (הפיכה למחרוזת)
                    if (field.id === 'images' && Array.isArray(value)) {
                        value = value.join(', ');
                    }
                    row[field.label] = value || "";
                });
                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
            
            const fileExtension = exportFormat === 'CSV' ? 'csv' : 'xlsx';
            XLSX.writeFile(workbook, `Tasks_Export.${fileExtension}`);

        } catch (e) {
            alert("Error exporting: " + e.message);
        } finally {
            setIsExporting(false);
        }
    };

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

    const validatePermissions = (tasksData) => {
        const errors = [];
        
        const allowedNames = new Set(
            relevantUsers
                .map(u => (u.full_name ? String(u.full_name).trim().toLowerCase() : ""))
                .filter(Boolean)
        );
        
        if (user.full_name) {
            allowedNames.add(String(user.full_name).trim().toLowerCase());
        }

        tasksData.forEach((row, index) => {
            const workerNameKey = Object.keys(row).find(k => 
                ['Worker Name', 'Worker', 'Assigned To', 'עובד', 'שם העובד'].includes(k) || 
                k.toLowerCase().includes('worker')
            );

            if (workerNameKey && row[workerNameKey]) {
                const nameInFile = String(row[workerNameKey] || "").trim().toLowerCase();
                
                if (nameInFile && user.role !== 'BIG_BOSS' && !allowedNames.has(nameInFile)) {
                    errors.push(`Row ${index + 1}: Permission Denied. You cannot import tasks for "${row[workerNameKey]}". This user is not in your team.`);
                }
            }
        });
        return errors;
    };

    const processFile = async (isDryRun) => {
        setIsProcessing(true);
        setValidationStatus("idle");
        setErrorList([]);

        const permissionErrors = validatePermissions(previewData);
        if (permissionErrors.length > 0) {
            setValidationStatus("error");
            setErrorList(permissionErrors);
            setIsProcessing(false);
            return;
        }

        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks/import-process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ tasks: previewData, isDryRun: isDryRun })
            });

            const result = await res.json();

            if (result.success) {
                if (isDryRun) {
                    setValidationStatus("valid"); 
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
            setValidationStatus("error");
            setErrorList(["Server error"]);
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
                        <button onClick={() => setActiveTab('import')} className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'import' ? 'bg-white shadow text-[#714B67]' : 'text-gray-500 hover:text-gray-700'}`}>Import</button>
                        <button onClick={() => setActiveTab('export')} className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'export' ? 'bg-white shadow text-[#714B67]' : 'text-gray-500 hover:text-gray-700'}`}>Export</button>
                    </div>

                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20}/></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-gray-50 p-5">
                    
                    {/* --- EXPORT VIEW --- */}
                    {activeTab === 'export' && (
                        <div className="flex flex-col h-full gap-4">
                            
                            {/* Top Controls Bar */}
                            <div className="flex flex-wrap gap-4 items-center text-sm p-3 bg-white rounded-lg border shadow-sm">
                                
                                {/* 1. Checkbox & Format */}
                                <div className="flex items-center gap-4 border-r pr-4">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="update_data" checked={isUpdateMode} onChange={handleUpdateModeChange} className="w-4 h-4 text-[#714B67] focus:ring-[#714B67] border-gray-300 rounded cursor-pointer"/>
                                        <label htmlFor="update_data" className="text-gray-700 font-medium cursor-pointer">
                                            {t.export_for_update || "Update Mode"}
                                        </label>
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

                                {/* 2. Employee Selection */}
                                {user.role !== 'EMPLOYEE' && (
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} className="text-gray-500"/>
                                        <select className="border border-gray-200 rounded p-1 text-gray-700 text-xs focus:ring-[#714B67] focus:border-[#714B67]" 
                                            value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
                                            <option value="">{user.role === 'BIG_BOSS' ? "All Employees" : "My Team"}</option>
                                            {relevantUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* 3. פילטרים חדשים: תאריכים וסטטוס */}
                                <div className="flex items-center gap-2 border-l pl-4">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={14} className="text-gray-500"/>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
                                            className="border border-gray-200 rounded p-1 text-xs text-gray-700 outline-none focus:border-[#714B67] w-28" 
                                            title="Start Date"
                                        />
                                        <span className="text-gray-400">-</span>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
                                            className="border border-gray-200 rounded p-1 text-xs text-gray-700 outline-none focus:border-[#714B67] w-28" 
                                            title="End Date"
                                        />
                                    </div>

                                    <div className="flex items-center gap-1 ml-2">
                                        <ListFilter size={14} className="text-gray-500"/>
                                        <select className="border border-gray-200 rounded p-1 text-gray-700 text-xs focus:ring-[#714B67] focus:border-[#714B67]" 
                                            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                            <option value="">All Statuses</option>
                                            <option value="PENDING">Pending (Not Performed)</option>
                                            <option value="WAITING_APPROVAL">Waiting Approval</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    </div>
                                </div>

                            </div>

                            {/* Columns Selection Area */}
                            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                                {/* Left Column: Available */}
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="mb-2">
                                        <h4 className="text-xs font-bold text-gray-800 mb-1 uppercase">Available fields</h4>
                                        <div className="relative">
                                            <Search size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                                            <input 
                                                type="text" 
                                                placeholder="Search..." 
                                                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#714B67]"
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded bg-white shadow-sm">
                                        {filteredAvailableFields.map(field => (
                                            <div key={field.id} onClick={() => moveToSelected(field)} 
                                                className="flex justify-between items-center px-3 py-2 border-b border-gray-50 hover:bg-purple-50 cursor-pointer group transition-colors text-sm text-gray-600"
                                            >
                                                <span>{field.label}</span>
                                                <Plus size={14} className="text-gray-300 group-hover:text-[#714B67]"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Column: Selected */}
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="mb-2 h-[58px] flex items-end"> 
                                        <h4 className="text-xs font-bold text-gray-800 mb-1 uppercase">Fields to export</h4>
                                    </div>
                                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded bg-white shadow-sm">
                                        {selectedFields.map((field) => (
                                            <div key={field.id} 
                                                className={`flex justify-between items-center px-3 py-2 border-b border-gray-50 group text-sm ${field.id === 'id' && isUpdateMode ? 'bg-gray-100 text-gray-400' : 'hover:bg-red-50 text-gray-800 cursor-pointer'}`}
                                            >
                                                <span className="font-medium">{field.label}</span>
                                                {!(field.id === 'id' && isUpdateMode) ? (
                                                    <Trash2 size={14} onClick={() => moveToAvailable(field)} className="text-gray-300 group-hover:text-red-500"/>
                                                ) : <span className="text-[10px] italic">Req</span>}
                                            </div>
                                        ))}
                                        {selectedFields.length === 0 && (
                                            <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">No fields selected</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- IMPORT VIEW --- */}
                    {activeTab === 'import' && (
                        <div className="h-full flex flex-col gap-4">
                            <div className="bg-white p-6 rounded border border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition cursor-pointer relative flex-1">
                                <Upload size={32} className="text-gray-400"/>
                                <p className="text-gray-600 font-medium text-sm">{fileName || "Drag & Drop Excel File"}</p>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                            </div>

                            <div className="flex justify-between items-center">
                                <button onClick={handleDownloadTemplate} className="text-[#714B67] text-xs font-bold hover:underline flex items-center gap-1">
                                    <Download size={12}/> Download Template
                                </button>
                                {user.role === 'BIG_BOSS' && <button onClick={handleDeleteAll} className="text-red-500 text-xs hover:underline">Delete All</button>}
                            </div>

                            {validationStatus === 'valid' && (
                                <div className="bg-green-50 border border-green-200 p-3 rounded flex gap-2 text-green-800 items-start animate-fade-in">
                                    <CheckCircle size={18} className="mt-0.5"/>
                                    <div>
                                        <p className="font-bold text-sm">Valid File</p>
                                        <p className="text-xs">{previewData.length} records ready.</p>
                                    </div>
                                </div>
                            )}

                            {validationStatus === 'error' && (
                                <div className="bg-red-50 border border-red-200 p-3 rounded flex gap-2 text-red-800 items-start animate-fade-in overflow-y-auto max-h-32">
                                    <AlertTriangle size={18} className="mt-0.5 shrink-0"/>
                                    <div>
                                        <p className="font-bold text-sm">Errors Found</p>
                                        <ul className="list-disc list-inside text-xs mt-1">
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
                            <button onClick={handleExport} disabled={isExporting} className="bg-[#714B67] text-white px-5 py-2 rounded font-bold hover:bg-[#5a3b52] transition shadow-sm disabled:opacity-50 flex items-center gap-2 text-sm">
                                {isExporting ? "Exporting..." : "Export"}
                            </button>
                            <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded font-medium hover:bg-gray-50 transition text-sm">
                                Close
                            </button>
                        </>
                    ) : (
                        <>
                            {previewData.length > 0 && (
                                <button onClick={() => processFile(true)} className="bg-white border border-[#714B67] text-[#714B67] px-5 py-2 rounded font-bold hover:bg-purple-50 transition text-sm">
                                    Test
                                </button>
                            )}
                            <button 
                                onClick={() => processFile(false)} 
                                disabled={validationStatus !== 'valid'}
                                className="bg-[#714B67] text-white px-5 py-2 rounded font-bold hover:bg-[#5a3b52] transition shadow-sm disabled:opacity-50 disabled:bg-gray-300 text-sm"
                            >
                                Import
                            </button>
                            <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded font-medium hover:bg-gray-50 transition text-sm">
                                Close
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedExcel;