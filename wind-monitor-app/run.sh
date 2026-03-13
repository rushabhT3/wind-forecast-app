#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting UK Wind Monitor..."

# Backend
echo "[backend] Starting FastAPI on port 8000..."
(
  cd "$ROOT/backend"
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -q -r requirements.txt
  else
    source .venv/bin/activate
  fi
  uvicorn main:app --port 8000 --reload
) &
BACKEND_PID=$!

sleep 2

# Frontend
echo "[frontend] Starting Next.js on port 3000..."
(
  cd "$ROOT/frontend"
  npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "✅  Both servers running:"
echo "   Backend:  http://localhost:8000  (API docs: http://localhost:8000/docs)"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
