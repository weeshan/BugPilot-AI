// ==========================================
// BUGPILOT AI - SHARED APP SHELL
// File: backend/public/js/layout.js
//
// Renders the sidebar, top bar and user menu around
// each page's existing content.
//
// Navigation is role-aware:
//   /admin      admin only
//   /dashboard  user only
//   /guest      guest only
//   /reports    admin and user
//   /github     admin and user
//
// User management lives on /admin (admin only).
//
// Usage:
//
//   const user = await BugPilotLayout.mount({
//       active: "dashboard",
//       // "dashboard" | "reports" | "github" | "users"
//
//       title: "Dashboard",
//       breadcrumb: ["Dashboard"],
//       subtitle: "Welcome back.",
//
//       search: {
//           placeholder: "Search issues",
//           onInput: value => { ... }
//       },
//
//       actions: [buttonElement],
//       user
//   });
//
// ==========================================

(function () {
    "use strict";

    // ==========================================
    // 1. ROLE DASHBOARD ROUTES
    // ==========================================

    const DASHBOARD_ROUTES = {
        admin: "/admin",
        user: "/dashboard",
        guest: "/guest"
    };

    // ==========================================
    // 2. SIDEBAR ICONS
    // ==========================================

    const ICON_PATHS = {

        dashboard:
            '<rect x="3" y="3" width="6" height="8" rx="1.5"/>' +
            '<rect x="11" y="3" width="6" height="5" rx="1.5"/>' +
            '<rect x="11" y="10" width="6" height="7" rx="1.5"/>' +
            '<rect x="3" y="13" width="6" height="4" rx="1.5"/>',

        reports:
            '<path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5H10z"/>' +
            '<path d="M12.5 2.9a7.5 7.5 0 0 1 4.6 4.6h-4.6z"/>',

        // NEW: GitHub Issues repository icon
        github:
            '<path d="M5.5 3h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>' +
            '<path d="M7 6.5h6M7 10h6M7 13.5h4"/>',

        users:
            '<circle cx="8" cy="7" r="3"/>' +
            '<path d="M2.5 17c.6-2.9 2.8-4.5 5.5-4.5s4.9 1.6 5.5 4.5"/>' +
            '<path d="M13 4.2a3 3 0 0 1 0 5.6M15.5 12.8c1 .7 1.7 2 2 3.7"/>',

        logout:
            '<path d="M13 14l4-4-4-4M17 10H8M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8"/>',

        search:
            '<circle cx="9" cy="9" r="5.5"/>' +
            '<path d="m17 17-3.9-3.9"/>',

        menu:
            '<path d="M3 5h14M3 10h14M3 15h14"/>',

        chevron:
            '<path d="m7.5 5 5 5-5 5"/>'
    };

    // ==========================================
    // 3. CREATE SVG ICON
    // ==========================================

    function icon(name) {

        const span = document.createElement("span");

        span.innerHTML =
            '<svg viewBox="0 0 20 20" ' +
            'fill="none" ' +
            'stroke="currentColor" ' +
            'stroke-width="1.67" ' +
            'stroke-linecap="round" ' +
            'stroke-linejoin="round" ' +
            'aria-hidden="true">' +
            ICON_PATHS[name] +
            "</svg>";

        return span.firstChild;
    }

    // ==========================================
    // 4. BRAND LOGO
    // ==========================================

    function brandMark() {

        const box = document.createElement("span");

        box.className = "brand-mark";

        box.innerHTML =
            '<svg viewBox="0 0 20 20" aria-hidden="true">' +
            '<ellipse cx="10" cy="11.5" rx="4.5" ry="5.5" fill="#7f56da"/>' +
            '<circle cx="10" cy="5" r="2.5" fill="#7f56da"/>' +
            '<path d="M10 7v10" stroke="#cecfd3" stroke-width="1.2"/>' +
            "</svg>";

        return box;
    }

    // ==========================================
    // 5. DOM HELPERS
    // ==========================================

    function el(tag, className, text) {

        const node = document.createElement(tag);

        if (className) {
            node.className = className;
        }

        if (text !== undefined && text !== null) {
            node.textContent = String(text);
        }

        return node;
    }

    function initials(name) {

        const parts = String(name || "?")
            .replace(/[_.-]+/g, " ")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!parts.length) {
            return "?";
        }

        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }

        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }

    function avatar(name, size) {

        const node = el(
            "span",
            "avatar" + (size === "sm" ? " sm" : ""),
            initials(name)
        );

        node.setAttribute("aria-hidden", "true");

        return node;
    }

    function roleBadge(role) {

        const safe =
            ["admin", "user", "guest"].includes(role)
                ? role
                : "guest";

        return el(
            "span",
            "badge role-" + safe,
            safe.charAt(0).toUpperCase() + safe.slice(1)
        );
    }

    // ==========================================
    // 6. ROLE-AWARE SIDEBAR NAVIGATION
    // ==========================================

    function navFor(role) {

        const items = [];

        // ==================================
        // DASHBOARD
        // Admin / User / Guest
        // ==================================

        if (DASHBOARD_ROUTES[role]) {

            items.push({
                id: "dashboard",
                label: "Dashboard",
                href: DASHBOARD_ROUTES[role],
                icon: "dashboard"
            });
        }

        // ==================================
        // REPORTS
        // Admin and User only
        // ==================================

        if (role === "admin" || role === "user") {

            items.push({
                id: "reports",
                label: "Reports",
                href: "/reports",
                icon: "reports"
            });

            // ==================================
            // NEW: GITHUB ISSUES
            // Admin and User only
            // ==================================

            items.push({
                id: "github",
                label: "GitHub Issues",
                href: "/github",
                icon: "github"
            });
        }

        // ==================================
        // ADMIN USER MANAGEMENT
        // Admin only
        // ==================================

        if (role === "admin") {

            items.push({
                id: "users",
                label: "User management",
                href: "/admin#adminPanel",
                icon: "users"
            });
        }

        return items;
    }

    // ==========================================
    // 7. FETCH CURRENT USER
    // ==========================================

    async function fetchUser() {

        const response = await fetch(
            "/api/auth/me",
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (response.status === 401) {

            window.location.replace("/login");

            throw new Error(
                "Your session has expired."
            );
        }

        const result = await response
            .json()
            .catch(() => ({}));

        if (!response.ok || !result.user) {

            throw new Error(
                result.message ||
                "Unable to load your account."
            );
        }

        return result.user;
    }

    // ==========================================
    // 8. LOGOUT
    // ==========================================

    async function logout(button) {

        if (button) {
            button.disabled = true;
        }

        try {

            const response = await fetch(
                "/api/auth/logout",
                {
                    method: "POST",
                    credentials: "same-origin"
                }
            );

            if (!response.ok) {
                throw new Error("Logout failed.");
            }

            window.location.replace("/login");

        } catch (error) {

            if (button) {
                button.disabled = false;
            }

            throw error;
        }
    }

    // ==========================================
    // 9. BUILD SIDEBAR
    // ==========================================

    function buildSidebar(user, active) {

        const aside = el("aside", "sidebar");

        aside.id = "appSidebar";

        // ==================================
        // BRAND
        // ==================================

        const brand = el("a", "brand");

        brand.href =
            DASHBOARD_ROUTES[user.role] || "/";

        brand.append(
            brandMark(),
            el("span", null, "BugPilot AI")
        );

        aside.appendChild(brand);

        // ==================================
        // NAVIGATION
        // ==================================

        const nav = el("nav", "nav");

        nav.setAttribute(
            "aria-label",
            "Main"
        );

        // Render every allowed navigation link.
        // GitHub Issues is automatically included
        // for Admin and Regular Users.

        for (const item of navFor(user.role)) {

            const link = el("a", "nav-item");

            link.href = item.href;

            link.dataset.nav = item.id;

            link.append(
                icon(item.icon),
                el("span", null, item.label)
            );

            // Highlight the active page.

            if (item.id === active) {

                link.setAttribute(
                    "aria-current",
                    "page"
                );
            }

            nav.appendChild(link);
        }

        aside.appendChild(nav);

        // ==================================
        // SIDEBAR FOOTER
        // ==================================

        const footer = el(
            "div",
            "sidebar-footer"
        );

        const card = el(
            "div",
            "user-card"
        );

        const who = el("div", "who");

        const name = el(
            "div",
            "name",
            user.username
        );

        name.id = "shellUsername";

        const roleRow = el(
            "div",
            "row"
        );

        roleRow.style.marginTop = "4px";

        const badge = roleBadge(user.role);

        badge.id = "shellRole";

        roleRow.appendChild(badge);

        who.append(
            name,
            roleRow
        );

        // ==================================
        // LOGOUT BUTTON
        // ==================================

        const logoutBtn = el(
            "button",
            "btn btn-ghost btn-icon btn-sm"
        );

        logoutBtn.type = "button";

        logoutBtn.id = "shellLogoutBtn";

        logoutBtn.title = "Log out";

        logoutBtn.setAttribute(
            "aria-label",
            "Log out"
        );

        logoutBtn.appendChild(
            icon("logout")
        );

        logoutBtn.addEventListener(
            "click",
            () => {

                logout(logoutBtn).catch(
                    error => window.alert(
                        error.message
                    )
                );
            }
        );

        card.append(
            avatar(user.username),
            who,
            logoutBtn
        );

        footer.appendChild(card);

        aside.appendChild(footer);

        return aside;
    }

    // ==========================================
    // 10. BUILD TOP BAR
    // ==========================================

    function buildTopbar(options, app) {

        const header = el(
            "header",
            "topbar"
        );

        // ==================================
        // BREADCRUMB
        // ==================================

        const crumbs =
            options.breadcrumb &&
            options.breadcrumb.length

                ? options.breadcrumb
                : [options.title];

        const breadcrumb = el(
            "nav",
            "breadcrumb"
        );

        breadcrumb.setAttribute(
            "aria-label",
            "Breadcrumb"
        );

        // ==================================
        // MOBILE MENU BUTTON
        // ==================================

        const menuBtn = el(
            "button",
            "btn btn-ghost btn-icon btn-sm menu-toggle"
        );

        menuBtn.type = "button";

        menuBtn.setAttribute(
            "aria-label",
            "Open navigation"
        );

        menuBtn.setAttribute(
            "aria-controls",
            "appSidebar"
        );

        menuBtn.setAttribute(
            "aria-expanded",
            "false"
        );

        menuBtn.appendChild(
            icon("menu")
        );

        menuBtn.addEventListener(
            "click",
            () => {

                const open =
                    app.classList.toggle(
                        "nav-open"
                    );

                menuBtn.setAttribute(
                    "aria-expanded",
                    String(open)
                );
            }
        );

        breadcrumb.appendChild(menuBtn);

        breadcrumb.appendChild(
            el("span", null, "BugPilot AI")
        );

        // ==================================
        // BREADCRUMB ITEMS
        // ==================================

        crumbs.forEach(
            (crumb, index) => {

                const sep = icon("chevron");

                sep.classList.add("sep");

                sep.setAttribute(
                    "width",
                    "16"
                );

                sep.setAttribute(
                    "height",
                    "16"
                );

                breadcrumb.appendChild(sep);

                const part = el(
                    "span",
                    null,
                    crumb
                );

                if (
                    index === crumbs.length - 1
                ) {
                    part.setAttribute(
                        "aria-current",
                        "page"
                    );
                }

                breadcrumb.appendChild(part);
            }
        );

        header.appendChild(breadcrumb);

        // ==================================
        // TITLE / SEARCH / ACTIONS
        // ==================================

        const row = el("div", "topbar-row");

        const heading = el("div");

        const title = el(
            "h1",
            "page-title",
            options.title
        );

        title.id = "pageTitle";

        heading.appendChild(title);

        if (options.subtitle) {

            const subtitle = el(
                "p",
                "page-subtitle",
                options.subtitle
            );

            subtitle.id = "pageSubtitle";

            heading.appendChild(subtitle);
        }

        row.appendChild(heading);

        const actions = el(
            "div",
            "topbar-actions"
        );

        actions.id = "topbarActions";

        // ==================================
        // OPTIONAL SEARCH
        // ==================================

        if (options.search) {

            const wrap = el(
                "label",
                "search"
            );

            const input = el(
                "input",
                "input"
            );

            input.type = "search";

            input.id =
                options.search.id ||
                "topbarSearch";

            input.placeholder =
                options.search.placeholder ||
                "Search";

            input.setAttribute(
                "aria-label",
                options.search.label ||
                input.placeholder
            );

            input.autocomplete = "off";

            if (
                typeof options.search.onInput ===
                "function"
            ) {

                input.addEventListener(
                    "input",
                    () => options.search.onInput(
                        input.value
                    )
                );
            }

            wrap.append(
                icon("search"),
                input
            );

            actions.appendChild(wrap);
        }

        // ==================================
        // OPTIONAL ACTION BUTTONS
        // ==================================

        for (
            const node of options.actions || []
        ) {

            actions.appendChild(node);
        }

        row.appendChild(actions);

        header.appendChild(row);

        return header;
    }

    // ==========================================
    // 11. MOUNT APPLICATION LAYOUT
    // ==========================================

    async function mount(options) {

        const opts = options || {};

        // Use supplied user, or fetch session.

        const user =
            opts.user ||
            await fetchUser();

        const app = el(
            "div",
            "app"
        );

        const main = el(
            "div",
            "main"
        );

        const content = el(
            "main",
            "content"
        );

        content.id = "main";

        // ==================================
        // FIND EXISTING PAGE CONTENT
        // ==================================

        const source =
            document.getElementById(
                "app-content"
            ) ||
            document.querySelector(
                "body > main"
            );

        if (source) {

            // Move page nodes so that existing
            // event listeners remain attached.

            while (source.firstChild) {

                content.appendChild(
                    source.firstChild
                );
            }

            source.remove();

        } else {

            for (
                const node of [
                    ...document.body.childNodes
                ]
            ) {

                if (node.nodeName !== "SCRIPT") {

                    content.appendChild(node);
                }
            }
        }

        // ==================================
        // ASSEMBLE APP SHELL
        // ==================================

        main.append(
            buildTopbar(opts, app),
            content
        );

        app.append(
            buildSidebar(user, opts.active),
            main
        );

        document.body.prepend(app);

        // ==================================
        // MOBILE NAVIGATION
        // ==================================

        app.addEventListener(
            "click",
            event => {

                if (
                    event.target.closest(
                        ".sidebar a"
                    )
                ) {

                    app.classList.remove(
                        "nav-open"
                    );
                }
            }
        );

        document.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {

                    app.classList.remove(
                        "nav-open"
                    );
                }
            }
        );

        return user;
    }

    // ==========================================
    // 12. EXPOSE APP LAYOUT API
    // ==========================================

    window.BugPilotLayout = Object.freeze({

        mount,

        navFor,

        logout,

        fetchUser,

        initials,

        avatar,

        roleBadge,

        icon,

        dashboardPath: role =>
            DASHBOARD_ROUTES[role] ||
            "/login"
    });

})();