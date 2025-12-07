@echo off
echo Starting Nexa Guard Backend...
start "Nexa Guard Backend" cmd /k "cd backend && npm start"
timeout /t 5
echo Starting Nexa Guard Frontend...
start "Nexa Guard Frontend" cmd /k "cd frontend && npm run dev"
echo Done! Please wait for the browser to open at localhost:3000
pause
