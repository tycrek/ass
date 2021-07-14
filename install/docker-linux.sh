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

# Done!
echo "ass-docker for Linux installed!"
echo "Run the following to view commands:"
echo "$ docker-compose logs -f --tail=50 --no-log-prefix ass"
