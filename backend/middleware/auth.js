// ==========================================
// BUGPILOT AI - AUTHENTICATION MIDDLEWARE
// ==========================================

// Check whether a user is logged in
function requireAuth(req, res, next) {

    if (!req.session?.user) {
        return res.status(401).json({
            success: false,
            message: "Please log in first."
        });
    }

    next();
}

// Check whether a user has an allowed role
function requireRole(...allowedRoles) {

    return (req, res, next) => {

        // Step 1: Check login session
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        // Step 2: Check user role
        const userRole = req.session.user.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message:
                    "Access denied. Insufficient permissions."
            });
        }

        // Step 3: Permission granted
        next();
    };
}

// Export functions for other backend files
module.exports = {
    requireAuth,
    requireRole
};