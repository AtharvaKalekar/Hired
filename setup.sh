#!/usr/bin/env bash
# =============================================================
#  setup.sh — One-command project bootstrapper for "Hired"
#  Usage: bash setup.sh
# =============================================================

set -e  # Exit on any error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         🚀  Hired — Project Setup        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─── 0. Check prerequisites ──────────────────────────────────────────────────
echo -e "${YELLOW}[0/5] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js is not installed. Install from https://nodejs.org${NC}"; exit 1
fi
echo -e "${GREEN}  ✓ Node.js $(node -v)${NC}"

if ! command -v python3 &> /dev/null; then
  echo -e "${RED}✗ Python 3 is not installed. Install from https://python.org${NC}"; exit 1
fi
echo -e "${GREEN}  ✓ Python $(python3 --version)${NC}"

if ! command -v tectonic &> /dev/null && [ ! -f "$(brew --prefix 2>/dev/null)/bin/tectonic" ]; then
  echo -e "${YELLOW}  ⚠ Tectonic not found. PDF generation will use cloud fallback.${NC}"
  echo -e "${YELLOW}    To install: brew install tectonic${NC}"
else
  echo -e "${GREEN}  ✓ Tectonic (LaTeX compiler)${NC}"
fi

# ─── 1. Backend — Node.js dependencies ───────────────────────────────────────
echo ""
echo -e "${YELLOW}[1/5] Installing Backend dependencies (npm)...${NC}"
cd Backend
npm install --silent
echo -e "${GREEN}  ✓ Backend node_modules ready${NC}"

# ─── 2. Backend — Environment file ───────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/5] Setting up Backend environment...${NC}"
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${YELLOW}  ⚠ Created Backend/.env from .env.example${NC}"
  echo -e "${YELLOW}    → Open Backend/.env and fill in your secrets!${NC}"
else
  echo -e "${GREEN}  ✓ Backend/.env already exists${NC}"
fi

# ─── 3. Python AI Agent — venv + dependencies ────────────────────────────────
echo ""
echo -e "${YELLOW}[3/5] Setting up Python AI agent (venv + pip)...${NC}"
cd ai_agent

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo -e "${GREEN}  ✓ Created Python virtual environment${NC}"
else
  echo -e "${GREEN}  ✓ Python venv already exists${NC}"
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo -e "${GREEN}  ✓ Python packages installed (litellm, python-dotenv)${NC}"

if [ ! -f ".env" ]; then
  echo "GROQ_API_KEY=your_groq_api_key_here" > .env
  echo -e "${YELLOW}  ⚠ Created ai_agent/.env — fill in your GROQ_API_KEY!${NC}"
else
  echo -e "${GREEN}  ✓ ai_agent/.env already exists${NC}"
fi

deactivate
cd ../..

# ─── 4. Frontend — Node.js dependencies ──────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/5] Installing Frontend dependencies (npm)...${NC}"
cd Frontend
npm install --silent
echo -e "${GREEN}  ✓ Frontend node_modules ready${NC}"

if [ ! -f ".env" ]; then
  echo "VITE_API_URL=http://localhost:5001" > .env
  echo -e "${GREEN}  ✓ Created Frontend/.env (pointing to local backend)${NC}"
else
  echo -e "${GREEN}  ✓ Frontend/.env already exists${NC}"
fi
cd ..

# ─── 5. Launch both servers ───────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[5/5] Starting servers...${NC}"
echo ""
echo -e "${CYAN}┌─────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│  Backend  → http://localhost:5001        │${NC}"
echo -e "${CYAN}│  Frontend → http://localhost:5173        │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────┘${NC}"
echo ""
echo -e "${YELLOW}  Press Ctrl+C to stop both servers${NC}"
echo ""

# Run both servers in parallel, kill both on Ctrl+C
trap 'kill %1 %2 2>/dev/null; echo ""; echo "Servers stopped."; exit 0' SIGINT SIGTERM

cd Backend && npm run dev &
sleep 2
cd Frontend && npm run dev &

wait
