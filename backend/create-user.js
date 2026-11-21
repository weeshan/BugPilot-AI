const bcrypt = require("bcryptjs");
const readline = require("readline-sync");
const pool = require("./db");

async function createUser() {
    try {
        console.log("\n=== BugPilot AI Account Creator ===\n");

        const username = readline.question("Username: ").trim();
        const email = readline.question("Email: ").trim().toLowerCase();
        const role = readline.question("Role (admin/user): ")
            .trim().toLowerCase();

        const password = readline.question("Password: ", {
            hideEchoBack: true
        });

        const confirmPassword = readline.question("Confirm password: ", {
            hideEchoBack: true
        });

        if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
            throw new Error(
                "Username must be 3-50 letters, numbers or underscores."
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Invalid email address.");
        }

        if (!["admin", "user"].includes(role)) {
            throw new Error("Role must be admin or user.");
        }

        if (password.length < 12) {
            throw new Error("Password must have at least 12 characters.");
        }

        if (password !== confirmPassword) {
            throw new Error("Passwords do not match.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.execute(
            `INSERT INTO app_users
             (username, email, password_hash, role)
             VALUES (?, ?, ?, ?)`,
            [username, email, passwordHash, role]
        );

        console.log(`\nAccount '${username}' created successfully!`);
        console.log(`Role: ${role}`);

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            console.error("Username or email already exists.");
        } else {
            console.error("Error:", error.message);
        }
    } finally {
        await pool.end();
    }
}

createUser();