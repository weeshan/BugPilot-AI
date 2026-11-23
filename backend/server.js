
// ==========================================
// BUGPILOT AI - MAIN SERVER
// File: backend/server.js
// ==========================================

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

const authRoutes = require("./routes/auth");
const issueRoutes = require("./routes/issues");
const viewsRoutes = require("./routes/views");

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

// Static assets (CSS and JS only).
// HTML pages stay behind their role-checked routes.
app.use(
    "/css",
    express.static(path.join(__dirname, "public", "css"), { index: false })
);

app.use(
    "/js",
    express.static(path.join(__dirname, "public", "js"), { index: false })
);

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

app.use(
    session({
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
    })
);

// ==========================================
// 5. REFRESH ACCOUNT PERMISSIONS
// ==========================================

// This prevents disabled users from continuing
// to use an existing login session.
//
// It also synchronizes role changes with MySQL.

app.use(async (req, res, next) => {
    const sessionUser = req.session?.user;

    // No session or a temporary guest session.
    if (!sessionUser || sessionUser.role === "guest") {
        return next();
    }

    const userId = Number(sessionUser.id);

    // Destroy an invalid or revoked session.
    function rejectSession() {
        req.session.destroy(error => {
            if (error) {
                return next(error);
            }

            res.clearCookie("bugpilot.sid", {
                path: "/"
            });

            if (req.path.startsWith("/api/")) {
                return res.status(401).json({
                    success: false,
                    message: "Session invalid. Please log in again."
                });
            }

            return res.redirect("/login");
        });
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        return rejectSession();
    }

    try {
        const [users] = await pool.execute(
            `SELECT
                user_id,
                username,
                role,
                is_active
             FROM app_users
             WHERE user_id = ?
             LIMIT 1`,
            [userId]
        );

        if (
            users.length === 0 ||
            !Boolean(users[0].is_active) ||
            !["admin", "user"].includes(users[0].role)
        ) {
            return rejectSession();
        }

        const account = users[0];

        // Update session if the admin changed this account.
        req.session.user = {
            id: account.user_id,
            username: account.username,
            role: account.role
        };

        next();

    } catch (error) {
        next(error);
    }
});

// ==========================================
// 6. AUTHENTICATION ROUTES
// ==========================================

// POST /api/auth/login
// POST /api/auth/guest
// GET  /api/auth/me
// POST /api/auth/logout

app.use("/api/auth", authRoutes);

// ==========================================
// 7. ISSUE ROUTES
// ==========================================

// GET    /api/issues
// GET    /api/issues/options
// POST   /api/issues
// DELETE /api/issues/:id

app.use("/api/issues", issueRoutes);

// ==========================================
// 8. REPORTING / SQL VIEW ROUTES
// ==========================================

app.use("/api/views", viewsRoutes);

// ==========================================
// 9. ADMIN - GET ALL USERS
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
// 10. ADMIN - UPDATE USER ACCOUNT
// PATCH /api/admin/users/:id
// ==========================================

app.patch(
    "/api/admin/users/:id",
    requireRole("admin"),
    async (req, res, next) => {
        try {
            const userId = Number(req.params.id);

            if (
                !Number.isSafeInteger(userId) ||
                userId <= 0 ||
                userId > 2147483647
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            const { role, is_active } = req.body || {};

            if (
                !["admin", "user"].includes(role) ||
                typeof is_active !== "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid role and active status are required."
                });
            }

            // Do not allow an administrator to disable
            // or demote their own account.
            if (userId === Number(req.session.user.id)) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot modify your own account."
                });
            }

            const [result] = await pool.execute(
                `UPDATE app_users
                 SET role = ?,
                     is_active = ?
                 WHERE user_id = ?`,
                [
                    role,
                    is_active ? 1 : 0,
                    userId
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User account not found."
                });
            }

            return res.json({
                success: true,
                message: "User account updated successfully.",
                data: {
                    user_id: userId,
                    role,
                    is_active
                }
            });

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 11. WEBSITE ROUTES
// ==========================================

// Login page
app.get("/login", (req, res) => {
    res.set("Cache-Control", "no-store");

    return res.sendFile(
        path.join(__dirname, "public", "login.html")
    );
});

// Prevent direct HTML access.
app.get("/login.html", (req, res) => {
    return res.redirect("/login");
});

app.get("/index.html", (req, res) => {
    return res.redirect("/");
});

// Report page
app.get("/reports", requireRole("admin", "user"), (req, res) => {
    res.set("Cache-Control", "no-store");
    return res.sendFile(
        path.join(__dirname, "public", "reports.html")
    );
});

// Shared dashboard HTML.
// Role-specific content is rendered by index.html.
function serveDashboard(req, res) {
    res.set("Cache-Control", "no-store");

    return res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
}

// ==========================================
// 12. ADMIN DASHBOARD
// ==========================================

app.get(
    "/admin",
    requireRole("admin"),
    serveDashboard
);

// ==========================================
// 13. REGULAR USER DASHBOARD
// ==========================================

app.get(
    "/dashboard",
    requireRole("user"),
    serveDashboard
);

// ==========================================
// 15. GUEST DASHBOARD
// ==========================================

app.get(
    "/guest",
    requireRole("guest"),
    serveDashboard
);

// ==========================================
// 16. HOME PAGE / ROLE REDIRECTION
// ==========================================

app.get("/", (req, res) => {
    const user = req.session?.user;

    if (!user) {
        return res.redirect("/login");
    }

    if (user.role === "admin") {
        return res.redirect("/admin");
    }

    if (user.role === "user") {
        return res.redirect("/dashboard");
    }

    if (user.role === "guest") {
        return res.redirect("/guest");
    }

    return res.status(403).send("Unknown account role.");
});

// ==========================================
// 17. UNKNOWN API ENDPOINTS
// ==========================================

app.use("/api", (req, res) => {
    return res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

// ==========================================
// 18. CENTRALIZED ERROR HANDLING
// ==========================================

app.use((error, req, res, next) => {
    console.error("Server error:", error.message);

    // Invalid JSON request.
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

    // Request body too large.
    if (error.status === 413) {
        return res.status(413).json({
            success: false,
            message: "Request body is too large."
        });
    }

    // Database unavailable.
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
// 19. START BUGPILOT AI SERVER
// ==========================================

async function startServer() {
    try {
        // Verify MySQL.
        await pool.query("SELECT 1");

        console.log("MySQL connection successful!");

        // Verify session storage.
        await sessionStore.onReady();

        console.log("Session store ready!");

        // Start application.
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
