#!/bin/bash
IMAGEPATH="$HOME/Pictures/" # Where to store screenshots before they're deleted
IMAGENAME="ass" # Not really important, tells Flameshot what file to send and delete
KEY="" # Your ass upload token
DOMAIN="" # Your upload domain (without http:// or https://)

flameshot config -f "$IMAGENAME" # Make sure that Flameshot names the file correctly
flameshot gui -r -p "$IMAGEPATH" # Prompt the screenshot GUI

FILE=$FILE/$IMAGENAME # Fİle path and file name combined

if test -f "$FILE/$IMAGENAME"; then # Check if file exists to handle Curl and rm errors

# Upload the image and copy the response URL
    URL=$(curl -X POST \
      -H "Content-Type: multipart/form-data" \
      -H "Accept: application/json" \
      -H "User-Agent: ShareX/13.4.0" \
      -H "Authorization: $KEY" \
      -F "file=@$IMAGEPATH$IMAGENAME.png" "https://$DOMAIN/" | grep -Po '(?<="resource":")[^"]+')
    rm $FILE
fi
# Echo instead of printf as echo is marginally faster than printf
echo -e "$URL" | xclip -sel clip

