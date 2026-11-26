const express = require("express");
const pool = require("../db");

const {
    requireAuth,
    requireRole
} = require("../middleware/auth");

const router = express.Router();

// ==========================================
// 1. SHARED HELPERS
// ==========================================

const projectQuery = `
    SELECT
        p.project_id,
        p.project_name,
        p.description,
        p.repository_url,
        p.owner_id,
        p.created_on,
        d.full_name AS owner_name
    FROM projects p
    INNER JOIN developers d
        ON d.developer_id = p.owner_id
`;

function validId(value) {
    if (
        typeof value !== "string" &&
        typeof value !== "number"
    ) {
        return false;
    }

    return /^[1-9][0-9]*$/.test(String(value)) &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) <= 2147483647;
}

function validateProject(body, isCreate) {

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        return "A JSON object is required.";
    }

    const allowed = [
        "project_name",
        "description",
        "repository_url",
        "owner_id"
    ];

    const keys = Object.keys(body);

    if (
        keys.length === 0 ||
        keys.some(key => !allowed.includes(key))
    ) {
        return "Only project_name, description, repository_url, and owner_id are allowed.";
    }

    if (
        isCreate &&
        ["project_name", "description", "owner_id"]
            .some(key => !(key in body))
    ) {
        return "Project name, description, and owner ID are required.";
    }

    // Project name validation
    if (
        "project_name" in body &&
        (
            typeof body.project_name !== "string" ||
            !body.project_name.trim() ||
            body.project_name.trim().length > 120
        )
    ) {
        return "Project name must contain 1-120 characters.";
    }

    // Description validation
    if (
        "description" in body &&
        (
            typeof body.description !== "string" ||
            !body.description.trim() ||
            body.description.trim().length > 10000
        )
    ) {
        return "Description must contain 1-10000 characters.";
    }

    // Owner validation
    if (
        "owner_id" in body &&
        !validId(body.owner_id)
    ) {
        return "A valid developer/owner ID is required.";
    }

    // Repository URL validation
    if (
        "repository_url" in body &&
        body.repository_url !== null &&
        body.repository_url !== ""
    ) {
        if (
            typeof body.repository_url !== "string" ||
            body.repository_url.trim().length > 255
        ) {
            return "Repository URL must contain no more than 255 characters.";
        }

        if (body.repository_url.trim()) {
            try {
                const url = new URL(
                    body.repository_url.trim()
                );

                if (
                    !["http:", "https:"].includes(url.protocol) ||
                    url.username ||
                    url.password
                ) {
                    return "Repository URL must be a valid HTTP or HTTPS link.";
                }

            } catch {
                return "Invalid repository URL.";
            }
        }
    }

    return null;
}

function normalizeProject(body) {

    const clean = {};

    for (const [key, value] of Object.entries(body)) {

        if (key === "owner_id") {
            clean[key] = Number(value);

        } else if (key === "repository_url") {
            clean[key] =
                value == null || !String(value).trim()
                    ? null
                    : value.trim();

        } else {
            clean[key] = value.trim();
        }
    }

    return clean;
}

function handleDatabaseError(error, res, next) {

    if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
            success: false,
            message: "Project name or repository URL already exists."
        });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(400).json({
            success: false,
            message: "Referenced developer does not exist."
        });
    }

    if (
        [
            "ER_ROW_IS_REFERENCED",
            "ER_ROW_IS_REFERENCED_2"
        ].includes(error.code)
    ) {
        return res.status(409).json({
            success: false,
            message: "Project has related issues or documents and cannot be deleted."
        });
    }

    return next(error);
}

// ==========================================
// 2. GET ALL PROJECTS
// GET /api/projects
// ==========================================

router.get(
    "/",
    requireAuth,
    async (req, res, next) => {

        try {
            const [projects] = await pool.execute(
                projectQuery +
                " ORDER BY p.project_id"
            );

            return res.status(200).json({
                success: true,
                count: projects.length,
                data: projects
            });

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 3. GET ONE PROJECT
// GET /api/projects/:id
// ==========================================

router.get(
    "/:id",
    requireAuth,
    async (req, res, next) => {

        if (!validId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        try {
            const [projects] = await pool.execute(
                projectQuery +
                " WHERE p.project_id = ?",
                [Number(req.params.id)]
            );

            if (projects.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found."
                });
            }

            return res.json({
                success: true,
                data: projects[0]
            });

        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// 4. CREATE PROJECT
// POST /api/projects
// ADMIN AND USER
// ==========================================

router.post(
    "/",
    requireRole("admin", "user"),
    async (req, res, next) => {

        const errorMessage = validateProject(
            req.body,
            true
        );

        if (errorMessage) {
            return res.status(400).json({
                success: false,
                message: errorMessage
            });
        }

        const input = normalizeProject(req.body);

        try {

            // Verify project owner exists.
            const [owners] = await pool.execute(
                `SELECT developer_id
                 FROM developers
                 WHERE developer_id = ?`,
                [input.owner_id]
            );

            if (owners.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Owner/developer not found."
                });
            }

            // Insert into MySQL.
            const [result] = await pool.execute(
                `INSERT INTO projects (
                    project_name,
                    description,
                    repository_url,
                    owner_id,
                    created_on
                )
                VALUES (?, ?, ?, ?, CURRENT_DATE())`,
                [
                    input.project_name,
                    input.description,
                    input.repository_url ?? null,
                    input.owner_id
                ]
            );

            // Retrieve the new project.
            const [projects] = await pool.execute(
                projectQuery +
                " WHERE p.project_id = ?",
                [result.insertId]
            );

            return res.status(201).json({
                success: true,
                message: "Project created successfully.",
                project_id: result.insertId,
                data: projects[0]
            });

        } catch (error) {
            return handleDatabaseError(error, res, next);
        }
    }
);

// ==========================================
// 5. UPDATE PROJECT
// PUT /api/projects/:id
// ADMIN AND USER
// ==========================================

router.put(
    "/:id",
    requireRole("admin", "user"),
    async (req, res, next) => {

        if (!validId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        const errorMessage = validateProject(
            req.body,
            false
        );

        if (errorMessage) {
            return res.status(400).json({
                success: false,
                message: errorMessage
            });
        }

        const input = normalizeProject(req.body);
        const fields = Object.keys(input);

        try {

            // Validate any new owner.
            if ("owner_id" in input) {
                const [owners] = await pool.execute(
                    `SELECT developer_id
                     FROM developers
                     WHERE developer_id = ?`,
                    [input.owner_id]
                );

                if (owners.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Owner/developer not found."
                    });
                }
            }

            // Column names come from the fixed
            // validation whitelist above.
            const assignments = fields.map(
                field => `${field} = ?`
            );

            const values = fields.map(
                field => input[field]
            );

            const projectId = Number(req.params.id);

            // Update MySQL project.
            const [result] = await pool.execute(
                `UPDATE projects
                 SET ${assignments.join(", ")}
                 WHERE project_id = ?`,
                [...values, projectId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found."
                });
            }

            const [projects] = await pool.execute(
                projectQuery +
                " WHERE p.project_id = ?",
                [projectId]
            );

            return res.json({
                success: true,
                message: "Project updated successfully.",
                data: projects[0]
            });

        } catch (error) {
            return handleDatabaseError(error, res, next);
        }
    }
);

// ==========================================
// 6. DELETE PROJECT
// DELETE /api/projects/:id
// ADMIN ONLY
// ==========================================

router.delete(
    "/:id",
    requireRole("admin"),
    async (req, res, next) => {

        if (!validId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID."
            });
        }

        try {

            const projectId = Number(req.params.id);

            const [result] = await pool.execute(
                `DELETE FROM projects
                 WHERE project_id = ?`,
                [projectId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found."
                });
            }

            return res.json({
                success: true,
                message: "Project deleted successfully.",
                project_id: projectId
            });

        } catch (error) {
            return handleDatabaseError(error, res, next);
        }
    }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
