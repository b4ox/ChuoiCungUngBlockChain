@echo off
REM =============================================================
REM CHAY NHANH MOI TRUONG DEV (Windows): mo 2 cua so
REM   1. remixd  : noi thu muc contracts/ voi Remix (https://app.remix.live)
REM   2. backend : npm run backend -> http://localhost:3000
REM Dong tung cua so (hoac Ctrl+C trong cua so do) de tat.
REM =============================================================
cd /d "%~dp0"

REM Lan dau chay: tu cai thu vien neu chua co
if not exist "node_modules" (
  echo Dang cai thu vien o thu muc goc...
  call npm install
)
if not exist "backend\node_modules" (
  echo Dang cai thu vien backend...
  call npm --prefix backend install
)

start "Remixd - contracts" cmd /k npx remixd -s ./contracts -u https://app.remix.live
start "Backend - localhost:3000" cmd /k npm run backend

echo Da mo 2 cua so: Remixd va Backend.
echo Remix: vao https://app.remix.live, chon "Connect to Localhost" de mo thu muc contracts.
echo Website: http://localhost:3000
