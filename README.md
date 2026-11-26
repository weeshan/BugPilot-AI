
# 🐛 BugPilot AI

**BugPilot AI** is a full-stack bug and issue tracking platform that allows development teams to view and manage software bugs across multiple projects in one place.

Team members can report bugs, track their status, explore project issues, and import issues directly from public GitHub repositories.

Built as a database management project at **Ontario Tech University**.

## ✨ Features

- **Centralized Bug Tracking** — View issues across multiple projects.
- **Team Collaboration** — Shared dashboards for tracking reported bugs.
- **GitHub Integration** — Sign in with GitHub and import issues from public repositories.
- **Issue Synchronization** — Import open GitHub issues and remove their local copies when closed.
- **Role-Based Access** — Admin, User, and Guest permissions.
- **Analytics Dashboard** — Visualize issue statistics and project activity.
- **SQL Reports** — Search, filter, and export reports as CSV or PDF.
- **REST API** — Full CRUD operations for issues and projects.

## 🛠️ Tech Stack

**Frontend:** HTML, CSS, JavaScript, Chart.js  
**Backend:** Node.js, Express.js  
**Database:** MySQL  
**Authentication:** Express Sessions, bcrypt, GitHub OAuth  
**API:** GitHub REST API

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd BugPilot-AI-V2/backend
```

### 2. Install Dependencies

```bash
npm ci
```

### 3. Set Up MySQL

Start your MySQL server and import the project's database schema and sample data using MySQL Workbench.

The database name is:

`bug_tracking_phase2`

### 4. Configure Environment Variables

Create a `.env` file inside `backend/`:

```env
PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=bug_tracking_phase2

SESSION_SECRET=your_long_random_session_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
```

For GitHub sign-in, configure a GitHub OAuth App with the same callback URL.

**Never upload your `.env` file or credentials to GitHub.**

### 5. Run BugPilot AI

```bash
node server.js
```

Open **http://localhost:3000** in your browser.

## 👥 User Roles

| Role | Permissions |
|---|---|
| Admin | Manage users, projects, and issues; delete records |
| User | View, create, and update issues; access GitHub imports |
| Guest | Limited read-only access |

## 🔗 GitHub Integration

Enter a public GitHub repository's owner and name to import its open issues into BugPilot AI.

When an issue is closed on GitHub, its imported database record is deleted during the next manual synchronization.

Only public repositories are supported.

## 📌 Project Information

**Course:** SOFE 3700U — Data Management Systems  
**University:** Ontario Tech University  
**GitHub:** [@weeshan](https://github.com/weeshan)

---

**BugPilot AI — One platform to track bugs across your team's projects.**
