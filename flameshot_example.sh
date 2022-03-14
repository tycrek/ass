#!/bin/bash
IMAGEPATH="$HOME/Pictures/" # Where to store screenshots before they're deleted
IMAGENAME="ass" # Not really important, tells Flameshot what file to send and delete
KEY="" # Your ass upload token
DOMAIN="" # Your upload domain (without http:// or https://)

flameshot config -f "$IMAGENAME" # Make sure that Flameshot names the file correctly
flameshot gui -r -p "$IMAGEPATH" > /dev/null # Prompt the screenshot GUI, also append the random gibberish to /dev/null

FILE="$IMAGEPATH$IMAGENAME.png" # File path and file name combined

# Check if file exists to handle Curl and rm errors
# then upload the image and copy the response URL
if [ -f "$FILE" ]; then
    echo "$FILE exists."
    URL=$(curl -X POST \
      -H "Content-Type: multipart/form-data" \
      -H "Accept: application/json" \
      -H "User-Agent: ShareX/13.4.0" \
      -H "Authorization: $KEY" \
      -F "file=@$IMAGEPATH$IMAGENAME.png" "https://$DOMAIN/" | grep -Po '(?<="resource":")[^"]+')
    # printf instead of echo as echo appends a newline
    printf "%s" "$URL" | xclip -sel clip
    rm "$IMAGEPATH$IMAGENAME.png" # Delete the image locally
else 
    echo "Aborted."
fi
