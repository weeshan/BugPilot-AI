-- ============================================================
-- BUGPILOT AI V2 - COMPLETE DATABASE SETUP
-- SOFE 3700U - Data Management Systems
--
-- Includes:
--   7 original Phase II tables
--   2 Phase III tables
--   88 fictional sample records
--   10 SQL reporting views
--   GitHub authentication
--   GitHub user ID
--   GitHub account username
--   GitHub issue author username
--   Conditional database migration
--
-- FOR NEW / EMPTY DATABASES ONLY!
-- Do not execute the entire file on an existing populated DB.
-- No user passwords or active sessions are included.
-- ============================================================

CREATE DATABASE IF NOT EXISTS bug_tracking_phase2
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bug_tracking_phase2;


-- ============================================================
-- PART A: DATABASE TABLES
-- ============================================================

-- TABLE 1: DEVELOPERS

CREATE TABLE IF NOT EXISTS developers (
    developer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    expertise VARCHAR(80) NOT NULL,
    joined_on DATE NOT NULL
) ENGINE=InnoDB;


-- ============================================================
-- TABLE 2: PROJECTS
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    project_name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    repository_url VARCHAR(255) UNIQUE,
    owner_id INT NOT NULL,
    created_on DATE NOT NULL,

    CONSTRAINT fk_project_owner
        FOREIGN KEY (owner_id)
        REFERENCES developers(developer_id)
) ENGINE=InnoDB;


-- ============================================================
-- TABLE 3: ISSUES
-- ============================================================

CREATE TABLE IF NOT EXISTS issues (
    issue_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    reporter_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL,
    status VARCHAR(12) NOT NULL,
    reported_on DATE NOT NULL,
    resolved_on DATE,

    CONSTRAINT fk_issue_project
        FOREIGN KEY (project_id)
        REFERENCES projects(project_id),

    CONSTRAINT fk_issue_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES developers(developer_id),

    CONSTRAINT chk_issue_severity
        CHECK (
            severity IN (
                'Low',
                'Medium',
                'High',
                'Critical'
            )
        ),

    CONSTRAINT chk_issue_status
        CHECK (
            status IN (
                'Open',
                'In Progress',
                'Resolved',
                'Closed'
            )
        )
) ENGINE=InnoDB;


-- ============================================================
-- TABLE 4: SOLUTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS solutions (
    solution_id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL,
    author_id INT NOT NULL,
    solution_text TEXT NOT NULL,
    is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    created_on DATE NOT NULL,

    CONSTRAINT fk_solution_issue
        FOREIGN KEY (issue_id)
        REFERENCES issues(issue_id),

    CONSTRAINT fk_solution_author
        FOREIGN KEY (author_id)
        REFERENCES developers(developer_id)
) ENGINE=InnoDB;


-- ============================================================
-- TABLE 5: DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    document_type VARCHAR(20) NOT NULL,
    content_excerpt TEXT NOT NULL,
    source_url VARCHAR(255),
    added_on DATE NOT NULL,

    CONSTRAINT fk_document_project
        FOREIGN KEY (project_id)
        REFERENCES projects(project_id),

    CONSTRAINT chk_document_type
        CHECK (
            document_type IN (
                'README',
                'API Guide',
                'Runbook',
                'Tutorial',
                'Log'
            )
        )
) ENGINE=InnoDB;


-- ============================================================
-- TABLE 6: ISSUE_DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS issue_documents (
    issue_id INT NOT NULL,
    document_id INT NOT NULL,
    relevance_note VARCHAR(200) NOT NULL,
    linked_on DATE NOT NULL,

    CONSTRAINT pk_issue_documents
        PRIMARY KEY (issue_id, document_id),

    CONSTRAINT fk_issue_document_issue
        FOREIGN KEY (issue_id)
        REFERENCES issues(issue_id),

    CONSTRAINT fk_issue_document_document
        FOREIGN KEY (document_id)
        REFERENCES documents(document_id)
) ENGINE=InnoDB;


-- ============================================================
-- TABLE 7: ISSUE_ASSIGNMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS issue_assignments (
    issue_id INT NOT NULL,
    developer_id INT NOT NULL,
    assigned_on DATE NOT NULL,
    role VARCHAR(15) NOT NULL,

    CONSTRAINT pk_issue_assignments
        PRIMARY KEY (issue_id, developer_id),

    CONSTRAINT fk_assignment_issue
        FOREIGN KEY (issue_id)
        REFERENCES issues(issue_id),

    CONSTRAINT fk_assignment_developer
        FOREIGN KEY (developer_id)
        REFERENCES developers(developer_id),

    CONSTRAINT chk_assignment_role
        CHECK (
            role IN (
                'Lead',
                'Contributor',
                'Reviewer'
            )
        )
) ENGINE=InnoDB;


-- ============================================================
-- PHASE III: AUTHENTICATION
-- ============================================================

-- TABLE 8: APP_USERS
--
-- Starts empty.
-- New users register through BugPilot AI.
-- Admins are provisioned separately.
--
-- Supports:
--   Local username/password authentication
--   GitHub authentication
--   Admin, User and Guest roles
--   GitHub username display
--   Unique GitHub account linking

CREATE TABLE IF NOT EXISTS app_users (
    user_id INT NOT NULL AUTO_INCREMENT,

    username VARCHAR(50) NOT NULL,

    email VARCHAR(255) NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    role ENUM('admin', 'user', 'guest')
        NOT NULL DEFAULT 'user',

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    github_user_id BIGINT UNSIGNED NULL,

    github_username VARCHAR(39) NULL,

    PRIMARY KEY (user_id),

    UNIQUE KEY uq_app_username (username),

    UNIQUE KEY uq_app_email (email),

    UNIQUE KEY uq_github_user_id (github_user_id)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- PHASE III: GITHUB REST API INTEGRATION
-- ============================================================

-- TABLE 9: GITHUB_IMPORTED_ISSUES
--
-- Starts empty.
-- Open public GitHub issues are imported through BugPilot.
-- Closed issues are deleted when detected during import/sync.
-- GitHub username identifies the original issue author.
-- Duplicate GitHub issues are updated instead of duplicated.

CREATE TABLE IF NOT EXISTS github_imported_issues (
    import_id BIGINT UNSIGNED
        AUTO_INCREMENT PRIMARY KEY,

    github_issue_id BIGINT UNSIGNED NOT NULL,

    repo_owner VARCHAR(100) NOT NULL,

    repo_name VARCHAR(100) NOT NULL,

    issue_number INT UNSIGNED NOT NULL,

    title VARCHAR(500) NOT NULL,

    -- GitHub username of the original issue author.

    github_username VARCHAR(39) NULL,

    body LONGTEXT,

    state ENUM('open', 'closed') NOT NULL,

    issue_url VARCHAR(1000) NOT NULL,

    github_created_at DATETIME,

    github_updated_at DATETIME,

    imported_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY unique_github_issue (github_issue_id),

    INDEX idx_repository (repo_owner, repo_name)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- PHASE III: GITHUB DATABASE MIGRATION
-- ============================================================
--
-- This section can be executed separately on an existing
-- BugPilot AI database.
--
-- Checks whether columns already exist before adding them.
-- Prevents duplicate-column errors on the expected schema.
-- Preserves existing users, passwords and imported issues.
--
-- Existing non-NULL GitHub user IDs must be unique.
-- ============================================================

USE bug_tracking_phase2;


-- ============================================================
-- MIGRATION 1: ADD GITHUB USER ID TO APP_USERS
-- ============================================================

SET @github_ddl = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'app_users'
          AND COLUMN_NAME = 'github_user_id'
    ),

    'SELECT ''app_users.github_user_id already exists'' AS migration_status',

    'ALTER TABLE app_users
     ADD COLUMN github_user_id BIGINT UNSIGNED NULL'
);

PREPARE github_stmt FROM @github_ddl;

EXECUTE github_stmt;

DEALLOCATE PREPARE github_stmt;


-- ============================================================
-- MIGRATION 2: ADD GITHUB USERNAME TO APP_USERS
-- ============================================================

SET @github_ddl = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'app_users'
          AND COLUMN_NAME = 'github_username'
    ),

    'SELECT ''app_users.github_username already exists'' AS migration_status',

    'ALTER TABLE app_users
     ADD COLUMN github_username VARCHAR(39) NULL'
);

PREPARE github_stmt FROM @github_ddl;

EXECUTE github_stmt;

DEALLOCATE PREPARE github_stmt;


-- ============================================================
-- MIGRATION 3: ADD UNIQUE GITHUB USER ID CONSTRAINT
-- ============================================================

SET @github_ddl = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'app_users'
          AND INDEX_NAME = 'uq_github_user_id'
    ),

    'SELECT ''uq_github_user_id already exists'' AS migration_status',

    'ALTER TABLE app_users
     ADD UNIQUE KEY uq_github_user_id (github_user_id)'
);

PREPARE github_stmt FROM @github_ddl;

EXECUTE github_stmt;

DEALLOCATE PREPARE github_stmt;


-- ============================================================
-- MIGRATION 4: ADD GITHUB ISSUE AUTHOR USERNAME
-- ============================================================

SET @github_ddl = IF(
    EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'github_imported_issues'
          AND COLUMN_NAME = 'github_username'
    ),

    'SELECT ''github_imported_issues.github_username already exists'' AS migration_status',

    'ALTER TABLE github_imported_issues
     ADD COLUMN github_username VARCHAR(39) NULL AFTER title'
);

PREPARE github_stmt FROM @github_ddl;

EXECUTE github_stmt;

DEALLOCATE PREPARE github_stmt;


-- ============================================================
-- MIGRATION 5: VERIFY GITHUB DATABASE STRUCTURE
-- ============================================================

SET @github_ddl = NULL;

DESCRIBE app_users;

DESCRIBE github_imported_issues;

SHOW INDEX FROM app_users
WHERE Key_name = 'uq_github_user_id';


-- ============================================================
-- END OF GITHUB DATABASE MIGRATION
-- ============================================================


-- ============================================================
-- PART B: SAMPLE DATA
-- ============================================================
--
-- Fictional demonstration records from Phase II.
-- Run these INSERT statements only once.
-- ============================================================


-- ============================================================
-- DEVELOPERS (8 ROWS)
-- ============================================================

INSERT INTO developers
(developer_id, full_name, email, expertise, joined_on)
VALUES

(1, 'Ava Patel', 'ava.patel@example.com',
 'Backend Development', '2025-01-15'),

(2, 'Liam Chen', 'liam.chen@example.com',
 'Frontend Development', '2025-03-10'),

(3, 'Sofia Martinez', 'sofia.martinez@example.com',
 'Quality Assurance', '2025-05-06'),

(4, 'Noah Ibrahim', 'noah.ibrahim@example.com',
 'DevOps', '2025-06-23'),

(5, 'Emma Wilson', 'emma.wilson@example.com',
 'Mobile Development', '2025-08-12'),

(6, 'Oliver Brooks', 'oliver.brooks@example.com',
 'Security', '2025-09-03'),

(7, 'Mia Nguyen', 'mia.nguyen@example.com',
 'Database Development', '2026-01-19'),

(8, 'Ethan Clarke', 'ethan.clarke@example.com',
 'Technical Documentation', '2026-04-14');


-- ============================================================
-- PROJECTS (7 ROWS)
-- ============================================================

INSERT INTO projects
(project_id, project_name, description,
 repository_url, owner_id, created_on)
VALUES

(1, 'Nova Web Portal',
 'Customer-facing account and profile portal.',
 'https://example.org/repos/nova-web',
 1, '2025-02-01'),

(2, 'Helios Mobile App',
 'Mobile app for customer notifications and account activity.',
 'https://example.org/repos/helios-mobile',
 5, '2025-09-05'),

(3, 'Atlas Inventory API',
 'Backend service for products, warehouse stock and inventory updates.',
 'https://example.org/repos/atlas-inventory',
 7, '2026-02-15'),

(4, 'Orion Payment Service',
 'Backend service for payments and transaction processing.',
 'https://example.org/repos/orion-payments',
 6, '2026-03-20'),

(5, 'Beacon Analytics Dashboard',
 'Visual dashboard for operational reports and metrics.',
 'https://example.org/repos/beacon-analytics',
 7, '2026-05-11'),

(6, 'Nimbus DevOps Toolkit',
 'CI/CD utilities for building and deploying services.',
 'https://example.org/repos/nimbus-devops',
 4, '2026-06-06'),

(7, 'Quartz Documentation Hub',
 'Internal project documentation and knowledge portal.',
 'https://example.org/repos/quartz-docs',
 8, '2026-10-01');


-- ============================================================
-- ISSUES (17 ROWS)
-- ============================================================

INSERT INTO issues
(issue_id, project_id, reporter_id, title,
 description, severity, status, reported_on, resolved_on)
VALUES

(1, 1, 3,
 'Login fails after password reset',
 'Valid users cannot sign in after changing their passwords.',
 'Critical', 'Open', '2026-10-20', NULL),

(2, 1, 2,
 'Login page takes too long to load',
 'Login page load time exceeds eight seconds on slower devices.',
 'Low', 'In Progress', '2026-10-22', NULL),

(3, 1, 1,
 'Dark mode button does not work',
 'Theme toggle does not update navigation colours.',
 'Low', 'Resolved', '2026-09-28', '2026-10-02'),

(4, 1, 3,
 'Search results contain duplicates',
 'Applying a filter occasionally returns the same profile twice.',
 'Medium', 'Closed', '2026-09-11', '2026-09-20'),

(5, 1, 2,
 'Profile image upload times out',
 'Large profile images cause a request timeout during upload.',
 'Medium', 'In Progress', '2026-10-28', NULL),

(6, 1, 6,
 'Password reset email has broken link',
 'Reset link contains an incorrect URL encoding sequence.',
 'High', 'Resolved', '2026-10-10', '2026-10-17'),

(7, 2, 5,
 'App crashes on first launch',
 'Application terminates during first-time initialization on Android.',
 'Critical', 'In Progress', '2026-10-12', NULL),

(8, 2, 3,
 'Push notifications not delivered',
 'Notification service fails to deliver alerts to some devices.',
 'High', 'Open', '2026-10-25', NULL),

(9, 2, 5,
 'Offline cache contains outdated data',
 'Cached account information is not refreshed after reconnection.',
 'Medium', 'Resolved', '2026-09-30', '2026-10-06'),

(10, 2, 5,
 'Background sync drains battery',
 'Sync task stays active after data synchronization completes.',
 'Low', 'Closed', '2026-09-15', '2026-09-22'),

(11, 3, 7,
 'Inventory quantity becomes negative',
 'Concurrent orders can reduce stock below zero.',
 'High', 'Open', '2026-10-18', NULL),

(12, 3, 1,
 'Products endpoint returns server error',
 'Invalid product filters trigger HTTP 500 instead of a validation error.',
 'Medium', 'Resolved', '2026-10-03', '2026-10-07'),

(13, 3, 3,
 'Pagination skips inventory records',
 'The second page of results misses rows when sorting by price.',
 'Medium', 'In Progress', '2026-10-29', NULL),

(14, 4, 6,
 'Duplicate payment transactions occur',
 'Repeated requests can create duplicate payment entries.',
 'Critical', 'Open', '2026-10-30', NULL),

(15, 4, 4,
 'Payment webhook is processed late',
 'Webhook handler sometimes waits too long before updating payment state.',
 'High', 'Resolved', '2026-09-19', '2026-09-23'),

(16, 5, 8,
 'Chart tooltip shows incorrect total',
 'Dashboard tooltip displays the prior day value.',
 'Low', 'Open', '2026-11-01', NULL),

(17, 6, 4,
 'Deployment pipeline fails at publish step',
 'CI job cannot publish the build artifact after tests pass.',
 'High', 'In Progress', '2026-11-02', NULL);


-- ============================================================
-- SOLUTIONS (12 ROWS)
-- ============================================================

INSERT INTO solutions
(solution_id, issue_id, author_id,
 solution_text, is_accepted, created_on)
VALUES

(1, 3, 2,
 'Corrected the dark-mode state binding in the navigation component.',
 TRUE, '2026-10-01'),

(2, 4, 1,
 'Applied DISTINCT to the profile query and fixed duplicate join paths.',
 TRUE, '2026-09-19'),

(3, 6, 6,
 'Encoded reset tokens properly and verified the email template URL.',
 TRUE, '2026-10-16'),

(4, 9, 5,
 'Invalidated the cached account record after the device reconnects.',
 TRUE, '2026-10-05'),

(5, 10, 5,
 'Stopped the background worker after synchronization completes.',
 TRUE, '2026-09-21'),

(6, 12, 1,
 'Added validation for unsupported product filters and returned HTTP 400.',
 TRUE, '2026-10-06'),

(7, 15, 4,
 'Moved webhook processing into a dedicated queue worker.',
 TRUE, '2026-09-22'),

(8, 1, 1,
 'Proposed refreshing login tokens after the password reset flow.',
 FALSE, '2026-10-21'),

(9, 2, 2,
 'Proposed lazy-loading images and deferred scripts on the login page.',
 FALSE, '2026-10-23'),

(10, 7, 5,
 'Investigating missing permissions during first-launch initialization.',
 FALSE, '2026-10-13'),

(11, 11, 7,
 'Testing row-level locking during concurrent inventory updates.',
 FALSE, '2026-10-19'),

(12, 13, 3,
 'Testing stable sorting by both price and product ID.',
 FALSE, '2026-10-31');


-- ============================================================
-- DOCUMENTS (10 ROWS)
-- ============================================================

INSERT INTO documents
(document_id, project_id, title, document_type,
 content_excerpt, source_url, added_on)
VALUES

(1, 1, 'Nova Setup Guide', 'README',
 'Setup steps for the web portal and local test environment.',
 'https://example.org/docs/nova-readme',
 '2026-08-01'),

(2, 1, 'Nova Authentication API', 'API Guide',
 'Authentication endpoints and token reset contract.',
 'https://example.org/docs/nova-auth',
 '2026-08-02'),

(3, 1, 'Nova Incident Runbook', 'Runbook',
 'Troubleshooting steps for login timeouts and authentication failures.',
 'https://example.org/docs/nova-runbook',
 '2026-08-03'),

(4, 2, 'Helios Mobile README', 'README',
 'Build configuration and first-launch setup instructions.',
 'https://example.org/docs/helios-readme',
 '2026-08-04'),

(5, 2, 'Helios Notification Tutorial', 'Tutorial',
 'Notification registration and delivery workflows.',
 'https://example.org/docs/helios-notifications',
 '2026-08-05'),

(6, 3, 'Atlas Inventory API Guide', 'API Guide',
 'Stock update endpoints, validation rules and pagination.',
 'https://example.org/docs/atlas-api',
 '2026-08-06'),

(7, 3, 'Atlas Error Handling Runbook', 'Runbook',
 'How to diagnose API errors and database exceptions.',
 'https://example.org/docs/atlas-errors',
 '2026-08-07'),

(8, 4, 'Orion Transaction Failure Log', 'Log',
 'Representative log events for failed and repeated transactions.',
 'https://example.org/docs/orion-log',
 '2026-08-08'),

(9, 4, 'Orion Webhook API Guide', 'API Guide',
 'Payment endpoints, callbacks and idempotency behaviour.',
 'https://example.org/docs/orion-api',
 '2026-08-09'),

(10, 5, 'Beacon Reporting Tutorial', 'Tutorial',
 'Chart configuration and daily reporting workflows.',
 'https://example.org/docs/beacon-tutorial',
 '2026-08-11');


-- ============================================================
-- ISSUE_DOCUMENTS (15 ROWS)
-- ============================================================

INSERT INTO issue_documents
(issue_id, document_id, relevance_note, linked_on)
VALUES

(1, 2,
 'Authentication endpoint reference for password reset failures.',
 '2026-10-20'),

(2, 1,
 'Frontend setup and performance testing steps.',
 '2026-10-22'),

(2, 3,
 'Performance incident troubleshooting checklist.',
 '2026-10-23'),

(3, 1,
 'Theme configuration documented in the setup guide.',
 '2026-09-28'),

(5, 3,
 'Timeout troubleshooting and error logging instructions.',
 '2026-10-28'),

(6, 2,
 'Password reset API contract and URL format.',
 '2026-10-10'),

(7, 4,
 'Mobile build configuration and first-launch initialization.',
 '2026-10-12'),

(8, 5,
 'Notification registration and delivery troubleshooting.',
 '2026-10-25'),

(9, 4,
 'Cache setup in the mobile app configuration.',
 '2026-09-30'),

(11, 6,
 'Inventory stock update and validation endpoint reference.',
 '2026-10-18'),

(12, 7,
 'API error-response troubleshooting steps.',
 '2026-10-03'),

(13, 6,
 'Pagination parameters and product listing API.',
 '2026-10-29'),

(14, 8,
 'Duplicate transaction logs for diagnosis.',
 '2026-10-30'),

(15, 9,
 'Webhook callbacks and payment status documentation.',
 '2026-09-19'),

(16, 10,
 'Daily chart configuration and reporting tutorial.',
 '2026-11-01');


-- ============================================================
-- ISSUE_ASSIGNMENTS (19 ROWS)
-- ============================================================

INSERT INTO issue_assignments
(issue_id, developer_id, assigned_on, role)
VALUES

(1, 1, '2026-10-20', 'Lead'),
(1, 6, '2026-10-21', 'Reviewer'),

(2, 2, '2026-10-22', 'Lead'),
(2, 1, '2026-10-23', 'Contributor'),

(3, 2, '2026-09-28', 'Contributor'),

(4, 1, '2026-09-12', 'Lead'),

(5, 2, '2026-10-28', 'Lead'),

(6, 6, '2026-10-10', 'Lead'),

(7, 5, '2026-10-12', 'Lead'),
(7, 4, '2026-10-13', 'Contributor'),

(8, 5, '2026-10-25', 'Contributor'),

(9, 5, '2026-09-30', 'Lead'),

(11, 7, '2026-10-18', 'Lead'),

(12, 1, '2026-10-03', 'Lead'),

(13, 7, '2026-10-29', 'Contributor'),

(14, 6, '2026-10-30', 'Lead'),

(15, 4, '2026-09-19', 'Reviewer'),

(16, 7, '2026-11-01', 'Reviewer'),

(17, 4, '2026-11-02', 'Lead');


-- ============================================================
-- PART C: THE 10 SQL REPORTING VIEWS
-- ============================================================


-- ============================================================
-- VIEW 1: ISSUE DETAILS
-- ============================================================

CREATE OR REPLACE VIEW view_issue_details AS

SELECT
    i.issue_id,
    i.title AS issue_title,
    i.description AS issue_description,
    i.severity,
    i.status,
    i.reported_on,
    p.project_name,
    reporter.full_name AS reported_by,
    assigned.full_name AS assigned_developer,
    ia.role AS assignment_role

FROM issues i

INNER JOIN projects p
    ON i.project_id = p.project_id

INNER JOIN developers reporter
    ON i.reporter_id = reporter.developer_id

LEFT JOIN issue_assignments ia
    ON i.issue_id = ia.issue_id

LEFT JOIN developers assigned
    ON ia.developer_id = assigned.developer_id;


-- ============================================================
-- VIEW 2: PROJECTS ABOVE AVERAGE ISSUE COUNT
-- ============================================================

CREATE OR REPLACE VIEW view_projects_above_avg_issues AS

SELECT
    p.project_id,
    p.project_name,
    COUNT(i.issue_id) AS total_issues

FROM projects p

LEFT JOIN issues i
    ON p.project_id = i.project_id

GROUP BY
    p.project_id,
    p.project_name

HAVING COUNT(i.issue_id) > ALL (

    SELECT AVG(project_issue_count)

    FROM (

        SELECT
            COUNT(i2.issue_id) AS project_issue_count

        FROM projects p2

        LEFT JOIN issues i2
            ON p2.project_id = i2.project_id

        GROUP BY p2.project_id

    ) AS project_counts

);


-- ============================================================
-- VIEW 3: DEVELOPERS WITH SOLUTIONS
-- ============================================================

CREATE OR REPLACE VIEW view_developers_with_solutions AS

SELECT
    d.developer_id,
    d.full_name,
    d.email,
    d.expertise,
    d.joined_on

FROM developers d

WHERE EXISTS (

    SELECT 1

    FROM solutions s

    WHERE s.author_id = d.developer_id

);


-- ============================================================
-- VIEW 4: PROJECTS AND DOCUMENTS
-- ============================================================

CREATE OR REPLACE VIEW view_projects_and_documents AS

SELECT
    p.project_id,
    p.project_name,
    d.document_id,
    d.title AS document_title,
    d.document_type,
    d.source_url

FROM projects p

LEFT JOIN documents d
    ON p.project_id = d.project_id

UNION

SELECT
    p.project_id,
    p.project_name,
    d.document_id,
    d.title AS document_title,
    d.document_type,
    d.source_url

FROM projects p

RIGHT JOIN documents d
    ON p.project_id = d.project_id;


-- ============================================================
-- VIEW 5: ACTIVE DEVELOPERS
-- ============================================================

CREATE OR REPLACE VIEW view_active_developers AS

SELECT
    d.developer_id,
    d.full_name,
    d.email,
    d.expertise

FROM developers d

WHERE d.developer_id IN (

    SELECT reporter_id
    FROM issues

    UNION

    SELECT author_id
    FROM solutions

);


-- ============================================================
-- VIEW 6: URGENT ISSUES
-- ============================================================

CREATE OR REPLACE VIEW view_urgent_issues AS

SELECT
    i.issue_id,
    i.title AS issue_title,
    i.description,
    i.severity,
    i.status,
    i.reported_on,
    p.project_name

FROM issues i

INNER JOIN projects p
    ON i.project_id = p.project_id

WHERE i.severity IN ('High', 'Critical')

  AND i.status IN ('Open', 'In Progress');


-- ============================================================
-- VIEW 7: ACCEPTED SOLUTIONS
-- ============================================================

CREATE OR REPLACE VIEW view_accepted_solutions AS

SELECT
    s.solution_id,
    i.issue_id,
    i.title AS issue_title,
    i.severity,
    i.status,
    p.project_name,
    s.solution_text,
    d.full_name AS solution_author,
    s.created_on AS solution_date

FROM solutions s

INNER JOIN issues i
    ON s.issue_id = i.issue_id

INNER JOIN projects p
    ON i.project_id = p.project_id

INNER JOIN developers d
    ON s.author_id = d.developer_id

WHERE s.is_accepted = TRUE;


-- ============================================================
-- VIEW 8: DEVELOPER WORKLOAD
-- ============================================================

CREATE OR REPLACE VIEW view_developer_workload AS

SELECT
    d.developer_id,
    d.full_name,
    d.expertise,

    COUNT(i.issue_id) AS total_assigned_issues,

    SUM(
        CASE
            WHEN i.status IN ('Open', 'In Progress')
            THEN 1 ELSE 0
        END
    ) AS active_issues,

    SUM(
        CASE
            WHEN ia.role = 'Lead'
            THEN 1 ELSE 0
        END
    ) AS lead_assignments,

    SUM(
        CASE
            WHEN ia.role = 'Contributor'
            THEN 1 ELSE 0
        END
    ) AS contributor_assignments,

    SUM(
        CASE
            WHEN ia.role = 'Reviewer'
            THEN 1 ELSE 0
        END
    ) AS reviewer_assignments

FROM developers d

LEFT JOIN issue_assignments ia
    ON d.developer_id = ia.developer_id

LEFT JOIN issues i
    ON ia.issue_id = i.issue_id

GROUP BY
    d.developer_id,
    d.full_name,
    d.expertise;


-- ============================================================
-- VIEW 9: ISSUE DOCUMENTATION
-- ============================================================

CREATE OR REPLACE VIEW view_issue_documentation AS

SELECT
    i.issue_id,
    i.title AS issue_title,
    i.severity,
    i.status,
    d.document_id,
    d.title AS document_title,
    d.document_type,
    d.source_url,
    idoc.relevance_note,
    idoc.linked_on

FROM issues i

INNER JOIN issue_documents idoc
    ON i.issue_id = idoc.issue_id

INNER JOIN documents d
    ON idoc.document_id = d.document_id;


-- ============================================================
-- VIEW 10: PROJECT ISSUE STATISTICS
-- ============================================================

CREATE OR REPLACE VIEW view_project_issue_statistics AS

SELECT
    p.project_id,
    p.project_name,

    COUNT(i.issue_id) AS total_issues,

    SUM(
        CASE
            WHEN i.status = 'Open'
            THEN 1 ELSE 0
        END
    ) AS open_issues,

    SUM(
        CASE
            WHEN i.status = 'In Progress'
            THEN 1 ELSE 0
        END
    ) AS in_progress_issues,

    SUM(
        CASE
            WHEN i.status = 'Resolved'
            THEN 1 ELSE 0
        END
    ) AS resolved_issues,

    SUM(
        CASE
            WHEN i.status = 'Closed'
            THEN 1 ELSE 0
        END
    ) AS closed_issues,

    SUM(
        CASE
            WHEN i.severity = 'Critical'
            THEN 1 ELSE 0
        END
    ) AS critical_issues

FROM projects p

LEFT JOIN issues i
    ON p.project_id = i.project_id

GROUP BY
    p.project_id,
    p.project_name;


-- ============================================================
-- PART D: VERIFY DATABASE SETUP
-- ============================================================

USE bug_tracking_phase2;


-- ============================================================
-- 1. SHOW DATABASE TABLES
-- ============================================================

SHOW TABLES;


-- ============================================================
-- 2. VERIFY SAMPLE DATA
-- ============================================================

SELECT COUNT(*) AS developers_count
FROM developers;

SELECT COUNT(*) AS projects_count
FROM projects;

SELECT COUNT(*) AS issues_count
FROM issues;

SELECT COUNT(*) AS solutions_count
FROM solutions;

SELECT COUNT(*) AS documents_count
FROM documents;

SELECT COUNT(*) AS linked_documents_count
FROM issue_documents;

SELECT COUNT(*) AS assignments_count
FROM issue_assignments;

SELECT COUNT(*) AS app_accounts_count
FROM app_users;

SELECT COUNT(*) AS imported_github_count
FROM github_imported_issues;


-- ============================================================
-- 3. VERIFY GITHUB AUTHENTICATION
-- ============================================================

DESCRIBE app_users;

SELECT
    user_id,
    username,
    github_user_id,
    github_username,
    role,
    is_active,
    created_at

FROM app_users

ORDER BY user_id;


-- ============================================================
-- 4. VERIFY GITHUB ISSUE IMPORTS
-- ============================================================

DESCRIBE github_imported_issues;

SELECT
    import_id,
    github_issue_id,
    repo_owner,
    repo_name,
    issue_number,
    title,
    github_username,
    state,
    issue_url,
    github_created_at,
    github_updated_at,
    imported_at

FROM github_imported_issues

ORDER BY imported_at DESC, import_id DESC;


-- ============================================================
-- 5. VERIFY GITHUB UNIQUE CONSTRAINT
-- ============================================================

SHOW INDEX FROM app_users
WHERE Key_name = 'uq_github_user_id';


-- ============================================================
-- 6. VERIFY ALL TEN REPORTING VIEWS
-- ============================================================

SHOW FULL TABLES
WHERE Table_type = 'VIEW';

SELECT * FROM view_issue_details;

SELECT * FROM view_projects_above_avg_issues;

SELECT * FROM view_developers_with_solutions;

SELECT * FROM view_projects_and_documents;

SELECT * FROM view_active_developers;

SELECT * FROM view_urgent_issues;

SELECT * FROM view_accepted_solutions;

SELECT * FROM view_developer_workload;

SELECT * FROM view_issue_documentation;

SELECT * FROM view_project_issue_statistics;


-- ============================================================
-- END OF BUGPILOT AI V2 DATABASE SETUP
-- ============================================================
