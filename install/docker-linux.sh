#!/bin/bash

echo "Installing ass-docker for Linux..."

# Ensure that ./uploads/thumbnails/ exists
mkdir -p ./uploads/thumbnails/

# Ensure that ./share/ exists
mkdir -p ./share/

# Ensure that files config.json, auth.json, & data.json exist
for value in config.json auth.json data.json
do
	if [ ! -f $value ]; then
		echo "File $value does not exist. Creating..."
		touch $value
	fi
done

# Wait for user to confirm
echo "Continuing will run docker-compose. Continue? (Press Ctrl+C to abort)"
read -n 1 -s -r -p "Press any key to continue..."

echo Running setup...

# docker-compose up -d
docker-compose up -d && \

# Run setup within the container
docker-compose exec ass npm run setup && \

# Restart the container when complete
docker-compose restart && \

# Open the logs to ensure it is running
docker-compose logs -f --tail=50 --no-log-prefix ass && \

# Done!
echo "ass-docker for Linux installed!"
