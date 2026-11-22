const express = require("express");
const pool = require("../db");

const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Map API endpoint names to existing SQL views
const allowedViews = {
    "issue-details": "view_issue_details",
    "projects-above-average": "view_projects_above_avg_issues",
    "developers-with-solutions": "view_developers_with_solutions",
    "projects-and-documents": "view_projects_and_documents",
    "active-developers": "view_active_developers",
    "urgent-issues": "view_urgent_issues",
    "accepted-solutions": "view_accepted_solutions",
    "developer-workload": "view_developer_workload",
    "issue-documentation": "view_issue_documentation",
    "project-issue-statistics": "view_project_issue_statistics"
};

// GET /api/views/:viewName
router.get( "/:viewName", requireRole("admin", "user"),
    async (req, res, next) => {
        try {
            const sqlView = allowedViews[req.params.viewName];

            // Reject unknown view names
            if (!sqlView) {
                return res.status(404).json({
                    success: false,
                    message: "SQL view not found."
                });
            }

            // Execute the existing SQL view
            const [rows] = await pool.execute(
                `SELECT * FROM ${sqlView}`
            );

            return res.json({
                success: true,
                count: rows.length,
                data: rows
            });

        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;