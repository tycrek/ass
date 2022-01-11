#!/bin/bash
IMAGEPATH="$HOME/Pictures/" # Where to store screenshots before they're deleted
IMAGENAME="ass" # Not really important, tells Flameshot what file to send and delete
KEY="" # Your ass upload token
DOMAIN="" # Your upload domain (without http:// or https://)

flameshot config -f "$IMAGENAME" # Make sure that Flameshot names the file correctly
flameshot gui -r -p "$IMAGEPATH" # Prompt the screenshot GUI

FILE="$IMAGEPATH$IMAGENAME.png" # File path and file name combined

# Check if file exists to handle Curl and rm errors
if test -f "$FILE"; then
  # Then upload the image and copy the response URL
  URL=$(curl -X POST \
    -H "Content-Type: multipart/form-data" \
    -H "Accept: application/json" \
    -H "User-Agent: ShareX/13.4.0" \
    -H "Authorization: $KEY" \
    -F "file=@$FILE" "https://$DOMAIN/" | grep -Po '(?<="resource":")[^"]+')

  echo -n "$URL" | xclip -sel clip # Uses echo instead of printf as echo is marginally faster than printf
  rm "$FILE"
fi 
