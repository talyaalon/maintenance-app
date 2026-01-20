import React, { useState } from 'react';
import { Download, Upload, Plus, Trash2, FileSpreadsheet, CheckCircle, AlertTriangle, X, ArrowRight } from 'lucide-react';

const AdvancedExcel = ({ token, t, onClose, onRefresh }) => {
    const [mode, setMode] = useState('export'); // 'export' or 'import'
    
    // --- Export State ---
    const allFields = [
        { id: 'id', label: 'ID (For Update)' },
        { id: 'title', label: t.task_title_label || 'Title' },
        { id: 'description', label: t.description_label || 'Description' },
        { id: 'urgency', label: t.urgency_label || 'Urgency' },
        { id: 'status', label: t.status_label || 'Status' },
        { id: 'due_date', label: t.date_label || 'Due Date' },
        { id: 'worker_name', label: t.assigned_to || 'Worker Name' },
        { id: 'manager_name', label: t.manager_label || 'Worker Manager' }, // חדש
        { id: 'location_name', label: t.location || 'Location' },
        { id: 'asset_name', label: t.asset_name || 'Asset Name' }, // חדש
        { id: 'category_name', label: t.category_label || 'Category' }, // חדש
        { id: 'creation_image_url', label: t.image_url_label || 'Image URL' } // חדש
    ];
    
    const [availableFields, setAvailableFields] = useState(allFields);
    const [selectedFields, setSelectedFields] = useState([]);
    const [isUpdateMode, setIsUpdateMode] = useState(false); // הסטייט החדש לתיבת הסימון

    // --- Import State ---
    const [importFile, setImportFile] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [isTesting, setIsTesting] = useState(false);

    // --- לוגיקה לייצוא ---
    const moveToSelected = (field) => {
        setSelectedFields([...selectedFields, field]);
        setAvailableFields(availableFields.filter(f => f.id !== field.id));
    };

    const moveToAvailable = (field) => {
        setAvailableFields([...availableFields, field]);
        setSelectedFields(selectedFields.filter(f => f.id !== field.id));
    };

    // הלוגיקה החדשה של ה-Checkbox
    const handleUpdateModeChange = (e) => {
        const checked = e.target.checked;
        setIsUpdateMode(checked);
        
        if (checked) {
            // אם סימנו V, אנחנו מחפשים את שדה ה-ID ברשימה השמאלית ומעבירים לימנית
            const idField = availableFields.find(f => f.id === 'id');
            if (idField) {
                moveToSelected(idField);
            }
        }
    };

    const handleExport = async () => {
        if (selectedFields.length === 0) return alert(t.select_fields_error || "Select at least one field");
        
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks/export-advanced', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ selectedFields: selectedFields.map(f => f.id) })
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Advanced_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
            a.click();
        } catch (e) { alert("Export Error"); }
    };

    // --- לוגיקה לייבוא (ללא שינוי) ---
    const handleTest = async () => {
        if (!importFile) return;
        setIsTesting(true);
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks/import/test', {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            const data = await res.json();
            setTestResult(data);
        } catch (e) { alert("Test Failed"); }
        finally { setIsTesting(false); }
    };

    const handleExecuteImport = async () => {
        if (!window.confirm(t.confirm_import || "Are you sure?")) return;
        const formData = new FormData();
        formData.append('file', importFile);
        
        try {
            const res = await fetch('https://maintenance-app-h84v.onrender.com/tasks/import/execute', {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            if (res.ok) {
                alert(t.import_success || "Import Successful!");
                onRefresh();
                onClose();
            }
        } catch (e) { alert("Import Failed"); }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div className="flex gap-4">
                        <button onClick={() => setMode('export')} className={`pb-2 font-bold transition-all ${mode === 'export' ? 'text-[#6A0DAD] border-b-2 border-[#6A0DAD]' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t.export_data || "Export Data"}
                        </button>
                        <button onClick={() => setMode('import')} className={`pb-2 font-bold transition-all ${mode === 'import' ? 'text-[#6A0DAD] border-b-2 border-[#6A0DAD]' : 'text-gray-500 hover:text-gray-700'}`}>
                            {t.import_data || "Import Data"}
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    
                    {/* --- EXPORT UI --- */}
                    {mode === 'export' && (
                        <div className="flex flex-col h-full">
                            
                            {/* --- התיקון: שורת ה-Checkbox החדשה --- */}
                            <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="updateMode" 
                                    checked={isUpdateMode} 
                                    onChange={handleUpdateModeChange}
                                    className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                                />
                                <label htmlFor="updateMode" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                    {t.export_update_mode || "I want to update data (import-compatible export)"}
                                </label>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
                                {/* Left: Available */}
                                <div className="flex-1 border rounded-lg p-3 bg-white flex flex-col shadow-sm h-full max-h-[55vh]">
                                    <h4 className="font-bold text-gray-700 mb-2 border-b pb-2 text-sm">{t.available_fields || "Available Fields"}</h4>
                                    <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                                        {availableFields.map(f => (
                                            <div key={f.id} onClick={() => moveToSelected(f)} className="p-2 bg-gray-50 border border-gray-100 rounded cursor-pointer hover:bg-purple-50 hover:border-purple-200 flex justify-between items-center group transition-all">
                                                <span className="text-sm">{f.label}</span>
                                                <Plus size={16} className="text-gray-400 group-hover:text-purple-600"/>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex items-center justify-center text-gray-300 md:rotate-0 rotate-90">
                                    <ArrowRight size={30} />
                                </div>

                                {/* Right: Selected */}
                                <div className="flex-1 border rounded-lg p-3 bg-white border-purple-200 flex flex-col shadow-md h-full max-h-[55vh]">
                                    <h4 className="font-bold text-purple-700 mb-2 border-b pb-2 text-sm">{t.fields_to_export || "Fields to Export"}</h4>
                                    <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                                        {selectedFields.map(f => (
                                            <div key={f.id} onClick={() => moveToAvailable(f)} className="p-2 bg-purple-50 border border-purple-100 rounded cursor-pointer hover:bg-red-50 hover:border-red-200 flex justify-between items-center group transition-all">
                                                <span className="text-sm font-medium">{f.label}</span>
                                                <Trash2 size={16} className="text-purple-400 group-hover:text-red-500"/>
                                            </div>
                                        ))}
                                        {selectedFields.length === 0 && <p className="text-gray-400 text-xs italic text-center mt-10">Select fields from the left list...</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- IMPORT UI (נשאר אותו דבר) --- */}
                    {mode === 'import' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-white hover:bg-gray-50 transition-colors">
                                <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-3"/>
                                <p className="text-sm text-gray-500 mb-4">{t.upload_instruction || "Upload Excel file (.xlsx) to update or create tasks."}</p>
                                <input type="file" accept=".xlsx" onChange={e => { setImportFile(e.target.files[0]); setTestResult(null); }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"/>
                            </div>

                            {importFile && !testResult && (
                                <button onClick={handleTest} disabled={isTesting} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition flex justify-center items-center gap-2">
                                    {isTesting ? "Testing..." : t.test_import || "Test Import"}
                                </button>
                            )}

                            {testResult && (
                                <div className="animate-slide-up">
                                    <div className={`p-4 rounded-lg border mb-4 flex items-center gap-3 ${testResult.isValid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                        {testResult.isValid ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
                                        <div>
                                            <h4 className="font-bold">{testResult.isValid ? (t.test_passed || "Everything looks good!") : (t.test_failed || "Issues Found")}</h4>
                                            <p className="text-xs mt-1">{testResult.isValid ? (t.ready_to_import || "Ready to import.") : (t.fix_errors || "Please fix the errors below.")}</p>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg border overflow-hidden mb-4 shadow-sm">
                                        <div className="bg-gray-100 px-4 py-2 border-b font-bold text-xs text-gray-600 uppercase">Preview (First 5 Rows)</div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                                    <tr>
                                                        <th className="p-3">Action</th>
                                                        <th className="p-3">ID</th>
                                                        <th className="p-3">Title</th>
                                                        <th className="p-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {testResult.preview.map((row, i) => (
                                                        <tr key={i} className="hover:bg-gray-50">
                                                            <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${row._action === 'Update' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{row._action}</span></td>
                                                            <td className="p-3 text-gray-500">{row.id || '-'}</td>
                                                            <td className="p-3 font-medium">{row.title}</td>
                                                            <td className="p-3">{row.status}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {testResult.errors.length > 0 && (
                                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-red-700 max-h-40 overflow-y-auto shadow-inner">
                                            <strong className="block mb-2">Errors:</strong>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {testResult.errors.map((e, i) => <li key={i}>Row {e.row}: {e.error}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white flex justify-end gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                    <button onClick={onClose} className="px-6 py-2 border rounded-lg hover:bg-gray-50 font-medium text-gray-600">{t.cancel}</button>
                    
                    {mode === 'export' && (
                        <button onClick={handleExport} className="px-6 py-2 bg-[#6A0DAD] text-white rounded-lg font-bold shadow hover:bg-purple-800 flex items-center gap-2">
                            <Download size={18}/> {t.download_excel || "Download Excel"}
                        </button>
                    )}

                    {mode === 'import' && testResult && testResult.isValid && (
                        <button onClick={handleExecuteImport} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow hover:bg-green-700 flex items-center gap-2">
                            <Upload size={18}/> {t.execute_import || "Import Data"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedExcel;