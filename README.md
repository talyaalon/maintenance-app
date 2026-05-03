🧠 Air Manage

Air Manage is a full-stack web platform designed to streamline maintenance operations and workforce management for organizations handling multiple assets and recurring tasks.

The system enables companies to automate task scheduling, track asset maintenance, and manage employees through a centralized and scalable solution.

⸻

🚨 Problem

Organizations with multiple physical assets (machines, equipment, infrastructure) often struggle with:

* Tracking maintenance schedules (daily, weekly, monthly, yearly)
* Ensuring tasks are completed on time
* Managing responsibilities across teams and departments
* Maintaining visibility over historical maintenance data

This leads to missed tasks, operational inefficiencies, and potential equipment failure.

⸻

💡 Solution

Air Manage solves this by providing:

* Automated task generation based on predefined frequencies
* Centralized asset and workforce management
* Real-time task tracking and approval workflows
* Multi-channel notifications (mobile, email, LINE)
* Advanced filtering, reporting, and export capabilities

⸻

✨ Key Features

📊 Asset & Task Management

* Bulk upload of assets and tasks via Excel
* Automatic generation of recurring tasks (daily, weekly, monthly, yearly)
* Custom scheduling logic (e.g., specific weekdays)

👥 Role-Based Access Control

* Hierarchical roles:
    * Admin (system owner)
    * Department Managers
    * Team Managers
    * Employees
* Scoped data visibility per role

📅 Smart Task Views

* Daily, weekly, and yearly calendar views
* Task filtering by:
    * Employee
    * Asset
    * Category
    * Date range

📸 Task Execution Workflow

* Employees:
    * View assigned tasks
    * Mark tasks as completed
    * Upload proof images
* Managers:
    * Review and approve/reject tasks

🚨 Exception Handling

* Report blocked/stuck tasks
* Escalation workflow to management

🔔 Notifications System

* In-app notifications
* Email notifications
* LINE integration (widely used messaging platform in Thailand)

🌍 Multi-language Support

* English
* Hebrew
* Thai

📤 Data Export & Reporting

* Export filtered data to Excel
* Generate reports by:
    * Employee
    * Asset
    * Date range

⸻

🏗️ Architecture

* Frontend: React (JavaScript)
* Backend: Node.js (REST API)
* Database: PostgreSQL
* Authentication & Services: Firebase (partial usage)
* Deployment: Render (production environment)

The system follows a client-server architecture with a clear separation between frontend and backend.

⸻

⚙️ How It Works

1. Admin uploads structured Excel files:
    * Assets
    * Employees
    * Tasks definitions
2. The system:
    * Parses the data
    * Generates recurring tasks based on frequency rules
    * Assigns tasks to relevant employees
3. Employees:
    * Receive tasks via app + notifications
    * Complete and submit tasks with proof
4. Managers:
    * Monitor progress
    * Approve or handle exceptions

⸻

🧩 Challenges & Solutions

🔄 Complex Recurring Task Logic

Handling recurring tasks across different frequencies and specific weekdays required building a flexible scheduling engine.

Solution:
Implemented dynamic task generation based on frequency rules and weekday selection logic.

⸻

🔐 Role-Based Data Access

Ensuring each user only sees relevant data (employee vs manager vs department head).

Solution:
Designed scoped queries and permission layers across the system.

⸻

📥 Excel Import / Export Complexity

Parsing large datasets and ensuring consistency across entities (assets, users, tasks).

Solution:
Built structured validation and mapping logic for reliable data ingestion and export.

⸻

🧠 Real-world Edge Case

Editing or deleting recurring task series caused partial updates due to incorrect logic.

Solution:
Refactored logic to operate on entire task series using unique identifiers, instead of partial date-based updates.

⸻

🌍 Real-World Usage

This system is actively used in a production environment within a company, supporting real operational workflows and continuously evolving with new features.

⸻

🧪 Testing

* Manual testing across multiple user roles
* Real-world validation in production environment
* Continuous bug fixing and improvements based on live usage

⸻

🚀 Future Improvements

* Demo environment for external users
* Automated testing suite
* Performance optimization for large-scale data
* Enhanced analytics dashboard

⸻

👩‍💻 Author

Developed independently — including product design, architecture, development, and deployment.
