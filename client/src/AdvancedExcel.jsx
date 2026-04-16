import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx'; 
import { Download, Upload, FileSpreadsheet, Filter, Trash2, AlertTriangle, X, CheckCircle, Search, Plus, Calendar } from 'lucide-react';

const AdvancedExcel = ({ token, t, onRefresh, onClose, user, lang }) => {
    const [activeTab, setActiveTab] = useState('import'); 
    const [searchTerm, setSearchTerm] = useState(''); 

    const [users, setUsers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);

    // --- EXPORT STATE ---
    const allFields = [
        { id: 'id', label: t.col_id || 'ID' },
        { id: 'title', label: t.task_title_label || 'Title' },
        { id: 'description', label: t.description_label || 'Description' },
        { id: 'urgency', label: t.urgency_label || 'Urgency' },
        { id: 'status', label: t.status_label || 'Status' },
        { id: 'due_date', label: t.date_label || 'Due Date' },
        { id: 'worker_name', label: t.assigned_to || 'Worker Name' },
        { id: 'creator_name', label: t.created_by_label || 'Created By' },
        { id: 'location_name', label: t.location || 'Location' },
        { id: 'asset_code', label: t.col_asset_code || 'Asset Code' },
        { id: 'asset_name', label: t.asset_name_label || 'Asset Name' },
        { id: 'category_name', label: t.category_label || 'Category' },
        { id: 'images', label: t.col_images || 'Images (URLs)' }
    ];

    const [availableFields, setAvailableFields] = useState(allFields.filter(f => f.id !== 'title' && f.id !== 'worker_name'));
    const [selectedFields, setSelectedFields] = useState(allFields.filter(f => f.id === 'title' || f.id === 'worker_name'));
    const [filterWorker, setFilterWorker] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterUrgency, setFilterUrgency] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterAsset, setFilterAsset] = useState('');
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
                    fetch('https://maintenance-app-staging.onrender.com/users', { headers }),
                    fetch('https://maintenance-app-staging.onrender.com/locations', { headers }),
                    fetch('https://maintenance-app-staging.onrender.com/categories', { headers }),
                    fetch('https://maintenance-app-staging.onrender.com/assets', { headers })
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

    // ==========================================
    // בניית תבנית 3 השפות (עם דוגמאות מתוחכמות)
    // ==========================================
    const handleDownloadTemplate = () => {
        const imgExample = "https://images.unsplash.com/photo-1581092160562-40aa08e78837, https://images.unsplash.com/photo-1581092335397-9583eb92d232";

        const dataHE = [
            {"שם העובד": user.full_name || "ישראל ישראלי", "מנהל ישיר": "שם המנהל", "שם המשימה": "ניקיון יסודי חלונות", "מיקום": "לובי", "תדירות": "חד פעמי", "תאריך או ימים": "25/12/2026", "דחיפות": "רגילה", "קטגוריה": "", "נכס": "", "תמונות (קישורים)": imgExample, "הערות": "חד פעמי – תאריך מלא (יום/חודש/שנה)"},
            {"שם העובד": user.full_name || "ישראל ישראלי", "מנהל ישיר": "שם המנהל", "שם המשימה": "ניקיון משרדים", "מיקום": "לובי", "תדירות": "יומי", "תאריך או ימים": "2, 3, 4, 5, 6", "דחיפות": "רגילה", "קטגוריה": "", "נכס": "", "תמונות (קישורים)": "", "הערות": "יומי – ספרות 1-7 (1=ראשון). ברירת מחדל: 2-6 = ב׳-ו׳"},
            {"שם העובד": user.full_name || "ישראל ישראלי", "מנהל ישיר": "שם המנהל", "שם המשימה": "בדיקת מזגנים", "מיקום": "לובי", "תדירות": "שבועי", "תאריך או ימים": "2", "דחיפות": "דחוף", "קטגוריה": "", "נכס": "", "תמונות (קישורים)": "", "הערות": "שבועי – יום אחד בלבד (2=יום ב׳)"},
            {"שם העובד": user.full_name || "ישראל ישראלי", "מנהל ישיר": "שם המנהל", "שם המשימה": "הזמנת ציוד", "מיקום": "לובי", "תדירות": "חודשי", "תאריך או ימים": "1, 15", "דחיפות": "רגילה", "קטגוריה": "", "נכס": "", "תמונות (קישורים)": "", "הערות": "חודשי – מספרים 1-31 מופרדים בפסיקים"},
            {"שם העובד": user.full_name || "ישראל ישראלי", "מנהל ישיר": "שם המנהל", "שם המשימה": "בדיקת רבעונית", "מיקום": "לובי", "תדירות": "רבעוני", "תאריך או ימים": "15/01, 15/04, 15/07, 15/10", "דחיפות": "דחוף", "קטגוריה": "", "נכס": "", "תמונות (קישורים)": "", "הערות": "רבעוני – 4 תאריכים בפורמט יום/חודש (אחד לכל רבעון)"},
            {"שם העובד": user.full_name || "ישראל ישראלי", "מנהל ישיר": "שם המנהל", "שם המשימה": "חידוש ביטוח מבנה", "מיקום": "לובי", "תדירות": "שנתי", "תאריך או ימים": "01-08", "דחיפות": "דחוף", "קטגוריה": "", "נכס": "", "תמונות (קישורים)": imgExample, "הערות": "שנתי – פורמט יום/חודש (01-08 = 1 באוגוסט)"}
        ];

        const dataEN = [
            {"Worker Name": user.full_name || "John Doe", "Manager Name": "Manager", "Task Title": "Clean Windows", "Location": "Lobby", "Frequency": "One-time", "Date or Days": "25/12/2026", "Urgency": "Normal", "Category": "", "Asset": "", "Images (URLs)": imgExample, "Notes": "One-time – full date (DD/MM/YYYY)"},
            {"Worker Name": user.full_name || "John Doe", "Manager Name": "Manager", "Task Title": "Clean Offices", "Location": "Lobby", "Frequency": "Daily", "Date or Days": "2, 3, 4, 5, 6", "Urgency": "Normal", "Category": "", "Asset": "", "Images (URLs)": "", "Notes": "Daily – digits 1-7 (1=Sun). Default Mon-Fri = 2,3,4,5,6"},
            {"Worker Name": user.full_name || "John Doe", "Manager Name": "Manager", "Task Title": "AC Check", "Location": "Lobby", "Frequency": "Weekly", "Date or Days": "2", "Urgency": "High", "Category": "", "Asset": "", "Images (URLs)": "", "Notes": "Weekly – ONE day only (2=Monday)"},
            {"Worker Name": user.full_name || "John Doe", "Manager Name": "Manager", "Task Title": "Order Supplies", "Location": "Lobby", "Frequency": "Monthly", "Date or Days": "1, 15", "Urgency": "Normal", "Category": "", "Asset": "", "Images (URLs)": "", "Notes": "Monthly – numbers 1-31 separated by commas"},
            {"Worker Name": user.full_name || "John Doe", "Manager Name": "Manager", "Task Title": "Quarterly Inspection", "Location": "Lobby", "Frequency": "Quarterly", "Date or Days": "15/01, 15/04, 15/07, 15/10", "Urgency": "High", "Category": "", "Asset": "", "Images (URLs)": "", "Notes": "Quarterly – 4 dates in DD/MM format (one per quarter)"},
            {"Worker Name": user.full_name || "John Doe", "Manager Name": "Manager", "Task Title": "Renew Insurance", "Location": "Lobby", "Frequency": "Yearly", "Date or Days": "01-08", "Urgency": "High", "Category": "", "Asset": "", "Images (URLs)": imgExample, "Notes": "Yearly – DD/MM format (01-08 = Aug 1st)"}
        ];

        const dataTH = [
            {"ชื่อพนักงาน": user.full_name || "Somchai", "ชื่อผู้จัดการ": "Manager", "ชื่องาน": "ทำความสะอาดหน้าต่าง", "สถานที่": "Lobby", "ความถี่": "ครั้งเดียว", "วันที่หรือวัน": "25/12/2026", "ความเร่งด่วน": "ปกติ", "หมวดหมู่": "", "ทรัพย์สิน": "", "รูปภาพ (ลิงก์)": imgExample, "หมายเหตุ": "ครั้งเดียว – วันที่เต็ม (วว/ดด/ปปปป)"},
            {"ชื่อพนักงาน": user.full_name || "Somchai", "ชื่อผู้จัดการ": "Manager", "ชื่องาน": "ทำความสะอาดออฟฟิศ", "สถานที่": "Lobby", "ความถี่": "รายวัน", "วันที่หรือวัน": "2, 3, 4, 5, 6", "ความเร่งด่วน": "ปกติ", "หมวดหมู่": "", "ทรัพย์สิน": "", "รูปภาพ (ลิงก์)": "", "หมายเหตุ": "รายวัน – ตัวเลข 1-7 (1=อาทิตย์). จ-ศ = 2,3,4,5,6"},
            {"ชื่อพนักงาน": user.full_name || "Somchai", "ชื่อผู้จัดการ": "Manager", "ชื่องาน": "ตรวจสอบแอร์", "สถานที่": "Lobby", "ความถี่": "รายสัปดาห์", "วันที่หรือวัน": "2", "ความเร่งด่วน": "ด่วน", "หมวดหมู่": "", "ทรัพย์สิน": "", "รูปภาพ (ลิงก์)": "", "หมายเหตุ": "รายสัปดาห์ – เลือกได้ 1 วันเท่านั้น (2=จันทร์)"},
            {"ชื่อพนักงาน": user.full_name || "Somchai", "ชื่อผู้จัดการ": "Manager", "ชื่องาน": "สั่งซื้ออุปกรณ์", "สถานที่": "Lobby", "ความถี่": "รายเดือน", "วันที่หรือวัน": "1, 15", "ความเร่งด่วน": "ปกติ", "หมวดหมู่": "", "ทรัพย์สิน": "", "รูปภาพ (ลิงก์)": "", "หมายเหตุ": "รายเดือน – ตัวเลข 1-31 คั่นด้วยจุลภาค"},
            {"ชื่อพนักงาน": user.full_name || "Somchai", "ชื่อผู้จัดการ": "Manager", "ชื่องาน": "ตรวจสอบรายไตรมาส", "สถานที่": "Lobby", "ความถี่": "รายไตรมาส", "วันที่หรือวัน": "15/01, 15/04, 15/07, 15/10", "ความเร่งด่วน": "ด่วน", "หมวดหมู่": "", "ทรัพย์สิน": "", "รูปภาพ (ลิงก์)": "", "หมายเหตุ": "รายไตรมาส – 4 วันที่ในรูปแบบ วว/ดด (ไตรมาสละ 1 วัน)"},
            {"ชื่อพนักงาน": user.full_name || "Somchai", "ชื่อผู้จัดการ": "Manager", "ชื่องาน": "ต่อประกัน", "สถานที่": "Lobby", "ความถี่": "รายปี", "วันที่หรือวัน": "01-08", "ความเร่งด่วน": "ด่วน", "หมวดหมู่": "", "ทรัพย์สิน": "", "รูปภาพ (ลิงก์)": imgExample, "หมายเหตุ": "รายปี – รูปแบบ วว/ดด (01-08 = 1 สิงหาคม)"}
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataHE), "עברית (Hebrew)");
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataEN), "English");
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataTH), "ภาษาไทย (Thai)");
        XLSX.writeFile(workbook, "OpsManager_Smart_Template.xlsx");
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportFile(file); setFileName(file.name); setValidationStatus("idle"); setErrorList([]); setPreviewData([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0]; // קורא תמיד מהגיליון הראשון (הפעיל)
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }); 
            if (data.length > 0) setPreviewData(data);
        };
        reader.readAsBinaryString(file);
    };

    // ==========================================
    // מנוע הולידציה הארגוני - 2-Step Enterprise Engine
    // ==========================================
    const validateAndMapData = () => {
        const errors = [];
        const validMappedTasks = [];

        if (previewData.length === 0) return { errors: ['הקובץ ריק.'], mapped: [] };

        // ── Task 2B: Trim all string values & strip ghost (all-empty) rows ─────
        const cleanedData = previewData
            .map(row => {
                const clean = {};
                for (const k of Object.keys(row)) {
                    clean[k] = typeof row[k] === 'string' ? row[k].trim() : row[k];
                }
                return clean;
            })
            .filter(row => Object.values(row).some(v => String(v).trim() !== ''));

        if (cleanedData.length === 0) return { errors: ['הקובץ ריק.'], mapped: [] };

        // זיהוי שפה לפי עמודת עובד
        const fileCols = Object.keys(cleanedData[0]);
        const isHeb = fileCols.includes('שם העובד');
        const isEng = fileCols.includes('Worker Name');
        const isTha = fileCols.includes('ชื่อพนักงาน');

        if (!isHeb && !isEng && !isTha) {
            return { errors: ['שגיאה קריטית: עמודות חובה לא זוהו. אנא השתמש בתבנית שהורדת.'], mapped: [] };
        }

        const keys = {
            worker:   isHeb ? 'שם העובד'         : isEng ? 'Worker Name'   : 'ชื่อพนักงาน',
            manager:  isHeb ? 'מנהל ישיר'         : isEng ? 'Manager Name'  : 'ชื่อผู้จัดการ',
            title:    isHeb ? 'שם המשימה'         : isEng ? 'Task Title'    : 'ชื่องาน',
            location: isHeb ? 'מיקום'             : isEng ? 'Location'      : 'สถานที่',
            freq:     isHeb ? 'תדירות'            : isEng ? 'Frequency'     : 'ความถี่',
            dates:    isHeb ? 'תאריך או ימים'     : isEng ? 'Date or Days'  : 'วันที่หรือวัน',
            urgency:  isHeb ? 'דחיפות'            : isEng ? 'Urgency'       : 'ความเร่งด่วน',
            cat:      isHeb ? 'קטגוריה'           : isEng ? 'Category'      : 'หมวดหมู่',
            asset:    isHeb ? 'נכס'               : isEng ? 'Asset'         : 'ทรัพย์สิน',
            images:   isHeb ? 'תמונות (קישורים)' : isEng ? 'Images (URLs)' : 'รูปภาพ (ลิงก์)',
            notes:    isHeb ? 'הערות'             : isEng ? 'Notes'         : 'หมายเหตุ',
        };

        // ── Task 2D: Structured error message helpers ─────────────────────────
        const eCol = (rowNum, col, msg) => `[Row ${rowNum}, Column '${col}']: ${msg}`;
        const eRow = (rowNum, msg)       => `[Row ${rowNum}]: ${msg}`;

        // Urgency allowed values
        const HIGH_URGENCY   = ['דחוף', 'גבוהה', 'high', 'ด่วน'];
        const NORMAL_URGENCY = ['רגילה', 'normal', 'ปกติ', ''];
        const ALL_URGENCY    = [...HIGH_URGENCY, ...NORMAL_URGENCY];
        const urgencyHint    = isHeb ? 'דחוף / רגילה' : isTha ? 'ด่วน / ปกติ' : 'High / Normal';

        cleanedData.forEach((row, index) => {
            const rowNum    = index + 2; // header = row 1
            const rowErrors = [];        // per-row accumulator (Task 2C)

            const empName    = String(row[keys.worker]   || '');
            const mgrName    = String(row[keys.manager]  || '');
            const taskName   = String(row[keys.title]    || '');
            const locName    = String(row[keys.location] || '');
            const freqRaw    = String(row[keys.freq]     || '');
            const freqValue  = freqRaw.toLowerCase();
            const datesValue = String(row[keys.dates]    || '');
            const imagesStr  = String(row[keys.images]   || '');

            // ── Mandatory field presence (per-column errors) ───────────────────
            if (!empName)    rowErrors.push(eCol(rowNum, keys.worker,   'Field is required.'));
            if (!mgrName)    rowErrors.push(eCol(rowNum, keys.manager,  'Field is required.'));
            if (!taskName)   rowErrors.push(eCol(rowNum, keys.title,    'Field is required.'));
            if (!locName)    rowErrors.push(eCol(rowNum, keys.location, 'Field is required.'));
            if (!freqValue)  rowErrors.push(eCol(rowNum, keys.freq,     'Field is required.'));
            if (!datesValue) rowErrors.push(eCol(rowNum, keys.dates,    'Field is required.'));

            if (rowErrors.length > 0) { errors.push(...rowErrors); return; }

            // ── Title DB length limit ─────────────────────────────────────────
            if (taskName.length > 255) {
                rowErrors.push(eCol(rowNum, keys.title, `Title exceeds the 255-character limit (${taskName.length} chars).`));
            }

            // ── Urgency enum validation ────────────────────────────────────────
            const urgencyRaw   = String(row[keys.urgency] || '');
            const urgencyLower = urgencyRaw.toLowerCase();
            if (!ALL_URGENCY.includes(urgencyLower)) {
                rowErrors.push(eCol(rowNum, keys.urgency, `"${urgencyRaw}" is not valid. Allowed: ${urgencyHint}.`));
            }
            const isUrgent = HIGH_URGENCY.includes(urgencyLower);

            // ── Employee & Manager — company-scoped + M:M team check ──────────
            const employee = users.find(u => u.full_name === empName && u.role === 'EMPLOYEE');
            const manager  = users.find(u => u.full_name === mgrName && ['MANAGER', 'BIG_BOSS'].includes(u.role));

            if (!employee) {
                rowErrors.push(eCol(rowNum, keys.worker,  `Employee "${empName}" not found in the system.`));
            }
            if (!manager) {
                rowErrors.push(eCol(rowNum, keys.manager, `Manager "${mgrName}" not found in the system.`));
            }
            if (employee && manager) {
                if (employee.parent_manager_id !== manager.id && manager.role !== 'BIG_BOSS') {
                    rowErrors.push(eRow(rowNum, `Employee "${empName}" is not assigned to manager "${mgrName}".`));
                }
                // Strict M:M scoping: logged-in MANAGER may only assign their own team
                if (user.role === 'MANAGER' && employee.parent_manager_id !== user.id) {
                    rowErrors.push(eRow(rowNum, `Employee "${empName}" is not assigned to your team.`));
                }
            }

            // ── Location — company-scoped via API ─────────────────────────────
            const location = locations.find(l => l.name === locName);
            if (!location) {
                rowErrors.push(eCol(rowNum, keys.location, `Location "${locName}" not found in your company.`));
            }

            // ── Frequency & Dates (EXISTING LOGIC — conditions unchanged) ──────
            let recurringType = 'once';
            let parsedDays    = [];
            let monthlyDates  = [];
            let yearlyDates   = [];
            let finalDate     = new Date();

            const fullDateRegex  = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/; // DD/MM/YYYY or DD-MM-YYYY
            const shortDateRegex = /^(\d{1,2})[-/](\d{1,2})$/;             // DD/MM or DD-MM

            const isOnce      = ['חד פעמי', 'one-time', 'ครั้งเดียว'].includes(freqValue);
            const isDaily     = ['יומי', 'daily', 'รายวัน'].includes(freqValue);
            const isWeekly    = ['שבועי', 'weekly', 'รายสัปดาห์'].includes(freqValue);
            const isMonthly   = ['חודשי', 'monthly', 'รายเดือน'].includes(freqValue);
            const isQuarterly = ['רבעוני', 'quarterly', 'รายไตรมาส'].includes(freqValue);
            const isYearly    = ['שנתי', 'yearly', 'รายปี'].includes(freqValue);

            if (isOnce) {
                recurringType = 'once';
                const match = datesValue.match(fullDateRegex);
                if (match) {
                    finalDate = new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00`);
                } else if (!isNaN(Date.parse(datesValue))) {
                    finalDate = new Date(datesValue);
                } else {
                    rowErrors.push(eCol(rowNum, keys.dates, 'Invalid one-time date. Use format DD/MM/YYYY (e.g. 25/12/2026 or 25-12-2026).'));
                }
            } else if (isDaily) {
                recurringType = 'daily';
                const days = datesValue.split(',').map(d => parseInt(d.trim()));
                const invalidDays = days.filter(d => isNaN(d) || d < 1 || d > 7);
                if (invalidDays.length > 0) {
                    rowErrors.push(eCol(rowNum, keys.dates, `Daily tasks require digits 1–7 separated by commas (found: ${invalidDays.join(',')}).`));
                } else {
                    parsedDays = days.map(d => d === 1 ? 0 : d === 2 ? 1 : d === 3 ? 2 : d === 4 ? 3 : d === 5 ? 4 : d === 6 ? 5 : 6);
                }
            } else if (isWeekly) {
                recurringType = 'weekly';
                const days = datesValue.split(',').map(d => parseInt(d.trim()));
                if (days.length > 1) {
                    rowErrors.push(eCol(rowNum, keys.dates, 'Weekly tasks require exactly one day (1–7).'));
                } else {
                    const invalidDays = days.filter(d => isNaN(d) || d < 1 || d > 7);
                    if (invalidDays.length > 0) {
                        rowErrors.push(eCol(rowNum, keys.dates, `Weekly tasks require a single digit between 1 and 7 (found: ${invalidDays.join(',')}).`));
                    } else {
                        parsedDays = days.map(d => d === 1 ? 0 : d === 2 ? 1 : d === 3 ? 2 : d === 4 ? 3 : d === 5 ? 4 : d === 6 ? 5 : 6);
                    }
                }
            } else if (isMonthly) {
                recurringType = 'monthly';
                const days = datesValue.split(',').map(d => parseInt(d.trim()));
                const invalidDays = days.filter(d => isNaN(d) || d < 1 || d > 31);
                if (invalidDays.length > 0) {
                    rowErrors.push(eCol(rowNum, keys.dates, 'Monthly tasks require numbers 1–31 separated by commas.'));
                } else {
                    monthlyDates = days;
                }
            } else if (isQuarterly) {
                recurringType = 'quarterly';
                const datesArr = datesValue.split(',').map(d => d.trim());
                if (datesArr.length !== 4) {
                    rowErrors.push(eCol(rowNum, keys.dates, 'Quarterly tasks require exactly 4 dates in DD/MM format (e.g. 15/01, 15/04, 15/07, 15/10).'));
                } else {
                    datesArr.forEach((d, qi) => {
                        const match = d.match(shortDateRegex);
                        if (match) {
                            const day   = match[1].padStart(2, '0');
                            const month = parseInt(match[2]);
                            const quarterMonths = [[1,2,3],[4,5,6],[7,8,9],[10,11,12]];
                            if (!quarterMonths[qi].includes(month)) {
                                rowErrors.push(eCol(rowNum, keys.dates, `Q${qi+1} date "${d}" must be in months ${quarterMonths[qi].join('/')}.`));
                            } else {
                                yearlyDates.push(`${day}/${String(month).padStart(2,'0')}`);
                            }
                        } else {
                            rowErrors.push(eCol(rowNum, keys.dates, `Invalid quarterly date "${d}". Use format DD/MM (e.g. 15/01).`));
                        }
                    });
                }
            } else if (isYearly) {
                recurringType = 'yearly';
                const datesArr = datesValue.split(',').map(d => d.trim());
                datesArr.forEach(d => {
                    const match = d.match(shortDateRegex);
                    if (match) {
                        const day   = match[1].padStart(2, '0');
                        const month = match[2].padStart(2, '0');
                        yearlyDates.push(`${day}/${month}`);
                    } else {
                        rowErrors.push(eCol(rowNum, keys.dates, `Invalid yearly date "${d}". Use format DD/MM (e.g. 01/08 or 01-08).`));
                    }
                });
            } else {
                rowErrors.push(eCol(rowNum, keys.freq, `Frequency "${freqRaw}" is not recognized. Use: One-time / Daily / Weekly / Monthly / Quarterly / Yearly.`));
            }

            // ── Images ────────────────────────────────────────────────────────
            let parsedImages = [];
            if (imagesStr) {
                parsedImages = imagesStr.split(',').map(img => img.trim()).filter(img => img.startsWith('http'));
            }

            // ── Category & Asset — company-scoped via API ─────────────────────
            let catId = null, assetId = null;
            const catName   = String(row[keys.cat]   || '');
            const assetName = String(row[keys.asset] || '');

            if (catName) {
                const cat = categories.find(c => c.name === catName);
                if (cat) {
                    catId = cat.id;
                } else {
                    rowErrors.push(eCol(rowNum, keys.cat, `Category "${catName}" not found in your company.`));
                }
            }
            if (assetName && catId) {
                const as = assets.find(a => a.name === assetName && a.category_id === catId);
                if (as) {
                    assetId = as.id;
                } else {
                    rowErrors.push(eCol(rowNum, keys.asset, `Asset "${assetName}" not found under the specified category.`));
                }
            }

            // ── Accumulate row errors; push to validMappedTasks only if clean ──
            if (rowErrors.length === 0) {
                validMappedTasks.push({
                    title:           taskName,
                    urgency:         isUrgent ? 'High' : 'Normal',
                    description:     String(row[keys.notes] || ''),
                    location_id:     location?.id,
                    worker_id:       employee?.id,
                    asset_id:        assetId,
                    is_recurring:    recurringType !== 'once',
                    recurring_type:  recurringType !== 'once' ? recurringType : null,
                    due_date:        finalDate.toISOString(),
                    selected_days:   parsedDays,      // [0, 2, 4] for daily/weekly
                    monthly_dates:   monthlyDates,    // [1, 15] for monthly
                    quarterly_dates: recurringType === 'quarterly' ? yearlyDates : [], // ["15/01", ...]
                    yearly_dates:    recurringType === 'yearly'    ? yearlyDates : [], // ["01/08", ...]
                    images:          parsedImages,
                });
            }
            errors.push(...rowErrors);
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
            const res = await fetch('https://maintenance-app-staging.onrender.com/tasks/bulk-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ tasks: mappedTasks })
            });

            const result = await res.json();
            if (res.ok) {
                alert(t.alert_created || 'יבוא המשימות הושלם בהצלחה!');
                onRefresh();
                onClose();
            } else {
                setValidationStatus("error");
                setErrorList([result.error || t.server_error || 'שגיאת שרת בהעלאה']);
            }
        } catch (err) {
            setValidationStatus("error");
            setErrorList([t.server_error || 'שגיאת תקשורת מול השרת']);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteAll = async () => {
        if(!window.confirm("⚠️ Delete ALL tasks?")) return;
        try {
            await fetch('https://maintenance-app-staging.onrender.com/tasks/delete-all', {
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
            if (filterUrgency) params.append('urgency', filterUrgency);
            if (filterCategory) params.append('category_id', filterCategory);
            if (filterAsset) params.append('asset_id', filterAsset);

            const res = await fetch(`https://maintenance-app-staging.onrender.com/tasks/export/advanced?${params.toString()}`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (!res.ok) throw new Error("Export failed");
            const rawData = await res.json();
            if (rawData.length === 0) { alert("No tasks found matching filters."); setIsExporting(false); return; }

            // Build a live label map from current `t` so language changes are reflected in headers
            const liveLabelMap = Object.fromEntries(allFields.map(f => [f.id, f.label]));
            const excelData = rawData.map(task => {
                const row = {};
                selectedFields.forEach(field => {
                    const header = liveLabelMap[field.id] || field.label;
                    let value = task[field.id];
                    if (field.id === 'due_date' && value) value = new Date(value).toISOString().split('T')[0];
                    if (field.id === 'images' && Array.isArray(value)) value = value.join(', ');
                    row[header] = value ?? "";
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
                        <button onClick={() => setActiveTab('import')} className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'import' ? 'bg-white shadow text-[#714B67]' : 'text-gray-500 hover:text-gray-700'}`}>{t.import_data || 'ייבוא'}</button>
                        <button onClick={() => setActiveTab('export')} className={`px-3 py-1 text-xs font-medium rounded transition ${activeTab === 'export' ? 'bg-white shadow text-[#714B67]' : 'text-gray-500 hover:text-gray-700'}`}>{t.export_data || 'ייצוא'}</button>
                    </div>

                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20}/></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-gray-50 p-5">
                    
                    {/* --- EXPORT VIEW --- */}
                    {activeTab === 'export' && (
                        <div className="flex flex-col h-full gap-3">
                            {/* Format / Mode row */}
                            <div className="flex items-center gap-4 px-3 py-2 bg-white rounded-lg border shadow-sm text-sm">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="update_data" checked={isUpdateMode} onChange={handleUpdateModeChange} className="w-4 h-4 text-[#714B67] focus:ring-[#714B67] border-gray-300 rounded cursor-pointer"/>
                                    <label htmlFor="update_data" className="text-gray-700 font-medium cursor-pointer">{t.export_for_update || "Update Mode"}</label>
                                </div>
                                <div className="flex items-center gap-2 border-l pl-4">
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

                            {/* Filters grid */}
                            <div className="bg-white rounded-lg border shadow-sm p-3">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Filter size={12}/> {t.filters_label || 'Filters'}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">

                                    {/* Assignee */}
                                    {user.role !== 'EMPLOYEE' && (
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.assigned_to || 'Assignee'}</label>
                                            <select className="border border-gray-200 rounded px-2 py-1.5 text-gray-700 text-xs focus:outline-none focus:border-[#714B67]" value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
                                                <option value="">{t.all_employees || 'All'}</option>
                                                {relevantUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {/* Urgency */}
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.urgency_label || 'Urgency'}</label>
                                        <select className="border border-gray-200 rounded px-2 py-1.5 text-gray-700 text-xs focus:outline-none focus:border-[#714B67]" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
                                            <option value="">{t.all_urgencies || 'All'}</option>
                                            <option value="NORMAL">{t.urgency_normal || 'Normal'}</option>
                                            <option value="HIGH">{t.urgency_high || 'Urgent'}</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.status_label || 'Status'}</label>
                                        <select className="border border-gray-200 rounded px-2 py-1.5 text-gray-700 text-xs focus:outline-none focus:border-[#714B67]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                            <option value="">{t.all_statuses || 'All'}</option>
                                            <option value="PENDING">{t.status_pending_filter || 'Pending'}</option>
                                            <option value="WAITING_APPROVAL">{t.status_waiting_filter || 'Waiting Approval'}</option>
                                            <option value="COMPLETED">{t.status_completed_filter || 'Completed'}</option>
                                        </select>
                                    </div>

                                    {/* Category */}
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.category_label || 'Category'}</label>
                                        <select className="border border-gray-200 rounded px-2 py-1.5 text-gray-700 text-xs focus:outline-none focus:border-[#714B67]" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterAsset(''); }}>
                                            <option value="">{t.all_categories || 'All'}</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name || c.name_en || c.name_he}</option>)}
                                        </select>
                                    </div>

                                    {/* Asset */}
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.asset_name_label || 'Asset'}</label>
                                        <select className="border border-gray-200 rounded px-2 py-1.5 text-gray-700 text-xs focus:outline-none focus:border-[#714B67]" value={filterAsset} onChange={e => setFilterAsset(e.target.value)}>
                                            <option value="">{t.all_assets || 'All'}</option>
                                            {assets
                                                .filter(a => !filterCategory || String(a.category_id) === String(filterCategory))
                                                .map(a => <option key={a.id} value={a.id}>{a.name || a.name_en || a.name_he} {a.code ? `(${a.code})` : ''}</option>)}
                                        </select>
                                    </div>

                                    {/* Date Range — spans full width */}
                                    <div className="col-span-2 flex flex-col gap-0.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><Calendar size={11}/> {t.date_range_label || 'Date Range'}</label>
                                        <div className="flex items-center gap-2">
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-[#714B67]" placeholder="From"/>
                                            <span className="text-gray-400 text-xs">—</span>
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-[#714B67]" placeholder="To"/>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="mb-2">
                                        <h4 className="text-xs font-bold text-gray-800 mb-1 uppercase">{t.available_fields_label || t.available_fields || 'Available Fields'}</h4>
                                        <div className="relative">
                                            <Search size={14} className="absolute left-2 top-2.5 text-gray-400"/>
                                            <input type="text" placeholder={t.search_placeholder || 'Search...'} className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#714B67]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
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
                                        <h4 className="text-xs font-bold text-gray-800 mb-1 uppercase">{t.fields_to_export_label || t.fields_to_export || 'Fields to Export'}</h4>
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
                                        {selectedFields.length === 0 && <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">{t.no_fields_selected || 'No fields selected'}</div>}
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
                                <p className="text-gray-600 font-medium text-sm">{fileName || (t.drag_drop_excel || 'Drag & Drop Excel File')}</p>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                            </div>

                            <div className="flex justify-between items-center bg-[#fdf4ff] p-3 rounded border border-[#714B67]/20">
                                <span className="text-xs text-[#714B67] font-medium">✨ {t.template_download_hint || 'תבנית מיוחדת ב-3 שפות קיימת להורדה, כולל עמודת תמונות ודוגמאות!'}</span>
                                <button onClick={handleDownloadTemplate} className="bg-[#714B67] text-white px-4 py-2 rounded text-xs font-bold hover:bg-[#5a3b52] shadow-sm flex items-center gap-1 transition">
                                    <Download size={14}/> {t.download_template_btn || 'הורד תבנית מתקדמת'}
                                </button>
                            </div>

                            {validationStatus === 'valid' && (
                                <div className="bg-green-50 border border-green-200 p-3 rounded flex gap-2 text-green-800 items-start animate-fade-in">
                                    <CheckCircle size={18} className="mt-0.5"/>
                                    <div>
                                        <p className="font-bold text-sm">{t.file_valid_title || 'הקובץ נבדק ותקין לחלוטין!'}</p>
                                        <p className="text-xs">{mappedTasks.length} {t.tasks_ready_prefix || 'משימות מוכנות להעלאה למערכת.'}</p>
                                    </div>
                                </div>
                            )}

                            {validationStatus === 'error' && (
                                <div className="bg-red-50 border border-red-200 p-3 rounded flex gap-2 text-red-800 items-start animate-fade-in overflow-y-auto max-h-40">
                                    <AlertTriangle size={18} className="mt-0.5 shrink-0"/>
                                    <div>
                                        <p className="font-bold text-sm text-red-700 mb-1">{t.errors_found_title || 'נמצאו שגיאות בקובץ! (לא ניתן להעלות)'}</p>
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
                                {isExporting ? (t.exporting || 'Exporting...') : (t.export_data || 'Export')}
                            </button>
                            <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded font-medium hover:bg-gray-50 transition text-sm">{t.close || t.cancel || 'Close'}</button>
                        </>
                    ) : (
                        <>
                            {previewData.length > 0 && validationStatus !== 'valid' && (
                                <button onClick={() => processFile(true)} disabled={isProcessing} className="bg-blue-600 text-white px-5 py-2 rounded font-bold hover:bg-blue-700 transition text-sm flex items-center gap-2">
                                    {isProcessing ? (t.validating || 'בודק...') : (t.validate_import || '1. בצע בדיקת תקינות')}
                                </button>
                            )}
                            <button onClick={() => processFile(false)} disabled={validationStatus !== 'valid' || isProcessing} className="bg-green-600 text-white px-5 py-2 rounded font-bold hover:bg-green-700 transition shadow-sm disabled:opacity-50 disabled:bg-gray-300 text-sm">
                                {isProcessing ? (t.uploading || 'מעלה...') : (t.upload_approved_btn || '2. העלה נתונים מאושרים')}
                            </button>
                            <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded hover:bg-gray-50 transition text-sm">{t.close || t.cancel || 'סגור'}</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedExcel;