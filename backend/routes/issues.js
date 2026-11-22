
// ==========================================
// BUGPILOT AI - ISSUE ROUTES
// File: backend/routes/issues.js
// ==========================================

const express = require("express");
const pool = require("../db");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. GET ALL ISSUES
// GET /api/issues
// Admin, User, Guest
// ==========================================

router.get(
    "/",
    requireAuth,
    async (req, res, next) => {
        try {
            const [issues] = await pool.execute(`
                SELECT
                    i.issue_id,
                    i.title,
                    i.description,
                    i.severity,
                    i.status,
                    i.reported_on,
                    p.project_name
                FROM issues i
                INNER JOIN projects p
                    ON i.project_id = p.project_id
                ORDER BY i.issue_id
            `);

            return res.status(200).json({
                success: true,
                count: issues.length,
                data: issues
            });

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 2. GET CREATE-ISSUE OPTIONS
// GET /api/issues/options
// Admin and User ONLY
// ==========================================

router.get(
    "/options",
    requireRole("admin", "user"),
    async (req, res, next) => {
        try {
            // Available projects.
            const [projects] = await pool.execute(`
                SELECT
                    project_id,
                    project_name
                FROM projects
                ORDER BY project_name
            `);

            // Available developers/reporters.
            const [developers] = await pool.execute(`
                SELECT
                    developer_id,
                    full_name
                FROM developers
                ORDER BY full_name
            `);

            return res.status(200).json({
                success: true,
                data: {
                    projects,
                    developers
                }
            });

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 3. CREATE NEW ISSUE
// POST /api/issues
// Admin and User ONLY
// ==========================================

router.post(
    "/",
    requireRole("admin", "user"),
    async (req, res, next) => {
        try {
            const {
                project_id,
                reporter_id,
                title,
                description,
                severity
            } = req.body || {};

            // ==================================
            // VALIDATE PROJECT AND REPORTER IDs
            // ==================================

            const projectId = Number(project_id);
            const reporterId = Number(reporter_id);

            if (
                !Number.isSafeInteger(projectId) ||
                projectId <= 0 ||
                projectId > 2147483647 ||
                !Number.isSafeInteger(reporterId) ||
                reporterId <= 0 ||
                reporterId > 2147483647 ||
                typeof project_id === "boolean" ||
                typeof reporter_id === "boolean" ||
                project_id === null ||
                reporter_id === null ||
                project_id === "" ||
                reporter_id === ""
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid project and reporter IDs are required."
                });
            }

            // ==================================
            // VALIDATE TITLE
            // ==================================

            if (
                typeof title !== "string" ||
                !title.trim() ||
                title.trim().length > 180
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Title must contain 1-180 characters."
                });
            }

            // ==================================
            // VALIDATE DESCRIPTION
            // ==================================

            if (
                typeof description !== "string" ||
                !description.trim() ||
                description.length > 10000
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Description must contain 1-10000 characters."
                });
            }

            // ==================================
            // VALIDATE SEVERITY
            // ==================================

            const allowedSeverities = [
                "Low",
                "Medium",
                "High",
                "Critical"
            ];

            if (!allowedSeverities.includes(severity)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid severity level."
                });
            }

            // ==================================
            // CHECK PROJECT EXISTS
            // ==================================

            const [projects] = await pool.execute(
                `SELECT project_id
                 FROM projects
                 WHERE project_id = ?`,
                [projectId]
            );

            if (projects.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found."
                });
            }

            // ==================================
            // CHECK REPORTER EXISTS
            // ==================================

            const [reporters] = await pool.execute(
                `SELECT developer_id
                 FROM developers
                 WHERE developer_id = ?`,
                [reporterId]
            );

            if (reporters.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Developer/reporter not found."
                });
            }

            // ==================================
            // INSERT ISSUE INTO MYSQL
            // ==================================

            const [result] = await pool.execute(
                `INSERT INTO issues (
                    project_id,
                    reporter_id,
                    title,
                    description,
                    severity,
                    status,
                    reported_on
                )
                VALUES (?, ?, ?, ?, ?, 'Open', CURDATE())`,
                [
                    projectId,
                    reporterId,
                    title.trim(),
                    description.trim(),
                    severity
                ]
            );

            // ==================================
            // SUCCESS RESPONSE
            // ==================================

            return res.status(201).json({
                success: true,
                message: "Bug created successfully!",
                issue_id: result.insertId,
                data: {
                    issue_id: result.insertId,
                    project_id: projectId,
                    reporter_id: reporterId,
                    title: title.trim(),
                    description: description.trim(),
                    severity,
                    status: "Open"
                }
            });

        } catch (error) {

            if (error.code === "ER_NO_REFERENCED_ROW_2") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid project or reporter reference."
                });
            }

            next(error);
        }
    }
);

// ==========================================
// 4. DELETE ISSUE
// DELETE /api/issues/:id
// ADMIN ONLY
// ==========================================

router.delete(
    "/:id",
    requireRole("admin"),
    async (req, res, next) => {
        try {
            const issueId = Number(req.params.id);

            // Validate issue ID.
            if (
                !Number.isSafeInteger(issueId) ||
                issueId <= 0 ||
                issueId > 2147483647
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid issue ID."
                });
            }

            // Delete the issue from MySQL.
            const [result] = await pool.execute(
                `DELETE FROM issues
                 WHERE issue_id = ?`,
                [issueId]
            );

            // No matching issue.
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Issue not found."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Issue deleted successfully.",
                issue_id: issueId
            });

        } catch (error) {

            // Preserve relational integrity.
            // Do not automatically delete related data.
            if (
                [
                    "ER_ROW_IS_REFERENCED_2",
                    "ER_ROW_IS_REFERENCED"
                ].includes(error.code)
            ) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This issue has related records and " +
                        "cannot be deleted until its " +
                        "dependencies are handled."
                });
            }

            next(error);
        }
    }
);

// ==========================================
// EXPORT ISSUE ROUTER
// ==========================================

module.exports = router;
