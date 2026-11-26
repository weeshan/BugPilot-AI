// ==========================================
// BUGPILOT AI - PDF REPORT EXPORT
// File: backend/routes/pdf.js
// ==========================================

const express = require("express");
const PDFDocument = require("pdfkit");

const pool = require("../db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. ALLOWED SQL VIEW REPORTS
// ==========================================

const REPORTS = Object.freeze({
    "issue-details": [
        "Issue Details",
        "view_issue_details"
    ],
    "projects-above-average": [
        "Projects Above Average Issues",
        "view_projects_above_avg_issues"
    ],
    "developers-with-solutions": [
        "Developers With Solutions",
        "view_developers_with_solutions"
    ],
    "projects-and-documents": [
        "Projects and Documents",
        "view_projects_and_documents"
    ],
    "active-developers": [
        "Active Developers",
        "view_active_developers"
    ],
    "urgent-issues": [
        "Urgent Issues",
        "view_urgent_issues"
    ],
    "accepted-solutions": [
        "Accepted Solutions",
        "view_accepted_solutions"
    ],
    "developer-workload": [
        "Developer Workload",
        "view_developer_workload"
    ],
    "issue-documentation": [
        "Issue Documentation",
        "view_issue_documentation"
    ],
    "project-issue-statistics": [
        "Project Issue Statistics",
        "view_project_issue_statistics"
    ]
});

// ==========================================
// 2. FORMAT DATABASE VALUES
// ==========================================

function formatValue(value) {
    if (value === null || value === undefined) {
        return "N/A";
    }

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}

// ==========================================
// 3. EXPORT SELECTED REPORT AS PDF
// GET /api/reports/export/pdf/:reportId
// ==========================================

router.get(
    "/export/pdf/:reportId",
    requireRole("admin", "user"),
    async (req, res, next) => {
        const reportId = req.params.reportId;

        if (!Object.prototype.hasOwnProperty.call(REPORTS, reportId)) {
            return res.status(404).json({
                success: false,
                message: "Unknown report."
            });
        }

        try {
            const [title, viewName] = REPORTS[reportId];

            // The SQL view name comes from our fixed allowlist,
            // not directly from user input.
            const [rows] = await pool.query(
                "SELECT * FROM ??",
                [viewName]
            );

            // PDF response headers
            res.setHeader("Content-Type", "application/pdf");

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="bugpilot-${reportId}.pdf"`
            );

            res.setHeader("Cache-Control", "no-store");

            // Create PDF document
            const pdf = new PDFDocument({
                size: "A4",
                margins: {
                    top: 40,
                    bottom: 45,
                    left: 42,
                    right: 42
                }
            });

            pdf.on("error", error => {
                if (!res.headersSent) {
                    return next(error);
                }

                res.destroy(error);
            });

            pdf.pipe(res);

            // ==================================
            // PDF HEADER
            // ==================================

            pdf
                .font("Helvetica-Bold")
                .fontSize(21)
                .fillColor("#2563eb")
                .text("BugPilot AI");

            pdf.moveDown(0.25);

            pdf
                .fontSize(15)
                .fillColor("#0f172a")
                .text(title);

            pdf.moveDown(0.4);

            pdf
                .font("Helvetica")
                .fontSize(9)
                .fillColor("#64748b")
                .text(
                    `Generated: ${new Date().toLocaleString("en-CA")}`
                )
                .text(`Total records: ${rows.length}`);

            pdf.moveDown(1);

            // ==================================
            // EMPTY REPORT
            // ==================================

            if (rows.length === 0) {
                pdf
                    .fontSize(11)
                    .fillColor("#475569")
                    .text("No records found for this report.");
            }

            // ==================================
            // PDF REPORT CONTENT
            // ==================================

            rows.forEach((row, index) => {
                // Add a page if there isn't enough
                // room for another record heading.
                if (pdf.y > pdf.page.height - 110) {
                    pdf.addPage();
                }

                pdf
                    .font("Helvetica-Bold")
                    .fontSize(11)
                    .fillColor("#1d4ed8")
                    .text(`Record ${index + 1}`);

                pdf.moveDown(0.25);

                for (const [column, value] of Object.entries(row)) {
                    const label = column.replace(/_/g, " ");

                    pdf
                        .font("Helvetica")
                        .fontSize(9)
                        .fillColor("#0f172a")
                        .text(
                            `${label}: ${formatValue(value)}`,
                            {
                                width:
                                    pdf.page.width -
                                    pdf.page.margins.left -
                                    pdf.page.margins.right,
                                lineGap: 2
                            }
                        );

                    pdf.moveDown(0.15);
                }

                pdf.moveDown(0.65);
            });

            // Finish and send PDF
            pdf.end();

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;