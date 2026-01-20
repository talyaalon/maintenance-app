export const translations = {
  // --- English ---
  en: {
    // --- Navigation ---
    app_name: "MAINTENANCE APP",
    nav_tasks: "Tasks",
    nav_team: "Team",
    nav_config: "Config",
    nav_profile: "Profile",
    
    // --- Auth (Login) ---
    login_title: "Sign in to your account",
    login_email: "Email Address",
    login_password: "Password",
    login_btn: "Sign In",
    login_failed: "Invalid email or password",
    server_error: "Server error",

    // --- General Actions ---
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    confirm: "Confirm",
    save_changes: "Save Changes",
    
    // --- Tasks Tab ---
    task_management_title: "Task Management",
    tab_todo: "To Do",
    tab_waiting: "Waiting Approval",
    tab_completed: "History",
    view_daily: "Daily",
    view_weekly: "Weekly",
    view_calendar: "Calendar",
    
    // --- Task Messages / Status ---
    no_tasks_today: "No tasks for today! Great job.",
    no_tasks_waiting: "No tasks waiting for approval.",
    no_tasks_completed: "No completed tasks yet.",
    tasks_for_date: "Tasks for",
    urgent_label: "Urgent",
    normal_label: "Normal",
    low_label: "Low",
    overdue: "Overdue",
    status_label: "Status",
    urgent: "Urgent",
    task_done: "Completed",

    // --- Task Card ---
    location: "Location",
    assigned_to: "Assigned To",
    has_notes: "Notes",
    has_image: "Photo Attached",
    
    // --- Create Task Form ---
    create_new_task: "Create New Task",
    select_asset_title: "Select Asset (Optional)",
    category_label: "Category",
    specific_asset_label: "Specific Asset",
    select_category: "Select Category",
    select_category_first: "Select category first",
    select_asset: "Select Asset",
    no_assets_in_category: "No assets in this category",
    task_title_label: "Task Title",
    task_title_placeholder: "e.g., Fix AC unit",
    description_label: "Description",
    description_placeholder: "Enter details here...",
    add_image: "Add Photo",
    assign_to_label: "Assign To",
    assign_self: "Assign to myself",
    urgency_label: "Urgency",
    date_label: "Due Date",
    recurring_task: "Recurring Task",
    recurring_weekly: "Weekly",
    recurring_monthly: "Monthly",
    day_of_month: "Day of month",
    select_location: "Select Location",
    save_task_btn: "Create Task",
    error_create_task: "Error creating task",

    // --- Task Details Modal ---
    complete_task: "Complete Task",
    complete_task_btn: "Report Completion",
    followup_task_btn: "Follow-up Task",
    approve_close_btn: "Approve & Close",
    report_execution: "Execution Report",
    what_was_done: "Describe what was done...",
    upload_proof: "Upload Photo Proof",
    send_for_approval: "Send for Approval",
    new_date: "New Due Date",
    manager_notes: "Manager's Notes",
    worker_report: "Worker's Report",
    alert_required: "Required field",
    alert_sent: "Sent successfully!",
    alert_approved: "Approved successfully!",
    alert_created: "Created successfully!",

    // --- Days ---
    day_0: "Sunday", day_1: "Monday", day_2: "Tuesday", day_3: "Wednesday", day_4: "Thursday", day_5: "Friday", day_6: "Saturday",

    // --- Team Tab ---
    add_team_member: "Add Team Member",
    ceo_role: "CEO",
    workers_suffix: "employees",
    workers_under: "Employees under",
    confirm_delete_user: "Are you sure you want to delete this user?",
    error_delete: "Error deleting user",
    edit_details_title: "Edit Details",
    full_name_label: "Full Name",
    email_label: "Email",
    password_placeholder_edit: "Password (leave empty to keep current)",
    assign_to_manager: "Assign to Manager",
    no_manager: "No Manager",
    alert_update_success: "Update successful!",
    alert_update_error: "Error updating details.",

    // --- Add User Form ---
    add_new_user_title: "Add New Team Member",
    user_created_success: "User created successfully!",
    error_create_user: "Error creating user",
    password_label: "Initial Password",
    role_label: "Role",
    role_employee: "Employee",
    role_manager: "Manager",
    select_manager: "Select Manager",
    create_btn: "Create User",
    creating: "Creating...",

    // --- Configuration Tab ---
    config_title: "Configuration & Assets",
    assets_tab: "Assets",
    categories_tab: "Categories",
    category_placeholder: "New Category Name",
    category_added: "Category Added!",
    error_adding_category: "Error adding category",
    no_categories: "No categories yet",
    add_new_asset: "Add New Asset",
    asset_name_placeholder: "Asset Name",
    asset_code_placeholder: "Unique Code",
    save_asset_btn: "Save Asset",
    asset_created: "Asset Created Successfully!",
    error_creating_asset: "Error creating asset",
    fill_all_fields: "Please fill all fields",
    no_assets: "No assets yet. Create categories first!",

    // --- excel export and import ---
    export_data: "Export Data",
    import_data: "Import Data",
    available_fields: "Available Fields",
    fields_to_export: "Fields to Export",
    upload_instruction: "Upload Excel file (.xlsx) to update or create tasks.",
    test_import: "Test Import",
    test_passed: "Everything looks good!",
    test_failed: "Issues Found",
    ready_to_import: "Ready to import.",
    fix_errors: "Please fix the errors below.",
    download_excel: "Download Excel",
    execute_import: "Import Data",
    select_fields_error: "Select at least one field",
    confirm_import: "Are you sure? This will update the database.",
    export_update_mode: "I want to update data (import-compatible export)",

    // --- update location tab ---
    manager_label: "Worker's Manager",
    image_url_label: "Image URL",
    confirm_delete: "Are you sure you want to delete?",
    error_delete_in_use: "Cannot delete: Item is in use by existing tasks.",
    location_placeholder: "New Location Name",
    asset_name: "Asset Name",
    general_task: "General Task",
    no_location: "No Location",

    // --- update yearly option ---
    yearly: "Yearly",
    day_of_month: "Day of month",
    month: "Month",
    day: "Day",

    // --- New Additions ---
    phone: "Phone",
    phone_label: "Phone Number",
    excel_center: "Excel Center",
    export_data: "Export Data",
    import_data: "Import / Update",
    filters: "Filters",
    date_range: "Date Range",
    employee: "Employee",
    export_for_update: "I want to update data (Includes ID)",
    delete_all_tasks: "Delete All Tasks",
    instructions: "Instructions:",
    click_upload: "Click to Upload Excel",
    execute_import: "Import Now",
    viewing_as: "Viewing as",
    edit_profile_btn: "Edit Profile",
    password_placeholder_edit: "New Password (Optional)",
    password_security_note: "Old password hidden for security",
    error_code_exists: "⚠️ Error: This Asset Code already exists!",
    error_category_exists: "⚠️ Error: This Category name already exists.",
    error_location_exists: "⚠️ Error: This Location name already exists.",
    fill_all_fields: "Please fill all fields",
    alert_update_success: "Profile updated successfully!",
    alert_update_error: "Error updating profile",
    confirm_delete_user: "Are you sure you want to delete this user?",
    save_asset_btn: "Save Asset",
    asset_name_placeholder: "Asset Name",
    asset_code_placeholder: "Internal Code",
    category_placeholder: "New Category Name",
    location_placeholder: "New Location Name",

    // ...
    optional: "Optional",
    phone: "Phone",
    logout: "Logout",
    view_daily: "Daily",
    view_weekly: "Weekly",
    view_monthly: "Monthly",
    view_yearly: "Yearly",
    view_waiting: "Waiting",
    view_history: "History",
    task_singular: "Task",
    tasks_plural: "Tasks",
    urgent: "Urgent",
    normal: "Normal",
    nav_locations: "Locations",
    // ...

    // --- Profile Tab ---
    edit_profile_btn: "Edit Profile",
    password_security_note: "Old password hidden for security"
  },

  // --- Hebrew ---
  he: {
    // --- Navigation ---
    app_name: "מערכת אחזקה",
    nav_tasks: "משימות",
    nav_team: "הצוות שלי",
    nav_config: "הגדרות",
    nav_profile: "פרופיל",
    
    // --- Auth (Login) ---
    login_title: "התחברות למערכת",
    login_email: "כתובת אימייל",
    login_password: "סיסמה",
    login_btn: "כניסה למערכת",
    login_failed: "אימייל או סיסמה שגויים",
    server_error: "שגיאת שרת",

    // --- General Actions ---
    save: "שמור",
    cancel: "ביטול",
    delete: "מחק",
    edit: "ערוך",
    confirm: "אישור",
    save_changes: "שמור שינויים",
    
    // --- Tasks Tab ---
    task_management_title: "ניהול משימות",
    tab_todo: "לביצוע",
    tab_waiting: "ממתין לאישור",
    tab_completed: "היסטוריה",
    view_daily: "יומי",
    view_weekly: "שבועי",
    view_calendar: "יומן",
    
    // --- Task Messages / Status ---
    no_tasks_today: "אין משימות להיום! עבודה טובה.",
    no_tasks_waiting: "אין משימות הממתינות לאישורך.",
    no_tasks_completed: "עדיין אין משימות שהושלמו.",
    tasks_for_date: "משימות לתאריך",
    urgent_label: "דחוף",
    normal_label: "רגיל",
    low_label: "נמוך",
    overdue: "באיחור",
    status_label: "סטטוס",
    urgent: "דחוף",
    task_done: "הושלם",

    // --- Task Card ---
    location: "מיקום",
    assigned_to: "באחריות",
    has_notes: "יש הערות",
    has_image: "יש תמונה",
    
    // --- Create Task Form ---
    create_new_task: "יצירת משימה חדשה",
    select_asset_title: "בחירת נכס לטיפול (אופציונלי)",
    category_label: "קטגוריה",
    specific_asset_label: "הנכס הספציפי",
    select_category: "בחר קטגוריה",
    select_category_first: "בחר קטגוריה תחילה",
    select_asset: "בחר נכס",
    no_assets_in_category: "אין נכסים בקטגוריה זו",
    task_title_label: "כותרת המשימה",
    task_title_placeholder: "לדוגמה: תיקון מזגן",
    description_label: "תיאור",
    description_placeholder: "הכנס פרטים כאן...",
    add_image: "הוסף תמונה",
    assign_to_label: "שייך לעובד",
    assign_self: "שייך לעצמי",
    urgency_label: "דחיפות",
    date_label: "תאריך יעד",
    recurring_task: "משימה מחזורית",
    recurring_weekly: "שבועי",
    recurring_monthly: "חודשי",
    day_of_month: "יום בחודש",
    select_location: "בחר מיקום",
    save_task_btn: "צור משימה",
    error_create_task: "שגיאה ביצירת המשימה",

    // --- Task Details Modal ---
    complete_task: "סיים משימה",
    complete_task_btn: "דווח ביצוע",
    followup_task_btn: "משימת המשך",
    approve_close_btn: "אשר וסגור",
    report_execution: "דיווח ביצוע משימה",
    what_was_done: "תאר מה בוצע בשטח...",
    upload_proof: "העלה תמונת הוכחה",
    send_for_approval: "שלח לאישור",
    new_date: "תאריך יעד חדש",
    manager_notes: "הערות מנהל",
    worker_report: "דיווח עובד",
    alert_required: "שדה חובה",
    alert_sent: "נשלח בהצלחה!",
    alert_approved: "אושר בהצלחה!",
    alert_created: "נוצר בהצלחה!",

    // --- Days ---
    day_0: "ראשון", day_1: "שני", day_2: "שלישי", day_3: "רביעי", day_4: "חמישי", day_5: "שישי", day_6: "שבת",

    // --- Team Tab ---
    add_team_member: "הוסף איש צוות",
    ceo_role: "מנכ״ל",
    workers_suffix: "עובדים",
    workers_under: "עובדים תחת",
    confirm_delete_user: "האם למחוק משתמש זה?",
    error_delete: "שגיאה במחיקה",
    edit_details_title: "עריכת פרטים",
    full_name_label: "שם מלא",
    email_label: "אימייל",
    password_placeholder_edit: "סיסמה (השאר ריק כדי לא לשנות)",
    assign_to_manager: "שייך למנהל",
    no_manager: "ללא מנהל",
    alert_update_success: "העדכון בוצע בהצלחה!",
    alert_update_error: "שגיאה בעדכון",

    // --- Add User Form ---
    add_new_user_title: "הוספת איש צוות חדש",
    user_created_success: "משתמש נוצר בהצלחה!",
    error_create_user: "שגיאה ביצירת משתמש",
    password_label: "סיסמה ראשונית",
    role_label: "תפקיד",
    role_employee: "עובד רגיל",
    role_manager: "מנהל אזור",
    select_manager: "בחר מנהל",
    create_btn: "צור משתמש",
    creating: "יוצר...",

    // --- Configuration Tab ---
    config_title: "הגדרות ונכסים",
    assets_tab: "נכסים",
    categories_tab: "קטגוריות",
    category_placeholder: "שם קטגוריה חדשה (למשל: מוצרי חשמל)",
    category_added: "קטגוריה נוספה!",
    error_adding_category: "שגיאה בהוספת קטגוריה",
    no_categories: "אין קטגוריות עדיין",
    add_new_asset: "הוספת נכס חדש",
    asset_name_placeholder: "שם הנכס (למשל: תנור פיצה)",
    asset_code_placeholder: "קוד ייחודי (למשל: OVN-324)",
    save_asset_btn: "שמור נכס",
    asset_created: "נכס נוצר בהצלחה!",
    error_creating_asset: "שגיאה ביצירת נכס",
    fill_all_fields: "אנא מלא את כל השדות",
    no_assets: "אין נכסים עדיין. צור קטגוריות קודם!",

    // --- excel export and import ---
    export_data: "ייצוא נתונים",
    import_data: "ייבוא נתונים",
    available_fields: "שדות זמינים",
    fields_to_export: "שדות לייצוא",
    upload_instruction: "העלה קובץ אקסל לעדכון או יצירת משימות.",
    test_import: "בדיקת קובץ",
    test_passed: "הקובץ תקין!",
    test_failed: "נמצאו שגיאות",
    ready_to_import: "מוכן לייבוא.",
    fix_errors: "אנא תקן את השגיאות למטה.",
    download_excel: "הורד אקסל",
    execute_import: "בצע ייבוא",
    select_fields_error: "יש לבחור לפחות שדה אחד",
    confirm_import: "האם אתה בטוח? הפעולה תעדכן את מסד הנתונים.",
    export_update_mode: "אני רוצה לעדכן נתונים (ייצוא תואם ייבוא)",

    // --- update location tab ---
    manager_label: "המנהל הישיר",
    image_url_label: "קישור לתמונה",
    confirm_delete: "האם למחוק פריט זה?",
    error_delete_in_use: "לא ניתן למחוק: הפריט משויך למשימות קיימות.",
    location_placeholder: "שם מיקום חדש",
    asset_name: "שם הנכס",
    general_task: "משימה כללית",
    no_location: "ללא מיקום",

    // --- update yearly option ---
    yearly: "שנתי",
    day_of_month: "יום בחודש",
    month: "חודש",
    day: "יום",

    // --- תוספות חדשות ---
    phone: "טלפון",
    phone_label: "מספר טלפון",
    excel_center: "מרכז אקסל",
    export_data: "ייצוא נתונים",
    import_data: "ייבוא / עדכון",
    filters: "סינון",
    date_range: "טווח תאריכים",
    employee: "עובד",
    export_for_update: "מצב עדכון (כולל עמודת ID)",
    delete_all_tasks: "מחק את כל המשימות",
    instructions: "הוראות:",
    click_upload: "לחץ להעלאת קובץ אקסל",
    execute_import: "בצע ייבוא עכשיו",
    viewing_as: "צופה בתור",
    edit_profile_btn: "ערוך פרופיל",
    password_placeholder_edit: "סיסמה חדשה (אופציונלי)",
    password_security_note: "הסיסמה הישנה מוסתרת לביטחון",
    error_code_exists: "⚠️ שגיאה: קוד נכס זה כבר קיים במערכת!",
    error_category_exists: "⚠️ שגיאה: שם קטגוריה זה כבר קיים.",
    error_location_exists: "⚠️ שגיאה: שם מיקום זה כבר קיים.",
    fill_all_fields: "נא למלא את כל השדות",
    alert_update_success: "הפרופיל עודכן בהצלחה!",
    alert_update_error: "שגיאה בעדכון הפרופיל",
    confirm_delete_user: "האם אתה בטוח שברצונך למחוק משתמש זה?",
    save_asset_btn: "שמור נכס",
    asset_name_placeholder: "שם הנכס",
    asset_code_placeholder: "קוד פנימי",
    category_placeholder: "שם קטגוריה חדשה",
    location_placeholder: "שם מיקום חדש",

    // ...
    optional: "אופציונלי",
    phone: "טלפון",
    logout: "התנתק",
    view_daily: "יומי",
    view_weekly: "שבועי",
    view_monthly: "חודשי",
    view_yearly: "שנתי",
    view_waiting: "ממתין לאישור",
    view_history: "היסטוריה",
    task_singular: "משימה",
    tasks_plural: "משימות",
    urgent: "דחוף",
    normal: "רגיל",
    nav_locations: "מיקומים", // התיקון שביקשת
    // ...

    // --- Profile Tab ---
    edit_profile_btn: "ערוך פרופיל",
    password_security_note: "הסיסמה הישנה מוסתרת מטעמי אבטחה"
  },

  // --- Thai ---
  th: {
    // --- Navigation ---
    app_name: "แอพซ่อมบำรุง",
    nav_tasks: "งาน",
    nav_team: "ทีมของฉัน",
    nav_config: "การตั้งค่า",
    nav_profile: "โปรไฟล์",
    
    // --- Auth (Login) ---
    login_title: "ลงชื่อเข้าใช้บัญชีของคุณ",
    login_email: "ที่อยู่อีเมล",
    login_password: "รหัสผ่าน",
    login_btn: "ลงชื่อเข้าใช้",
    login_failed: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    server_error: "ข้อผิดพลาดของเซิร์ฟเวอร์",

    // --- General Actions ---
    save: "บันทึก",
    cancel: "ยกเลิก",
    delete: "ลบ",
    edit: "แก้ไข",
    confirm: "ยืนยัน",
    save_changes: "บันทึกการเปลี่ยนแปลง",
    
    // --- Tasks Tab ---
    task_management_title: "การจัดการงาน",
    tab_todo: "ต้องทำ",
    tab_waiting: "รออนุมัติ",
    tab_completed: "ประวัติ",
    view_daily: "รายวัน",
    view_weekly: "รายสัปดาห์",
    view_calendar: "ปฏิทิน",
    
    // --- Task Messages / Status ---
    no_tasks_today: "วันนี้ไม่มีงาน! ทำได้ดีมาก",
    no_tasks_waiting: "ไม่มีงานที่รอการอนุมัติ",
    no_tasks_completed: "ยังไม่มีงานที่เสร็จสมบูรณ์",
    tasks_for_date: "งานสำหรับวันที่",
    urgent_label: "ด่วน",
    normal_label: "ปกติ",
    low_label: "ต่ำ",
    overdue: "เกินกำหนด",
    status_label: "สถานะ",
    urgent: "ด่วน",
    task_done: "เสร็จสมบูรณ์",

    // --- Task Card ---
    location: "สถานที่",
    assigned_to: "ผู้รับผิดชอบ",
    has_notes: "มีบันทึก",
    has_image: "มีรูปภาพ",
    
    // --- Create Task Form ---
    create_new_task: "สร้างงานใหม่",
    select_asset_title: "เลือกทรัพย์สิน (ไม่บังคับ)",
    category_label: "หมวดหมู่",
    specific_asset_label: "ทรัพย์สินเฉพาะ",
    select_category: "เลือกหมวดหมู่",
    select_category_first: "เลือกหมวดหมู่ก่อน",
    select_asset: "เลือกทรัพย์สิน",
    no_assets_in_category: "ไม่มีทรัพย์สินในหมวดหมู่นี้",
    task_title_label: "หัวข้องาน",
    task_title_placeholder: "เช่น ซ่อมแอร์",
    description_label: "รายละเอียด",
    description_placeholder: "ใส่รายละเอียดที่นี่...",
    add_image: "เพิ่มรูปภาพ",
    assign_to_label: "มอบหมายให้",
    assign_self: "มอบหมายให้ตัวเอง",
    urgency_label: "ความเร่งด่วน",
    date_label: "วันที่กำหนด",
    recurring_task: "งานที่ทำซ้ำ",
    recurring_weekly: "รายสัปดาห์",
    recurring_monthly: "รายเดือน",
    day_of_month: "วันที่ของเดือน",
    select_location: "เลือกสถานที่",
    save_task_btn: "สร้างงาน",
    error_create_task: "เกิดข้อผิดพลาดในการสร้างงาน",

    // --- Task Details Modal ---
    complete_task: "เสร็จสิ้นงาน",
    complete_task_btn: "รายงานการเสร็จสิ้น",
    followup_task_btn: "งานติดตามผล",
    approve_close_btn: "อนุมัติและปิดงาน",
    report_execution: "รายงานการปฏิบัติงาน",
    what_was_done: "อธิบายสิ่งที่ได้ทำไป...",
    upload_proof: "อัปโหลดรูปภาพหลักฐาน",
    send_for_approval: "ส่งเพื่ออนุมัติ",
    new_date: "กำหนดวันเสร็จใหม่",
    manager_notes: "บันทึกจากผู้จัดการ",
    worker_report: "รายงานจากพนักงาน",
    alert_required: "จำเป็นต้องระบุ",
    alert_sent: "ส่งเรียบร้อยแล้ว!",
    alert_approved: "อนุมัติเรียบร้อยแล้ว!",
    alert_created: "สร้างเรียบร้อยแล้ว!",

    // --- Days ---
    day_0: "วันอาทิตย์", day_1: "วันจันทร์", day_2: "วันอังคาร", day_3: "วันพุธ", day_4: "วันพฤหัสบดี", day_5: "วันศุกร์", day_6: "วันเสาร์",

    // --- Team Tab ---
    add_team_member: "เพิ่มสมาชิกในทีม",
    ceo_role: "ซีอีโอ",
    workers_suffix: "พนักงาน",
    workers_under: "พนักงานภายใต้",
    confirm_delete_user: "คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?",
    error_delete: "เกิดข้อผิดพลาดในการลบ",
    edit_details_title: "แก้ไขรายละเอียด",
    full_name_label: "ชื่อเต็ม",
    email_label: "อีเมล",
    password_placeholder_edit: "รหัสผ่าน (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)",
    assign_to_manager: "มอบหมายให้ผู้จัดการ",
    no_manager: "ไม่มีผู้จัดการ",
    alert_update_success: "อัปเดตสำเร็จ!",
    alert_update_error: "เกิดข้อผิดพลาดในการอัปเดต",

    // --- Add User Form ---
    add_new_user_title: "เพิ่มสมาชิกในทีมใหม่",
    user_created_success: "สร้างผู้ใช้สำเร็จ!",
    error_create_user: "เกิดข้อผิดพลาดในการสร้างผู้ใช้",
    password_label: "รหัสผ่านเริ่มต้น",
    role_label: "บทบาท",
    role_employee: "พนักงาน",
    role_manager: "ผู้จัดการ",
    select_manager: "เลือกผู้จัดการ",
    create_btn: "สร้างผู้ใช้",
    creating: "กำลังสร้าง...",

    // --- Configuration Tab ---
    config_title: "การตั้งค่าและทรัพย์สิน",
    assets_tab: "ทรัพย์สิน",
    categories_tab: "หมวดหมู่",
    category_placeholder: "ชื่อหมวดหมู่ใหม่",
    category_added: "เพิ่มหมวดหมู่แล้ว!",
    error_adding_category: "เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่",
    no_categories: "ยังไม่มีหมวดหมู่",
    add_new_asset: "เพิ่มทรัพย์สินใหม่",
    asset_name_placeholder: "ชื่อทรัพย์สิน",
    asset_code_placeholder: "รหัสเฉพาะ",
    save_asset_btn: "บันทึกทรัพย์สิน",
    asset_created: "สร้างทรัพย์สินสำเร็จ!",
    error_creating_asset: "เกิดข้อผิดพลาดในการสร้างทรัพย์สิน",
    fill_all_fields: "กรุณากรอกข้อมูลให้ครบถ้วน",
    no_assets: "ยังไม่มีทรัพย์สิน สร้างหมวดหมู่ก่อน!",

    // --- excel export and import ---
    export_data: "ส่งออกข้อมูล",
    import_data: "นำเข้าข้อมูล",
    available_fields: "ฟิลด์ที่มีอยู่",
    fields_to_export: "ฟิลด์ที่จะส่งออก",
    upload_instruction: "อัปโหลดไฟล์ Excel เพื่ออัปเดตหรือสร้างงาน",
    test_import: "ทดสอบการนำเข้า",
    test_passed: "ทุกอย่างดูดี!",
    test_failed: "พบปัญหา",
    ready_to_import: "พร้อมนำเข้า",
    fix_errors: "โปรดแก้ไขข้อผิดพลาดด้านล่าง",
    download_excel: "ดาวน์โหลด Excel",
    execute_import: "นำเข้าข้อมูล",
    select_fields_error: "เลือกอย่างน้อยหนึ่งฟิลด์",
    confirm_import: "คุณแน่ใจหรือไม่? นี่จะเป็นการอัปเดตฐานข้อมูล",
    export_update_mode: "ฉันต้องการอัปเดตข้อมูล (ส่งออกที่เข้ากันได้กับการนำเข้า)",

    // --- update location tab ---
    manager_label: "ผู้จัดการของผู้ปฏิบัติงาน",
    image_url_label: "ลิงก์รูปภาพ",
    confirm_delete: "คุณแน่ใจหรือไม่ว่าต้องการลบ?",
    error_delete_in_use: "ไม่สามารถลบได้: รายการนี้ถูกใช้งานอยู่",
    location_placeholder: "ชื่อสถานที่ใหม่",
    asset_name: "ชื่อทรัพย์สิน",
    general_task: "งานทั่วไป",
    no_location: "ไม่มีสถานที่",

    // --- update yearly option ---
    yearly: "รายปี",
    day_of_month: "วันที่ของเดือน",
    month: "เดือน",
    day: "วัน",

    // --- เพิ่มใหม่ ---
    phone: "โทรศัพท์",
    phone_label: "เบอร์โทรศัพท์",
    excel_center: "ศูนย์ Excel",
    export_data: "ส่งออกข้อมูล",
    import_data: "นำเข้า / อัปเดต",
    filters: "ตัวกรอง",
    date_range: "ช่วงวันที่",
    employee: "พนักงาน",
    export_for_update: "ฉันต้องการอัปเดตข้อมูล (รวม ID)",
    delete_all_tasks: "ลบงานทั้งหมด",
    instructions: "คำแนะนำ:",
    click_upload: "คลิกเพื่ออัปโหลด Excel",
    execute_import: "นำเข้าทันที",
    viewing_as: "กำลังดูในฐานะ",
    edit_profile_btn: "แก้ไขโปรไฟล์",
    password_placeholder_edit: "รหัสผ่านใหม่ (ไม่บังคับ)",
    password_security_note: "รหัสผ่านเก่าถูกซ่อนเพื่อความปลอดภัย",
    error_code_exists: "⚠️ ข้อผิดพลาด: รหัสทรัพย์สินนี้มีอยู่แล้ว!",
    error_category_exists: "⚠️ ข้อผิดพลาด: ชื่อหมวดหมู่นี้มีอยู่แล้ว",
    error_location_exists: "⚠️ ข้อผิดพลาด: ชื่อสถานที่นี้มีอยู่แล้ว",
    fill_all_fields: "กรุณากรอกข้อมูลให้ครบถ้วน",
    alert_update_success: "อัปเดตโปรไฟล์เรียบร้อยแล้ว!",
    alert_update_error: "ข้อผิดพลาดในการอัปเดตโปรไฟล์",
    confirm_delete_user: "คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?",
    save_asset_btn: "บันทึกทรัพย์สิน",
    asset_name_placeholder: "ชื่อทรัพย์สิน",
    asset_code_placeholder: "รหัสภายใน",
    category_placeholder: "ชื่อหมวดหมู่ใหม่",
    location_placeholder: "ชื่อสถานที่ใหม่",

    // --- New Additions (Thai) ---
    optional: "ไม่บังคับ",  // Optional
    phone: "โทรศัพท์", // Phone
    phone_label: "เบอร์โทรศัพท์", // Phone Number label
    logout: "ออกจากระบบ", // Logout
    
    // Views
    view_daily: "รายวัน", // Daily
    view_weekly: "รายสัปดาห์", // Weekly
    view_monthly: "รายเดือน", // Monthly
    view_yearly: "รายปี", // Yearly
    view_waiting: "รออนุมัติ", // Waiting
    view_history: "ประวัติ", // History
    
    // Task details
    task_singular: "งาน", // Task
    tasks_plural: "งาน", // Tasks
    urgent: "ด่วน", // Urgent
    normal: "ปกติ", // Normal
    nav_locations: "สถานที่", // Locations
    
    // Profile & General
    edit_profile_btn: "แก้ไขโปรไฟล์", // Edit Profile
    password_placeholder_edit: "รหัสผ่านใหม่ (ไม่บังคับ)", // New Password
    password_security_note: "รหัสผ่านเก่าถูกซ่อนเพื่อความปลอดภัย", // Old password hidden
    
    // Alerts & Errors
    error_code_exists: "⚠️ ข้อผิดพลาด: รหัสทรัพย์สินนี้มีอยู่แล้ว!",
    error_category_exists: "⚠️ ข้อผิดพลาด: ชื่อหมวดหมู่นี้มีอยู่แล้ว",
    error_location_exists: "⚠️ ข้อผิดพลาด: ชื่อสถานที่นี้มีอยู่แล้ว",
    fill_all_fields: "กรุณากรอกข้อมูลให้ครบถ้วน",
    alert_update_success: "อัปเดตโปรไฟล์เรียบร้อยแล้ว!",
    alert_update_error: "ข้อผิดพลาดในการอัปเดตโปรไฟล์",
    confirm_delete_user: "คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?",
    
    // Config Forms
    save_asset_btn: "บันทึกทรัพย์สิน",
    asset_name_placeholder: "ชื่อทรัพย์สิน",
    asset_code_placeholder: "รหัสภายใน",
    category_placeholder: "ชื่อหมวดหมู่ใหม่",
    location_placeholder: "ชื่อสถานที่ใหม่",
    
    // Task Actions
    complete_task_btn: "แจ้งงานเสร็จ",
    followup_task_btn: "สร้างงานต่อเนื่อง",
    approve_close_btn: "อนุมัติและปิดงาน",
    report_execution: "รายงานผลการปฏิบัติงาน",
    what_was_done: "ทำอะไรไปบ้าง...",
    upload_proof: "อัปโหลดหลักฐาน",
    send_for_approval: "ส่งขออนุมัติ",
    new_date: "วันที่กำหนดใหม่",
    alert_sent: "ส่งสำเร็จ!",
    manager_notes: "บันทึกจากผู้จัดการ",
    worker_report: "รายงานจากพนักงาน",

    // --- Profile Tab ---
    edit_profile_btn: "แก้ไขโปรไฟล์",
    password_security_note: "รหัสผ่านเก่าถูกซ่อนเพื่อความปลอดภัย"
  }
};