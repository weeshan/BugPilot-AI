
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { rateLimit } = require("express-rate-limit");

const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. SESSION HELPER
// ==========================================

function establishSession(req, res, next, user, redirectTo = null) {
    req.session.regenerate(error => {
        if (error) return next(error);

        req.session.user = user;

        req.session.save(saveError => {
            if (saveError) return next(saveError);

            // GitHub uses a browser redirect after OAuth.
            if (redirectTo) {
                return res.redirect(303, redirectTo);
            }

            // Existing login/guest APIs still return JSON.
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

const githubLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many GitHub login attempts."
});

// ==========================================
// 3. NORMAL USERNAME/PASSWORD LOGIN
// POST /api/auth/login
// ==========================================

router.post("/login", loginLimiter, async (req, res, next) => {
    try {
        const { username, password } = req.body || {};

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

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }

        const user = users[0];

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

        return establishSession(req, res, next, {
            id: user.user_id,
            username: user.username,
            role: user.role
        });

    } catch (error) {
        next(error);
    }
});

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

            // Validate username
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

            // Validate email
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

            // Validate password
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

            // Confirm password
            if (
                typeof confirmPassword !== "string" ||
                password !== confirmPassword
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Passwords do not match."
                });
            }

            // Check existing accounts
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

            const passwordHash = await bcrypt.hash(password, 12);

            // New public registrations always get USER role.
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

            return res.status(201).json({
                success: true,
                message:
                    "Account created successfully! Please sign in.",
                user: {
                    id: result.insertId,
                    username,
                    email: cleanEmail,
                    role: "user"
                }
            });

        } catch (error) {
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
// 5. GITHUB OAUTH CONFIGURATION
// ==========================================

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const GITHUB_CALLBACK_URL =
    process.env.GITHUB_CALLBACK_URL ||
    "http://localhost:3000/api/auth/github/callback";

function githubConfigured() {
    return Boolean(
        GITHUB_CLIENT_ID &&
        GITHUB_CLIENT_SECRET &&
        !GITHUB_CLIENT_ID.startsWith("YOUR_") &&
        !GITHUB_CLIENT_SECRET.startsWith("YOUR_")
    );
}

function githubLoginError(res, reason = "failed") {
    // Fixed redirect destinations prevent open redirects.
    return res.redirect(
        303,
        `/login?github_error=${encodeURIComponent(reason)}`
    );
}

function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save(error => {
            if (error) return reject(error);
            resolve();
        });
    });
}

// ==========================================
// 6. START GITHUB SIGN-IN
// GET /api/auth/github
// ==========================================

router.get(
    "/github",
    githubLoginLimiter,
    async (req, res, next) => {
        try {
            if (!githubConfigured()) {
                return res.status(503).send(
                    "GitHub login is not configured."
                );
            }

            // Random state protects the OAuth callback.
            const state = crypto
                .randomBytes(32)
                .toString("hex");

            // PKCE protects the authorization code.
            const codeVerifier = crypto
                .randomBytes(32)
                .toString("base64url");

            const codeChallenge = crypto
                .createHash("sha256")
                .update(codeVerifier)
                .digest("base64url");

            // Store the temporary flow in the existing
            // MySQL-backed session.
            req.session.githubOAuth = {
                state,
                codeVerifier,
                createdAt: Date.now()
            };

            await saveSession(req);

            const authorizeUrl = new URL(
                "https://github.com/login/oauth/authorize"
            );

            authorizeUrl.searchParams.set(
                "client_id",
                GITHUB_CLIENT_ID
            );

            authorizeUrl.searchParams.set(
                "redirect_uri",
                GITHUB_CALLBACK_URL
            );

            authorizeUrl.searchParams.set("state", state);

            authorizeUrl.searchParams.set(
                "code_challenge",
                codeChallenge
            );

            authorizeUrl.searchParams.set(
                "code_challenge_method",
                "S256"
            );

            // No repo, user, or private-data scopes requested.
            // GitHub's public identity is enough.
            return res.redirect(302, authorizeUrl.toString());

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 7. GITHUB OAUTH CALLBACK
// GET /api/auth/github/callback
// ==========================================

router.get("/github/callback", async (req, res, next) => {
    try {
        if (!githubConfigured()) {
            return githubLoginError(res, "configuration");
        }

        const flow = req.session?.githubOAuth;

        // Consume the state before exchanging the code.
        if (req.session) {
            delete req.session.githubOAuth;
            await saveSession(req);
        }

        const providedState =
            typeof req.query.state === "string"
                ? req.query.state
                : "";

        const expectedState = flow?.state || "";

        const receivedBuffer = Buffer.from(providedState);
        const expectedBuffer = Buffer.from(expectedState);

        const stateMatches =
            expectedBuffer.length === 64 &&
            receivedBuffer.length === expectedBuffer.length &&
            crypto.timingSafeEqual(
                receivedBuffer,
                expectedBuffer
            );

        const flowValid =
            flow &&
            Number.isFinite(flow.createdAt) &&
            Date.now() >= flow.createdAt &&
            Date.now() - flow.createdAt <= 10 * 60 * 1000 &&
            typeof flow.codeVerifier === "string" &&
            stateMatches;

        if (!flowValid) {
            return githubLoginError(res, "state");
        }

        // The user cancelled authorization.
        if (req.query.error) {
            return githubLoginError(res, "denied");
        }

        const code = req.query.code;

        if (
            typeof code !== "string" ||
            !code ||
            code.length > 1024
        ) {
            return githubLoginError(res, "code");
        }

        // ----------------------------------
        // EXCHANGE CODE FOR ACCESS TOKEN
        // ----------------------------------

        const tokenResponse = await fetch(
            "https://github.com/login/oauth/access_token",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "User-Agent": "BugPilot-AI-V2"
                },
                body: new URLSearchParams({
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    code,
                    redirect_uri: GITHUB_CALLBACK_URL,
                    code_verifier: flow.codeVerifier
                }),
                signal: AbortSignal.timeout(15000)
            }
        );

        if (!tokenResponse.ok) {
            return githubLoginError(res, "token");
        }

        const tokenData = await tokenResponse.json();

        if (
            tokenData.error ||
            typeof tokenData.access_token !== "string" ||
            !tokenData.access_token
        ) {
            return githubLoginError(res, "token");
        }

        // Strictly public-only integration.
        // Reject any scopes inherited from previous grants.
        const grantedScopes =
            typeof tokenData.scope === "string"
                ? tokenData.scope.trim()
                : "";

        if (grantedScopes) {
            return githubLoginError(res, "scope");
        }

        // ----------------------------------
        // VERIFY GITHUB IDENTITY
        // ----------------------------------

        const profileResponse = await fetch(
            "https://api.github.com/user",
            {
                headers: {
                    "Accept": "application/vnd.github+json",
                    "Authorization":
                        `Bearer ${tokenData.access_token}`,
                    "User-Agent": "BugPilot-AI-V2",
                    "X-GitHub-Api-Version": "2022-11-28"
                },
                signal: AbortSignal.timeout(15000)
            }
        );

        if (!profileResponse.ok) {
            return githubLoginError(res, "profile");
        }

        const profile = await profileResponse.json();

        const githubId = Number(profile.id);
        const githubUsername = profile.login;

        if (
            !Number.isSafeInteger(githubId) ||
            githubId <= 0 ||
            typeof githubUsername !== "string" ||
            !/^[A-Za-z0-9-]{1,39}$/.test(githubUsername)
        ) {
            return githubLoginError(res, "profile");
        }

        // ----------------------------------
        // LOOK FOR EXISTING LINKED ACCOUNT
        // ----------------------------------

        const [existingAccounts] = await pool.execute(
            `SELECT
                user_id,
                username,
                role,
                is_active
             FROM app_users
             WHERE github_user_id = ?
             LIMIT 1`,
            [githubId]
        );

        let account;

        if (existingAccounts.length > 0) {
            account = existingAccounts[0];

            if (!Boolean(account.is_active)) {
                return githubLoginError(res, "disabled");
            }

            // Keep GitHub's latest username in MySQL.
            await pool.execute(
                `UPDATE app_users
                 SET github_username = ?
                 WHERE user_id = ?`,
                [
                    githubUsername,
                    account.user_id
                ]
            );

        } else {
            // ----------------------------------
            // CREATE NEW REGULAR USER
            // ----------------------------------

            // Stable, collision-resistant identity based
            // on GitHub's numeric user ID.
            //
            // Do not match existing local users by email
            // or GitHub username: that could compromise
            // an existing account.

            const localUsername = `github_${githubId}`;

            // The schema requires a unique email.
            // This is an internal placeholder, not
            // the person's real email address.
            const localEmail =
                `github_${githubId}@users.bugpilot.invalid`;

            // A random password hash keeps GitHub-only
            // accounts from having a usable default password.
            const randomPassword = crypto
                .randomBytes(32)
                .toString("hex");

            const passwordHash = await bcrypt.hash(
                randomPassword,
                12
            );

            try {
                const [result] = await pool.execute(
                    `INSERT INTO app_users (
                        username,
                        email,
                        password_hash,
                        role,
                        is_active,
                        github_user_id,
                        github_username
                    )
                    VALUES (?, ?, ?, 'user', TRUE, ?, ?)`,
                    [
                        localUsername,
                        localEmail,
                        passwordHash,
                        githubId,
                        githubUsername
                    ]
                );

                account = {
                    user_id: result.insertId,
                    username: localUsername,
                    role: "user",
                    is_active: 1
                };

            } catch (error) {
                // If two simultaneous sign-ins tried to
                // create the same GitHub identity, check
                // whether the other request created it.
                if (error.code !== "ER_DUP_ENTRY") {
                    throw error;
                }

                const [accounts] = await pool.execute(
                    `SELECT
                        user_id,
                        username,
                        role,
                        is_active
                     FROM app_users
                     WHERE github_user_id = ?
                     LIMIT 1`,
                    [githubId]
                );

                if (
                    accounts.length === 0 ||
                    !Boolean(accounts[0].is_active)
                ) {
                    return githubLoginError(
                        res,
                        "account"
                    );
                }

                account = accounts[0];
            }
        }

        // ----------------------------------
        // CREATE FRESH BUGPILOT SESSION
        // ----------------------------------

        return establishSession(
            req,
            res,
            next,
            {
                id: account.user_id,
                username: account.username,
                role: account.role
            },
            "/"
        );

    } catch (error) {
        console.error(
            "GitHub OAuth login failed:",
            error.message
        );

        // Do not expose tokens or GitHub's internal
        // error details to the browser.
        return githubLoginError(res, "failed");
    }
});

// ==========================================
// 8. GUEST LOGIN
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
// 9. GET CURRENT LOGGED-IN USER
// GET /api/auth/me
// ==========================================

router.get("/me", requireAuth, (req, res) => {
    return res.json({
        success: true,
        user: req.session.user
    });
});

// ==========================================
// 10. LOGOUT
// POST /api/auth/logout
// ==========================================

router.post("/logout", (req, res, next) => {
    req.session.destroy(error => {
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
// 11. EXPORT AUTHENTICATION ROUTER
// ==========================================

module.exports = router;
