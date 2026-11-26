
 // ==========================================
 // BUGPILOT AI - PUBLIC GITHUB ISSUE IMPORT
 // File: backend/routes/github.js
 //
 // OPEN   -> save to MySQL
 // CLOSED -> permanently DELETE from MySQL
 // ==========================================

 const express = require("express");
 const { rateLimit } = require("express-rate-limit");
 const pool = require("../db");
 const { requireRole } = require("../middleware/auth");

 const router = express.Router();

 // ==========================================
 // 1. RATE LIMIT
 // ==========================================

 const importLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     limit: 5,
     standardHeaders: "draft-7",
     legacyHeaders: false,
     message: {
         success: false,
         message: "Too many imports. Please try again later."
     }
 });

 // ==========================================
 // 2. VALIDATE INPUTS
 // ==========================================

 function validOwner(value) {
     return typeof value === "string" &&
         /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value);
 }

 function validRepo(value) {
     return typeof value === "string" &&
         /^[A-Za-z0-9._-]{1,100}$/.test(value) &&
         value !== "." &&
         value !== "..";
 }

 function mysqlDatetime(value) {
     if (!value) return null;

     const date = new Date(value);

     return Number.isNaN(date.getTime())
         ? null
         : date.toISOString().slice(0, 19).replace("T", " ");
 }

 // ==========================================
 // 3. GITHUB API HELPER
 // ==========================================

 async function githubGet(url) {
     const response = await fetch(url, {
         headers: {
             Accept: "application/vnd.github+json",
             "User-Agent": "BugPilot-AI"
         },
         signal: AbortSignal.timeout(12000)
     });

     return {
         ok: response.ok,
         status: response.status,
         data: await response.json().catch(() => null)
     };
 }

 // ==========================================
 // 4. VIEW IMPORTED ISSUES
 // GET /api/github/issues
 // ADMIN AND USER
 // ==========================================

 router.get(
     "/issues",
     requireRole("admin", "user"),
     async (req, res, next) => {
         try {
             const [rows] = await pool.execute(`
                 SELECT
                     import_id,
                     github_issue_id,
                     repo_owner,
                     repo_name,
                     issue_number,
                     title,
                     body,
                     state,
                     issue_url,
                     github_created_at,
                     github_updated_at,
                     imported_at
                 FROM github_imported_issues
                 ORDER BY imported_at DESC, import_id DESC
                 LIMIT 100
             `);

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

 // ==========================================
 // 5. IMPORT AND SYNC ISSUES
 // POST /api/github/import
 // ADMIN AND USER
 // ==========================================

 router.post(
     "/import",
     requireRole("admin", "user"),
     importLimiter,
     async (req, res, next) => {

         const { owner, repo } = req.body || {};

         if (!validOwner(owner) || !validRepo(repo)) {
             return res.status(400).json({
                 success: false,
                 message:
                     "Enter a valid GitHub owner and repository."
             });
         }

         const base =
             "https://api.github.com/repos/" +
             `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

         try {

             // ==================================
             // 6. VERIFY PUBLIC REPOSITORY
             // ==================================

             const metadata = await githubGet(base);

             if (metadata.status === 404) {
                 return res.status(404).json({
                     success: false,
                     message: "Public GitHub repository not found."
                 });
             }

             if (!metadata.ok) {
                 return res.status(
                     [403, 429].includes(metadata.status)
                         ? 429
                         : 502
                 ).json({
                     success: false,
                     message:
                         "GitHub could not verify this repository."
                 });
             }

             if (
                 metadata.data?.private !== false ||
                 metadata.data?.visibility !== "public" ||
                 !metadata.data?.owner?.login ||
                 !metadata.data?.name
             ) {
                 return res.status(403).json({
                     success: false,
                     message:
                         "Only public GitHub repositories are allowed."
                 });
             }

             // ==================================
             // 7. FETCH OPEN AND CLOSED ISSUES
             // ==================================

             // state=all allows us to detect
             // which GitHub issues have been closed.
             //
             // This checks up to 100 recently
             // updated issues per import.

             const fetched = await githubGet(
                 `${base}/issues` +
                 "?state=all" +
                 "&sort=updated" +
                 "&direction=desc" +
                 "&per_page=100"
             );

             if (
                 !fetched.ok ||
                 !Array.isArray(fetched.data)
             ) {
                 return res.status(
                     [403, 429].includes(fetched.status)
                         ? 429
                         : 502
                 ).json({
                     success: false,
                     message: "Failed to fetch GitHub issues."
                 });
             }

             // GitHub's Issues API also returns
             // pull requests. Exclude those.

             const issues = fetched.data.filter(issue =>
                 !issue.pull_request &&
                 Number.isSafeInteger(issue.id) &&
                 issue.id > 0 &&
                 Number.isSafeInteger(issue.number) &&
                 ["open", "closed"].includes(issue.state)
             );

             const canonicalOwner =
                 metadata.data.owner.login;

             const canonicalRepo =
                 metadata.data.name;

             const connection =
                 await pool.getConnection();

             let saved = 0;
             let deleted = 0;

             // ==================================
             // 8. SYNCHRONIZE MYSQL
             // ==================================

             try {
                 await connection.beginTransaction();

                 for (const issue of issues) {

                     // ==========================
                     // CLOSED -> PERMANENT DELETE
                     // ==========================

                     if (issue.state === "closed") {

                         const [result] =
                             await connection.execute(
                                 `DELETE
                                  FROM github_imported_issues
                                  WHERE github_issue_id = ?`,
                                 [String(issue.id)]
                             );

                         deleted += result.affectedRows;

                         // Do NOT import closed issues.
                         continue;
                     }

                     // ==========================
                     // OPEN -> INSERT OR UPDATE
                     // ==========================

                     await connection.execute(
                         `INSERT INTO github_imported_issues (
                             github_issue_id,
                             repo_owner,
                             repo_name,
                             issue_number,
                             title,
                             body,
                             state,
                             issue_url,
                             github_created_at,
                             github_updated_at
                         )
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

                         ON DUPLICATE KEY UPDATE
                             repo_owner = VALUES(repo_owner),
                             repo_name = VALUES(repo_name),
                             issue_number = VALUES(issue_number),
                             title = VALUES(title),
                             body = VALUES(body),
                             state = VALUES(state),
                             issue_url = VALUES(issue_url),
                             github_created_at =
                                 VALUES(github_created_at),
                             github_updated_at =
                                 VALUES(github_updated_at)`,
                         [
                             String(issue.id),
                             canonicalOwner,
                             canonicalRepo,
                             issue.number,
                             String(
                                 issue.title || "Untitled"
                             ).slice(0, 500),
                             issue.body == null
                                 ? null
                                 : String(issue.body),
                             "open",
                             String(
                                 issue.html_url || ""
                             ).slice(0, 1000),
                             mysqlDatetime(issue.created_at),
                             mysqlDatetime(issue.updated_at)
                         ]
                     );

                     saved++;
                 }

                 // Commit all changes permanently.
                 await connection.commit();

             } catch (error) {

                 // If anything fails, undo the
                 // incomplete transaction.
                 await connection.rollback();
                 throw error;

             } finally {
                 connection.release();
             }

             // ==================================
             // 9. SUCCESS RESPONSE
             // ==================================

             return res.json({
                 success: true,
                 message:
                     "GitHub sync completed. Closed issues deleted from BugPilot.",

                 repository:
                     `${canonicalOwner}/${canonicalRepo}`,

                 visibility: "public",

                 fetched: fetched.data.length,

                 imported: saved,

                 saved,

                 deleted
             });

         } catch (error) {

             if (
                 ["TimeoutError", "AbortError"]
                     .includes(error.name)
             ) {
                 return res.status(504).json({
                     success: false,
                     message:
                         "GitHub timed out. Please try again."
                 });
             }

             next(error);
         }
     }
 );

 // ==========================================
 // EXPORT ROUTER
 // ==========================================

 module.exports = router;
