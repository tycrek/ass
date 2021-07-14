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

ECHO Running setup...

REM docker-compose up -d
docker-compose up -d

REM Run setup within the container
docker-compose exec ass npm run setup

REM Restart the container when complete
docker-compose restart

REM Open the logs to ensure it is running
docker-compose logs -f --tail=50 --no-log-prefix ass
