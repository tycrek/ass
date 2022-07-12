@echo off

ECHO Installing ass-docker for Windows...

REM Ensure that ./uploads/thumbnails/ exists
if not exist "./uploads/thumbnails/" md "./uploads/thumbnails/"

REM Ensure that ./share/ exists
if not exist "./share/" md "./share/"

REM Ensure that files config.json, auth.json, & data.json exist
if not exist "./config.json" echo. >> "./config.json"
if not exist "./auth.json" echo. >> "./auth.json"
if not exist "./data.json" echo. >> "./data.json"

REM Wait for user to confirm
ECHO Continuing will run docker compose. Continue? (Press Ctrl+C to abort)
PAUSE

ECHO Running setup...

REM Bring up the container and run the setup
docker compose up -d && docker compose exec ass npm run setup && docker compose restart

REM Done!
ECHO ass-docker for Windows installed!
ECHO Run the following to view commands:
ECHO > docker compose logs -f --tail=50 --no-log-prefix ass
