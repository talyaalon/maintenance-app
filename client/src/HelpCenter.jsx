import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

/* ─────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────── */

/** Uses React state for error handling — avoids fragile nextSibling DOM walk. */
const ManualImage = ({ filename, alt }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="my-4 flex items-center justify-center gap-2 bg-gray-100 border border-dashed border-gray-300 rounded-xl p-6 text-gray-400 text-sm">
        <span>🖼️</span>
        <span>{filename}</span>
      </div>
    );
  }
  return (
    <div className="my-4">
      <img
        src={`/manual-assets/${filename}`}
        alt={alt}
        style={{
          maxWidth: '100%',
          borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          margin: '8px auto',
          display: 'block',
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
};

const Section = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-700 leading-relaxed space-y-3 border-t border-gray-50">
          {children}
        </div>
      )}
    </div>
  );
};

const Step = ({ n, text }) => (
  <div className="flex gap-3 items-start">
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#714B67] text-white text-xs flex items-center justify-center font-bold mt-0.5">
      {n}
    </span>
    <span>{text}</span>
  </div>
);

const Tip = ({ children }) => (
  <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs">
    <span className="text-base leading-none mt-0.5">💡</span>
    <span>{children}</span>
  </div>
);

const Note = ({ children }) => (
  <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800 text-xs">
    <span className="text-base leading-none mt-0.5">ℹ️</span>
    <span>{children}</span>
  </div>
);

/* ─────────────────────────────────────────────
   Data-driven renderer
───────────────────────────────────────────── */

const renderItem = (item, i) => {
  switch (item.type) {
    case 'p':
      return item.html
        ? <p key={i} dangerouslySetInnerHTML={{ __html: item.text }} />
        : <p key={i}>{item.text}</p>;
    case 'image':
      return <ManualImage key={i} filename={item.filename} alt={item.alt} />;
    case 'ul':
      return (
        <ul key={i} className="list-disc list-inside space-y-1 pl-1">
          {item.items.map((li, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: li }} />
          ))}
        </ul>
      );
    case 'step':
      return <Step key={i} n={item.n} text={item.text} />;
    case 'tip':
      return <Tip key={i}>{item.text}</Tip>;
    case 'note':
      return <Note key={i}>{item.text}</Note>;
    default:
      return null;
  }
};

const ManualRenderer = ({ sections }) => (
  <div>
    {sections.map((section, i) => (
      <Section key={i} title={section.title}>
        {section.items.map((item, j) => renderItem(item, j))}
      </Section>
    ))}
  </div>
);

/* ─────────────────────────────────────────────
   MANUAL DATA — BIG BOSS
───────────────────────────────────────────── */

const BIG_BOSS_MANUAL = {
  en: [
    {
      title: '1. Welcome & Logging In',
      items: [
        { type: 'p', html: true, text: 'As <strong>Big Boss</strong>, you have full administrative access to Air Manage. You can create and manage Departments, assign managers and employees, configure the system, and see every task across the entire organisation.' },
        { type: 'image', filename: 'bb_login_screen.png', alt: 'Big Boss Login Screen' },
        { type: 'p', html: true, text: '<strong>Forgot your password?</strong> Follow these steps to reset it:' },
        { type: 'step', n: 1, text: 'On the login screen, tap "Forgot Password?" beneath the login button.' },
        { type: 'step', n: 2, text: 'Enter your registered email address and tap "Send Reset Link".' },
        { type: 'step', n: 3, text: 'Check your email for the reset link and follow the instructions.' },
        { type: 'step', n: 4, text: 'Return to the app and log in with your new password.' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'Forgot Password Flow' },
        { type: 'p', text: 'Your bottom navigation has three tabs:' },
        { type: 'ul', items: ['<strong>Tasks</strong> — See all tasks across all departments.', '<strong>Departments</strong> — Create and manage departments &amp; their staff.', '<strong>Profile</strong> — Edit your personal details and preferences.'] },
      ],
    },
    {
      title: '2. Managing Departments',
      items: [
        { type: 'p', html: true, text: 'Navigate to the <strong>Departments</strong> tab to view all departments registered in the system.' },
        { type: 'step', n: 1, text: 'Tap the "Departments" tab at the bottom.' },
        { type: 'step', n: 2, text: 'Tap "+ Add Department" to create a new department.' },
        { type: 'step', n: 3, text: 'Enter the department name and optionally upload a logo.' },
        { type: 'step', n: 4, text: 'Tap "Save". The department appears in the list.' },
        { type: 'image', filename: 'dm_settings_tab_overview.png', alt: 'Department Settings Overview' },
        { type: 'p', text: 'To edit or delete a department, tap the pencil or trash icon on any department card.' },
        { type: 'tip', text: 'Each department is assigned a unique ID shown on its card — useful when contacting support.' },
      ],
    },
    {
      title: '3. Managing Managers & Employees',
      items: [
        { type: 'p', html: true, text: 'Inside each department card, tap <strong>View Details</strong> to open the department dashboard.' },
        { type: 'p', html: true, text: '<strong>Adding a New Employee:</strong>' },
        { type: 'step', n: 1, text: 'Open the department detail view and tap "Add Employee".' },
        { type: 'step', n: 2, text: "Fill in the employee's full name, email address, and set an initial password." },
        { type: 'step', n: 3, text: 'Select their role and preferred display language.' },
        { type: 'step', n: 4, text: 'Tap "Save". The employee can now log in using the email and password you set.' },
        { type: 'image', filename: 'bb_add_employee_form.png', alt: 'Add Employee Form' },
        { type: 'p', html: true, text: '<strong>Assigning Employees to a Manager:</strong>' },
        { type: 'step', n: 1, text: 'In the department detail view, tap "Assign Employees to Manager".' },
        { type: 'step', n: 2, text: 'Select the manager from the list.' },
        { type: 'step', n: 3, text: 'Check the employees you want to assign to that manager and tap "Save".' },
        { type: 'image', filename: 'bb_assign_employees_to_manager.png', alt: 'Assign Employees to Manager' },
        { type: 'p', html: true, text: "<strong>Editing an Employee's Password:</strong>" },
        { type: 'step', n: 1, text: 'Find the employee card and tap the edit (pencil) icon.' },
        { type: 'step', n: 2, text: 'Enter the new password in the password field and tap "Save".' },
        { type: 'note', text: "Managers can only see employees assigned to them. Always inform the employee of their new password after resetting it." },
      ],
    },
    {
      title: '4. Viewing, Searching & Filtering Tasks',
      items: [
        { type: 'p', html: true, text: 'In the <strong>Tasks</strong> tab you see every task in the system regardless of department.' },
        { type: 'p', text: 'Task status tabs:' },
        { type: 'ul', items: ['<strong>Overdue</strong> — Past-due tasks that need immediate attention.', '<strong>To Do</strong> — Upcoming or current tasks.', '<strong>Waiting Approval</strong> — Tasks completed by employees awaiting sign-off.', '<strong>History</strong> — All completed tasks.'] },
        { type: 'p', html: true, text: '<strong>Search & Filter:</strong>' },
        { type: 'step', n: 1, text: 'Tap the search bar at the top and type a task name or keyword.' },
        { type: 'step', n: 2, text: 'Tap the filter icon (funnel) to open the filter panel.' },
        { type: 'step', n: 3, text: 'Apply filters: Priority, Status, Department, Location, Category, or Date Range.' },
        { type: 'step', n: 4, text: 'Tap "Apply" to see filtered results, or "Clear" to reset all filters.' },
        { type: 'image', filename: 'shared_tasks_filter_panel.png', alt: 'Tasks Filter Panel' },
        { type: 'p', html: true, text: '<strong>Bulk Actions:</strong> Select multiple tasks to delete or mark done at once.' },
        { type: 'step', n: 1, text: 'Long-press any task card to enter selection mode. Checkboxes appear on all cards.' },
        { type: 'step', n: 2, text: 'Tap additional cards to add them to your selection.' },
        { type: 'step', n: 3, text: 'Use the action bar at the bottom to "Mark Done" or "Delete" all selected tasks.' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'Bulk Task Operations' },
        { type: 'tip', text: 'Switch between Daily, Weekly, and Calendar view modes using the icons at the top of the Tasks tab.' },
      ],
    },
    {
      title: '5. Approving Completed & Stuck Tasks',
      items: [
        { type: 'step', n: 1, text: 'Go to the "Waiting Approval" tab in Tasks.' },
        { type: 'step', n: 2, text: 'Tap a task card to open its details.' },
        { type: 'p', html: true, text: '<strong>Approving a "Done" task:</strong> Review the completion notes and any uploaded photos. Tap "Approve" to move it to History, or "Reject" to return it to the employee with your feedback.' },
        { type: 'p', html: true, text: '<strong>Handling a "Stuck" task:</strong> A stuck task means the employee hit a blocker (e.g., needs budget approval, an external contractor, or a manager decision). Review their explanation, take the necessary external action, then tap "Approve" to close the task or "Reject" to reassign it with instructions.' },
        { type: 'note', text: "Stuck tasks require your active intervention — the employee cannot proceed until you act. Rejected tasks return to the employee's To Do list with your feedback note." },
      ],
    },
    {
      title: '6. Creating, Assigning & Managing Recurring Tasks',
      items: [
        { type: 'step', n: 1, text: 'In the Tasks tab, tap the "+" button (bottom right).' },
        { type: 'step', n: 2, text: 'Fill in the title, description, priority, location, category, and due date.' },
        { type: 'step', n: 3, text: 'Assign the task to one or more employees.' },
        { type: 'step', n: 4, text: 'Optionally set a recurrence (daily, weekly, monthly, quarterly, yearly).' },
        { type: 'step', n: 5, text: 'Tap "Create Task".' },
        { type: 'p', html: true, text: '<strong>Deleting a Recurring Task Series — "Delete Set":</strong>' },
        { type: 'p', text: 'When you open a recurring task, you will see both "Delete" and "Delete Set" options.' },
        { type: 'ul', items: ['<strong>Delete</strong> — Removes only this single occurrence.', '<strong>Delete Set</strong> — Permanently removes the ENTIRE recurring series. All future instances are deleted.'] },
        { type: 'step', n: 1, text: 'Open the recurring task you wish to remove.' },
        { type: 'step', n: 2, text: 'Tap the delete icon or menu.' },
        { type: 'step', n: 3, text: 'Choose "Delete Set" to remove the whole series.' },
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'Delete Recurring Task Set' },
        { type: 'tip', text: 'Use "Delete Set" only when the recurring task is permanently retired. To skip just one occurrence, use single Delete instead.' },
      ],
    },
    {
      title: '7. Excel Import & Export',
      items: [
        { type: 'p', text: 'Air Manage supports bulk task import and export via Excel.' },
        { type: 'step', n: 1, text: 'In the Tasks tab, tap the Excel/Export button in the toolbar.' },
        { type: 'step', n: 2, text: 'Choose "Export" to download current tasks, or "Import" to upload a filled template.' },
        { type: 'step', n: 3, text: 'Use the column filters (date range, status, department) before exporting.' },
        { type: 'tip', text: 'Download the template first to ensure column headers match the expected format.' },
      ],
    },
    {
      title: '8. System Configuration & Auto-Approve',
      items: [
        { type: 'p', html: true, text: 'The <strong>Config</strong> tab (accessible only to Big Boss) lets you configure system-wide settings such as task categories, locations, assets, and notification channels.' },
        { type: 'p', text: 'From here you can:' },
        { type: 'ul', items: ['Add / edit task <strong>Categories</strong>.', 'Add / edit <strong>Locations</strong> (buildings, floors, zones).', 'Manage <strong>Assets</strong> linked to maintenance tasks.', 'Configure <strong>LINE Notification</strong> channels per team.'] },
        { type: 'p', html: true, text: '<strong>Auto-Approve Setting:</strong> The <strong>Auto-Approve</strong> toggle on each manager card controls how employee task completions are handled.' },
        { type: 'ul', items: ['<strong>Auto-Approve OFF (default):</strong> When an employee taps "Mark as Done", the task moves to <strong>Waiting Approval</strong> and requires manual manager review.', '<strong>Auto-Approve ON:</strong> When an employee taps "Mark as Done", the task bypasses the approval queue and goes directly to <strong>History</strong>.'] },
        { type: 'note', text: 'Auto-Approve applies only to "Mark as Done" completions. Tasks marked as "Stuck" always require manual manager review regardless of this setting.' },
        { type: 'image', filename: 'bb_manager_permission_settings.png', alt: 'Manager Permission Settings with Auto-Approve Toggle' },
      ],
    },
    {
      title: '9. Profile & Language Settings',
      items: [
        { type: 'p', html: true, text: 'Go to the <strong>Profile</strong> tab to update your name, email, phone, password, and profile picture.' },
        { type: 'step', n: 1, text: 'Tap the Profile tab.' },
        { type: 'step', n: 2, text: 'Tap "Edit" next to any field or tap your avatar to upload a new photo.' },
        { type: 'step', n: 3, text: 'Choose your preferred display language (English, Hebrew, Thai) from the language selector in the top-right header.' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'Profile Tab' },
      ],
    },
  ],

  he: [
    {
      title: '1. ברוכים הבאים וכניסה למערכת',
      items: [
        { type: 'p', html: true, text: 'כ<strong>Big Boss</strong>, יש לך גישה מנהלית מלאה ל-Air Manage. תוכל ליצור ולנהל מחלקות, להקצות מנהלים ועובדים, להגדיר את המערכת ולצפות בכל משימה בכל הארגון.' },
        { type: 'image', filename: 'bb_login_screen.png', alt: 'מסך כניסה של Big Boss' },
        { type: 'p', html: true, text: '<strong>שכחת את הסיסמה?</strong> עקוב אחר השלבים הבאים לאיפוסה:' },
        { type: 'step', n: 1, text: 'במסך הכניסה, לחץ על "שכחתי סיסמה" מתחת לכפתור הכניסה.' },
        { type: 'step', n: 2, text: 'הכנס את כתובת האימייל הרשומה שלך ולחץ "שלח קישור לאיפוס".' },
        { type: 'step', n: 3, text: 'בדוק את תיבת האימייל שלך לקישור האיפוס ועקוב אחר ההוראות.' },
        { type: 'step', n: 4, text: 'חזור לאפליקציה והתחבר עם הסיסמה החדשה שלך.' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'תהליך שחזור סיסמה' },
        { type: 'p', text: 'בניווט התחתון שלך שלוש לשוניות:' },
        { type: 'ul', items: ['<strong>משימות</strong> — ראה את כל המשימות בכל המחלקות.', '<strong>מחלקות</strong> — צור ונהל מחלקות וצוותיהן.', '<strong>פרופיל</strong> — ערוך את הפרטים האישיים שלך.'] },
      ],
    },
    {
      title: '2. ניהול מחלקות',
      items: [
        { type: 'p', html: true, text: 'עבור ללשונית <strong>מחלקות</strong> לצפייה בכל המחלקות הרשומות במערכת.' },
        { type: 'step', n: 1, text: 'לחץ על לשונית "מחלקות" בתחתית.' },
        { type: 'step', n: 2, text: 'לחץ על "+ הוסף מחלקה" ליצירת מחלקה חדשה.' },
        { type: 'step', n: 3, text: 'הכנס את שם המחלקה ואופציונלית העלה לוגו.' },
        { type: 'step', n: 4, text: 'לחץ "שמור". המחלקה תופיע ברשימה.' },
        { type: 'image', filename: 'dm_settings_tab_overview.png', alt: 'סקירת לשונית הגדרות המחלקה' },
        { type: 'p', text: 'לעריכה או מחיקה של מחלקה, לחץ על סמל העיפרון או הפח בכרטיס המחלקה.' },
        { type: 'tip', text: 'לכל מחלקה מוקצה מזהה ייחודי המוצג על הכרטיס — שימושי בעת פנייה לתמיכה.' },
      ],
    },
    {
      title: '3. ניהול מנהלים ועובדים',
      items: [
        { type: 'p', html: true, text: 'בתוך כרטיס המחלקה, לחץ על <strong>הצג פרטים</strong> לפתיחת לוח המחלקה.' },
        { type: 'p', html: true, text: '<strong>הוספת עובד חדש:</strong>' },
        { type: 'step', n: 1, text: 'פתח את תצוגת פרטי המחלקה ולחץ "הוסף עובד".' },
        { type: 'step', n: 2, text: 'מלא את שם המלא של העובד, כתובת אימייל, וקבע סיסמה ראשונית.' },
        { type: 'step', n: 3, text: 'בחר את תפקידם ושפת התצוגה המועדפת.' },
        { type: 'step', n: 4, text: 'לחץ "שמור". כעת העובד יכול להתחבר עם האימייל והסיסמה שקבעת.' },
        { type: 'image', filename: 'bb_add_employee_form.png', alt: 'טופס הוספת עובד' },
        { type: 'p', html: true, text: '<strong>שיוך עובדים למנהל:</strong>' },
        { type: 'step', n: 1, text: 'בתצוגת פרטי המחלקה, לחץ "שייך עובדים למנהל".' },
        { type: 'step', n: 2, text: 'בחר את המנהל מהרשימה.' },
        { type: 'step', n: 3, text: 'סמן את העובדים שברצונך לשייך למנהל זה ולחץ "שמור".' },
        { type: 'image', filename: 'bb_assign_employees_to_manager.png', alt: 'שיוך עובדים למנהל' },
        { type: 'p', html: true, text: '<strong>עריכת סיסמת עובד:</strong>' },
        { type: 'step', n: 1, text: 'מצא את כרטיס העובד ולחץ על סמל העיפרון (עריכה).' },
        { type: 'step', n: 2, text: 'הכנס סיסמה חדשה בשדה הסיסמה ולחץ "שמור".' },
        { type: 'note', text: 'מנהלים יכולים לראות רק עובדים המשויכים אליהם. הודע תמיד לעובד על הסיסמה החדשה לאחר איפוסה.' },
      ],
    },
    {
      title: '4. צפייה, חיפוש וסינון משימות',
      items: [
        { type: 'p', html: true, text: 'בלשונית <strong>משימות</strong> תראה כל משימה במערכת ללא קשר למחלקה.' },
        { type: 'p', text: 'לשוניות סטטוס משימה:' },
        { type: 'ul', items: ['<strong>באיחור</strong> — משימות שעברו את המועד, דרוש טיפול מיידי.', '<strong>לביצוע</strong> — משימות עתידיות או נוכחיות.', '<strong>ממתין לאישור</strong> — משימות שהושלמו על ידי עובדים וממתינות לחתימה.', '<strong>היסטוריה</strong> — כל המשימות שהושלמו.'] },
        { type: 'p', html: true, text: '<strong>חיפוש וסינון:</strong>' },
        { type: 'step', n: 1, text: 'לחץ על שורת החיפוש בראש המסך והקלד שם משימה או מילת מפתח.' },
        { type: 'step', n: 2, text: 'לחץ על סמל הסינון (משפך) לפתיחת לוח הסינון.' },
        { type: 'step', n: 3, text: 'החל סינונים: עדיפות, סטטוס, מחלקה, מיקום, קטגוריה, או טווח תאריכים.' },
        { type: 'step', n: 4, text: 'לחץ "החל" לצפייה בתוצאות, או "נקה" לאיפוס כל הסינונים.' },
        { type: 'image', filename: 'shared_tasks_filter_panel.png', alt: 'לוח סינון משימות' },
        { type: 'p', html: true, text: '<strong>פעולות מרובות:</strong> בחר מספר משימות למחיקה או סימון כהושלמו בבת אחת.' },
        { type: 'step', n: 1, text: 'לחץ לחיצה ארוכה על כרטיס משימה כלשהו לכניסה למצב בחירה. תיבות סימון יופיעו על כל הכרטיסים.' },
        { type: 'step', n: 2, text: 'לחץ על כרטיסים נוספים להוספתם לבחירה.' },
        { type: 'step', n: 3, text: 'השתמש בסרגל הפעולות בתחתית ל"סמן כהושלם" או "מחק" את כל המשימות שנבחרו.' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'פעולות מרובות על משימות' },
        { type: 'tip', text: 'עבור בין מצבי תצוגה יומי, שבועי ולוח שנה באמצעות הסמלים בראש לשונית המשימות.' },
      ],
    },
    {
      title: '5. אישור משימות שהושלמו ומשימות תקועות',
      items: [
        { type: 'step', n: 1, text: 'עבור ללשונית "ממתין לאישור" במשימות.' },
        { type: 'step', n: 2, text: 'לחץ על כרטיס משימה לפתיחת פרטיה.' },
        { type: 'p', html: true, text: '<strong>אישור משימה "הושלמה":</strong> עיין בהערות ובתמונות שהועלו. לחץ "אשר" להעברתה להיסטוריה, או "דחה" להחזרתה לעובד עם משוב.' },
        { type: 'p', html: true, text: '<strong>טיפול במשימה "תקועה":</strong> משימה תקועה פירושה שהעובד נתקל בחסם (למשל, נדרש אישור תקציבי, קבלן חיצוני, או החלטת מנהל). עיין בהסברו, נקוט פעולה חיצונית נדרשת, ולאחר מכן לחץ "אשר" לסגירת המשימה או "דחה" להקצאה מחדש עם הוראות.' },
        { type: 'note', text: 'משימות תקועות דורשות התערבות פעילה שלך — העובד לא יכול להמשיך עד שתנקוט פעולה. משימות שנדחו חוזרות לרשימת "לביצוע" של העובד עם הערת המשוב שלך.' },
      ],
    },
    {
      title: '6. יצירת, הקצאת וניהול משימות חוזרות',
      items: [
        { type: 'step', n: 1, text: 'בלשונית משימות, לחץ על כפתור "+" (פינה ימנית תחתונה).' },
        { type: 'step', n: 2, text: 'מלא את הכותרת, התיאור, העדיפות, המיקום, הקטגוריה ותאריך היעד.' },
        { type: 'step', n: 3, text: 'הקצה את המשימה לעובד אחד או יותר.' },
        { type: 'step', n: 4, text: 'אופציונלית הגדר חזרה (יומי, שבועי, חודשי, רבעוני, שנתי).' },
        { type: 'step', n: 5, text: 'לחץ "צור משימה".' },
        { type: 'p', html: true, text: '<strong>מחיקת סדרת משימה חוזרת — "מחק סט":</strong>' },
        { type: 'p', text: 'בעת פתיחת משימה חוזרת, תראה אפשרויות "מחק" ו"מחק סט".' },
        { type: 'ul', items: ['<strong>מחק</strong> — מסיר רק את המופע הבודד הזה.', '<strong>מחק סט</strong> — מוחק לצמיתות את כל הסדרה החוזרת. כל המופעים העתידיים יימחקו.'] },
        { type: 'step', n: 1, text: 'פתח את המשימה החוזרת שברצונך להסיר.' },
        { type: 'step', n: 2, text: 'לחץ על סמל המחיקה או התפריט.' },
        { type: 'step', n: 3, text: 'בחר "מחק סט" להסרת כל הסדרה.' },
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'מחיקת סדרת משימה חוזרת' },
        { type: 'tip', text: 'השתמש ב"מחק סט" רק כאשר המשימה החוזרת אינה נדרשת עוד. לדילוג על מופע בודד, השתמש ב"מחק" רגיל.' },
      ],
    },
    {
      title: '7. ייבוא וייצוא לאקסל',
      items: [
        { type: 'p', text: 'Air Manage תומכת בייבוא וייצוא משימות בכמות גדולה דרך Excel.' },
        { type: 'step', n: 1, text: 'בלשונית משימות, לחץ על כפתור Excel/ייצוא בסרגל הכלים.' },
        { type: 'step', n: 2, text: 'בחר "ייצוא" להורדת משימות קיימות, או "ייבוא" להעלאת תבנית ממולאת.' },
        { type: 'step', n: 3, text: 'השתמש במסנני העמודה (טווח תאריכים, סטטוס, מחלקה) לפני הייצוא.' },
        { type: 'tip', text: 'הורד את התבנית תחילה כדי לוודא שכותרות העמודות תואמות את הפורמט הנדרש.' },
      ],
    },
    {
      title: '8. הגדרות מערכת ואישור אוטומטי',
      items: [
        { type: 'p', html: true, text: 'לשונית <strong>הגדרות</strong> (נגישה רק ל-Big Boss) מאפשרת לקבוע הגדרות ברמת המערכת כגון קטגוריות משימות, מיקומים, נכסים וערוצי התראות.' },
        { type: 'p', text: 'מכאן תוכל:' },
        { type: 'ul', items: ['הוסף / ערוך <strong>קטגוריות</strong> משימות.', 'הוסף / ערוך <strong>מיקומים</strong> (בניינים, קומות, אזורים).', 'נהל <strong>נכסים</strong> המקושרים למשימות תחזוקה.', 'הגדר ערוצי <strong>התראות LINE</strong> לכל צוות.'] },
        { type: 'p', html: true, text: '<strong>הגדרת אישור אוטומטי:</strong> המתג <strong>אישור אוטומטי</strong> בכל כרטיס מנהל קובע כיצד מטופלות השלמות משימות של עובדים.' },
        { type: 'ul', items: ['<strong>אישור אוטומטי כבוי (ברירת מחדל):</strong> כאשר עובד לוחץ "סמן כהושלם", המשימה עוברת ל<strong>ממתין לאישור</strong> ודורשת בדיקה ידנית של המנהל.', '<strong>אישור אוטומטי פועל:</strong> כאשר עובד לוחץ "סמן כהושלם", המשימה עוקפת את תור האישור ועוברת ישירות ל<strong>היסטוריה</strong>.'] },
        { type: 'note', text: 'אישור אוטומטי חל רק על פעולות "סמן כהושלם". משימות המסומנות כ"תקועות" תמיד דורשות בדיקה ידנית של המנהל, ללא קשר להגדרה זו.' },
        { type: 'image', filename: 'bb_manager_permission_settings.png', alt: 'הגדרות הרשאות מנהל עם מתג אישור אוטומטי' },
      ],
    },
    {
      title: '9. הגדרות פרופיל ושפה',
      items: [
        { type: 'p', html: true, text: 'עבור ללשונית <strong>פרופיל</strong> לעדכון שמך, אימייל, טלפון, סיסמה ותמונת פרופיל.' },
        { type: 'step', n: 1, text: 'לחץ על לשונית פרופיל.' },
        { type: 'step', n: 2, text: 'לחץ "ערוך" ליד כל שדה או לחץ על האווטר שלך להעלאת תמונה חדשה.' },
        { type: 'step', n: 3, text: 'בחר את שפת התצוגה המועדפת (אנגלית, עברית, תאית) מבורר השפה בפינה הימנית העליונה של הכותרת.' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'לשונית פרופיל' },
      ],
    },
  ],

  th: [
    {
      title: '1. ยินดีต้อนรับและการเข้าสู่ระบบ',
      items: [
        { type: 'p', html: true, text: 'ในฐานะ<strong>Big Boss</strong> คุณมีสิทธิ์เข้าถึงระบบ Air Manage แบบเต็มรูปแบบ คุณสามารถสร้างและจัดการแผนก กำหนดผู้จัดการและพนักงาน กำหนดค่าระบบ และดูทุกงานทั่วทั้งองค์กร' },
        { type: 'image', filename: 'bb_login_screen.png', alt: 'หน้าเข้าสู่ระบบ Big Boss' },
        { type: 'p', html: true, text: '<strong>ลืมรหัสผ่าน?</strong> ทำตามขั้นตอนเหล่านี้เพื่อรีเซ็ต:' },
        { type: 'step', n: 1, text: 'บนหน้าเข้าสู่ระบบ แตะ "ลืมรหัสผ่าน?" ใต้ปุ่มเข้าสู่ระบบ' },
        { type: 'step', n: 2, text: 'ป้อนที่อยู่อีเมลที่ลงทะเบียนและแตะ "ส่งลิงก์รีเซ็ต"' },
        { type: 'step', n: 3, text: 'ตรวจสอบกล่องจดหมายอีเมลสำหรับลิงก์รีเซ็ตและทำตามคำแนะนำ' },
        { type: 'step', n: 4, text: 'กลับไปที่แอปและเข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'ขั้นตอนการรีเซ็ตรหัสผ่าน' },
        { type: 'p', text: 'แถบนำทางด้านล่างของคุณมีสามแท็บ:' },
        { type: 'ul', items: ['<strong>งาน</strong> — ดูงานทั้งหมดในทุกแผนก', '<strong>แผนก</strong> — สร้างและจัดการแผนกและพนักงาน', '<strong>โปรไฟล์</strong> — แก้ไขข้อมูลส่วนตัวและการตั้งค่า'] },
      ],
    },
    {
      title: '2. การจัดการแผนก',
      items: [
        { type: 'p', html: true, text: 'ไปที่แท็บ<strong>แผนก</strong>เพื่อดูแผนกทั้งหมดที่ลงทะเบียนในระบบ' },
        { type: 'step', n: 1, text: 'แตะแท็บ "แผนก" ที่ด้านล่าง' },
        { type: 'step', n: 2, text: 'แตะ "+ เพิ่มแผนก" เพื่อสร้างแผนกใหม่' },
        { type: 'step', n: 3, text: 'ป้อนชื่อแผนกและอัปโหลดโลโก้ (ไม่บังคับ)' },
        { type: 'step', n: 4, text: 'แตะ "บันทึก" แผนกจะปรากฏในรายการ' },
        { type: 'image', filename: 'dm_settings_tab_overview.png', alt: 'ภาพรวมแท็บการตั้งค่าแผนก' },
        { type: 'p', text: 'หากต้องการแก้ไขหรือลบแผนก ให้แตะไอคอนดินสอหรือถังขยะบนการ์ดแผนก' },
        { type: 'tip', text: 'แต่ละแผนกจะได้รับ ID เฉพาะที่แสดงบนการ์ด — มีประโยชน์เมื่อติดต่อฝ่ายสนับสนุน' },
      ],
    },
    {
      title: '3. การจัดการผู้จัดการและพนักงาน',
      items: [
        { type: 'p', html: true, text: 'ภายในการ์ดแผนก แตะ<strong>ดูรายละเอียด</strong>เพื่อเปิดแดชบอร์ดแผนก' },
        { type: 'p', html: true, text: '<strong>การเพิ่มพนักงานใหม่:</strong>' },
        { type: 'step', n: 1, text: 'เปิดมุมมองรายละเอียดแผนกและแตะ "เพิ่มพนักงาน"' },
        { type: 'step', n: 2, text: 'กรอกชื่อเต็มของพนักงาน ที่อยู่อีเมล และตั้งรหัสผ่านเริ่มต้น' },
        { type: 'step', n: 3, text: 'เลือกบทบาทและภาษาที่แสดงที่ต้องการ' },
        { type: 'step', n: 4, text: 'แตะ "บันทึก" ตอนนี้พนักงานสามารถเข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่คุณตั้งได้' },
        { type: 'image', filename: 'bb_add_employee_form.png', alt: 'แบบฟอร์มเพิ่มพนักงาน' },
        { type: 'p', html: true, text: '<strong>การมอบหมายพนักงานให้ผู้จัดการ:</strong>' },
        { type: 'step', n: 1, text: 'ในมุมมองรายละเอียดแผนก แตะ "มอบหมายพนักงานให้ผู้จัดการ"' },
        { type: 'step', n: 2, text: 'เลือกผู้จัดการจากรายการ' },
        { type: 'step', n: 3, text: 'เลือกพนักงานที่คุณต้องการมอบหมายให้ผู้จัดการคนนั้นและแตะ "บันทึก"' },
        { type: 'image', filename: 'bb_assign_employees_to_manager.png', alt: 'มอบหมายพนักงานให้ผู้จัดการ' },
        { type: 'p', html: true, text: '<strong>การแก้ไขรหัสผ่านพนักงาน:</strong>' },
        { type: 'step', n: 1, text: 'หาการ์ดพนักงานและแตะไอคอนแก้ไข (ดินสอ)' },
        { type: 'step', n: 2, text: 'ป้อนรหัสผ่านใหม่ในช่องรหัสผ่านและแตะ "บันทึก"' },
        { type: 'note', text: 'ผู้จัดการสามารถเห็นเฉพาะพนักงานที่ถูกมอบหมายให้กับตนเท่านั้น แจ้งพนักงานเสมอเกี่ยวกับรหัสผ่านใหม่หลังจากรีเซ็ต' },
      ],
    },
    {
      title: '4. การดู ค้นหา และกรองงาน',
      items: [
        { type: 'p', html: true, text: 'ในแท็บ<strong>งาน</strong> คุณจะเห็นทุกงานในระบบโดยไม่คำนึงถึงแผนก' },
        { type: 'p', text: 'แท็บสถานะงาน:' },
        { type: 'ul', items: ['<strong>เกินกำหนด</strong> — งานที่เลยกำหนดซึ่งต้องการความสนใจทันที', '<strong>รอดำเนินการ</strong> — งานปัจจุบันหรืองานที่กำลังจะมาถึง', '<strong>รออนุมัติ</strong> — งานที่พนักงานทำเสร็จแล้วรอการลงนาม', '<strong>ประวัติ</strong> — งานที่เสร็จสิ้นทั้งหมด'] },
        { type: 'p', html: true, text: '<strong>การค้นหาและกรอง:</strong>' },
        { type: 'step', n: 1, text: 'แตะแถบค้นหาที่ด้านบนและพิมพ์ชื่องานหรือคำสำคัญ' },
        { type: 'step', n: 2, text: 'แตะไอคอนกรอง (กรวย) เพื่อเปิดแผงกรอง' },
        { type: 'step', n: 3, text: 'ใช้ตัวกรอง: ความสำคัญ สถานะ แผนก สถานที่ หมวดหมู่ หรือช่วงวันที่' },
        { type: 'step', n: 4, text: 'แตะ "ใช้" เพื่อดูผลลัพธ์ที่กรองแล้ว หรือ "ล้าง" เพื่อรีเซ็ตตัวกรองทั้งหมด' },
        { type: 'image', filename: 'shared_tasks_filter_panel.png', alt: 'แผงกรองงาน' },
        { type: 'p', html: true, text: '<strong>การดำเนินการหลายรายการ:</strong> เลือกหลายงานเพื่อลบหรือทำเครื่องหมายว่าเสร็จแล้วในครั้งเดียว' },
        { type: 'step', n: 1, text: 'กดค้างที่การ์ดงานใดก็ได้เพื่อเข้าสู่โหมดการเลือก ช่องทำเครื่องหมายจะปรากฏบนทุกการ์ด' },
        { type: 'step', n: 2, text: 'แตะการ์ดเพิ่มเติมเพื่อเพิ่มในการเลือก' },
        { type: 'step', n: 3, text: 'ใช้แถบการดำเนินการที่ด้านล่างเพื่อ "ทำเครื่องหมายว่าเสร็จ" หรือ "ลบ" งานที่เลือกทั้งหมด' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'การดำเนินการงานหลายรายการ' },
        { type: 'tip', text: 'สลับระหว่างโหมดมุมมองรายวัน รายสัปดาห์ และปฏิทินโดยใช้ไอคอนที่ด้านบนของแท็บงาน' },
      ],
    },
    {
      title: '5. การอนุมัติงานที่เสร็จสิ้นและงานที่ติดขัด',
      items: [
        { type: 'step', n: 1, text: 'ไปที่แท็บ "รออนุมัติ" ในงาน' },
        { type: 'step', n: 2, text: 'แตะการ์ดงานเพื่อเปิดรายละเอียด' },
        { type: 'p', html: true, text: '<strong>การอนุมัติงาน "เสร็จแล้ว":</strong> ตรวจสอบบันทึกการเสร็จสิ้นและรูปภาพที่อัปโหลด แตะ "อนุมัติ" เพื่อย้ายไปยังประวัติ หรือ "ปฏิเสธ" เพื่อส่งกลับพนักงานพร้อมความคิดเห็น' },
        { type: 'p', html: true, text: '<strong>การจัดการงาน "ติดขัด":</strong> งานติดขัดหมายความว่าพนักงานพบอุปสรรค (เช่น ต้องการอนุมัติงบประมาณ ผู้รับเหมา หรือการตัดสินใจของผู้จัดการ) ตรวจสอบคำอธิบาย ดำเนินการภายนอกที่จำเป็น จากนั้นแตะ "อนุมัติ" เพื่อปิดงาน หรือ "ปฏิเสธ" เพื่อมอบหมายใหม่พร้อมคำแนะนำ' },
        { type: 'note', text: 'งานติดขัดต้องการการแทรกแซงของคุณโดยตรง — พนักงานไม่สามารถดำเนินการต่อได้จนกว่าคุณจะดำเนินการ งานที่ถูกปฏิเสธจะกลับไปยังรายการ "รอดำเนินการ" ของพนักงาน' },
      ],
    },
    {
      title: '6. การสร้าง มอบหมาย และจัดการงานที่เกิดซ้ำ',
      items: [
        { type: 'step', n: 1, text: 'ในแท็บงาน แตะปุ่ม "+" ที่ด้านล่างขวา' },
        { type: 'step', n: 2, text: 'กรอกชื่อ คำอธิบาย ความสำคัญ สถานที่ หมวดหมู่ และวันครบกำหนด' },
        { type: 'step', n: 3, text: 'มอบหมายงานให้กับพนักงานหนึ่งคนหรือมากกว่า' },
        { type: 'step', n: 4, text: 'เลือกกำหนดการทำซ้ำ (รายวัน รายสัปดาห์ รายเดือน รายไตรมาส รายปี) หากต้องการ' },
        { type: 'step', n: 5, text: 'แตะ "สร้างงาน"' },
        { type: 'p', html: true, text: '<strong>การลบชุดงานที่เกิดซ้ำ — "ลบชุด":</strong>' },
        { type: 'p', text: 'เมื่อคุณเปิดงานที่เกิดซ้ำ คุณจะเห็นทั้งตัวเลือก "ลบ" และ "ลบชุด"' },
        { type: 'ul', items: ['<strong>ลบ</strong> — ลบเฉพาะการเกิดซ้ำครั้งนี้', '<strong>ลบชุด</strong> — ลบชุดที่เกิดซ้ำทั้งหมดอย่างถาวร งานในอนาคตทั้งหมดจะถูกลบ'] },
        { type: 'step', n: 1, text: 'เปิดงานที่เกิดซ้ำที่คุณต้องการลบ' },
        { type: 'step', n: 2, text: 'แตะไอคอนลบหรือเมนู' },
        { type: 'step', n: 3, text: 'เลือก "ลบชุด" เพื่อลบทั้งชุด' },
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'การลบชุดงานที่เกิดซ้ำ' },
        { type: 'tip', text: 'ใช้ "ลบชุด" เฉพาะเมื่องานที่เกิดซ้ำไม่จำเป็นอีกต่อไป หากต้องการข้ามเพียงครั้งเดียว ให้ใช้การลบปกติแทน' },
      ],
    },
    {
      title: '7. นำเข้าและส่งออก Excel',
      items: [
        { type: 'p', text: 'Air Manage รองรับการนำเข้าและส่งออกงานจำนวนมากผ่าน Excel' },
        { type: 'step', n: 1, text: 'ในแท็บงาน แตะปุ่ม Excel/ส่งออกในแถบเครื่องมือ' },
        { type: 'step', n: 2, text: 'เลือก "ส่งออก" เพื่อดาวน์โหลดงานปัจจุบัน หรือ "นำเข้า" เพื่ออัปโหลดเทมเพลตที่กรอกแล้ว' },
        { type: 'step', n: 3, text: 'ใช้ตัวกรองคอลัมน์ (ช่วงวันที่ สถานะ แผนก) ก่อนส่งออก' },
        { type: 'tip', text: 'ดาวน์โหลดเทมเพลตก่อนเพื่อให้แน่ใจว่าหัวคอลัมน์ตรงกับรูปแบบที่ต้องการ' },
      ],
    },
    {
      title: '8. การกำหนดค่าระบบและการอนุมัติอัตโนมัติ',
      items: [
        { type: 'p', html: true, text: 'แท็บ<strong>การตั้งค่า</strong> (เข้าถึงได้เฉพาะ Big Boss) ช่วยให้คุณกำหนดค่าการตั้งค่าทั่วทั้งระบบ เช่น หมวดหมู่งาน สถานที่ สินทรัพย์ และช่องทางการแจ้งเตือน' },
        { type: 'p', text: 'จากที่นี่คุณสามารถ:' },
        { type: 'ul', items: ['เพิ่ม / แก้ไข<strong>หมวดหมู่</strong>งาน', 'เพิ่ม / แก้ไข<strong>สถานที่</strong> (อาคาร ชั้น โซน)', 'จัดการ<strong>สินทรัพย์</strong>ที่เชื่อมโยงกับงานบำรุงรักษา', 'กำหนดค่าช่องทาง<strong>การแจ้งเตือน LINE</strong> ต่อทีม'] },
        { type: 'p', html: true, text: '<strong>การตั้งค่าอนุมัติอัตโนมัติ:</strong> สวิตช์<strong>อนุมัติอัตโนมัติ</strong>บนการ์ดผู้จัดการแต่ละคนควบคุมวิธีจัดการการทำงานให้เสร็จของพนักงาน' },
        { type: 'ul', items: ['<strong>อนุมัติอัตโนมัติปิด (ค่าเริ่มต้น):</strong> เมื่อพนักงานแตะ "ทำเครื่องหมายว่าเสร็จ" งานจะย้ายไปยัง<strong>รออนุมัติ</strong>และต้องการการตรวจสอบด้วยตนเองโดยผู้จัดการ', '<strong>อนุมัติอัตโนมัติเปิด:</strong> เมื่อพนักงานแตะ "ทำเครื่องหมายว่าเสร็จ" งานจะข้ามคิวอนุมัติและไปยัง<strong>ประวัติ</strong>โดยตรง'] },
        { type: 'note', text: 'การอนุมัติอัตโนมัติใช้กับ "ทำเครื่องหมายว่าเสร็จ" เท่านั้น งานที่ทำเครื่องหมายว่า "ติดขัด" ต้องการการตรวจสอบด้วยตนเองโดยผู้จัดการเสมอ' },
        { type: 'image', filename: 'bb_manager_permission_settings.png', alt: 'การตั้งค่าสิทธิ์ผู้จัดการพร้อมสวิตช์อนุมัติอัตโนมัติ' },
      ],
    },
    {
      title: '9. การตั้งค่าโปรไฟล์และภาษา',
      items: [
        { type: 'p', html: true, text: 'ไปที่แท็บ<strong>โปรไฟล์</strong>เพื่ออัปเดตชื่อ อีเมล โทรศัพท์ รหัสผ่าน และรูปโปรไฟล์ของคุณ' },
        { type: 'step', n: 1, text: 'แตะแท็บโปรไฟล์' },
        { type: 'step', n: 2, text: 'แตะ "แก้ไข" ถัดจากช่องใดก็ได้ หรือแตะอวตารของคุณเพื่ออัปโหลดรูปใหม่' },
        { type: 'step', n: 3, text: 'เลือกภาษาที่แสดงที่ต้องการ (อังกฤษ ฮีบรู ไทย) จากตัวเลือกภาษาที่มุมขวาบนของส่วนหัว' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'แท็บโปรไฟล์' },
      ],
    },
  ],
};

/* ─────────────────────────────────────────────
   MANUAL DATA — COMPANY MANAGER (Department Manager)
───────────────────────────────────────────── */

const COMPANY_MANAGER_MANUAL = {
  en: [
    {
      title: '1. Login & Navigation',
      items: [
        { type: 'p', html: true, text: 'Log in with the email and password provided by your Big Boss.' },
        { type: 'image', filename: 'dm_login_screen.png', alt: 'Department Manager Login Screen' },
        { type: 'p', html: true, text: '<strong>Forgot your password?</strong> Follow these steps to reset it:' },
        { type: 'step', n: 1, text: 'On the login screen, tap "Forgot Password?" beneath the login button.' },
        { type: 'step', n: 2, text: 'Enter your registered email address and tap "Send Reset Link".' },
        { type: 'step', n: 3, text: 'Check your email for the reset link and follow the instructions.' },
        { type: 'step', n: 4, text: 'Return to the app and log in with your new password.' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'Forgot Password Flow' },
        { type: 'p', html: true, text: 'Your bottom navigation has three tabs: <strong>Tasks</strong>, <strong>Config</strong>, and <strong>Profile</strong>.' },
        { type: 'image', filename: 'dm_bottom_navigation.png', alt: 'Department Manager Bottom Navigation' },
        { type: 'p', html: true, text: 'Update your name, email, phone, password, and profile picture in the <strong>Profile</strong> tab.' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'Department Manager Profile Tab' },
        { type: 'p', html: true, text: 'Configure your LINE push-notification preferences in the <strong>Notifications</strong> section of the Profile tab.' },
        { type: 'image', filename: 'dm_notification_settings.png', alt: 'Department Manager Notification Settings' },
      ],
    },
    {
      title: '2. Department Scope — Filtering, Searching & Assigning Tasks',
      items: [
        { type: 'p', html: true, text: 'As a <strong>Department Manager</strong>, your scope covers every employee in the entire department — you can search, filter, and assign tasks to <strong>any employee</strong>, regardless of which manager they report to.' },
        { type: 'p', html: true, text: '<strong>To search & filter tasks:</strong>' },
        { type: 'step', n: 1, text: 'Tap the search bar at the top of the Tasks tab and type a task name or keyword.' },
        { type: 'step', n: 2, text: 'Tap the filter icon (funnel) to open the filter panel.' },
        { type: 'step', n: 3, text: 'Apply filters: Priority, Status, Location, Category, Assigned Employee, or Date Range.' },
        { type: 'step', n: 4, text: 'Tap "Apply" to see filtered results, or "Clear" to reset.' },
        { type: 'image', filename: 'shared_filter_panel.png', alt: 'Task Filter Panel' },
        { type: 'p', html: true, text: '<strong>To create and assign a task:</strong> Tap the <strong>"+"</strong> button in the Tasks tab. In the assignee list you will see all employees in your department — select one or more.' },
        { type: 'image', filename: 'dm_create_task_button.png', alt: 'Create Task Button' },
        { type: 'tip', text: 'Unlike regular Managers, you are not limited to a sub-team. Every department employee is available in the assignee picker.' },
      ],
    },
    {
      title: '3. Configuring the Department (Config Tab)',
      items: [
        { type: 'p', html: true, text: 'The <strong>Config</strong> tab is your department\'s control panel. Use it to add managers, onboard employees, and organise your team structure.' },
        { type: 'image', filename: 'dm_settings_tab_overview.png', alt: 'Department Config Tab Overview' },
        { type: 'p', html: true, text: '<strong>Adding a Manager:</strong>' },
        { type: 'step', n: 1, text: 'Open the Config tab and tap "Add Manager".' },
        { type: 'step', n: 2, text: 'Fill in the manager\'s name, email, and phone number, then tap "Save".' },
        { type: 'step', n: 3, text: 'The new manager receives login credentials by email.' },
        { type: 'image', filename: 'dm_add_manager_form.png', alt: 'Add Manager Form' },
        { type: 'p', html: true, text: '<strong>Viewing & Adding Employees:</strong> The employees list shows every member in your department.' },
        { type: 'image', filename: 'dm_employees_list.png', alt: 'Department Employees List' },
        { type: 'p', html: true, text: '<strong>Assigning Employees to a Manager:</strong>' },
        { type: 'step', n: 1, text: 'Open the department detail view in the Config tab.' },
        { type: 'step', n: 2, text: 'Tap the "Assign Employees" button on a manager\'s card.' },
        { type: 'step', n: 3, text: 'Select the employees you want to link to that manager and confirm.' },
        { type: 'image', filename: 'dm_assign_employees_to_manager.png', alt: 'Assign Employees to Manager' },
        { type: 'note', text: 'An employee can only be assigned to one manager at a time. Re-assigning them automatically removes the previous link.' },
      ],
    },
    {
      title: '4. Admin Settings — Manager Permissions & Auto-Approve',
      items: [
        { type: 'p', html: true, text: 'Each manager card in the Config tab has a set of permission toggles that control what that manager can do.' },
        { type: 'image', filename: 'dm_manager_permission_toggles.png', alt: 'Manager Permission Toggles' },
        { type: 'ul', items: [
          '<strong>Can Manage Fields</strong> — Allows the manager to add/edit task categories, locations, and assets.',
          '<strong>Language Permissions</strong> — Choose which display languages are available to this manager\'s team.',
        ]},
        { type: 'p', html: true, text: '<strong>Auto-Approve:</strong> This toggle controls how an employee\'s "Mark as Done" action is handled.' },
        { type: 'ul', items: [
          '<strong>Auto-Approve OFF (default):</strong> When an employee taps "Mark as Done", the task moves to <strong>Waiting Approval</strong>. A manager must manually review and approve or reject it before it reaches History.',
          '<strong>Auto-Approve ON:</strong> When an employee taps "Mark as Done", the task bypasses the approval queue and goes directly to <strong>History</strong>.',
        ]},
        { type: 'image', filename: 'admin_auto_approve_toggle.png', alt: 'Auto-Approve Toggle' },
        { type: 'note', text: 'Auto-Approve applies only to "Mark as Done" completions. Tasks marked as "Stuck" always require manual manager review regardless of this setting.' },
      ],
    },
    {
      title: '5. Advanced Tasks — Frequencies, Bulk Actions & Delete Set',
      items: [
        { type: 'p', html: true, text: '<strong>Task Frequencies:</strong> When creating a recurring task you can choose from Daily, Weekly, Monthly, or Quarterly schedules. Use <strong>Quarterly</strong> for tasks that need to repeat every three months (e.g. equipment inspections).' },
        { type: 'image', filename: 'freq_quarterly.png', alt: 'Quarterly Frequency Setting' },
        { type: 'p', html: true, text: '<strong>Bulk Actions:</strong> Process multiple tasks at once without opening each one individually.' },
        { type: 'step', n: 1, text: 'Long-press any task card to enter selection mode.' },
        { type: 'step', n: 2, text: 'Tap additional cards to add them to your selection.' },
        { type: 'step', n: 3, text: 'Use the action bar at the bottom to "Mark Done" or "Delete" all selected tasks.' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'Bulk Task Operations' },
        { type: 'p', html: true, text: '<strong>Delete Set — Critical Warning:</strong> When you open a recurring task you will see two delete options.' },
        { type: 'ul', items: [
          '<strong>Delete</strong> — Removes only this single occurrence.',
          '<strong>Delete Set</strong> — Permanently deletes the <strong>ENTIRE recurring series globally</strong>. Every past, present, and future instance is removed and cannot be recovered.',
        ]},
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'Delete Recurring Task Set' },
        { type: 'tip', text: 'Use "Delete Set" only when retiring a task permanently. To skip a single occurrence, use "Delete" (single) instead.' },
      ],
    },
    {
      title: '6. Approving Completed & Stuck Tasks',
      items: [
        { type: 'step', n: 1, text: 'Open the "Waiting Approval" tab.' },
        { type: 'step', n: 2, text: 'Tap a task card to review the details.' },
        { type: 'p', html: true, text: '<strong>Approving a "Done" task:</strong> Review the completion notes and uploaded photos. Tap "Approve" to move it to History, or "Reject" to send it back with comments.' },
        { type: 'p', html: true, text: '<strong>Handling a "Stuck" task:</strong> A stuck task means the employee hit a blocker (e.g., needs budget approval, an external contractor, or a manager decision). Review their explanation, take the necessary external action, then tap "Approve" to close the task or "Reject" to reassign it with instructions.' },
        { type: 'note', text: 'Stuck tasks require your active intervention — the employee cannot proceed until you act. Employees receive a notification when their task is approved or rejected.' },
      ],
    },
    {
      title: '7. Profile Settings',
      items: [
        { type: 'p', html: true, text: 'Update your name, email, phone, password, and profile picture in the <strong>Profile</strong> tab.' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'Profile Tab' },
        { type: 'tip', text: 'Your preferred language can be changed from the flag dropdown in the top-right corner at any time.' },
      ],
    },
  ],

  he: [
    {
      title: '1. כניסה וניווט',
      items: [
        { type: 'p', html: true, text: 'התחבר עם האימייל והסיסמה שסיפק לך ה-Big Boss.' },
        { type: 'image', filename: 'dm_login_screen.png', alt: 'מסך כניסה של מנהל מחלקה' },
        { type: 'p', html: true, text: '<strong>שכחת את הסיסמה?</strong> עקוב אחר השלבים הבאים לאיפוסה:' },
        { type: 'step', n: 1, text: 'במסך הכניסה, לחץ על "שכחתי סיסמה" מתחת לכפתור הכניסה.' },
        { type: 'step', n: 2, text: 'הכנס את כתובת האימייל הרשומה שלך ולחץ "שלח קישור לאיפוס".' },
        { type: 'step', n: 3, text: 'בדוק את תיבת האימייל שלך לקישור האיפוס ועקוב אחר ההוראות.' },
        { type: 'step', n: 4, text: 'חזור לאפליקציה והתחבר עם הסיסמה החדשה שלך.' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'תהליך שחזור סיסמה' },
        { type: 'p', html: true, text: 'בניווט התחתון שלך שלוש לשוניות: <strong>משימות</strong>, <strong>הגדרות</strong> ו<strong>פרופיל</strong>.' },
        { type: 'image', filename: 'dm_bottom_navigation.png', alt: 'ניווט תחתי של מנהל מחלקה' },
        { type: 'p', html: true, text: 'עדכן את שמך, אימייל, טלפון, סיסמה ותמונת פרופיל בלשונית <strong>פרופיל</strong>.' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'לשונית פרופיל מנהל מחלקה' },
        { type: 'p', html: true, text: 'הגדר העדפות התראות LINE בחלק <strong>התראות</strong> של לשונית הפרופיל.' },
        { type: 'image', filename: 'dm_notification_settings.png', alt: 'הגדרות התראות מנהל מחלקה' },
      ],
    },
    {
      title: '2. היקף המחלקה — סינון, חיפוש והקצאת משימות',
      items: [
        { type: 'p', html: true, text: 'כ<strong>מנהל מחלקה</strong>, הסמכות שלך מכסה את כל העובדים במחלקה — ביכולתך לחפש, לסנן ולהקצות משימות ל<strong>כל עובד</strong>, ללא תלות למי הם כפופים.' },
        { type: 'p', html: true, text: '<strong>חיפוש וסינון משימות:</strong>' },
        { type: 'step', n: 1, text: 'לחץ על שורת החיפוש בראש לשונית המשימות והקלד שם משימה או מילת מפתח.' },
        { type: 'step', n: 2, text: 'לחץ על סמל הסינון (משפך) לפתיחת לוח הסינון.' },
        { type: 'step', n: 3, text: 'החל סינונים: עדיפות, סטטוס, מיקום, קטגוריה, עובד משויך, או טווח תאריכים.' },
        { type: 'step', n: 4, text: 'לחץ "החל" לצפייה בתוצאות, או "נקה" לאיפוס.' },
        { type: 'image', filename: 'shared_filter_panel.png', alt: 'לוח סינון משימות' },
        { type: 'p', html: true, text: '<strong>יצירה והקצאת משימה:</strong> לחץ על כפתור <strong>"+"</strong> בלשונית המשימות. ברשימת המשימות תראה את כל עובדי המחלקה — בחר אחד או יותר.' },
        { type: 'image', filename: 'dm_create_task_button.png', alt: 'כפתור יצירת משימה' },
        { type: 'tip', text: 'שלא כמו מנהלים רגילים, אינך מוגבל לצוות משנה. כל עובדי המחלקה זמינים לבחירה.' },
      ],
    },
    {
      title: '3. הגדרת המחלקה (לשונית הגדרות)',
      items: [
        { type: 'p', html: true, text: 'לשונית <strong>הגדרות</strong> היא לוח הבקרה של המחלקה שלך. השתמש בה להוספת מנהלים, קליטת עובדים וארגון מבנה הצוות.' },
        { type: 'image', filename: 'dm_settings_tab_overview.png', alt: 'סקירת לשונית הגדרות המחלקה' },
        { type: 'p', html: true, text: '<strong>הוספת מנהל:</strong>' },
        { type: 'step', n: 1, text: 'פתח את לשונית ההגדרות ולחץ "הוסף מנהל".' },
        { type: 'step', n: 2, text: 'מלא את שם המנהל, אימייל ומספר טלפון, ולחץ "שמור".' },
        { type: 'step', n: 3, text: 'המנהל החדש יקבל פרטי כניסה לאימייל.' },
        { type: 'image', filename: 'dm_add_manager_form.png', alt: 'טופס הוספת מנהל' },
        { type: 'p', html: true, text: '<strong>צפייה והוספת עובדים:</strong> רשימת העובדים מציגה את כל חברי המחלקה.' },
        { type: 'image', filename: 'dm_employees_list.png', alt: 'רשימת עובדי המחלקה' },
        { type: 'p', html: true, text: '<strong>הקצאת עובדים למנהל:</strong>' },
        { type: 'step', n: 1, text: 'פתח את תצוגת פרטי המחלקה בלשונית ההגדרות.' },
        { type: 'step', n: 2, text: 'לחץ על כפתור "הקצה עובדים" בכרטיס המנהל.' },
        { type: 'step', n: 3, text: 'בחר את העובדים שברצונך לשייך למנהל זה ואשר.' },
        { type: 'image', filename: 'dm_assign_employees_to_manager.png', alt: 'הקצאת עובדים למנהל' },
        { type: 'note', text: 'עובד יכול להיות משויך למנהל אחד בלבד. שיוך מחדש מסיר אוטומטית את הקישור הקודם.' },
      ],
    },
    {
      title: '4. הגדרות מנהל — הרשאות ואישור אוטומטי',
      items: [
        { type: 'p', html: true, text: 'לכל כרטיס מנהל בלשונית ההגדרות יש סדרת מתגי הרשאות השולטים במה שהמנהל יכול לעשות.' },
        { type: 'image', filename: 'dm_manager_permission_toggles.png', alt: 'מתגי הרשאות מנהל' },
        { type: 'ul', items: [
          '<strong>ניהול שדות</strong> — מאפשר למנהל להוסיף/לערוך קטגוריות משימה, מיקומים ונכסים.',
          '<strong>הרשאות שפה</strong> — בחר אילו שפות תצוגה זמינות לצוות של מנהל זה.',
        ]},
        { type: 'p', html: true, text: '<strong>אישור אוטומטי:</strong> מתג זה קובע כיצד מטופלת פעולת "סמן כהושלם" של עובד.' },
        { type: 'ul', items: [
          '<strong>אישור אוטומטי כבוי (ברירת מחדל):</strong> כאשר עובד לוחץ "סמן כהושלם", המשימה עוברת ל<strong>ממתין לאישור</strong>. המנהל חייב לאשר או לדחות ידנית לפני שהמשימה עוברת להיסטוריה.',
          '<strong>אישור אוטומטי פועל:</strong> כאשר עובד לוחץ "סמן כהושלם", המשימה עוקפת את תור האישור ועוברת ישירות ל<strong>היסטוריה</strong>.',
        ]},
        { type: 'image', filename: 'admin_auto_approve_toggle.png', alt: 'מתג אישור אוטומטי' },
        { type: 'note', text: 'אישור אוטומטי חל רק על "סמן כהושלם". משימות תקועות תמיד דורשות בדיקה ידנית של המנהל, ללא קשר להגדרה זו.' },
      ],
    },
    {
      title: '5. משימות מתקדמות — תדירויות, פעולות מרובות ומחק סט',
      items: [
        { type: 'p', html: true, text: '<strong>תדירויות משימה:</strong> בעת יצירת משימה חוזרת ניתן לבחור בין יומי, שבועי, חודשי, או רבעוני. השתמש ב<strong>רבעוני</strong> למשימות שחוזרות כל שלושה חודשים (למשל בדיקות ציוד).' },
        { type: 'image', filename: 'freq_quarterly.png', alt: 'הגדרת תדירות רבעונית' },
        { type: 'p', html: true, text: '<strong>פעולות מרובות:</strong> עבד על מספר משימות בו-זמנית מבלי לפתוח כל אחת בנפרד.' },
        { type: 'step', n: 1, text: 'לחץ לחיצה ארוכה על כרטיס משימה כלשהו לכניסה למצב בחירה.' },
        { type: 'step', n: 2, text: 'לחץ על כרטיסים נוספים להוספתם לבחירה.' },
        { type: 'step', n: 3, text: 'השתמש בסרגל הפעולות בתחתית ל"סמן כהושלם" או "מחק" את כל המשימות שנבחרו.' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'פעולות מרובות על משימות' },
        { type: 'p', html: true, text: '<strong>מחק סט — אזהרה חשובה:</strong> בעת פתיחת משימה חוזרת, תראה שתי אפשרויות מחיקה.' },
        { type: 'ul', items: [
          '<strong>מחק</strong> — מסיר רק את המופע הבודד הזה.',
          '<strong>מחק סט</strong> — מוחק לצמיתות את <strong>כל הסדרה החוזרת באופן גלובלי</strong>. כל מופע — עבר, הווה ועתיד — יימחק ואינו ניתן לשחזור.',
        ]},
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'מחיקת סדרת משימה חוזרת' },
        { type: 'tip', text: 'השתמש ב"מחק סט" רק בעת פרישת משימה לצמיתות. לדילוג על מופע בודד, השתמש ב"מחק" (בודד).' },
      ],
    },
    {
      title: '6. אישור משימות שהושלמו ומשימות תקועות',
      items: [
        { type: 'step', n: 1, text: 'פתח את לשונית "ממתין לאישור".' },
        { type: 'step', n: 2, text: 'לחץ על כרטיס משימה לבדיקת הפרטים.' },
        { type: 'p', html: true, text: '<strong>אישור משימה "הושלמה":</strong> עיין בהערות ובתמונות שהועלו. לחץ "אשר" להעברתה להיסטוריה, או "דחה" להחזרתה לעובד עם הערות.' },
        { type: 'p', html: true, text: '<strong>טיפול במשימה "תקועה":</strong> משימה תקועה פירושה שהעובד נתקל בחסם (למשל, אישור תקציבי, קבלן חיצוני, או החלטת מנהל). עיין בהסברו, נקוט פעולה חיצונית נדרשת, ולאחר מכן לחץ "אשר" לסגירת המשימה או "דחה" להקצאה מחדש עם הוראות.' },
        { type: 'note', text: 'משימות תקועות דורשות התערבות פעילה שלך — העובד לא יכול להמשיך עד שתנקוט פעולה. עובדים מקבלים הודעה כאשר משימתם אושרה או נדחתה.' },
      ],
    },
    {
      title: '7. הגדרות פרופיל',
      items: [
        { type: 'p', html: true, text: 'עדכן את שמך, אימייל, טלפון, סיסמה ותמונת פרופיל בלשונית <strong>פרופיל</strong>.' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'לשונית פרופיל' },
        { type: 'tip', text: 'ניתן לשנות את שפת ההעדפה מתפריט הדגל בפינה הימנית העליונה בכל עת.' },
      ],
    },
  ],

  th: [
    {
      title: '1. การเข้าสู่ระบบและการนำทาง',
      items: [
        { type: 'p', html: true, text: 'เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ได้รับจาก Big Boss ของคุณ' },
        { type: 'image', filename: 'dm_login_screen.png', alt: 'หน้าจอเข้าสู่ระบบผู้จัดการแผนก' },
        { type: 'p', html: true, text: '<strong>ลืมรหัสผ่าน?</strong> ทำตามขั้นตอนเหล่านี้เพื่อรีเซ็ต:' },
        { type: 'step', n: 1, text: 'บนหน้าเข้าสู่ระบบ แตะ "ลืมรหัสผ่าน?" ใต้ปุ่มเข้าสู่ระบบ' },
        { type: 'step', n: 2, text: 'ป้อนที่อยู่อีเมลที่ลงทะเบียนและแตะ "ส่งลิงก์รีเซ็ต"' },
        { type: 'step', n: 3, text: 'ตรวจสอบกล่องจดหมายอีเมลสำหรับลิงก์รีเซ็ตและทำตามคำแนะนำ' },
        { type: 'step', n: 4, text: 'กลับไปที่แอปและเข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'ขั้นตอนการรีเซ็ตรหัสผ่าน' },
        { type: 'p', html: true, text: 'แถบนำทางด้านล่างของคุณมีสามแท็บ: <strong>งาน</strong>, <strong>การตั้งค่า</strong> และ<strong>โปรไฟล์</strong>' },
        { type: 'image', filename: 'dm_bottom_navigation.png', alt: 'แถบนำทางผู้จัดการแผนก' },
        { type: 'p', html: true, text: 'อัปเดตชื่อ อีเมล โทรศัพท์ รหัสผ่าน และรูปโปรไฟล์ของคุณในแท็บ<strong>โปรไฟล์</strong>' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'แท็บโปรไฟล์ผู้จัดการแผนก' },
        { type: 'p', html: true, text: 'กำหนดค่าการแจ้งเตือน LINE ในส่วน<strong>การแจ้งเตือน</strong>ของแท็บโปรไฟล์' },
        { type: 'image', filename: 'dm_notification_settings.png', alt: 'การตั้งค่าการแจ้งเตือนผู้จัดการแผนก' },
      ],
    },
    {
      title: '2. ขอบเขตแผนก — การกรอง ค้นหา และมอบหมายงาน',
      items: [
        { type: 'p', html: true, text: 'ในฐานะ<strong>ผู้จัดการแผนก</strong> ขอบเขตของคุณครอบคลุมพนักงานทุกคนในแผนก — คุณสามารถค้นหา กรอง และมอบหมายงานให้<strong>พนักงานคนใดก็ได้</strong> โดยไม่คำนึงว่าพวกเขารายงานต่อผู้จัดการคนใด' },
        { type: 'p', html: true, text: '<strong>การค้นหาและกรองงาน:</strong>' },
        { type: 'step', n: 1, text: 'แตะแถบค้นหาที่ด้านบนของแท็บงานและพิมพ์ชื่องานหรือคำสำคัญ' },
        { type: 'step', n: 2, text: 'แตะไอคอนกรอง (กรวย) เพื่อเปิดแผงกรอง' },
        { type: 'step', n: 3, text: 'ใช้ตัวกรอง: ความสำคัญ สถานะ สถานที่ หมวดหมู่ พนักงาน หรือช่วงวันที่' },
        { type: 'step', n: 4, text: 'แตะ "ใช้" เพื่อดูผลลัพธ์ที่กรองแล้ว หรือ "ล้าง" เพื่อรีเซ็ต' },
        { type: 'image', filename: 'shared_filter_panel.png', alt: 'แผงกรองงาน' },
        { type: 'p', html: true, text: '<strong>การสร้างและมอบหมายงาน:</strong> แตะปุ่ม <strong>"+"</strong> ในแท็บงาน ในรายชื่อผู้รับมอบหมายคุณจะเห็นพนักงานทุกคนในแผนก — เลือกหนึ่งคนหรือมากกว่า' },
        { type: 'image', filename: 'dm_create_task_button.png', alt: 'ปุ่มสร้างงาน' },
        { type: 'tip', text: 'ต่างจากผู้จัดการทั่วไป คุณไม่ถูกจำกัดแค่ทีมย่อย พนักงานทุกคนในแผนกมีให้เลือกในตัวเลือกผู้รับมอบหมาย' },
      ],
    },
    {
      title: '3. การกำหนดค่าแผนก (แท็บการตั้งค่า)',
      items: [
        { type: 'p', html: true, text: 'แท็บ<strong>การตั้งค่า</strong>คือแผงควบคุมของแผนกคุณ ใช้เพื่อเพิ่มผู้จัดการ รับสมัครพนักงาน และจัดโครงสร้างทีม' },
        { type: 'image', filename: 'dm_settings_tab_overview.png', alt: 'ภาพรวมแท็บการตั้งค่าแผนก' },
        { type: 'p', html: true, text: '<strong>การเพิ่มผู้จัดการ:</strong>' },
        { type: 'step', n: 1, text: 'เปิดแท็บการตั้งค่าและแตะ "เพิ่มผู้จัดการ"' },
        { type: 'step', n: 2, text: 'กรอกชื่อ อีเมล และเบอร์โทรของผู้จัดการ แล้วแตะ "บันทึก"' },
        { type: 'step', n: 3, text: 'ผู้จัดการใหม่จะได้รับข้อมูลเข้าสู่ระบบทางอีเมล' },
        { type: 'image', filename: 'dm_add_manager_form.png', alt: 'แบบฟอร์มเพิ่มผู้จัดการ' },
        { type: 'p', html: true, text: '<strong>การดูและเพิ่มพนักงาน:</strong> รายชื่อพนักงานแสดงสมาชิกทุกคนในแผนก' },
        { type: 'image', filename: 'dm_employees_list.png', alt: 'รายชื่อพนักงานในแผนก' },
        { type: 'p', html: true, text: '<strong>การมอบหมายพนักงานให้ผู้จัดการ:</strong>' },
        { type: 'step', n: 1, text: 'เปิดมุมมองรายละเอียดแผนกในแท็บการตั้งค่า' },
        { type: 'step', n: 2, text: 'แตะปุ่ม "มอบหมายพนักงาน" บนการ์ดผู้จัดการ' },
        { type: 'step', n: 3, text: 'เลือกพนักงานที่ต้องการเชื่อมโยงกับผู้จัดการนั้นและยืนยัน' },
        { type: 'image', filename: 'dm_assign_employees_to_manager.png', alt: 'มอบหมายพนักงานให้ผู้จัดการ' },
        { type: 'note', text: 'พนักงานหนึ่งคนสามารถมอบหมายให้ผู้จัดการได้เพียงคนเดียวในคราวเดียว การมอบหมายใหม่จะลบลิงก์เดิมโดยอัตโนมัติ' },
      ],
    },
    {
      title: '4. การตั้งค่าผู้ดูแล — สิทธิ์ผู้จัดการและการอนุมัติอัตโนมัติ',
      items: [
        { type: 'p', html: true, text: 'การ์ดผู้จัดการแต่ละใบในแท็บการตั้งค่ามีสวิตช์สิทธิ์ที่ควบคุมสิ่งที่ผู้จัดการคนนั้นสามารถทำได้' },
        { type: 'image', filename: 'dm_manager_permission_toggles.png', alt: 'สวิตช์สิทธิ์ผู้จัดการ' },
        { type: 'ul', items: [
          '<strong>จัดการฟิลด์</strong> — อนุญาตให้ผู้จัดการเพิ่ม/แก้ไขหมวดหมู่งาน สถานที่ และสินทรัพย์',
          '<strong>สิทธิ์ภาษา</strong> — เลือกภาษาที่แสดงที่มีให้กับทีมของผู้จัดการคนนี้',
        ]},
        { type: 'p', html: true, text: '<strong>อนุมัติอัตโนมัติ:</strong> สวิตช์นี้ควบคุมวิธีจัดการการกระทำ "ทำเครื่องหมายว่าเสร็จ" ของพนักงาน' },
        { type: 'ul', items: [
          '<strong>อนุมัติอัตโนมัติปิด (ค่าเริ่มต้น):</strong> เมื่อพนักงานแตะ "ทำเครื่องหมายว่าเสร็จ" งานจะย้ายไปยัง<strong>รออนุมัติ</strong> ผู้จัดการต้องตรวจสอบและอนุมัติหรือปฏิเสธด้วยตนเองก่อนที่งานจะไปยังประวัติ',
          '<strong>อนุมัติอัตโนมัติเปิด:</strong> เมื่อพนักงานแตะ "ทำเครื่องหมายว่าเสร็จ" งานจะข้ามคิวอนุมัติและไปยัง<strong>ประวัติ</strong>โดยตรง',
        ]},
        { type: 'image', filename: 'admin_auto_approve_toggle.png', alt: 'สวิตช์อนุมัติอัตโนมัติ' },
        { type: 'note', text: 'การอนุมัติอัตโนมัติใช้กับ "ทำเครื่องหมายว่าเสร็จ" เท่านั้น งานที่ทำเครื่องหมายว่า "ติดขัด" ต้องการการตรวจสอบด้วยตนเองเสมอ' },
      ],
    },
    {
      title: '5. งานขั้นสูง — ความถี่ การดำเนินการหลายรายการ และลบชุด',
      items: [
        { type: 'p', html: true, text: '<strong>ความถี่งาน:</strong> เมื่อสร้างงานที่เกิดซ้ำ คุณสามารถเลือกรายวัน รายสัปดาห์ รายเดือน หรือรายไตรมาส ใช้<strong>รายไตรมาส</strong>สำหรับงานที่ต้องทำซ้ำทุกสามเดือน (เช่น การตรวจสอบอุปกรณ์)' },
        { type: 'image', filename: 'freq_quarterly.png', alt: 'การตั้งค่าความถี่รายไตรมาส' },
        { type: 'p', html: true, text: '<strong>การดำเนินการหลายรายการ:</strong> ประมวลผลหลายงานพร้อมกันโดยไม่ต้องเปิดทีละงาน' },
        { type: 'step', n: 1, text: 'กดค้างที่การ์ดงานใดก็ได้เพื่อเข้าสู่โหมดการเลือก' },
        { type: 'step', n: 2, text: 'แตะการ์ดเพิ่มเติมเพื่อเพิ่มในการเลือก' },
        { type: 'step', n: 3, text: 'ใช้แถบการดำเนินการที่ด้านล่างเพื่อ "ทำเครื่องหมายว่าเสร็จ" หรือ "ลบ" งานที่เลือกทั้งหมด' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'การดำเนินการงานหลายรายการ' },
        { type: 'p', html: true, text: '<strong>ลบชุด — คำเตือนสำคัญ:</strong> เมื่อคุณเปิดงานที่เกิดซ้ำ คุณจะเห็นตัวเลือกลบสองแบบ' },
        { type: 'ul', items: [
          '<strong>ลบ</strong> — ลบเฉพาะการเกิดซ้ำครั้งนี้',
          '<strong>ลบชุด</strong> — ลบ<strong>ชุดที่เกิดซ้ำทั้งหมดอย่างถาวรทั่วโลก</strong> ทุกอินสแตนซ์ — อดีต ปัจจุบัน และอนาคต — จะถูกลบและไม่สามารถกู้คืนได้',
        ]},
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'การลบชุดงานที่เกิดซ้ำ' },
        { type: 'tip', text: 'ใช้ "ลบชุด" เฉพาะเมื่อต้องการยกเลิกงานอย่างถาวร สำหรับการข้ามการเกิดซ้ำครั้งเดียว ให้ใช้ "ลบ" (รายเดียว) แทน' },
      ],
    },
    {
      title: '6. การอนุมัติงานที่เสร็จสิ้นและงานที่ติดขัด',
      items: [
        { type: 'step', n: 1, text: 'เปิดแท็บ "รออนุมัติ"' },
        { type: 'step', n: 2, text: 'แตะการ์ดงานเพื่อตรวจสอบรายละเอียด' },
        { type: 'p', html: true, text: '<strong>การอนุมัติงาน "เสร็จแล้ว":</strong> ตรวจสอบบันทึกการเสร็จสิ้นและรูปภาพที่อัปโหลด แตะ "อนุมัติ" เพื่อย้ายไปยังประวัติ หรือ "ปฏิเสธ" เพื่อส่งกลับพร้อมความคิดเห็น' },
        { type: 'p', html: true, text: '<strong>การจัดการงาน "ติดขัด":</strong> งานติดขัดหมายความว่าพนักงานพบอุปสรรค (เช่น ต้องการอนุมัติงบประมาณ ผู้รับเหมา หรือการตัดสินใจของผู้จัดการ) ตรวจสอบคำอธิบาย ดำเนินการภายนอกที่จำเป็น จากนั้นแตะ "อนุมัติ" เพื่อปิดงาน หรือ "ปฏิเสธ" เพื่อมอบหมายใหม่พร้อมคำแนะนำ' },
        { type: 'note', text: 'งานติดขัดต้องการการแทรกแซงของคุณโดยตรง — พนักงานไม่สามารถดำเนินการต่อได้จนกว่าคุณจะดำเนินการ พนักงานจะได้รับการแจ้งเตือนเมื่องานได้รับการอนุมัติหรือปฏิเสธ' },
      ],
    },
    {
      title: '7. การตั้งค่าโปรไฟล์',
      items: [
        { type: 'p', html: true, text: 'อัปเดตชื่อ อีเมล โทรศัพท์ รหัสผ่าน และรูปโปรไฟล์ของคุณในแท็บ<strong>โปรไฟล์</strong>' },
        { type: 'image', filename: 'dm_profile_tab.png', alt: 'แท็บโปรไฟล์' },
        { type: 'tip', text: 'คุณสามารถเปลี่ยนภาษาที่ต้องการได้จากเมนูธงในมุมขวาบนได้ตลอดเวลา' },
      ],
    },
  ],
};

/* ─────────────────────────────────────────────
   MANUAL DATA — MANAGER
───────────────────────────────────────────── */

const MANAGER_MANUAL = {
  en: [
    {
      title: '1. Login & Navigation',
      items: [
        { type: 'p', html: true, text: 'Log in with the email and password provided by your Department Manager or Big Boss.' },
        { type: 'image', filename: 'mgr_login_screen.png', alt: 'Manager Login Screen' },
        { type: 'p', html: true, text: '<strong>Forgot your password?</strong> Tap "Forgot Password?" on the login screen, enter your registered email, and follow the reset link sent to your inbox.' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'Forgot Password Flow' },
        { type: 'p', html: true, text: 'Your bottom navigation has three tabs: <strong>Tasks</strong>, <strong>Team</strong>, and <strong>Profile</strong>.' },
        { type: 'image', filename: 'mgr_bottom_navigation.png', alt: 'Manager Bottom Navigation' },
        { type: 'p', html: true, text: 'Edit your personal details, password, and profile picture in the <strong>Profile</strong> tab.' },
        { type: 'image', filename: 'mgr_profile_tab.png', alt: 'Manager Profile Tab' },
        { type: 'p', html: true, text: 'Configure your LINE push-notification preferences in the <strong>Notifications</strong> section of the Profile tab.' },
        { type: 'image', filename: 'mgr_notification_settings.png', alt: 'Manager Notification Settings' },
        { type: 'p', html: true, text: 'The <strong>Team</strong> tab lists every employee assigned directly to you — their name, role, and contact details. To add or remove team members, contact your Department Manager or Big Boss.' },
        { type: 'image', filename: 'mgr_team_tab.png', alt: 'Manager Team Tab' },
      ],
    },
    {
      title: '2. Filtering & Assigning Tasks',
      items: [
        { type: 'p', html: true, text: 'You can filter tasks and assign new tasks <strong>only to employees who are directly assigned to you</strong>. Employees outside your team will not appear in the assignee list.' },
        { type: 'p', html: true, text: '<strong>To filter tasks:</strong>' },
        { type: 'step', n: 1, text: 'Tap the filter icon (funnel) at the top of the Tasks tab.' },
        { type: 'step', n: 2, text: 'Apply filters: Priority, Status, Location, Category, Assignee, or Date Range.' },
        { type: 'step', n: 3, text: 'Tap "Apply" to see filtered results, or "Clear" to reset.' },
        { type: 'image', filename: 'shared_filter_panel.png', alt: 'Task Filter Panel' },
      ],
    },
    {
      title: '3. Creating Tasks & Frequency Rules',
      items: [
        { type: 'p', html: true, text: 'Tap the <strong>"+"</strong> button in the Tasks tab to open the task creation form.' },
        { type: 'image', filename: 'mgr_create_task_button.png', alt: 'Create Task Button' },
        { type: 'step', n: 1, text: 'Fill in the task title and description.' },
        { type: 'step', n: 2, text: 'Set priority: Low, Medium, High, or Urgent.' },
        { type: 'step', n: 3, text: 'Choose the location and category.' },
        { type: 'step', n: 4, text: 'Assign to one or more of your direct employees.' },
        { type: 'step', n: 5, text: 'Toggle on "Recurring" and select a frequency (see rules below).' },
        { type: 'step', n: 6, text: 'Tap "Create Task".' },
        { type: 'p', html: true, text: '<strong>Frequency Rules:</strong>' },
        { type: 'ul', items: [
          '<strong>Daily</strong> — Defaults to Monday–Friday. You can toggle individual days on or off to customise the schedule (e.g. exclude Wednesday).',
          '<strong>Weekly</strong> — Select exactly 1 day of the week. The task repeats on that day every week.',
          '<strong>Monthly</strong> — Select a day of the month (1–31). The task repeats on that date each month.',
          '<strong>Quarterly</strong> — Select exactly 4 dates spread across the year. The task fires on each of those dates.',
          '<strong>Yearly</strong> — Pick 1 specific date. The task repeats annually on that date.',
        ] },
        { type: 'image', filename: 'freq_daily.png', alt: 'Daily Frequency Settings' },
        { type: 'image', filename: 'freq_quarterly.png', alt: 'Quarterly Frequency — Select 4 Dates' },
      ],
    },
    {
      title: '4. Advanced Actions: Bulk Operations & Delete Set',
      items: [
        { type: 'p', html: true, text: '<strong>Bulk Actions:</strong> Use checkboxes to act on multiple tasks at once.' },
        { type: 'step', n: 1, text: 'Long-press any task card to enter selection mode — checkboxes appear on every card.' },
        { type: 'step', n: 2, text: 'Tap the checkboxes of each task you want to include.' },
        { type: 'step', n: 3, text: 'Use the action bar at the bottom to "Mark Done" or "Delete" all selected tasks.' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'Bulk Task Operations' },
        { type: 'p', html: true, text: '<strong>Delete Set — ⚠️ Use with caution:</strong>' },
        { type: 'p', text: 'When you open a recurring task you will see two delete options:' },
        { type: 'ul', items: [
          '<strong>Delete</strong> — Removes only this single occurrence. The rest of the series remains intact.',
          '<strong>Delete Set</strong> — Permanently deletes the ENTIRE recurring series globally. Every past and future instance is removed and this action cannot be undone.',
        ] },
        { type: 'note', text: 'Only tap "Delete Set" if you want to permanently retire the entire recurring task for everyone. There is no undo.' },
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'Delete Recurring Task Set Warning' },
      ],
    },
    {
      title: '5. Approving Tasks',
      items: [
        { type: 'p', html: true, text: 'When an employee submits a resolution, the task moves to <strong>Waiting Approval</strong>. Tap that tab, then tap a card to review it.' },
        { type: 'image', filename: 'shared_task_approval_view.png', alt: 'Task Approval View' },
        { type: 'p', html: true, text: '<strong>Standard "Mark as Done" approval:</strong> The employee has completed the task and submitted notes and/or photos as evidence. Review the details, then:' },
        { type: 'ul', items: [
          'Tap <strong>"Approve"</strong> to accept the completion and move the task to History.',
          'Tap <strong>"Reject"</strong> (with an optional comment) to return the task to the employee for re-work.',
        ] },
        { type: 'p', html: true, text: '<strong>Handling a "Stuck" task:</strong> The employee has flagged a blocker they cannot resolve themselves — for example, a repair that needs a contractor, a cost that exceeds their authority, or a safety concern. They have provided an explanation.' },
        { type: 'ul', items: [
          'Read the employee\'s reason carefully.',
          'Take the necessary external action (arrange a contractor, approve a budget, make a decision).',
          'Tap <strong>"Approve"</strong> to close the task once the blocker is resolved, or <strong>"Reject"</strong> with instructions to reassign it with a new action for the employee.',
        ] },
        { type: 'note', text: 'A Stuck task is frozen until you act — the employee cannot move it forward. A LINE notification is sent to the employee as soon as you approve or reject.' },
      ],
    },
  ],

  he: [
    {
      title: '1. כניסה וניווט',
      items: [
        { type: 'p', html: true, text: 'התחבר עם האימייל והסיסמה שסיפק לך מנהל המחלקה או ה-Big Boss.' },
        { type: 'image', filename: 'mgr_login_screen.png', alt: 'מסך כניסת מנהל' },
        { type: 'p', html: true, text: '<strong>שכחת סיסמה?</strong> לחץ על "שכחתי סיסמה" במסך הכניסה, הזן את האימייל הרשום שלך ועקוב אחר קישור האיפוס שנשלח לתיבת הדואר.' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'תהליך שחזור סיסמה' },
        { type: 'p', html: true, text: 'בניווט התחתון שלך שלוש לשוניות: <strong>משימות</strong>, <strong>צוות</strong> ו<strong>פרופיל</strong>.' },
        { type: 'image', filename: 'mgr_bottom_navigation.png', alt: 'ניווט תחתי של מנהל' },
        { type: 'p', html: true, text: 'ערוך את הפרטים האישיים, הסיסמה ותמונת הפרופיל שלך בלשונית <strong>פרופיל</strong>.' },
        { type: 'image', filename: 'mgr_profile_tab.png', alt: 'לשונית פרופיל מנהל' },
        { type: 'p', html: true, text: 'הגדר את העדפות ההתראות שלך ב-LINE בחלק <strong>הגדרות התראות</strong> בלשונית הפרופיל.' },
        { type: 'image', filename: 'mgr_notification_settings.png', alt: 'הגדרות התראות מנהל' },
        { type: 'p', html: true, text: 'לשונית <strong>הצוות</strong> מציגה את כל העובדים המשויכים ישירות אליך — שמם, תפקידם ופרטי הקשר שלהם. להוספה או הסרה של חברי צוות, פנה למנהל המחלקה או ל-Big Boss.' },
        { type: 'image', filename: 'mgr_team_tab.png', alt: 'לשונית צוות מנהל' },
      ],
    },
    {
      title: '2. סינון והקצאת משימות',
      items: [
        { type: 'p', html: true, text: 'ניתן לסנן משימות ולהקצות משימות חדשות <strong>אך ורק לעובדים המשויכים ישירות אליך</strong>. עובדים מחוץ לצוות שלך לא יופיעו ברשימת המשימה.' },
        { type: 'p', html: true, text: '<strong>לסינון משימות:</strong>' },
        { type: 'step', n: 1, text: 'לחץ על סמל הסינון (משפך) בראש לשונית המשימות.' },
        { type: 'step', n: 2, text: 'החל סינונים: עדיפות, סטטוס, מיקום, קטגוריה, מוקצה, או טווח תאריכים.' },
        { type: 'step', n: 3, text: 'לחץ "החל" לצפייה בתוצאות, או "נקה" לאיפוס.' },
        { type: 'image', filename: 'shared_filter_panel.png', alt: 'לוח סינון משימות' },
      ],
    },
    {
      title: '3. יצירת משימות וכללי תדירות',
      items: [
        { type: 'p', html: true, text: 'לחץ על כפתור <strong>"+"</strong> בלשונית המשימות לפתיחת טופס יצירת משימה.' },
        { type: 'image', filename: 'mgr_create_task_button.png', alt: 'כפתור יצירת משימה' },
        { type: 'step', n: 1, text: 'מלא את כותרת המשימה והתיאור.' },
        { type: 'step', n: 2, text: 'קבע עדיפות: נמוכה, בינונית, גבוהה, או דחופה.' },
        { type: 'step', n: 3, text: 'בחר מיקום וקטגוריה.' },
        { type: 'step', n: 4, text: 'הקצה לאחד או יותר מהעובדים הישירים שלך.' },
        { type: 'step', n: 5, text: 'הפעל "חזרה" ובחר תדירות (ראה כללים למטה).' },
        { type: 'step', n: 6, text: 'לחץ "צור משימה".' },
        { type: 'p', html: true, text: '<strong>כללי תדירות:</strong>' },
        { type: 'ul', items: [
          '<strong>יומי</strong> — ברירת מחדל: ימים א\'–ה\'. ניתן להפעיל/לכבות ימים ספציפיים (למשל לדלג על יום רביעי).',
          '<strong>שבועי</strong> — בחר יום אחד בשבוע. המשימה חוזרת על אותו יום כל שבוע.',
          '<strong>חודשי</strong> — בחר יום בחודש (1–31). המשימה חוזרת בתאריך זה כל חודש.',
          '<strong>רבעוני</strong> — בחר בדיוק 4 תאריכים פרוסים לאורך השנה. המשימה מופעלת בכל אחד מהם.',
          '<strong>שנתי</strong> — בחר תאריך אחד. המשימה חוזרת מדי שנה בתאריך זה.',
        ] },
        { type: 'image', filename: 'freq_daily.png', alt: 'הגדרות תדירות יומית' },
        { type: 'image', filename: 'freq_quarterly.png', alt: 'תדירות רבעונית — בחר 4 תאריכים' },
      ],
    },
    {
      title: '4. פעולות מתקדמות: פעולות מרובות ומחיקת סט',
      items: [
        { type: 'p', html: true, text: '<strong>פעולות מרובות:</strong> השתמש בתיבות סימון לפעולה על מספר משימות בבת אחת.' },
        { type: 'step', n: 1, text: 'לחץ לחיצה ארוכה על כרטיס משימה כלשהו — תיבות סימון יופיעו על כל הכרטיסים.' },
        { type: 'step', n: 2, text: 'לחץ על תיבות הסימון של כל משימה שברצונך לכלול.' },
        { type: 'step', n: 3, text: 'השתמש בסרגל הפעולות בתחתית ל"סמן כהושלם" או "מחק" את כל המשימות שנבחרו.' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'פעולות מרובות על משימות' },
        { type: 'p', html: true, text: '<strong>מחיקת סט — ⚠️ השתמש בזהירות:</strong>' },
        { type: 'p', text: 'בעת פתיחת משימה חוזרת, תראה שתי אפשרויות מחיקה:' },
        { type: 'ul', items: [
          '<strong>מחק</strong> — מסיר רק את המופע הבודד הזה. שאר הסדרה נשארת שלמה.',
          '<strong>מחק סט</strong> — מוחק לצמיתות את כל הסדרה החוזרת באופן גלובלי. כל מופע עבר ועתידי מוסר ולא ניתן לבטל את הפעולה.',
        ] },
        { type: 'note', text: 'לחץ על "מחק סט" רק אם ברצונך לפרוש לצמיתות את כל המשימה החוזרת עבור כולם. אין ביטול.' },
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'אזהרת מחיקת סדרת משימה חוזרת' },
      ],
    },
    {
      title: '5. אישור משימות',
      items: [
        { type: 'p', html: true, text: 'כאשר עובד מגיש פתרון, המשימה עוברת ל<strong>ממתין לאישור</strong>. לחץ על הלשונית, ולאחר מכן לחץ על כרטיס לסקירתו.' },
        { type: 'image', filename: 'shared_task_approval_view.png', alt: 'מסך אישור משימה' },
        { type: 'p', html: true, text: '<strong>אישור רגיל — "סומן כהושלם":</strong> העובד השלים את המשימה והגיש הערות ו/או תמונות כראיה. סקור את הפרטים, ולאחר מכן:' },
        { type: 'ul', items: [
          'לחץ <strong>"אשר"</strong> לקבלת ההשלמה ולהעברת המשימה להיסטוריה.',
          'לחץ <strong>"דחה"</strong> (עם הערה אופציונלית) להחזרת המשימה לעובד לעיבוד מחדש.',
        ] },
        { type: 'p', html: true, text: '<strong>טיפול במשימה "תקועה":</strong> העובד סימן חסם שאינו יכול לפתור בעצמו — למשל תיקון הדורש קבלן, עלות החורגת מסמכותו, או בעיית בטיחות. הוא סיפק הסבר.' },
        { type: 'ul', items: [
          'קרא את הסיבה שסיפק העובד בעיון.',
          'נקוט את הפעולה החיצונית הנדרשת (סדר קבלן, אשר תקציב, קבל החלטה).',
          'לחץ <strong>"אשר"</strong> לסגירת המשימה לאחר פתרון החסם, או <strong>"דחה"</strong> עם הוראות להקצאה מחדש עם פעולה חדשה לעובד.',
        ] },
        { type: 'note', text: 'משימה תקועה קפואה עד שתנקוט פעולה — העובד אינו יכול להתקדם. הודעת LINE נשלחת לעובד ברגע שאתה מאשר או דוחה.' },
      ],
    },
  ],

  th: [
    {
      title: '1. การเข้าสู่ระบบและการนำทาง',
      items: [
        { type: 'p', html: true, text: 'เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ผู้จัดการแผนกหรือ Big Boss มอบให้คุณ' },
        { type: 'image', filename: 'mgr_login_screen.png', alt: 'หน้าเข้าสู่ระบบผู้จัดการ' },
        { type: 'p', html: true, text: '<strong>ลืมรหัสผ่าน?</strong> แตะ "ลืมรหัสผ่าน?" บนหน้าเข้าสู่ระบบ ป้อนอีเมลที่ลงทะเบียน และทำตามลิงก์รีเซ็ตที่ส่งไปยังกล่องจดหมายของคุณ' },
        { type: 'image', filename: 'shared_forgot_password.png', alt: 'ขั้นตอนการรีเซ็ตรหัสผ่าน' },
        { type: 'p', html: true, text: 'แถบนำทางด้านล่างของคุณมีสามแท็บ: <strong>งาน</strong> <strong>ทีม</strong> และ <strong>โปรไฟล์</strong>' },
        { type: 'image', filename: 'mgr_bottom_navigation.png', alt: 'แถบนำทางผู้จัดการ' },
        { type: 'p', html: true, text: 'แก้ไขข้อมูลส่วนตัว รหัสผ่าน และรูปโปรไฟล์ในแท็บ<strong>โปรไฟล์</strong>' },
        { type: 'image', filename: 'mgr_profile_tab.png', alt: 'แท็บโปรไฟล์ผู้จัดการ' },
        { type: 'p', html: true, text: 'ตั้งค่าการแจ้งเตือน LINE ของคุณในส่วน<strong>การแจ้งเตือน</strong>ของแท็บโปรไฟล์' },
        { type: 'image', filename: 'mgr_notification_settings.png', alt: 'การตั้งค่าการแจ้งเตือนผู้จัดการ' },
        { type: 'p', html: true, text: 'แท็บ<strong>ทีม</strong>แสดงพนักงานทุกคนที่ถูกมอบหมายโดยตรงให้คุณ — ชื่อ บทบาท และข้อมูลติดต่อ หากต้องการเพิ่มหรือลบสมาชิกในทีม ให้ติดต่อผู้จัดการแผนกหรือ Big Boss' },
        { type: 'image', filename: 'mgr_team_tab.png', alt: 'แท็บทีมผู้จัดการ' },
      ],
    },
    {
      title: '2. การกรองและมอบหมายงาน',
      items: [
        { type: 'p', html: true, text: 'คุณสามารถกรองงานและมอบหมายงานใหม่<strong>ได้เฉพาะพนักงานที่ถูกมอบหมายโดยตรงให้คุณเท่านั้น</strong> พนักงานนอกทีมของคุณจะไม่ปรากฏในรายการผู้รับมอบหมาย' },
        { type: 'p', html: true, text: '<strong>วิธีกรองงาน:</strong>' },
        { type: 'step', n: 1, text: 'แตะไอคอนกรอง (กรวย) ที่ด้านบนของแท็บงาน' },
        { type: 'step', n: 2, text: 'ใช้ตัวกรอง: ความสำคัญ สถานะ สถานที่ หมวดหมู่ ผู้รับมอบหมาย หรือช่วงวันที่' },
        { type: 'step', n: 3, text: 'แตะ "ใช้" เพื่อดูผลลัพธ์ที่กรองแล้ว หรือ "ล้าง" เพื่อรีเซ็ต' },
        { type: 'image', filename: 'shared_filter_panel.png', alt: 'แผงกรองงาน' },
      ],
    },
    {
      title: '3. การสร้างงานและกฎความถี่',
      items: [
        { type: 'p', html: true, text: 'แตะปุ่ม <strong>"+"</strong> ในแท็บงานเพื่อเปิดฟอร์มสร้างงาน' },
        { type: 'image', filename: 'mgr_create_task_button.png', alt: 'ปุ่มสร้างงาน' },
        { type: 'step', n: 1, text: 'กรอกชื่องานและคำอธิบาย' },
        { type: 'step', n: 2, text: 'กำหนดความสำคัญ: ต่ำ ปานกลาง สูง หรือเร่งด่วน' },
        { type: 'step', n: 3, text: 'เลือกสถานที่และหมวดหมู่' },
        { type: 'step', n: 4, text: 'มอบหมายให้พนักงานโดยตรงของคุณหนึ่งคนหรือมากกว่า' },
        { type: 'step', n: 5, text: 'เปิด "ทำซ้ำ" และเลือกความถี่ (ดูกฎด้านล่าง)' },
        { type: 'step', n: 6, text: 'แตะ "สร้างงาน"' },
        { type: 'p', html: true, text: '<strong>กฎความถี่:</strong>' },
        { type: 'ul', items: [
          '<strong>รายวัน</strong> — ค่าเริ่มต้นคือวันจันทร์–ศุกร์ คุณสามารถเปิด/ปิดวันเฉพาะเจาะจงได้ (เช่น ข้ามวันพุธ)',
          '<strong>รายสัปดาห์</strong> — เลือก 1 วันของสัปดาห์ งานจะเกิดซ้ำในวันนั้นทุกสัปดาห์',
          '<strong>รายเดือน</strong> — เลือกวันในเดือน (1–31) งานจะเกิดซ้ำในวันที่นั้นทุกเดือน',
          '<strong>รายไตรมาส</strong> — เลือก 4 วันที่กระจายตลอดปี งานจะเริ่มในแต่ละวันที่เหล่านั้น',
          '<strong>รายปี</strong> — เลือก 1 วันที่เฉพาะเจาะจง งานจะเกิดซ้ำทุกปีในวันที่นั้น',
        ] },
        { type: 'image', filename: 'freq_daily.png', alt: 'การตั้งค่าความถี่รายวัน' },
        { type: 'image', filename: 'freq_quarterly.png', alt: 'ความถี่รายไตรมาส — เลือก 4 วันที่' },
      ],
    },
    {
      title: '4. การดำเนินการขั้นสูง: การดำเนินการหลายรายการและลบชุด',
      items: [
        { type: 'p', html: true, text: '<strong>การดำเนินการหลายรายการ:</strong> ใช้ช่องทำเครื่องหมายเพื่อดำเนินการกับหลายงานพร้อมกัน' },
        { type: 'step', n: 1, text: 'กดค้างที่การ์ดงานใดก็ได้ — ช่องทำเครื่องหมายจะปรากฏบนทุกการ์ด' },
        { type: 'step', n: 2, text: 'แตะช่องทำเครื่องหมายของแต่ละงานที่ต้องการรวม' },
        { type: 'step', n: 3, text: 'ใช้แถบการดำเนินการที่ด้านล่างเพื่อ "ทำเครื่องหมายว่าเสร็จ" หรือ "ลบ" งานที่เลือกทั้งหมด' },
        { type: 'image', filename: 'shared_bulk_task_operations.png', alt: 'การดำเนินการงานหลายรายการ' },
        { type: 'p', html: true, text: '<strong>ลบชุด — ⚠️ ใช้ด้วยความระมัดระวัง:</strong>' },
        { type: 'p', text: 'เมื่อคุณเปิดงานที่เกิดซ้ำ คุณจะเห็นตัวเลือกการลบสองแบบ:' },
        { type: 'ul', items: [
          '<strong>ลบ</strong> — ลบเฉพาะการเกิดซ้ำครั้งนี้เท่านั้น ส่วนที่เหลือของชุดยังคงสมบูรณ์',
          '<strong>ลบชุด</strong> — ลบชุดที่เกิดซ้ำทั้งหมดอย่างถาวรในระดับสากล ทุกอินสแตนซ์ในอดีตและอนาคตจะถูกลบและไม่สามารถยกเลิกได้',
        ] },
        { type: 'note', text: 'แตะ "ลบชุด" เฉพาะเมื่อต้องการยกเลิกงานที่เกิดซ้ำทั้งหมดอย่างถาวรสำหรับทุกคน ไม่มีการยกเลิก' },
        { type: 'image', filename: 'shared_delete_recurring_set.png', alt: 'คำเตือนการลบชุดงานที่เกิดซ้ำ' },
      ],
    },
    {
      title: '5. การอนุมัติงาน',
      items: [
        { type: 'p', html: true, text: 'เมื่อพนักงานส่งการแก้ไข งานจะย้ายไปยัง<strong>รออนุมัติ</strong> แตะแท็บนั้น จากนั้นแตะการ์ดเพื่อตรวจสอบ' },
        { type: 'image', filename: 'shared_task_approval_view.png', alt: 'หน้าอนุมัติงาน' },
        { type: 'p', html: true, text: '<strong>การอนุมัติมาตรฐาน "ทำเครื่องหมายว่าเสร็จ":</strong> พนักงานได้เสร็จสิ้นงานและส่งบันทึกและ/หรือรูปภาพเป็นหลักฐาน ตรวจสอบรายละเอียด จากนั้น:' },
        { type: 'ul', items: [
          'แตะ <strong>"อนุมัติ"</strong> เพื่อยอมรับการเสร็จสิ้นและย้ายงานไปยังประวัติ',
          'แตะ <strong>"ปฏิเสธ"</strong> (พร้อมความคิดเห็นที่ไม่บังคับ) เพื่อส่งงานคืนให้พนักงานทำงานใหม่',
        ] },
        { type: 'p', html: true, text: '<strong>การจัดการงาน "ติดขัด":</strong> พนักงานได้ระบุอุปสรรคที่ไม่สามารถแก้ไขได้เอง — เช่น การซ่อมแซมที่ต้องการผู้รับเหมา ค่าใช้จ่ายที่เกินอำนาจ หรือปัญหาความปลอดภัย พวกเขาได้ให้คำอธิบายไว้แล้ว' },
        { type: 'ul', items: [
          'อ่านเหตุผลของพนักงานอย่างละเอียด',
          'ดำเนินการภายนอกที่จำเป็น (จัดหาผู้รับเหมา อนุมัติงบประมาณ ตัดสินใจ)',
          'แตะ <strong>"อนุมัติ"</strong> เพื่อปิดงานเมื่อแก้ไขอุปสรรคแล้ว หรือ <strong>"ปฏิเสธ"</strong> พร้อมคำแนะนำเพื่อมอบหมายใหม่พร้อมการดำเนินการใหม่สำหรับพนักงาน',
        ] },
        { type: 'note', text: 'งานติดขัดจะถูกระงับจนกว่าคุณจะดำเนินการ — พนักงานไม่สามารถก้าวหน้าต่อได้ การแจ้งเตือน LINE จะถูกส่งให้พนักงานทันทีที่คุณอนุมัติหรือปฏิเสธ' },
      ],
    },
  ],
};

/* ─────────────────────────────────────────────
   MANUAL DATA — EMPLOYEE
───────────────────────────────────────────── */

const EMPLOYEE_MANUAL = {
  en: [
    {
      title: '1. Welcome to Air Manage',
      items: [
        { type: 'p', text: 'Air Manage helps you stay on top of your daily and recurring maintenance tasks. Log in with the email and password provided by your manager.' },
        { type: 'image', filename: 'emp_login_screen.png', alt: 'Employee Login Screen' },
        { type: 'p', html: true, text: '<strong>Forgot your password?</strong> Follow these steps to reset it:' },
        { type: 'step', n: 1, text: 'On the login screen, tap "Forgot Password?" beneath the login button.' },
        { type: 'step', n: 2, text: 'Enter your registered email address and tap "Send Reset Link".' },
        { type: 'step', n: 3, text: 'Check your email for the reset link and follow the instructions.' },
        { type: 'step', n: 4, text: 'Return to the app and log in with your new password.' },
        { type: 'image', filename: 'emp_forgot_password.png', alt: 'Forgot Password Flow' },
        { type: 'p', html: true, text: 'After logging in, your screen has two tabs at the bottom:' },
        { type: 'ul', items: ['<strong>Tasks</strong> — See all tasks assigned to you.', '<strong>Profile</strong> — Update your personal info and preferences.'] },
        { type: 'image', filename: 'emp_bottom_navigation.png', alt: 'Employee Bottom Navigation' },
      ],
    },
    {
      title: '2. Understanding Your Task List',
      items: [
        { type: 'p', text: 'Your tasks are grouped into four status tabs:' },
        { type: 'ul', items: ['<strong>Overdue</strong> — These tasks are past their due date. Complete them as soon as possible and notify your manager.', '<strong>To Do</strong> — Your current and upcoming tasks.', '<strong>Waiting Approval</strong> — Tasks you\'ve submitted for review. Your manager will approve or return them.', '<strong>History</strong> — Completed and approved tasks for your reference.'] },
        { type: 'image', filename: 'emp_tasks_tab_overview.png', alt: 'Employee Task List Overview' },
        { type: 'image', filename: 'emp_tasks_status_tabs.png', alt: 'Employee Task Status Tabs' },
        { type: 'p', html: true, text: '<strong>Creating a task:</strong> Employees can create tasks, but they can <strong>only assign tasks to themselves</strong>. To create a task, tap the <strong>+ Create Task</strong> button at the bottom of the Tasks tab.' },
        { type: 'image', filename: 'emp_create_task_button.png', alt: 'Employee Create Task Button' },
      ],
    },
    {
      title: '3. Completing a Task — Resolution Options',
      items: [
        { type: 'p', text: 'When you open a task and are ready to act, you have three resolution options. Choose the one that matches your situation:' },
        { type: 'image', filename: 'emp_task_detail_screen.png', alt: 'Task Detail Screen' },
        { type: 'image', filename: 'emp_task_resolution_buttons.png', alt: 'Task Resolution Buttons' },
        { type: 'p', html: true, text: '<strong>Option 1 — Mark as Done</strong>' },
        { type: 'p', text: 'Use this when you have fully completed the task.' },
        { type: 'step', n: 1, text: 'Tap "Mark as Done".' },
        { type: 'step', n: 2, text: 'Optionally add a completion note and upload a photo as proof of work.' },
        { type: 'step', n: 3, text: 'Tap "Submit". The task moves to "Waiting Approval" (or directly to History if your manager has Auto-Approve enabled).' },
        { type: 'tip', text: 'Adding a photo speeds up the approval process and provides a clear record of the completed work.' },
        { type: 'p', html: true, text: '<strong>Option 2 — Continue Task (Follow-up / Needs More Time)</strong>' },
        { type: 'p', text: 'Use this when the task is partially done but requires additional time, parts, or a follow-up visit. The task will be rescheduled rather than closed.' },
        { type: 'step', n: 1, text: 'Tap "Continue Task".' },
        { type: 'step', n: 2, text: 'Enter a reason explaining what still needs to be done (e.g., "Waiting for spare part delivery").' },
        { type: 'step', n: 3, text: 'Select a new due date for the follow-up.' },
        { type: 'step', n: 4, text: 'Tap "Submit". The task is rescheduled to the new date and stays in your To Do list.' },
        { type: 'image', filename: 'emp_task_continue_form.png', alt: 'Continue Task Form' },
        { type: 'note', text: 'Your manager can see the reason and new due date you entered. Use this option to keep them informed of your progress.' },
        { type: 'p', html: true, text: '<strong>Option 3 — Mark as Stuck</strong>' },
        { type: 'p', text: 'Use this when you cannot complete the task without external help, budget approval, or a manager decision (e.g., repair needs a contractor, cost exceeds your authority, safety concern).' },
        { type: 'step', n: 1, text: 'Tap "Mark as Stuck".' },
        { type: 'step', n: 2, text: 'Enter a clear explanation of why the task is blocked.' },
        { type: 'step', n: 3, text: 'Tap "Submit". The task moves to "Waiting Approval" so your manager can review it and take action.' },
        { type: 'image', filename: 'emp_task_stuck_form.png', alt: 'Mark as Stuck Form' },
        { type: 'note', text: 'A "Stuck" task will not return to your To Do list until your manager reviews it and takes action (e.g., arranges external help or re-assigns the task). Make your reason as clear as possible.' },
      ],
    },
    {
      title: '4. Understanding Task Priority',
      items: [
        { type: 'p', text: 'Each task has a priority level that tells you how urgent it is:' },
        { type: 'ul', items: ['🟢 <strong>Low</strong> — Complete when you have time.', '🟡 <strong>Medium</strong> — Complete today.', '🟠 <strong>High</strong> — Complete as soon as possible.', '🔴 <strong>Urgent</strong> — Drop everything and handle immediately.'] },
      ],
    },
    {
      title: '5. Viewing Task Details',
      items: [
        { type: 'p', text: 'Tap any task card to see:' },
        { type: 'ul', items: ['Full description and instructions.', 'Location and category.', 'Due date and time.', 'Any attachments or images added by your manager.'] },
      ],
    },
    {
      title: '6. Searching & Filtering Tasks',
      items: [
        { type: 'p', html: true, text: 'Use the search bar at the top of the Tasks tab to find a task by name or description. You can also switch between <strong>Daily</strong> and <strong>Weekly</strong> views to see tasks by date.' },
      ],
    },
    {
      title: '7. Notifications',
      items: [
        { type: 'p', text: 'You will receive notifications via LINE when:' },
        { type: 'ul', items: ['A new task is assigned to you.', 'A task you submitted is approved ✅ or rejected ❌.', 'A task is approaching its due date.'] },
        { type: 'image', filename: 'emp_notification_settings.png', alt: 'Employee Notification Settings' },
        { type: 'note', text: "Make sure your LINE account is linked. Ask your manager if you're not receiving notifications." },
      ],
    },
    {
      title: '8. Profile Settings',
      items: [
        { type: 'p', html: true, text: 'Go to the <strong>Profile</strong> tab to update your:' },
        { type: 'ul', items: ['Display name (English / Hebrew / Thai)', 'Email address', 'Phone number', 'Password', 'Profile picture'] },
        { type: 'step', n: 1, text: 'Tap the Profile tab.' },
        { type: 'step', n: 2, text: 'Tap "Edit" or tap your avatar to upload a new photo.' },
        { type: 'step', n: 3, text: 'Tap "Save Changes".' },
        { type: 'image', filename: 'emp_profile_tab.png', alt: 'Profile Settings' },
        { type: 'tip', text: 'You can change the display language using the flag selector (🇺🇸 / 🇮🇱 / 🇹🇭) in the top-right corner.' },
      ],
    },
  ],

  he: [
    {
      title: '1. ברוכים הבאים ל-Air Manage',
      items: [
        { type: 'p', text: 'Air Manage עוזרת לך לעקוב אחר משימות התחזוקה היומיות והחוזרות שלך. התחבר עם הדואר האלקטרוני והסיסמה שסיפק המנהל שלך.' },
        { type: 'image', filename: 'emp_login_screen.png', alt: 'מסך התחברות עובד' },
        { type: 'p', html: true, text: '<strong>שכחת את הסיסמה?</strong> בצע את הצעדים הבאים לאיפוס:' },
        { type: 'step', n: 1, text: 'במסך ההתחברות, לחץ על "שכחתי סיסמה?" מתחת לכפתור ההתחברות.' },
        { type: 'step', n: 2, text: 'הזן את כתובת האימייל הרשומה שלך ולחץ "שלח קישור איפוס".' },
        { type: 'step', n: 3, text: 'בדוק את האימייל שלך לאיתור קישור האיפוס ופעל לפי ההוראות.' },
        { type: 'step', n: 4, text: 'חזור לאפליקציה והתחבר עם הסיסמה החדשה שלך.' },
        { type: 'image', filename: 'emp_forgot_password.png', alt: 'תהליך שכחתי סיסמה' },
        { type: 'p', html: true, text: 'לאחר ההתחברות, בתחתית המסך שלך שתי לשוניות:' },
        { type: 'ul', items: ['<strong>משימות</strong> — ראה את כל המשימות שהוקצו לך.', '<strong>פרופיל</strong> — עדכן את המידע האישי שלך והעדפותיך.'] },
        { type: 'image', filename: 'emp_bottom_navigation.png', alt: 'ניווט תחתי של עובד' },
      ],
    },
    {
      title: '2. הבנת רשימת המשימות שלך',
      items: [
        { type: 'p', text: 'המשימות שלך מקובצות לארבע לשוניות סטטוס:' },
        { type: 'ul', items: ['<strong>באיחור</strong> — משימות אלו עברו את תאריך היעד. השלם אותן בהקדם האפשרי והודע למנהל שלך.', '<strong>לביצוע</strong> — המשימות הנוכחיות והעתידיות שלך.', '<strong>ממתין לאישור</strong> — משימות שהגשת לבדיקה. המנהל שלך יאשר או יחזיר אותן.', '<strong>היסטוריה</strong> — משימות שהושלמו ואושרו לעיונך.'] },
        { type: 'image', filename: 'emp_tasks_tab_overview.png', alt: 'סקירת לשונית משימות עובד' },
        { type: 'image', filename: 'emp_tasks_status_tabs.png', alt: 'לשוניות סטטוס משימות עובד' },
        { type: 'p', html: true, text: '<strong>יצירת משימה:</strong> עובדים יכולים ליצור משימות, אך הם יכולים <strong>להקצות משימות לעצמם בלבד</strong>. ליצירת משימה, לחץ על כפתור <strong>+ צור משימה</strong> בתחתית לשונית המשימות.' },
        { type: 'image', filename: 'emp_create_task_button.png', alt: 'כפתור יצירת משימה לעובד' },
      ],
    },
    {
      title: '3. השלמת משימה — אפשרויות פתרון',
      items: [
        { type: 'p', text: 'כשאתה פותח משימה ומוכן לפעול, יש לך שלוש אפשרויות פתרון. בחר את האפשרות המתאימה למצבך:' },
        { type: 'image', filename: 'emp_task_detail_screen.png', alt: 'מסך פרטי המשימה' },
        { type: 'image', filename: 'emp_task_resolution_buttons.png', alt: 'כפתורי פתרון משימה' },
        { type: 'p', html: true, text: '<strong>אפשרות 1 — סמן כהושלם</strong>' },
        { type: 'p', text: 'השתמש באפשרות זו כאשר השלמת את המשימה במלואה.' },
        { type: 'step', n: 1, text: 'לחץ "סמן כהושלם".' },
        { type: 'step', n: 2, text: 'אופציונלית הוסף הערת השלמה והעלה תמונה כהוכחה לעבודה.' },
        { type: 'step', n: 3, text: 'לחץ "שלח". המשימה עוברת ל"ממתין לאישור" (או ישירות ל"היסטוריה" אם המנהל שלך הפעיל אישור אוטומטי).' },
        { type: 'tip', text: 'הוספת תמונה מזרזת את תהליך האישור ומספקת תיעוד ברור של העבודה שבוצעה.' },
        { type: 'p', html: true, text: '<strong>אפשרות 2 — המשך משימה (דורש זמן נוסף / חלקים)</strong>' },
        { type: 'p', text: 'השתמש באפשרות זו כאשר המשימה בוצעה חלקית אך דורשת זמן נוסף, חלקי חילוף, או ביקור המשך. המשימה תקבע מחדש במקום להיסגר.' },
        { type: 'step', n: 1, text: 'לחץ "המשך משימה".' },
        { type: 'step', n: 2, text: 'הזן סיבה המסבירה מה עדיין נדרש לביצוע (לדוגמה: "ממתין לאספקת חלק חילוף").' },
        { type: 'step', n: 3, text: 'בחר תאריך יעד חדש לביקור ההמשך.' },
        { type: 'step', n: 4, text: 'לחץ "שלח". המשימה מתוכננת מחדש לתאריך החדש ונשארת ברשימת "לביצוע" שלך.' },
        { type: 'image', filename: 'emp_task_continue_form.png', alt: 'טופס המשך משימה' },
        { type: 'note', text: 'המנהל שלך יכול לראות את הסיבה ותאריך היעד החדש שהזנת. השתמש באפשרות זו כדי להשאיר אותו מעודכן לגבי התקדמותך.' },
        { type: 'p', html: true, text: '<strong>אפשרות 3 — סמן כתקוע</strong>' },
        { type: 'p', text: 'השתמש באפשרות זו כאשר אינך יכול להשלים את המשימה ללא עזרה חיצונית, אישור תקציב, או החלטת מנהל (לדוגמה: התיקון דורש קבלן, העלות חורגת מסמכותך, בעיית בטיחות).' },
        { type: 'step', n: 1, text: 'לחץ "סמן כתקוע".' },
        { type: 'step', n: 2, text: 'הזן הסבר ברור מדוע המשימה חסומה.' },
        { type: 'step', n: 3, text: 'לחץ "שלח". המשימה עוברת ל"ממתין לאישור" כדי שהמנהל שלך יוכל לבדוק ולנקוט פעולה.' },
        { type: 'image', filename: 'emp_task_stuck_form.png', alt: 'טופס סימון כתקוע' },
        { type: 'note', text: 'משימה "תקועה" לא תחזור לרשימת "לביצוע" שלך עד שהמנהל שלך יבדוק אותה ויפעל (לדוגמה: ידאג לעזרה חיצונית או יחלק מחדש את המשימה). הפוך את הסיבה שלך לברורה ככל האפשר.' },
      ],
    },
    {
      title: '4. הבנת עדיפות המשימה',
      items: [
        { type: 'p', text: 'לכל משימה יש רמת עדיפות המציינת את דחיפותה:' },
        { type: 'ul', items: ['🟢 <strong>נמוכה</strong> — השלם כשיש לך זמן.', '🟡 <strong>בינונית</strong> — השלם היום.', '🟠 <strong>גבוהה</strong> — השלם בהקדם האפשרי.', '🔴 <strong>דחופה</strong> — עצור הכל וטפל מיד.'] },
      ],
    },
    {
      title: '5. צפייה בפרטי משימה',
      items: [
        { type: 'p', text: 'לחץ על כל כרטיס משימה לצפייה ב:' },
        { type: 'ul', items: ['תיאור מלא והוראות.', 'מיקום וקטגוריה.', 'תאריך ושעת יעד.', 'קבצים מצורפים או תמונות שהוסיף המנהל שלך.'] },
      ],
    },
    {
      title: '6. חיפוש וסינון משימות',
      items: [
        { type: 'p', html: true, text: 'השתמש בשורת החיפוש בראש לשונית המשימות לחיפוש משימה לפי שם או תיאור. תוכל גם לעבור בין תצוגות <strong>יומי</strong> ו<strong>שבועי</strong> לצפייה במשימות לפי תאריך.' },
      ],
    },
    {
      title: '7. התראות',
      items: [
        { type: 'p', text: 'תקבל התראות ב-LINE כאשר:' },
        { type: 'ul', items: ['משימה חדשה הוקצתה לך.', 'משימה שהגשת אושרה ✅ או נדחתה ❌.', 'משימה מתקרבת לתאריך היעד שלה.'] },
        { type: 'image', filename: 'emp_notification_settings.png', alt: 'הגדרות התראות עובד' },
        { type: 'note', text: 'ודא שחשבון ה-LINE שלך מקושר. פנה למנהל שלך אם אינך מקבל התראות.' },
      ],
    },
    {
      title: '8. הגדרות פרופיל',
      items: [
        { type: 'p', html: true, text: 'עבור ללשונית <strong>פרופיל</strong> לעדכון:' },
        { type: 'ul', items: ['שם תצוגה (אנגלית / עברית / תאית)', 'כתובת אימייל', 'מספר טלפון', 'סיסמה', 'תמונת פרופיל'] },
        { type: 'step', n: 1, text: 'לחץ על לשונית פרופיל.' },
        { type: 'step', n: 2, text: 'לחץ "ערוך" או לחץ על האווטר שלך להעלאת תמונה חדשה.' },
        { type: 'step', n: 3, text: 'לחץ "שמור שינויים".' },
        { type: 'image', filename: 'emp_profile_tab.png', alt: 'הגדרות פרופיל' },
        { type: 'tip', text: 'ניתן לשנות את שפת התצוגה באמצעות בורר הדגל (🇺🇸 / 🇮🇱 / 🇹🇭) בפינה הימנית העליונה.' },
      ],
    },
  ],

  th: [
    {
      title: '1. ยินดีต้อนรับสู่ Air Manage',
      items: [
        { type: 'p', text: 'Air Manage ช่วยให้คุณติดตามงานบำรุงรักษาประจำวันและงานที่เกิดซ้ำของคุณ เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่ผู้จัดการของคุณให้ไว้' },
        { type: 'image', filename: 'emp_login_screen.png', alt: 'หน้าจอเข้าสู่ระบบพนักงาน' },
        { type: 'p', html: true, text: '<strong>ลืมรหัสผ่าน?</strong> ทำตามขั้นตอนเหล่านี้เพื่อรีเซ็ต:' },
        { type: 'step', n: 1, text: 'ในหน้าจอเข้าสู่ระบบ แตะ "ลืมรหัสผ่าน?" ใต้ปุ่มเข้าสู่ระบบ' },
        { type: 'step', n: 2, text: 'ป้อนที่อยู่อีเมลที่ลงทะเบียนของคุณและแตะ "ส่งลิงก์รีเซ็ต"' },
        { type: 'step', n: 3, text: 'ตรวจสอบอีเมลของคุณเพื่อหาลิงก์รีเซ็ตและทำตามคำแนะนำ' },
        { type: 'step', n: 4, text: 'กลับไปที่แอปและเข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ' },
        { type: 'image', filename: 'emp_forgot_password.png', alt: 'ขั้นตอนลืมรหัสผ่าน' },
        { type: 'p', html: true, text: 'หลังจากเข้าสู่ระบบ หน้าจอของคุณมีสองแท็บที่ด้านล่าง:' },
        { type: 'ul', items: ['<strong>งาน</strong> — ดูงานทั้งหมดที่ได้รับมอบหมายให้คุณ', '<strong>โปรไฟล์</strong> — อัปเดตข้อมูลส่วนตัวและการตั้งค่าของคุณ'] },
        { type: 'image', filename: 'emp_bottom_navigation.png', alt: 'แถบนำทางพนักงาน' },
      ],
    },
    {
      title: '2. การเข้าใจรายการงานของคุณ',
      items: [
        { type: 'p', text: 'งานของคุณถูกจัดกลุ่มเป็นสี่แท็บสถานะ:' },
        { type: 'ul', items: ['<strong>เกินกำหนด</strong> — งานเหล่านี้เลยวันครบกำหนดแล้ว ทำให้เสร็จโดยเร็วที่สุดและแจ้งผู้จัดการของคุณ', '<strong>รอดำเนินการ</strong> — งานปัจจุบันและงานที่กำลังจะมาถึงของคุณ', '<strong>รออนุมัติ</strong> — งานที่คุณส่งเพื่อตรวจสอบ ผู้จัดการของคุณจะอนุมัติหรือส่งคืน', '<strong>ประวัติ</strong> — งานที่เสร็จสิ้นและได้รับการอนุมัติสำหรับข้อมูลอ้างอิงของคุณ'] },
        { type: 'image', filename: 'emp_tasks_tab_overview.png', alt: 'ภาพรวมแท็บงานพนักงาน' },
        { type: 'image', filename: 'emp_tasks_status_tabs.png', alt: 'แท็บสถานะงานพนักงาน' },
        { type: 'p', html: true, text: '<strong>การสร้างงาน:</strong> พนักงานสามารถสร้างงานได้ แต่สามารถ<strong>มอบหมายงานให้ตัวเองเท่านั้น</strong> หากต้องการสร้างงาน ให้แตะปุ่ม <strong>+ สร้างงาน</strong> ที่ด้านล่างของแท็บงาน' },
        { type: 'image', filename: 'emp_create_task_button.png', alt: 'ปุ่มสร้างงานพนักงาน' },
      ],
    },
    {
      title: '3. การทำงานให้เสร็จสิ้น — ตัวเลือกการแก้ไข',
      items: [
        { type: 'p', text: 'เมื่อคุณเปิดงานและพร้อมที่จะดำเนินการ คุณมีสามตัวเลือกในการแก้ไข เลือกตัวเลือกที่เหมาะกับสถานการณ์ของคุณ:' },
        { type: 'image', filename: 'emp_task_detail_screen.png', alt: 'หน้าจอรายละเอียดงาน' },
        { type: 'image', filename: 'emp_task_resolution_buttons.png', alt: 'ปุ่มแก้ไขงาน' },
        { type: 'p', html: true, text: '<strong>ตัวเลือกที่ 1 — ทำเครื่องหมายว่าเสร็จสิ้น</strong>' },
        { type: 'p', text: 'ใช้เมื่อคุณทำงานเสร็จสมบูรณ์แล้ว' },
        { type: 'step', n: 1, text: 'แตะ "ทำเครื่องหมายว่าเสร็จสิ้น"' },
        { type: 'step', n: 2, text: 'เพิ่มบันทึกการเสร็จสิ้นและอัปโหลดรูปภาพเป็นหลักฐานการทำงาน (ไม่บังคับ)' },
        { type: 'step', n: 3, text: 'แตะ "ส่ง" งานจะย้ายไปยัง "รออนุมัติ" (หรือไปยัง "ประวัติ" โดยตรงหากผู้จัดการของคุณเปิดใช้งานการอนุมัติอัตโนมัติ)' },
        { type: 'tip', text: 'การเพิ่มรูปภาพช่วยเร่งกระบวนการอนุมัติและให้บันทึกที่ชัดเจนของงานที่เสร็จสิ้น' },
        { type: 'p', html: true, text: '<strong>ตัวเลือกที่ 2 — ดำเนินงานต่อ (ต้องการเวลา/ชิ้นส่วนเพิ่มเติม)</strong>' },
        { type: 'p', text: 'ใช้เมื่องานทำเสร็จบางส่วนแต่ต้องการเวลาเพิ่มเติม ชิ้นส่วน หรือการเยี่ยมชมติดตาม งานจะถูกกำหนดใหม่แทนที่จะปิด' },
        { type: 'step', n: 1, text: 'แตะ "ดำเนินงานต่อ"' },
        { type: 'step', n: 2, text: 'ป้อนเหตุผลที่อธิบายสิ่งที่ยังต้องทำ (เช่น "รอการส่งอะไหล่")' },
        { type: 'step', n: 3, text: 'เลือกวันครบกำหนดใหม่สำหรับการติดตาม' },
        { type: 'step', n: 4, text: 'แตะ "ส่ง" งานจะถูกกำหนดใหม่ตามวันที่ใหม่และยังคงอยู่ในรายการ "รอดำเนินการ" ของคุณ' },
        { type: 'image', filename: 'emp_task_continue_form.png', alt: 'แบบฟอร์มดำเนินงานต่อ' },
        { type: 'note', text: 'ผู้จัดการของคุณสามารถเห็นเหตุผลและวันครบกำหนดใหม่ที่คุณป้อน ใช้ตัวเลือกนี้เพื่อแจ้งให้พวกเขาทราบถึงความคืบหน้าของคุณ' },
        { type: 'p', html: true, text: '<strong>ตัวเลือกที่ 3 — ทำเครื่องหมายว่าติดขัด</strong>' },
        { type: 'p', text: 'ใช้เมื่อคุณไม่สามารถทำงานให้เสร็จสิ้นได้โดยไม่มีความช่วยเหลือจากภายนอก การอนุมัติงบประมาณ หรือการตัดสินใจของผู้จัดการ (เช่น การซ่อมแซมต้องใช้ผู้รับเหมา ค่าใช้จ่ายเกินอำนาจของคุณ ปัญหาด้านความปลอดภัย)' },
        { type: 'step', n: 1, text: 'แตะ "ทำเครื่องหมายว่าติดขัด"' },
        { type: 'step', n: 2, text: 'ป้อนคำอธิบายที่ชัดเจนว่าทำไมงานถึงถูกบล็อก' },
        { type: 'step', n: 3, text: 'แตะ "ส่ง" งานจะย้ายไปยัง "รออนุมัติ" เพื่อให้ผู้จัดการของคุณตรวจสอบและดำเนินการ' },
        { type: 'image', filename: 'emp_task_stuck_form.png', alt: 'แบบฟอร์มทำเครื่องหมายว่าติดขัด' },
        { type: 'note', text: 'งานที่ "ติดขัด" จะไม่กลับไปยังรายการ "รอดำเนินการ" ของคุณจนกว่าผู้จัดการของคุณจะตรวจสอบและดำเนินการ (เช่น จัดการความช่วยเหลือจากภายนอกหรือมอบหมายงานใหม่) ทำให้เหตุผลของคุณชัดเจนที่สุดเท่าที่จะทำได้' },
      ],
    },
    {
      title: '4. การเข้าใจความสำคัญของงาน',
      items: [
        { type: 'p', text: 'งานแต่ละชิ้นมีระดับความสำคัญที่บอกคุณถึงความเร่งด่วน:' },
        { type: 'ul', items: ['🟢 <strong>ต่ำ</strong> — ทำเสร็จเมื่อมีเวลา', '🟡 <strong>ปานกลาง</strong> — ทำเสร็จวันนี้', '🟠 <strong>สูง</strong> — ทำเสร็จโดยเร็วที่สุด', '🔴 <strong>เร่งด่วน</strong> — หยุดทุกอย่างและจัดการทันที'] },
      ],
    },
    {
      title: '5. การดูรายละเอียดงาน',
      items: [
        { type: 'p', text: 'แตะการ์ดงานใดก็ได้เพื่อดู:' },
        { type: 'ul', items: ['คำอธิบายและคำแนะนำฉบับเต็ม', 'สถานที่และหมวดหมู่', 'วันและเวลาครบกำหนด', 'ไฟล์แนบหรือรูปภาพที่ผู้จัดการของคุณเพิ่ม'] },
      ],
    },
    {
      title: '6. การค้นหาและกรองงาน',
      items: [
        { type: 'p', html: true, text: 'ใช้แถบค้นหาที่ด้านบนของแท็บงานเพื่อค้นหางานตามชื่อหรือคำอธิบาย คุณยังสามารถสลับระหว่างมุมมอง<strong>รายวัน</strong>และ<strong>รายสัปดาห์</strong>เพื่อดูงานตามวันที่' },
      ],
    },
    {
      title: '7. การแจ้งเตือน',
      items: [
        { type: 'p', text: 'คุณจะได้รับการแจ้งเตือนผ่าน LINE เมื่อ:' },
        { type: 'ul', items: ['มีการมอบหมายงานใหม่ให้คุณ', 'งานที่คุณส่งได้รับการอนุมัติ ✅ หรือถูกปฏิเสธ ❌', 'งานกำลังใกล้ถึงวันครบกำหนด'] },
        { type: 'image', filename: 'emp_notification_settings.png', alt: 'การตั้งค่าการแจ้งเตือนพนักงาน' },
        { type: 'note', text: 'ตรวจสอบให้แน่ใจว่าบัญชี LINE ของคุณเชื่อมโยงแล้ว ถามผู้จัดการของคุณหากคุณไม่ได้รับการแจ้งเตือน' },
      ],
    },
    {
      title: '8. การตั้งค่าโปรไฟล์',
      items: [
        { type: 'p', html: true, text: 'ไปที่แท็บ<strong>โปรไฟล์</strong>เพื่ออัปเดต:' },
        { type: 'ul', items: ['ชื่อที่แสดง (อังกฤษ / ฮีบรู / ไทย)', 'ที่อยู่อีเมล', 'หมายเลขโทรศัพท์', 'รหัสผ่าน', 'รูปโปรไฟล์'] },
        { type: 'step', n: 1, text: 'แตะแท็บโปรไฟล์' },
        { type: 'step', n: 2, text: 'แตะ "แก้ไข" หรือแตะอวตารของคุณเพื่ออัปโหลดรูปใหม่' },
        { type: 'step', n: 3, text: 'แตะ "บันทึกการเปลี่ยนแปลง"' },
        { type: 'image', filename: 'emp_profile_tab.png', alt: 'การตั้งค่าโปรไฟล์' },
        { type: 'tip', text: 'คุณสามารถเปลี่ยนภาษาที่แสดงโดยใช้ตัวเลือกธง (🇺🇸 / 🇮🇱 / 🇹🇭) ที่มุมขวาบน' },
      ],
    },
  ],
};

/* ─────────────────────────────────────────────
   Role-specific manual components
───────────────────────────────────────────── */

const BigBossManual        = ({ lang }) => <ManualRenderer sections={BIG_BOSS_MANUAL[lang]        || BIG_BOSS_MANUAL.en} />;
const CompanyManagerManual = ({ lang }) => <ManualRenderer sections={COMPANY_MANAGER_MANUAL[lang] || COMPANY_MANAGER_MANUAL.en} />;
const ManagerManual        = ({ lang }) => <ManualRenderer sections={MANAGER_MANUAL[lang]          || MANAGER_MANUAL.en} />;
const EmployeeManual       = ({ lang }) => <ManualRenderer sections={EMPLOYEE_MANUAL[lang]         || EMPLOYEE_MANUAL.en} />;

/* ─────────────────────────────────────────────
   ROLE → MANUAL MAP
───────────────────────────────────────────── */

const MANUAL_CONFIG = {
  BIG_BOSS: {
    badge: 'bg-purple-100 text-purple-700',
    badgeLabel: { en: 'Big Boss', he: 'Big Boss', th: 'Big Boss' },
    subtitle: {
      en: 'Complete guide to managing the entire Air Manage platform',
      he: 'מדריך מלא לניהול פלטפורמת Air Manage כולה',
      th: 'คู่มือฉบับสมบูรณ์สำหรับการจัดการแพลตฟอร์ม Air Manage ทั้งหมด',
    },
    Component: BigBossManual,
  },
  COMPANY_MANAGER: {
    badge: 'bg-blue-100 text-blue-700',
    badgeLabel: { en: 'Department Manager', he: 'מנהל מחלקה', th: 'ผู้จัดการแผนก' },
    subtitle: {
      en: 'Guide to managing your department, staff, and task workflow',
      he: 'מדריך לניהול המחלקה, הצוות ותהליך המשימות שלך',
      th: 'คู่มือสำหรับการจัดการแผนก พนักงาน และกระบวนการงานของคุณ',
    },
    Component: CompanyManagerManual,
  },
  MANAGER: {
    badge: 'bg-green-100 text-green-700',
    badgeLabel: { en: 'Manager', he: 'מנהל', th: 'ผู้จัดการ' },
    subtitle: {
      en: 'Guide to managing your team and daily task operations',
      he: 'מדריך לניהול הצוות שלך ופעולות המשימות היומיות',
      th: 'คู่มือสำหรับการจัดการทีมและการดำเนินงานประจำวัน',
    },
    Component: ManagerManual,
  },
  EMPLOYEE: {
    badge: 'bg-gray-100 text-gray-600',
    badgeLabel: { en: 'Employee', he: 'עובד', th: 'พนักงาน' },
    subtitle: {
      en: 'Your guide to completing tasks and using Air Manage',
      he: 'המדריך שלך להשלמת משימות ושימוש ב-Air Manage',
      th: 'คู่มือของคุณสำหรับการทำงานให้เสร็จสิ้นและการใช้ Air Manage',
    },
    Component: EmployeeManual,
  },
};

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */

export default function HelpCenter({ user, t, lang = 'en' }) {
  const config = MANUAL_CONFIG[user?.role] || MANUAL_CONFIG.EMPLOYEE;
  const { badge, badgeLabel, subtitle, Component } = config;
  const effectiveLang = ['en', 'he', 'th'].includes(lang) ? lang : 'en';

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-[#714B67]/10 flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} className="text-[#714B67]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">{t?.nav_help || 'Help Center'}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                {badgeLabel[effectiveLang] || badgeLabel.en}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle[effectiveLang] || subtitle.en}</p>
          </div>
        </div>
      </div>

      {/* Manual content */}
      <Component lang={effectiveLang} />

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 mt-4">
        Air Manage · {t?.nav_help || 'Help Center'} · v1.0
      </p>
    </div>
  );
}
