# 🐛 BugPilot AI V2

**BugPilot AI** is a full-stack bug and issue tracking platform that allows development teams to view and manage software bugs across multiple projects in one place.

Team members can report bugs, track their status, explore project issues, and import issues directly from public GitHub repositories.

Built as a database management project at **Ontario Tech University**.

---

## ✨ Features

- **Centralized Bug Tracking** — View and manage issues across multiple projects.
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
- **Startup Script** — Launch BugPilot AI using a single terminal command.

---

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

---

## 📋 Prerequisites

Before running BugPilot AI, ensure you have installed:

- Node.js 18 or newer
- npm
- MySQL Server
- MySQL Workbench
- Git
- Bash (for the startup script)
- Visual Studio Code (recommended)

---

## 🚀 Quick Start

### macOS — Existing Local Installation

If BugPilot AI V2 is already installed inside your Documents folder, run:

```bash
cd ~/Documents/BugPilot-AI-V2 && bash start-bugpilot.sh
```

This command:

1. Navigates to the BugPilot AI V2 project directory.
2. Executes the startup shell script.
3. Launches the application if the required dependencies and database are configured.

Once the application starts, open:

http://localhost:3000

**For first-time installations, complete the installation steps below before running the application.**

---

## 📦 Installation

### 1. Clone the Repository

Open your terminal and run:

```bash
cd ~/Documents

git clone https://github.com/weeshan/BugPilot-AI.git BugPilot-AI-V2

cd BugPilot-AI-V2
```

The project will now be located at:

```text
~/Documents/BugPilot-AI-V2
```

---

### 2. Install Dependencies

From the root directory of the project, run:

```bash
cd backend

npm ci

cd ..
```

This installs the required Node.js dependencies.

---

### 3. Set Up MySQL

Start your MySQL server and open MySQL Workbench.

Locate the complete SQL database setup file inside the project's `database/` directory.

Open the SQL file in MySQL Workbench and execute it if you are installing BugPilot AI for the first time.

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

#### New Database Installation

Execute the complete SQL setup file.

#### Existing Database Installation

Execute only the required database migration section.

The GitHub integration requires the following columns:

| Table | Required Column | Data Type |
|---|---|---|
| app_users | github_user_id | BIGINT UNSIGNED |
| app_users | github_username | VARCHAR(39) |
| github_imported_issues | github_username | VARCHAR(39) |

Verify your database structure using:

```sql
USE bug_tracking_phase2;

DESCRIBE app_users;

DESCRIBE github_imported_issues;
```

**Do not execute the complete database setup repeatedly on an existing populated database, as this may cause duplicate primary key errors.**

---

### 4. Configure Environment Variables

Create a `.env` file inside the `backend/` directory.

The file location should be:

```text
BugPilot-AI-V2/backend/.env
```

Add the following configuration:

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

Replace the placeholder values with your own credentials.

The session secret must contain at least 32 characters.

You can generate a secure session secret using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `SESSION_SECRET` inside your `.env` file.

**Never upload your `.env` file, database passwords, session secrets, or GitHub credentials to GitHub.**

---

### 5. Configure GitHub OAuth

GitHub OAuth allows users to sign in to BugPilot AI using their GitHub accounts.

Create a GitHub OAuth App at:

https://github.com/settings/developers

Configure the following values:

| Setting | Value |
|---|---|
| Application name | BugPilot AI |
| Homepage URL | http://localhost:3000 |
| Authorization callback URL | http://localhost:3000/api/auth/github/callback |

Copy the generated Client ID and Client Secret into your `.env` file:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

Keep these credentials private.

---

## ▶️ Running BugPilot AI

There are multiple ways to start the application.

### Option 1 — Quick Startup on macOS (Recommended)

If the project is installed inside your Documents folder, run:

```bash
cd ~/Documents/BugPilot-AI-V2 && bash start-bugpilot.sh
```

This command works regardless of your current terminal directory, provided the project exists at the specified location.

No `chmod` command is required when executing the script using `bash`.

---

### Option 2 — Startup Script from the Project Root

If your terminal is already inside the `BugPilot-AI-V2` directory, run:

```bash
bash start-bugpilot.sh
```

Your terminal must be inside the main project directory, not the `backend` directory.

---

### Option 3 — Manual Startup

Run:

```bash
cd ~/Documents/BugPilot-AI-V2/backend

node server.js
```

Alternatively, if you are already inside the backend directory:

```bash
node server.js
```

---

### Option 4 — Other Installation Locations

If you cloned the project somewhere other than your Documents folder, navigate to your actual project directory and run:

```bash
bash start-bugpilot.sh
```

For Windows users, the startup script requires a compatible Bash environment, such as Git Bash.

Alternatively, use Node.js directly from the backend directory:

```bash
node server.js
```

---

### Successful Startup

When the backend starts successfully, the terminal should display:

```text
MySQL connection successful!
Session store ready!
BugPilot AI running at http://localhost:3000
```

Open BugPilot AI in your browser:

http://localhost:3000

---

### Stop the Application

To stop the Node.js server, return to the terminal where the application is running and press:

```text
Ctrl + C
```

---

## 👤 Creating a User

Users can create an account through the BugPilot AI registration page.

GitHub authentication is also supported.

To manually provision a user account, run:

```bash
cd ~/Documents/BugPilot-AI-V2/backend

node create-user.js
```

Follow the account configuration instructions provided by the script.

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| Admin | Manage users, projects, and issues; delete records; access reporting and GitHub imports |
| User | View, create, and update issues; access reports and GitHub imports |
| Guest | Limited read-only access |

Protected backend routes enforce role-based permissions.

---

## 🔗 GitHub Integration

BugPilot AI integrates with the GitHub REST API to retrieve public repository issues.

### Importing GitHub Issues

1. Sign in as an Admin or User.
2. Navigate to the GitHub Issues page.
3. Enter the GitHub repository owner.
4. Enter the repository name.
5. Click **Import Issues**.
6. View the imported issues in the dashboard.

### Example Repository

| Field | Value |
|---|---|
| Repository Owner | weeshan |
| Repository Name | BugPilot-AI |

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

### Example Imported Issue

| Repository | Issue # | Title | Username | State | GitHub |
|---|---|---|---|---|---|
| weeshan/BugPilot-AI | #1 | Example application issue | @weeshan | open | View Issue |

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

### Refreshing Imported Issues

The **Refresh** button retrieves the latest saved records from MySQL.

To retrieve updated information directly from GitHub, click **Import Issues** again.

### API Rate Limiting

BugPilot AI includes rate limiting to protect the GitHub import endpoint.

The application currently allows:

- 20 import requests per minute per IP address.

GitHub also enforces its own API rate limits, independently of BugPilot AI.

---

## 📊 Database and Reporting

BugPilot AI uses a relational MySQL database to manage:

| Table | Purpose |
|---|---|
| developers | Store developer information |
| projects | Store software project information |
| issues | Track software bugs and issues |
| solutions | Store proposed and accepted solutions |
| documents | Store technical documentation |
| issue_documents | Link issues to relevant documentation |
| issue_assignments | Assign developers to issues |
| app_users | Manage authentication and user roles |
| github_imported_issues | Store imported GitHub issues and author usernames |

### SQL Reporting Views

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

---

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
- Duplicate GitHub issue prevention

---

## 📁 Project Structure

```text
BugPilot-AI-V2/
│
├── backend/
│   │
│   ├── middleware/
│   │
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
│
├── .gitignore
├── README.md
└── start-bugpilot.sh
```

The `.env` file must be created locally and must not be committed to GitHub.

---

## 🛠️ Troubleshooting

### Error: start-bugpilot.sh: No such file or directory

This error occurs when the terminal cannot locate the startup script.

The startup script is located in the root project directory, not inside the backend directory.

For macOS installations inside Documents, run:

```bash
cd ~/Documents/BugPilot-AI-V2 && bash start-bugpilot.sh
```

To check your current terminal directory, run:

```bash
pwd
```

To list the files in your current directory, run:

```bash
ls
```

---

### Error: Unknown column 'github_username' in 'field list'

This error occurs when the MySQL database does not contain the required GitHub username columns.

First, verify the existing database structure:

```sql
USE bug_tracking_phase2;

DESCRIBE app_users;

DESCRIBE github_imported_issues;
```

Execute the conditional GitHub migration section from the project's updated SQL setup file.

Alternatively, if both GitHub authentication columns and the unique index are missing from the `app_users` table, execute:

```sql
USE bug_tracking_phase2;

ALTER TABLE app_users
    ADD COLUMN github_user_id BIGINT UNSIGNED NULL,
    ADD COLUMN github_username VARCHAR(39) NULL,
    ADD UNIQUE KEY uq_github_user_id (github_user_id);
```

If `github_imported_issues` is missing its GitHub username column, execute:

```sql
USE bug_tracking_phase2;

ALTER TABLE github_imported_issues
    ADD COLUMN github_username VARCHAR(39) NULL
    AFTER title;
```

Only execute these ALTER TABLE commands for missing columns and indexes.

If some of the columns already exist, use the conditional migration section instead.

After updating the database, restart BugPilot AI and reimport the GitHub repository.

---

### Error: Too many imports

BugPilot AI limits excessive GitHub import requests.

Allow the rate limit window to reset before attempting another import.

GitHub's external API may also enforce additional restrictions.

---

### Error: MySQL Connection Failed

Verify that:

- MySQL Server is running.
- The database exists.
- The MySQL username and password are correct.
- The database port is correct.
- The `.env` file is inside the backend directory.
- The database name is `bug_tracking_phase2`.

---

### Error: Port 3000 Is Already in Use

An existing BugPilot AI server may already be running.

Stop the previous server using:

```text
Ctrl + C
```

Then restart the application:

```bash
cd ~/Documents/BugPilot-AI-V2 && bash start-bugpilot.sh
```

---

## 📌 Project Information

| Information | Details |
|---|---|
| Project | BugPilot AI V2 |
| Course | SOFE 3700U — Data Management Systems |
| University | Ontario Tech University |
| Project Phase | Phase III |
| Database | MySQL |
| Application Type | Full-Stack Web Application |
| External Integration | GitHub REST API and GitHub OAuth |

**GitHub:** [@weeshan](https://github.com/weeshan)

**Repository:** [BugPilot AI](https://github.com/weeshan/BugPilot-AI)

---

## ⚡ Quick Command Reference

| Task | Command |
|---|---|
| Start BugPilot AI | `cd ~/Documents/BugPilot-AI-V2 && bash start-bugpilot.sh` |
| Start from project root | `bash start-bugpilot.sh` |
| Start manually from backend | `node server.js` |
| Create user from backend | `node create-user.js` |
| Install dependencies from backend | `npm ci` |
| Check current directory | `pwd` |
| Stop server | `Ctrl + C` |

---

**BugPilot AI — One platform to track bugs across your team's projects.**
