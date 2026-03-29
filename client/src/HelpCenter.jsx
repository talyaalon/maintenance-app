import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

/* ─────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────── */

const ManualImage = ({ filename, alt }) => (
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
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
    <div
      style={{ display: 'none' }}
      className="flex items-center justify-center gap-2 bg-gray-100 border border-dashed border-gray-300 rounded-xl p-6 text-gray-400 text-sm"
    >
      <span>🖼️</span>
      <span>{filename}</span>
    </div>
  </div>
);

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
   MANUAL: BIG BOSS
───────────────────────────────────────────── */
const BigBossManual = () => (
  <div>
    <Section title="1. Welcome — Your System Overview">
      <p>
        As <strong>Big Boss</strong>, you have full administrative access to Air Manage. You can create and manage
        Departments, assign managers and employees, configure the system, and see every task across the entire
        organisation.
      </p>
      <ManualImage filename="bb_dashboard_overview.png" alt="Big Boss Dashboard Overview" />
      <p>Your bottom navigation has three tabs:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li><strong>Tasks</strong> — See all tasks across all departments.</li>
        <li><strong>Departments</strong> — Create and manage departments &amp; their staff.</li>
        <li><strong>Profile</strong> — Edit your personal details and preferences.</li>
      </ul>
    </Section>

    <Section title="2. Managing Departments">
      <p>Navigate to the <strong>Departments</strong> tab to view all departments registered in the system.</p>
      <Step n="1" text='Tap the "Departments" tab at the bottom.' />
      <Step n="2" text='Tap "+ Add Department" to create a new department.' />
      <Step n="3" text="Enter the department name and optionally upload a logo." />
      <Step n="4" text='Tap "Save". The department appears in the list.' />
      <ManualImage filename="bb_add_department.png" alt="Add Department Modal" />
      <p>To edit or delete a department, tap the pencil or trash icon on any department card.</p>
      <Tip>Each department is assigned a unique ID shown on its card — useful when contacting support.</Tip>
    </Section>

    <Section title="3. Managing Managers & Employees">
      <p>Inside each department card, tap <strong>View Details</strong> to open the department dashboard.</p>
      <Step n="1" text="Tap a department card to open its detail view." />
      <Step n="2" text='Tap "Add Manager" or "Add Employee" to assign existing users or invite new ones.' />
      <Step n="3" text="Set the user's role, preferred language, and team assignments." />
      <Step n="4" text='Tap "Save". The user is now visible to their department manager.' />
      <ManualImage filename="bb_department_detail.png" alt="Department Detail View" />
      <Note>Managers can only see employees who are assigned to them. Make sure to link employees to the correct manager.</Note>
    </Section>

    <Section title="4. Viewing & Overseeing All Tasks">
      <p>
        In the <strong>Tasks</strong> tab you see every task in the system regardless of department. Use the
        filter bar to narrow down by department, priority, location, or category.
      </p>
      <ManualImage filename="bb_tasks_overview.png" alt="All Tasks View" />
      <p>Task status tabs:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li><strong>Overdue</strong> — Past-due tasks that need immediate attention.</li>
        <li><strong>To Do</strong> — Upcoming or current tasks.</li>
        <li><strong>Waiting Approval</strong> — Tasks completed by employees awaiting sign-off.</li>
        <li><strong>History</strong> — All completed tasks.</li>
      </ul>
      <Tip>Switch between Daily, Weekly, and Calendar view modes using the icons at the top of the Tasks tab.</Tip>
    </Section>

    <Section title="5. Approving Completed Tasks">
      <Step n="1" text='Go to the "Waiting Approval" tab in Tasks.' />
      <Step n="2" text="Tap a task card to open its details." />
      <Step n="3" text='Review the completion notes and any uploaded images, then tap "Approve" or "Reject".' />
      <ManualImage filename="bb_task_approval.png" alt="Task Approval Screen" />
      <Note>Rejected tasks return to the employee's To Do list with your feedback note.</Note>
    </Section>

    <Section title="6. Creating & Assigning Tasks">
      <Step n="1" text='In the Tasks tab, tap the "+" button (bottom right).' />
      <Step n="2" text="Fill in the title, description, priority, location, category, and due date." />
      <Step n="3" text="Assign the task to one or more employees." />
      <Step n="4" text="Optionally set a recurrence (daily, weekly, monthly, quarterly, yearly)." />
      <Step n="5" text='Tap "Create Task".' />
      <ManualImage filename="bb_create_task.png" alt="Create Task Form" />
    </Section>

    <Section title="7. Excel Import & Export">
      <p>Air Manage supports bulk task import and export via Excel.</p>
      <Step n="1" text='In the Tasks tab, tap the Excel/Export button in the toolbar.' />
      <Step n="2" text='Choose "Export" to download current tasks, or "Import" to upload a filled template.' />
      <Step n="3" text="Use the column filters (date range, status, department) before exporting." />
      <ManualImage filename="bb_excel_export.png" alt="Excel Export Panel" />
      <Tip>Download the template first to ensure column headers match the expected format.</Tip>
    </Section>

    <Section title="8. System Configuration">
      <p>
        The <strong>Config</strong> tab (accessible only to Big Boss) lets you configure system-wide settings such
        as task categories, locations, assets, and notification channels.
      </p>
      <ManualImage filename="bb_configuration.png" alt="System Configuration" />
      <p>From here you can:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li>Add / edit task <strong>Categories</strong>.</li>
        <li>Add / edit <strong>Locations</strong> (buildings, floors, zones).</li>
        <li>Manage <strong>Assets</strong> linked to maintenance tasks.</li>
        <li>Configure <strong>LINE Notification</strong> channels per team.</li>
      </ul>
    </Section>

    <Section title="9. Profile & Language Settings">
      <p>Go to the <strong>Profile</strong> tab to update your name, email, phone, password, and profile picture.</p>
      <Step n="1" text="Tap the Profile tab." />
      <Step n="2" text='Tap "Edit" next to any field or tap your avatar to upload a new photo.' />
      <Step n="3" text='Choose your preferred display language (English, Hebrew, Thai) from the language selector in the top-right header.' />
      <ManualImage filename="bb_profile.png" alt="Profile Tab" />
    </Section>
  </div>
);

/* ─────────────────────────────────────────────
   MANUAL: COMPANY MANAGER (Department Manager)
───────────────────────────────────────────── */
const CompanyManagerManual = () => (
  <div>
    <Section title="1. Welcome — Your Department Dashboard">
      <p>
        As a <strong>Department Manager</strong>, you oversee your department's staff, tasks, and configuration.
        Your bottom navigation has three tabs:
      </p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li><strong>Tasks</strong> — View and manage all tasks in your department.</li>
        <li><strong>Config</strong> — Configure department-specific settings (categories, locations, etc.).</li>
        <li><strong>Profile</strong> — Edit your personal details.</li>
      </ul>
      <ManualImage filename="cm_dashboard_overview.png" alt="Department Manager Dashboard" />
    </Section>

    <Section title="2. Viewing Your Department's Tasks">
      <p>
        The Tasks tab shows all tasks assigned within your department. You can filter, search, and switch
        between Daily, Weekly, and Calendar views.
      </p>
      <ManualImage filename="cm_tasks_view.png" alt="Department Tasks View" />
      <p>Use the filter bar to narrow tasks by:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li>Priority (Low / Medium / High / Urgent)</li>
        <li>Location</li>
        <li>Category</li>
        <li>Assigned employee</li>
        <li>Date range</li>
      </ul>
      <Tip>Tap a column header in Weekly view to sort tasks.</Tip>
    </Section>

    <Section title="3. Creating Tasks">
      <Step n="1" text='In the Tasks tab, tap the "+" button.' />
      <Step n="2" text="Enter task title, description, priority, location, and category." />
      <Step n="3" text="Set the due date and optionally enable recurrence." />
      <Step n="4" text="Assign to one or more employees in your department." />
      <Step n="5" text='Tap "Create Task".' />
      <ManualImage filename="cm_create_task.png" alt="Create Task Form" />
    </Section>

    <Section title="4. Approving Completed Tasks">
      <Step n="1" text='Open the "Waiting Approval" tab.' />
      <Step n="2" text="Tap a task card to review the completion details." />
      <Step n="3" text='Tap "Approve" to mark it done, or "Reject" to send it back with comments.' />
      <ManualImage filename="cm_approval.png" alt="Task Approval" />
      <Note>Employees receive a notification when their task is approved or rejected.</Note>
    </Section>

    <Section title="5. Department Configuration (Config Tab)">
      <p>
        The <strong>Config</strong> tab is your department's control panel. Here you can manage settings specific
        to your department.
      </p>
      <ManualImage filename="cm_config_tab.png" alt="Config Tab" />
      <p>Available settings:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li><strong>Categories</strong> — Add or remove task categories relevant to your team.</li>
        <li><strong>Locations</strong> — Define the buildings, floors, or zones your team works in.</li>
        <li><strong>Notification Channels</strong> — Set up LINE group notifications for your managers and employees.</li>
        <li><strong>Language Permissions</strong> — Control which display languages are available to your team members.</li>
      </ul>
    </Section>

    <Section title="6. Managing Employees (via Big Boss assignment)">
      <p>
        Employee assignment to your department is done by the Big Boss. Once assigned, employees appear in your
        task assignment dropdowns automatically.
      </p>
      <Note>If you need a new employee added or removed, contact your Big Boss administrator.</Note>
    </Section>

    <Section title="7. Excel Export">
      <Step n="1" text="In the Tasks tab, tap the Export button." />
      <Step n="2" text="Choose your filters (date range, status, employee)." />
      <Step n="3" text='Tap "Export to Excel" to download a .xlsx file.' />
      <ManualImage filename="cm_excel_export.png" alt="Excel Export" />
    </Section>

    <Section title="8. Profile Settings">
      <p>Update your name, email, phone, password, and profile picture in the <strong>Profile</strong> tab.</p>
      <ManualImage filename="cm_profile.png" alt="Profile Tab" />
      <Tip>Your preferred language can also be changed from the flag dropdown in the top-right corner at any time.</Tip>
    </Section>
  </div>
);

/* ─────────────────────────────────────────────
   MANUAL: MANAGER
───────────────────────────────────────────── */
const ManagerManual = () => (
  <div>
    <Section title="1. Welcome — Your Team Overview">
      <p>
        As a <strong>Manager</strong>, you are responsible for your team's daily and recurring tasks. Your bottom
        navigation has three tabs:
      </p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li><strong>Tasks</strong> — Create, assign, and track tasks for your team.</li>
        <li><strong>Team</strong> — View your team members and their details.</li>
        <li><strong>Profile</strong> — Edit your personal details.</li>
      </ul>
      <ManualImage filename="mgr_dashboard_overview.png" alt="Manager Dashboard" />
    </Section>

    <Section title="2. Viewing Your Team's Tasks">
      <p>
        The Tasks tab shows all tasks assigned within your team's area. Switch between <strong>Daily</strong>,{' '}
        <strong>Weekly</strong>, and <strong>Calendar</strong> views to see tasks by timeframe.
      </p>
      <ManualImage filename="mgr_tasks_view.png" alt="Manager Tasks View" />
      <p>Status tabs:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li><strong>Overdue</strong> — Tasks past their due date.</li>
        <li><strong>To Do</strong> — Current and upcoming tasks.</li>
        <li><strong>Waiting Approval</strong> — Tasks your employees marked complete.</li>
        <li><strong>History</strong> — Approved / completed tasks.</li>
      </ul>
    </Section>

    <Section title="3. Creating a Task">
      <Step n="1" text='Tap the "+" button in the Tasks tab.' />
      <Step n="2" text="Fill in the task title and description." />
      <Step n="3" text="Set priority: Low, Medium, High, or Urgent." />
      <Step n="4" text="Choose the location and category." />
      <Step n="5" text="Pick a due date using the calendar." />
      <Step n="6" text="Assign to one or more of your team members." />
      <Step n="7" text="Toggle on Recurring if this is a repeating task and choose the frequency." />
      <Step n="8" text='Tap "Create Task".' />
      <ManualImage filename="mgr_create_task.png" alt="Create Task Form" />
      <Tip>For recurring tasks (e.g. daily cleaning), enable recurrence so the task auto-generates on schedule.</Tip>
    </Section>

    <Section title="4. Approving Completed Tasks">
      <p>When an employee marks a task complete, it moves to <strong>Waiting Approval</strong>.</p>
      <Step n="1" text='Tap the "Waiting Approval" tab.' />
      <Step n="2" text="Tap a card to see the completion photo and notes left by the employee." />
      <Step n="3" text='Tap "Approve" or "Reject" with an optional comment.' />
      <ManualImage filename="mgr_approval.png" alt="Task Approval" />
      <Note>A LINE notification is sent to the employee when you approve or reject.</Note>
    </Section>

    <Section title="5. Managing Your Team (Team Tab)">
      <p>The Team tab shows every employee assigned to you.</p>
      <ManualImage filename="mgr_team_tab.png" alt="Team Tab" />
      <p>From here you can:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li>View each employee's name, role, and contact info.</li>
        <li>See which tasks are assigned to each person.</li>
      </ul>
      <Note>To add or remove team members, contact your Department Manager or Big Boss.</Note>
    </Section>

    <Section title="6. Scoped Task View">
      <p>
        Tapping <strong>My Team's Tasks</strong> (the team icon on a date row) opens a scoped modal showing only
        that day's tasks for your area, sorted by employee.
      </p>
      <ManualImage filename="mgr_scoped_tasks.png" alt="Scoped Tasks Modal" />
    </Section>

    <Section title="7. Profile Settings">
      <p>Edit your personal details, password, and profile picture in the <strong>Profile</strong> tab.</p>
      <ManualImage filename="mgr_profile.png" alt="Profile Tab" />
      <Tip>Change your display language anytime using the flag dropdown in the top-right corner.</Tip>
    </Section>
  </div>
);

/* ─────────────────────────────────────────────
   MANUAL: EMPLOYEE
───────────────────────────────────────────── */
const EmployeeManual = () => (
  <div>
    <Section title="1. Welcome to Air Manage">
      <p>
        Air Manage helps you stay on top of your daily and recurring maintenance tasks. Your screen has two
        tabs at the bottom:
      </p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li><strong>Tasks</strong> — See all tasks assigned to you.</li>
        <li><strong>Profile</strong> — Update your personal info and preferences.</li>
      </ul>
      <ManualImage filename="emp_dashboard_overview.png" alt="Employee Dashboard" />
    </Section>

    <Section title="2. Understanding Your Task List">
      <p>Your tasks are grouped into four tabs:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li>
          <strong>Overdue</strong> — These tasks are past their due date. Complete them as soon as possible and
          notify your manager.
        </li>
        <li>
          <strong>To Do</strong> — Your current and upcoming tasks.
        </li>
        <li>
          <strong>Waiting Approval</strong> — Tasks you've submitted for review. Your manager will approve or
          return them.
        </li>
        <li>
          <strong>History</strong> — Completed and approved tasks for your reference.
        </li>
      </ul>
      <ManualImage filename="emp_task_list.png" alt="Employee Task List" />
    </Section>

    <Section title="3. Completing a Task">
      <Step n="1" text='In the "To Do" tab, tap a task card to open it.' />
      <Step n="2" text="Read the task description, priority, and location." />
      <Step n="3" text='When done, tap "Mark as Complete".' />
      <Step n="4" text="Optionally add a completion note and upload a photo as proof." />
      <Step n="5" text='Tap "Submit". The task moves to "Waiting Approval".' />
      <ManualImage filename="emp_complete_task.png" alt="Complete Task Screen" />
      <Tip>Adding a photo of the completed work speeds up the approval process.</Tip>
    </Section>

    <Section title="4. Understanding Task Priority">
      <p>Each task has a priority level that tells you how urgent it is:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li>🟢 <strong>Low</strong> — Complete when you have time.</li>
        <li>🟡 <strong>Medium</strong> — Complete today.</li>
        <li>🟠 <strong>High</strong> — Complete as soon as possible.</li>
        <li>🔴 <strong>Urgent</strong> — Drop everything and handle immediately.</li>
      </ul>
      <ManualImage filename="emp_priority_labels.png" alt="Task Priority Labels" />
    </Section>

    <Section title="5. Viewing Task Details">
      <p>Tap any task card to see:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li>Full description and instructions.</li>
        <li>Location and category.</li>
        <li>Due date and time.</li>
        <li>Any attachments or images added by your manager.</li>
      </ul>
      <ManualImage filename="emp_task_detail.png" alt="Task Detail View" />
    </Section>

    <Section title="6. Searching & Filtering Tasks">
      <p>
        Use the search bar at the top of the Tasks tab to find a task by name or description. You can also
        switch between <strong>Daily</strong> and <strong>Weekly</strong> views to see tasks by date.
      </p>
      <ManualImage filename="emp_search_filter.png" alt="Search and Filter" />
    </Section>

    <Section title="7. Notifications">
      <p>
        You will receive notifications via LINE when:
      </p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li>A new task is assigned to you.</li>
        <li>A task you submitted is approved ✅ or rejected ❌.</li>
        <li>A task is approaching its due date.</li>
      </ul>
      <Note>Make sure your LINE account is linked. Ask your manager if you're not receiving notifications.</Note>
    </Section>

    <Section title="8. Profile Settings">
      <p>Go to the <strong>Profile</strong> tab to update your:</p>
      <ul className="list-disc list-inside space-y-1 pl-1">
        <li>Display name (English / Hebrew / Thai)</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Password</li>
        <li>Profile picture</li>
      </ul>
      <Step n="1" text="Tap the Profile tab." />
      <Step n="2" text='Tap "Edit" or tap your avatar to upload a new photo.' />
      <Step n="3" text='Tap "Save Changes".' />
      <ManualImage filename="emp_profile.png" alt="Profile Settings" />
      <Tip>You can change the display language using the flag selector (🇺🇸 / 🇮🇱 / 🇹🇭) in the top-right corner.</Tip>
    </Section>
  </div>
);

/* ─────────────────────────────────────────────
   ROLE → MANUAL MAP
───────────────────────────────────────────── */
const MANUAL_CONFIG = {
  BIG_BOSS: {
    title: 'Big Boss — System Administrator Manual',
    subtitle: 'Complete guide to managing the entire Air Manage platform',
    badge: 'bg-purple-100 text-purple-700',
    badgeLabel: 'Big Boss',
    Component: BigBossManual,
  },
  COMPANY_MANAGER: {
    title: 'Department Manager Manual',
    subtitle: 'Guide to managing your department, staff, and task workflow',
    badge: 'bg-blue-100 text-blue-700',
    badgeLabel: 'Department Manager',
    Component: CompanyManagerManual,
  },
  MANAGER: {
    title: 'Manager Manual',
    subtitle: 'Guide to managing your team and daily task operations',
    badge: 'bg-green-100 text-green-700',
    badgeLabel: 'Manager',
    Component: ManagerManual,
  },
  EMPLOYEE: {
    title: 'Employee Manual',
    subtitle: 'Your guide to completing tasks and using Air Manage',
    badge: 'bg-gray-100 text-gray-600',
    badgeLabel: 'Employee',
    Component: EmployeeManual,
  },
};

/* ─────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────── */
export default function HelpCenter({ user, t }) {
  const config = MANUAL_CONFIG[user?.role] || MANUAL_CONFIG.EMPLOYEE;
  const { title, subtitle, badge, badgeLabel, Component } = config;

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
                {badgeLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Manual content */}
      <Component />

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 mt-4">
        Air Manage · {t?.nav_help || 'Help Center'} · v1.0
      </p>
    </div>
  );
}
