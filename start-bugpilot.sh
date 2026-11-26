
#!/bin/bash

# ==========================================
# BUGPILOT AI V2 - MACOS STARTUP SCRIPT
# ==========================================

set -e

PROJECT_DIR="$HOME/Documents/BugPilot-AI-V2/backend"
PORT=3000

echo ""
echo "=========================================="
echo "          BUGPILOT AI V2"
echo "=========================================="
echo ""

# 1. Locate project
echo "[1/5] Locating BugPilot AI..."

if [ ! -d "$PROJECT_DIR" ]; then
    echo "ERROR: Backend folder not found!"
    echo "$PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"
echo "Project found."

# 2. Check Node.js
echo ""
echo "[2/5] Checking Node.js..."

if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js is not installed."
    exit 1
fi

node --version

# 3. Check dependencies
echo ""
echo "[3/5] Checking dependencies..."

if [ ! -f ".env" ]; then
    echo "ERROR: Missing backend/.env file."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Dependencies missing. Installing..."
    npm ci
fi

echo "Dependencies ready."

# 4. Check syntax
echo ""
echo "[4/5] Checking JavaScript..."

node --check server.js
node --check routes/auth.js
node --check routes/issues.js
node --check routes/projects.js
node --check routes/github.js
node --check routes/views.js
node --check routes/pdf.js
node --check public/js/layout.js

echo "JavaScript syntax checks passed."

# 5. Check port
echo ""
echo "[5/5] Checking port $PORT..."

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN \
    >/dev/null 2>&1; then

    echo "ERROR: Port $PORT is already occupied."
    echo ""
    echo "Existing process:"
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN
    echo ""
    echo "Stop your existing server before restarting."
    exit 1
fi

# Launch server
echo ""
echo "=========================================="
echo "         STARTING BUGPILOT AI"
echo "=========================================="
echo ""
echo "Website: http://localhost:$PORT"
echo "Press Control + C to stop the server."
echo ""

exec node server.js
