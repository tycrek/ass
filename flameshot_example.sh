#!/bin/bash
RAND=$RANDOM$RANDOM #Random number, because ass displays the same file with different URLs depending on its original name while using ZWS mode
IMAGEPATH="$HOME/Pictures/" #where to hold the screenshots before they are deleted
IMAGENAME="$RAND" #Not really important unless using ZWS (see $RAND.) tells flameshot what file to send and delete
KEY="" #Enter auth key
DOMAIN="" #your upload domain

flameshot config -f $IMAGENAME #Make sure that flameshot names the file correctly
flameshot gui -r -p $IMAGEPATH #Prompt the screenshot GUI

#Upload the image and copy the response URL
URL=$(curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -H "Accept: application/json" \
  -H "User-Agent: ShareX/13.4.0" \
  -H "Authorization: $KEY" \
  -F "file=@$IMAGEPATH$IMAGENAME.png" https://$DOMAIN/ | grep -Po '(?<="resource":")[^"]+')
echo $URL | xclip -sel clip

rm $IMAGEPATH$IMAGENAME.png #Delete the image locally



