import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, Plus, Trash2, Search, X } from 'lucide-react';

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

const ConfigExcelPanel = ({ section, t, onClose }) => {
    const [activeTab, setActiveTab]         = useState('import');
    const [fileName, setFileName]           = useState('');
    const [validationStatus, setValidationStatus] = useState('idle'); // idle | valid | error
    const [searchTerm, setSearchTerm]       = useState('');
    const [selectedFields, setSelectedFields] = useState([]);

    const allFields       = SECTION_FIELDS[section] || [];
    const availableFields = allFields
        .filter(f => !selectedFields.find(s => s.id === f.id))
        .filter(f => f.label.toLowerCase().includes(searchTerm.toLowerCase()));

    const sectionLabel = SECTION_LABELS[section]?.he || section;

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setValidationStatus('idle');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        setFileName(file.name);
        setValidationStatus('idle');
    };

    const moveToSelected  = (field) => setSelectedFields(prev => [...prev, field]);
    const moveToAvailable = (field) => setSelectedFields(prev => prev.filter(f => f.id !== field.id));

    return (
        <div className="border border-green-200 rounded-xl bg-white shadow-sm overflow-hidden mb-4 animate-fade-in">
            {/* ── Panel header ── */}
            <div className="flex items-center justify-between bg-green-50 border-b border-green-200 px-4 py-2.5 gap-3">
                <div className="flex items-center gap-2 shrink-0">
                    <FileSpreadsheet size={15} className="text-green-700" />
                    <span className="text-xs font-bold text-green-800">{sectionLabel} — Excel</span>
                </div>

                {/* Tab switcher */}
                <div className="flex bg-white border border-green-200 p-0.5 rounded-lg">
                    <button
                        onClick={() => setActiveTab('import')}
                        className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'import' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t?.import_update_tab || 'ייבוא / עדכון'}
                    </button>
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'export' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
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

                    {/* Template download banner */}
                    <div className="flex justify-between items-center bg-[#fdf4ff] p-3 rounded-lg border border-[#714B67]/20">
                        <span className="text-xs text-[#714B67] font-medium">
                            ✨ {t?.template_download_hint || 'הורד תבנית Excel מותאמת אישית'}
                        </span>
                        <button
                            className="bg-[#714B67] text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-[#5a3b52] shadow-sm flex items-center gap-1 transition"
                        >
                            <Download size={12} /> {t?.download_template_btn || 'הורד תבנית'}
                        </button>
                    </div>

                    {/* Validation status — placeholder states */}
                    {validationStatus === 'valid' && (
                        <div className="bg-green-50 border border-green-200 p-2.5 rounded text-green-800 text-xs font-medium">
                            ✓ {t?.file_valid_title || 'הקובץ תקין ומוכן להעלאה'}
                        </div>
                    )}

                    {/* Action buttons */}
                    {fileName && (
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setValidationStatus('valid')}
                                className="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1"
                            >
                                {t?.validate_import || '1. בדוק תקינות'}
                            </button>
                            <button
                                disabled={validationStatus !== 'valid'}
                                className="bg-green-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
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
                        {/* Available fields column */}
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

                        {/* Selected fields column */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <h4 className="text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                {t?.fields_to_export_label || 'Export Fields'}
                            </h4>
                            {/* spacer to align with search box */}
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

                    {/* Export action */}
                    <div className="flex justify-start">
                        <button
                            disabled={selectedFields.length === 0}
                            className="bg-green-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <Download size={12} /> {t?.export_data || 'ייצוא נתונים'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfigExcelPanel;
