# 🐛 BugPilot AI

**BugPilot AI** is a full-stack bug and issue tracking platform that allows development teams to view and manage software bugs across multiple projects in one place.

Team members can report bugs, track their status, explore project issues, and import issues directly from public GitHub repositories.

Built as a database management project at **Ontario Tech University**.

## ✨ Features

- **Centralized Bug Tracking** — View issues across multiple projects.
- **Team Collaboration** — Shared dashboards for tracking reported bugs.
- **GitHub Authentication** — Sign in using your GitHub account.
- **GitHub Integration** — Import issues from public GitHub repositories.
- **GitHub Usernames** — Display the original GitHub username of each imported issue's author.
- **GitHub Profile Links** — Access issue authors' GitHub profiles directly.
- **Issue Synchronization** — Import open GitHub issues and remove their local copies when detected as closed.
- **Duplicate Prevention** — Update previously imported GitHub issues instead of creating duplicates.
- **Role-Based Access** — Admin, User, and Guest permissions.
- **Analytics Dashboard** — Visualize issue statistics and project activity.
- **SQL Reports** — Search, filter, and export reports as CSV or PDF.
- **REST API** — CRUD operations for issues and projects.
- **Rate Limiting** — Protect GitHub import endpoints from excessive requests.
- **Startup Script** — Launch BugPilot AI using a shell script.

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, Chart.js |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Authentication | Express Sessions, bcrypt, GitHub OAuth |
| External API | GitHub REST API |
| Data Export | CSV, PDF |
| Version Control | Git, GitHub |

## 📋 Prerequisites

Before running BugPilot AI, ensure you have installed:

- Node.js 18 or newer
- npm
- MySQL Server
- MySQL Workbench
- Git
- Bash (for the startup script)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/weeshan/BugPilot-AI.git
cd BugPilot-AI
```

### 2. Install Dependencies

```bash
cd backend
npm ci
cd ..
```

### 3. Set Up MySQL

Start your MySQL server and open MySQL Workbench.

Import the project's complete SQL database setup file located in the `database/` directory.

The database name is:

```sql
bug_tracking_phase2
```

The database includes:

- 7 original Phase II tables
- 2 Phase III tables
- 88 fictional sample records
- 10 SQL reporting views
- GitHub authentication fields
- GitHub imported issue author usernames
- Unique GitHub account constraints
- Database migration commands

For a new installation, execute the complete SQL setup file.

For an existing installation, execute only the required migration section.

**Do not execute the complete database setup repeatedly on an existing populated database, as this may cause duplicate primary key errors.**

### 4. Configure Environment Variables

Create a `.env` file inside the `backend/` directory:

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

The session secret must contain at least 32 characters.

You can generate a secure session secret using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For GitHub sign-in, configure a GitHub OAuth App with the following settings:

**Homepage URL:**

```text
http://localhost:3000
```

**Authorization callback URL:**

```text
http://localhost:3000/api/auth/github/callback
```

GitHub OAuth Apps can be configured at:

https://github.com/settings/developers

**Never upload your `.env` file, database passwords, session secrets, or GitHub credentials to GitHub.**

## ▶️ Running BugPilot AI

There are two ways to start the application.

### Option 1 — Startup Script (Recommended)

From the root directory of the project, run:

```bash
bash start-bugpilot.sh
```

Alternatively, grant execution permission to the startup script:

```bash
chmod +x start-bugpilot.sh
./start-bugpilot.sh
```

Make sure MySQL is running and the database and environment variables have already been configured.

### Option 2 — Manual Startup

From the root directory of the project, run:

```bash
cd backend
node server.js
```

When the backend starts successfully, the terminal should display:

```text
MySQL connection successful!
Session store ready!
BugPilot AI running at http://localhost:3000
```

Open the following URL in your browser:

**http://localhost:3000**

To stop the server, press:

```text
Ctrl + C
```

## 👤 Creating a User

Users can create an account through the BugPilot AI registration page.

GitHub authentication is also supported.

To manually provision a user account, run the following command from the project root:

```bash
cd backend
node create-user.js
```

Follow the script's account configuration instructions.

## 👥 User Roles

| Role | Permissions |
|---|---|
| Admin | Manage users, projects, and issues; delete records; access reporting and GitHub imports |
| User | View, create, and update issues; access reports and GitHub imports |
| Guest | Limited read-only access |

Protected backend routes enforce role-based permissions.

## 🔗 GitHub Integration

BugPilot AI integrates with the GitHub REST API to retrieve public repository issues.

### Importing GitHub Issues

1. Sign in as an Admin or User.
2. Navigate to the GitHub Issues page.
3. Enter the GitHub repository owner.
4. Enter the repository name.
5. Click **Import Issues**.
6. View the imported issues in the dashboard.

### Imported Issue Information

Each imported issue includes:

- Repository owner
- Repository name
- GitHub issue number
- Issue title
- Original GitHub author's username
- Issue description
- Issue state
- GitHub issue URL
- Creation timestamp
- Update timestamp
- Import timestamp

The imported issue author's username is displayed beside the issue title.

Clicking a supported username opens the author's GitHub profile.

### Issue Synchronization

When a repository is imported again:

- New open issues are inserted into MySQL.
- Previously imported issues are updated.
- GitHub author usernames are synchronized.
- Duplicate issues are prevented.
- Detected closed issues are deleted from the imported issues table.
- Pull requests are excluded.

Each import checks up to 100 recently updated GitHub issues.

Only public GitHub repositories are supported.

## 📊 Database and Reporting

BugPilot AI uses a relational MySQL database to manage:

- Developers
- Projects
- Issues
- Solutions
- Documents
- Issue documentation
- Developer assignments
- Application users
- Imported GitHub issues

The system includes 10 SQL reporting views:

1. Issue Details
2. Projects Above Average Issue Count
3. Developers With Solutions
4. Projects and Documents
5. Active Developers
6. Urgent Issues
7. Accepted Solutions
8. Developer Workload
9. Issue Documentation
10. Project Issue Statistics

Reports can be viewed through the reporting dashboard and exported as CSV or PDF.

## 🔒 Security

BugPilot AI implements:

- Password hashing using bcrypt
- MySQL-backed session storage
- Role-based access control
- Protected backend API endpoints
- Parameterized SQL queries
- Frontend and backend input validation
- GitHub OAuth authentication
- API rate limiting
- Environment-based credential management
- Public repository validation
- MySQL transactions during GitHub synchronization

## 📁 Project Structure

```text
BugPilot-AI/
│
├── backend/
│   ├── middleware/
│   ├── public/
│   │   ├── css/
│   │   ├── js/
│   │   ├── index.html
│   │   ├── login.html
│   │   ├── reports.html
│   │   └── github.html
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── github.js
│   │   ├── issues.js
│   │   ├── projects.js
│   │   ├── views.js
│   │   └── pdf.js
│   │
│   ├── db.js
│   ├── server.js
│   ├── create-user.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env
│
├── database/
├── .gitignore
├── README.md
└── start-bugpilot.sh
```

The `.env` file must be created locally and must not be committed to GitHub.

## 📌 Project Information

**Project:** BugPilot AI V2  
**Course:** SOFE 3700U — Data Management Systems  
**University:** Ontario Tech University  
**Project Phase:** Phase III  
**GitHub:** [@weeshan](https://github.com/weeshan)  
**Repository:** [BugPilot AI](https://github.com/weeshan/BugPilot-AI)

---

**BugPilot AI — One platform to track bugs across your team's projects.**
