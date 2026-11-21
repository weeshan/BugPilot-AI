// ==========================================
// BUGPILOT AI - AUTHENTICATION ROUTES
// File: backend/routes/auth.js
// ==========================================

const express = require("express");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");

const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. SESSION HELPER
// ==========================================

// Create a fresh session after login
function establishSession(req, res, next, user) {
    req.session.regenerate((error) => {
        if (error) {
            return next(error);
        }

        req.session.user = user;

        req.session.save((saveError) => {
            if (saveError) {
                return next(saveError);
            }

            return res.json({
                success: true,
                message: "Login successful.",
                user
            });
        });
    });
}

// ==========================================
// 2. RATE LIMITING
// ==========================================

// Limit repeated login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many login attempts. Try again later."
    }
});

// Limit repeated account registrations
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many registration attempts. Try again later."
    }
});

// ==========================================
// 3. LOGIN
// POST /api/auth/login
// ==========================================

router.post(
    "/login",
    loginLimiter,
    async (req, res, next) => {
        try {
            const { username, password } = req.body || {};

            // Validate username and password
            if (
                typeof username !== "string" ||
                typeof password !== "string" ||
                !username.trim() ||
                !password ||
                username.length > 50
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid username and password."
                });
            }

            // Find the active account in MySQL
            const [users] = await pool.execute(
                `SELECT
                    user_id,
                    username,
                    password_hash,
                    role
                 FROM app_users
                 WHERE username = ?
                   AND is_active = TRUE
                 LIMIT 1`,
                [username.trim()]
            );

            // Account does not exist
            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password."
                });
            }

            const user = users[0];

            // Compare password with stored bcrypt hash
            const passwordMatches = await bcrypt.compare(
                password,
                user.password_hash
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password."
                });
            }

            // Create login session
            return establishSession(req, res, next, {
                id: user.user_id,
                username: user.username,
                role: user.role
            });

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 4. REGISTER NEW ACCOUNT
// POST /api/auth/register
// ==========================================

router.post(
    "/register",
    registerLimiter,
    async (req, res, next) => {
        try {
            const {
                username,
                email,
                password,
                confirmPassword
            } = req.body || {};

            // ----------------------------------
            // VALIDATE USERNAME
            // ----------------------------------

            if (
                typeof username !== "string" ||
                !/^[a-zA-Z0-9_.-]{3,50}$/.test(username)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Username must be 3-50 characters and contain only letters, numbers, underscores, dots or hyphens."
                });
            }

            // ----------------------------------
            // VALIDATE EMAIL
            // ----------------------------------

            if (
                typeof email !== "string" ||
                !email.trim() ||
                email.trim().length > 254 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid email address."
                });
            }

            const cleanEmail = email.trim().toLowerCase();

            // ----------------------------------
            // VALIDATE PASSWORD
            // ----------------------------------

            if (
                typeof password !== "string" ||
                password.length < 8 ||
                Buffer.byteLength(password, "utf8") > 72
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must contain at least 8 characters and no more than 72 UTF-8 bytes."
                });
            }

            // ----------------------------------
            // VALIDATE CONFIRM PASSWORD
            // ----------------------------------

            if (
                typeof confirmPassword !== "string" ||
                password !== confirmPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Passwords do not match."
                });
            }

            // ----------------------------------
            // CHECK FOR EXISTING ACCOUNT
            // ----------------------------------

            const [existingUsers] = await pool.execute(
                `SELECT user_id
                 FROM app_users
                 WHERE username = ?
                    OR email = ?
                 LIMIT 1`,
                [username, cleanEmail]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Username or email already exists."
                });
            }

            // ----------------------------------
            // HASH PASSWORD
            // ----------------------------------

            // Never store the original plaintext password
            const passwordHash = await bcrypt.hash(
                password,
                12
            );

            // ----------------------------------
            // CREATE ACCOUNT IN MYSQL
            // ----------------------------------

            // Every public registration receives the USER role.
            // Admin accounts cannot be created through this API.

            const [result] = await pool.execute(
                `INSERT INTO app_users (
                    username,
                    email,
                    password_hash,
                    role,
                    is_active
                )
                VALUES (?, ?, ?, 'user', TRUE)`,
                [
                    username,
                    cleanEmail,
                    passwordHash
                ]
            );

            // ----------------------------------
            // REGISTRATION SUCCESSFUL
            // ----------------------------------

            return res.status(201).json({
                success: true,
                message:
                    "Account created successfully! Please sign in.",
                user: {
                    id: result.insertId,
                    username: username,
                    email: cleanEmail,
                    role: "user"
                }
            });

        } catch (error) {

            // Handle MySQL duplicate key error
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message: "Username or email already exists."
                });
            }

            next(error);
        }
    }
);

// ==========================================
// 5. GUEST LOGIN
// POST /api/auth/guest
// ==========================================

router.post("/guest", (req, res, next) => {
    return establishSession(req, res, next, {
        id: null,
        username: "Guest",
        role: "guest"
    });
});

// ==========================================
// 6. GET CURRENT LOGGED-IN USER
// GET /api/auth/me
// ==========================================

router.get("/me", requireAuth, (req, res) => {
    return res.json({
        success: true,
        user: req.session.user
    });
});

// ==========================================
// 7. LOGOUT
// POST /api/auth/logout
// ==========================================

router.post("/logout", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie("bugpilot.sid", {
            path: "/"
        });

        return res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});

// ==========================================
// 8. EXPORT AUTHENTICATION ROUTER
// ==========================================

module.exports = router;