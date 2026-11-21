
require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const pool = require("./db");

// ==========================================
// 1. IMPORT SHARED MODULES
// ==========================================

const { requireRole } = require("./middleware/auth");

// Authentication routes
const authRoutes = require("./routes/auth");

// Issue routes - NEW
const issueRoutes = require("./routes/issues");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ==========================================
// 2. ENVIRONMENT VALIDATION
// ==========================================

if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.length < 32
) {
    throw new Error("Set a strong SESSION_SECRET in .env");
}

// ==========================================
// 3. EXPRESS MIDDLEWARE
// ==========================================

app.disable("x-powered-by");

app.use(express.json({ limit: "20kb" }));

// ==========================================
// 4. MYSQL SESSION STORAGE
// ==========================================

const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    createDatabaseTable: true,
    expiration: 4 * 60 * 60 * 1000
});

app.use(session({
    name: "bugpilot.sid",
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 4 * 60 * 60 * 1000
    }
}));

// ==========================================
// 5. AUTHENTICATION ROUTES
// ==========================================

// Defined in routes/auth.js

app.use("/api/auth", authRoutes);

// POST /api/auth/login
// POST /api/auth/guest
// GET  /api/auth/me
// POST /api/auth/logout

// ==========================================
// 6. ISSUE ROUTES - NEW
// ==========================================

// Defined in routes/issues.js

app.use("/api/issues", issueRoutes);

// GET  /api/issues
// POST /api/issues

// Authorization is enforced inside routes/issues.js

// ==========================================
// 7. ADMIN-ONLY USER MANAGEMENT
// GET /api/admin/users
// ==========================================

app.get(
    "/api/admin/users",
    requireRole("admin"),
    async (req, res, next) => {
        try {
            const [users] = await pool.execute(`
                SELECT
                    user_id,
                    username,
                    email,
                    role,
                    is_active,
                    created_at
                FROM app_users
                ORDER BY user_id
            `);

            return res.json({
                success: true,
                count: users.length,
                data: users
            });

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 8. WEBSITE PAGES
// ==========================================

// Login page
app.get("/login", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "login.html")
    );
});

// Redirect direct HTML access
app.get("/login.html", (req, res) => {
    res.redirect("/login");
});

app.get("/index.html", (req, res) => {
    res.redirect("/");
});

// Protected dashboard
app.get("/", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    res.set("Cache-Control", "no-store");

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// ==========================================
// 9. UNKNOWN API ENDPOINTS
// ==========================================

app.use("/api", (req, res) => {
    return res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

// ==========================================
// 10. CENTRALIZED ERROR HANDLING
// ==========================================

app.use((error, req, res, next) => {
    console.error("Server error:", error.message);

    // Invalid JSON
    if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        "body" in error
    ) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON request body."
        });
    }

    // Request body too large
    if (error.status === 413) {
        return res.status(413).json({
            success: false,
            message: "Request body is too large."
        });
    }

    // MySQL connection failure
    if (
        [
            "ECONNREFUSED",
            "ETIMEDOUT",
            "PROTOCOL_CONNECTION_LOST"
        ].includes(error.code)
    ) {
        return res.status(503).json({
            success: false,
            message: "Database temporarily unavailable."
        });
    }

    return res.status(500).json({
        success: false,
        message: "An internal server error occurred."
    });
});

// ==========================================
// 11. START BUGPILOT AI SERVER
// ==========================================

async function startServer() {
    try {
        await pool.query("SELECT 1");

        console.log("MySQL connection successful!");

        await sessionStore.onReady();

        console.log("Session store ready!");

        app.listen(PORT, () => {
            console.log(
                `BugPilot AI running at http://localhost:${PORT}`
            );
        });

    } catch (error) {
        console.error("Startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
