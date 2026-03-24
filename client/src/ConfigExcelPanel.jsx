import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, Plus, Trash2, Search, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const BASE = 'https://maintenance-app-staging.onrender.com';

const SECTION_FIELDS = {
    categories: [
        { id: 'id',      label: 'ID' },
        { id: 'name_he', label: 'שם בעברית' },
        { id: 'name_en', label: 'Name (EN)' },
        { id: 'name_th', label: 'ชื่อ (TH)' },
        { id: 'code',    label: 'Code' },
    ],
    assets: [
        { id: 'id',          label: 'ID' },
        { id: 'name_he',     label: 'שם בעברית' },
        { id: 'name_en',     label: 'Name (EN)' },
        { id: 'name_th',     label: 'ชื่อ (TH)' },
        { id: 'code',        label: 'Code' },
        { id: 'category_id', label: 'Category' },
        { id: 'location_id', label: 'Location' },
    ],
    locations: [
        { id: 'id',      label: 'ID' },
        { id: 'name_he', label: 'שם בעברית' },
        { id: 'name_en', label: 'Name (EN)' },
        { id: 'name_th', label: 'ชื่อ (TH)' },
        { id: 'code',    label: 'Code' },
        { id: 'address', label: 'Address' },
    ],
    managers: [
        { id: 'id',        label: 'ID' },
        { id: 'full_name', label: 'Full Name' },
        { id: 'email',     label: 'Email' },
        { id: 'phone',     label: 'Phone' },
    ],
    employees: [
        { id: 'id',        label: 'ID' },
        { id: 'full_name', label: 'Full Name' },
        { id: 'email',     label: 'Email' },
        { id: 'phone',     label: 'Phone' },
    ],
};

const SECTION_LABELS = {
    categories: { he: 'קטגוריות', en: 'Categories' },
    assets:     { he: 'נכסים',    en: 'Assets' },
    locations:  { he: 'מיקומים',  en: 'Locations' },
    managers:   { he: 'מנהלים',   en: 'Managers' },
    employees:  { he: 'עובדים',   en: 'Employees' },
};

// Sample rows used to generate the downloadable template per section
const TEMPLATE_SAMPLE = {
    categories: [
        { name_he: 'חשמל',       name_en: 'Electrical', name_th: 'ไฟฟ้า',  code: 'ELEC' },
        { name_he: 'אינסטלציה', name_en: 'Plumbing',   name_th: 'ประปา', code: 'PLMB' },
    ],
    assets: [
        { name_he: 'מזגן ראשי', name_en: 'Main AC',     name_th: 'แอร์หลัก', code: 'ELEC-0001', category_id: 'ELEC',  location_id: 'LOC-0001' },
        { name_he: 'משאבה',     name_en: 'Water Pump',  name_th: 'ปั๊มน้ำ',  code: 'PLMB-0001', category_id: 'PLMB',  location_id: 'LOC-0002' },
    ],
    locations: [
        { name_he: 'קומה 1', name_en: 'Floor 1', name_th: 'ชั้น 1', code: 'LOC-0001', address: '123 Main St' },
        { name_he: 'קומה 2', name_en: 'Floor 2', name_th: 'ชั้น 2', code: 'LOC-0002', address: '123 Main St' },
    ],
    managers: [
        { full_name: 'David Cohen', email: 'david@example.com', phone: '0501234567', password: 'Temp1234!' },
        { full_name: 'Sarah Levi',  email: 'sarah@example.com', phone: '0509876543', password: 'Temp1234!' },
    ],
    employees: [
        { full_name: 'John Smith', email: 'john@example.com', phone: '0501111111', password: 'Temp1234!' },
        { full_name: 'Jane Doe',   email: 'jane@example.com', phone: '0502222222', password: 'Temp1234!' },
    ],
};

const ConfigExcelPanel = ({ section, t, onClose, token }) => {
    const [activeTab, setActiveTab]               = useState('import');
    const [fileName, setFileName]                 = useState('');
    const [parsedRows, setParsedRows]             = useState([]);
    const [validationStatus, setValidationStatus] = useState('idle'); // idle | valid | error
    const [importErrors, setImportErrors]         = useState([]);
    const [importResult, setImportResult]         = useState(null);
    const [isLoading, setIsLoading]               = useState(false);
    const [searchTerm, setSearchTerm]             = useState('');
    const [selectedFields, setSelectedFields]     = useState([]);

    const allFields       = SECTION_FIELDS[section] || [];
    const availableFields = allFields
        .filter(f => !selectedFields.find(s => s.id === f.id))
        .filter(f => f.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const sectionLabel = SECTION_LABELS[section]?.he || section;

    const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // ── Parse an XLSX/CSV file into a JSON row array ──────────────────────────
    const parseFile = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
            } catch { resolve([]); }
        };
        reader.readAsBinaryString(file);
    });

    const resetImportState = () => {
        setValidationStatus('idle');
        setImportErrors([]);
        setImportResult(null);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        resetImportState();
        setParsedRows(await parseFile(file));
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        setFileName(file.name);
        resetImportState();
        setParsedRows(await parseFile(file));
    };

    // ── Step 1: dry-run validation ────────────────────────────────────────────
    const handleValidate = async () => {
        if (!parsedRows.length) return;
        setIsLoading(true);
        try {
            const res  = await fetch(`${BASE}/${section}/bulk-import`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ rows: parsedRows, isDryRun: true }),
            });
            const data = await res.json();
            if (!res.ok) {
                setImportErrors([data.error || 'Validation failed']);
                setValidationStatus('error');
            } else if (data.errors?.length > 0) {
                setImportErrors(data.errors);
                setValidationStatus('error');
            } else {
                setImportErrors([]);
                setValidationStatus('valid');
                setImportResult({ validCount: data.validCount });
            }
        } catch {
            setImportErrors(['Network error — please check your connection']);
            setValidationStatus('error');
        }
        setIsLoading(false);
    };

    // ── Step 2: commit import ─────────────────────────────────────────────────
    const handleImport = async () => {
        if (validationStatus !== 'valid') return;
        setIsLoading(true);
        try {
            const res  = await fetch(`${BASE}/${section}/bulk-import`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ rows: parsedRows, isDryRun: false }),
            });
            const data = await res.json();
            if (!res.ok) {
                setImportErrors([data.error || 'Import failed']);
                setValidationStatus('error');
            } else {
                setImportResult(data);
                setValidationStatus('idle');
                setFileName('');
                setParsedRows([]);
            }
        } catch {
            setImportErrors(['Network error — please check your connection']);
            setValidationStatus('error');
        }
        setIsLoading(false);
    };

    // ── Export: fetch data then generate XLSX client-side ────────────────────
    const handleExport = async () => {
        if (!selectedFields.length) return;
        setIsLoading(true);
        try {
            const fields = selectedFields.map(f => f.id).join(',');
            const res    = await fetch(`${BASE}/${section}/export?fields=${fields}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Export failed');
            const rows = await res.json();
            const ws   = XLSX.utils.json_to_sheet(rows);
            const wb   = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sectionLabel);
            XLSX.writeFile(wb, `${section}_export.xlsx`);
        } catch (err) {
            alert(err.message || 'Export failed');
        }
        setIsLoading(false);
    };

    // ── Template download ─────────────────────────────────────────────────────
    const handleDownloadTemplate = () => {
        const sample = TEMPLATE_SAMPLE[section] || [];
        if (!sample.length) return;
        const ws = XLSX.utils.json_to_sheet(sample);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `${section}_template.xlsx`);
    };

    const moveToSelected  = (field) => setSelectedFields(prev => [...prev, field]);
    const moveToAvailable = (field) => setSelectedFields(prev => prev.filter(f => f.id !== field.id));

    return (
        <div className="border border-[#714B67]/30 rounded-xl bg-white shadow-sm overflow-hidden mb-4 animate-fade-in">

            {/* ── Panel header ── */}
            <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2.5 gap-3">
                <div className="flex items-center gap-2 shrink-0">
                    <FileSpreadsheet size={15} className="text-[#714B67]" />
                    <span className="text-xs font-bold text-[#714B67]">{sectionLabel} — Excel</span>
                </div>

                <div className="flex bg-white border border-[#714B67]/20 p-0.5 rounded-lg">
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'import' ? 'bg-[#714B67] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t?.import_update_tab || 'ייבוא / עדכון'}
                    </button>
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'export' ? 'bg-[#714B67] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t?.export_data_tab || 'ייצוא נתונים'}
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition shrink-0"
                    title={t?.close || 'סגור'}
                >
                    <X size={15} />
                </button>
            </div>

            {/* ── Import Tab ── */}
            {activeTab === 'import' && (
                <div className="p-4 space-y-3">
                    {/* Drop zone */}
                    <div
                        className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-2 bg-gray-50 hover:bg-gray-100 transition cursor-pointer"
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        <Upload size={24} className="text-gray-400" />
                        <p className="text-gray-500 text-sm font-medium text-center">
                            {fileName || (t?.drag_drop_excel || 'Drag & Drop Excel File')}
                        </p>
                        <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                        />
                    </div>

                    {/* Template download */}
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="text-xs text-[#714B67] font-medium">
                            ✨ {t?.template_download_hint || 'הורד תבנית Excel מותאמת אישית'}
                        </span>
                        <button
                            onClick={handleDownloadTemplate}
                            className="bg-[#714B67] text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-[#5a3b52] shadow-sm flex items-center gap-1 transition"
                        >
                            <Download size={12} /> {t?.download_template_btn || 'הורד תבנית'}
                        </button>
                    </div>

                    {/* Validation result — valid */}
                    {validationStatus === 'valid' && importResult && (
                        <div className="bg-green-50 border border-green-200 p-2.5 rounded text-green-700 text-xs font-medium flex items-center gap-1.5">
                            <CheckCircle size={14} />
                            {t?.file_valid_title || 'הקובץ תקין'} — {importResult.validCount} {t?.rows_ready || 'שורות מוכנות'}
                        </div>
                    )}

                    {/* Import success */}
                    {importResult?.inserted !== undefined && (
                        <div className="bg-blue-50 border border-blue-200 p-2.5 rounded text-blue-800 text-xs font-medium flex items-center gap-1.5">
                            <CheckCircle size={14} />
                            {t?.import_success || 'הייבוא הושלם'}: {importResult.inserted} {t?.inserted || 'נוספו'}, {importResult.updated} {t?.updated || 'עודכנו'}
                        </div>
                    )}

                    {/* Errors list */}
                    {importErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 p-2.5 rounded text-red-800 text-xs space-y-0.5 max-h-28 overflow-y-auto">
                            {importErrors.map((e, i) => (
                                <div key={i} className="flex items-start gap-1">
                                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                    <span>{e}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action buttons */}
                    {fileName && (
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleValidate}
                                disabled={isLoading || !parsedRows.length}
                                className="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading && validationStatus === 'idle' ? <Loader2 size={12} className="animate-spin" /> : null}
                                {t?.validate_import || '1. בדוק תקינות'}
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={validationStatus !== 'valid' || isLoading}
                                className="bg-[#714B67] text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-[#5a3b52] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                {isLoading && validationStatus === 'valid' ? <Loader2 size={12} className="animate-spin" /> : null}
                                {t?.upload_approved_btn || '2. העלה נתונים'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Export Tab ── */}
            {activeTab === 'export' && (
                <div className="p-4 space-y-3">
                    <div className="flex gap-3" style={{ height: '200px' }}>
                        {/* Available fields */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <h4 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                {t?.available_fields_label || 'Available Fields'}
                            </h4>
                            <div className="relative mb-1.5">
                                <Search size={12} className="absolute left-2 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t?.search_placeholder || 'Search...'}
                                    className="w-full pl-6 pr-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-[#714B67]"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto border border-gray-200 rounded bg-white">
                                {availableFields.map(field => (
                                    <div
                                        key={field.id}
                                        onClick={() => moveToSelected(field)}
                                        className="flex justify-between items-center px-2.5 py-1.5 border-b border-gray-50 hover:bg-purple-50 cursor-pointer group text-xs text-gray-600 transition-colors"
                                    >
                                        <span>{field.label}</span>
                                        <Plus size={12} className="text-gray-300 group-hover:text-[#714B67]" />
                                    </div>
                                ))}
                                {availableFields.length === 0 && (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-xs italic p-3">
                                        {t?.no_fields_available || 'All fields selected'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected fields */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <h4 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                {t?.fields_to_export_label || 'Export Fields'}
                            </h4>
                            <div className="mb-1.5" style={{ height: '30px' }} />
                            <div className="flex-1 overflow-y-auto border border-gray-200 rounded bg-white">
                                {selectedFields.map(field => (
                                    <div
                                        key={field.id}
                                        className="flex justify-between items-center px-2.5 py-1.5 border-b border-gray-50 hover:bg-red-50 cursor-pointer group text-xs text-gray-800 transition-colors"
                                    >
                                        <span className="font-medium">{field.label}</span>
                                        <Trash2
                                            size={12}
                                            onClick={() => moveToAvailable(field)}
                                            className="text-gray-300 group-hover:text-red-500"
                                        />
                                    </div>
                                ))}
                                {selectedFields.length === 0 && (
                                    <div className="flex items-center justify-center h-full text-gray-400 text-xs italic p-3">
                                        {t?.no_fields_selected || 'No fields selected'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-start">
                        <button
                            onClick={handleExport}
                            disabled={selectedFields.length === 0 || isLoading}
                            className="bg-[#714B67] text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-[#5a3b52] transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                            {t?.export_data || 'ייצוא נתונים'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigExcelPanel;
