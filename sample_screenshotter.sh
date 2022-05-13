#!/bin/bash

# File Options
IMAGEPATH="$HOME/Pictures/" # Where to store screenshots before they are deleted
IMAGENAME="ass" # Not really important, tells this script which image to send and delete
FILE="$IMAGEPATH$IMAGENAME" # for future convenience, please do not edit


# Authentication
# If left empty, a local screenshot will be taken and copied to your clipboard.
KEY="" # Your ass upload token
DOMAIN="" # Your upload domain (without http:// or https://)


# helper function to take flameshot screenshots
takeFlameshot () {
    flameshot config -f "${IMAGENAME}"
    flameshot gui -r -p "${IMAGEPATH}" > /dev/null
}

# helper function to take screenshots on wayland using grim + slurp for region capture
takeGrimshot () {
    grim -g "$(slurp)" "${FILE}.png"  > /dev/null
}

# decide on the screenshot tool(s) based on display backend
if [[ "${XDG_SESSION_TYPE}" == x11 ]]; then
    echo -en "Display backend detected as Xorg (x11), using Flameshot\n" # append new line so that Flameshot messages start at a new line
    takeFlameshot # call for the flameshot function
elif [[ "${XDG_SESSION_TYPE}" == wayland ]]; then
    echo -en "Display backend detected as Wayland, using grim & slurp\n"
    takeGrimshot # call for the grim function
else
    echo -en "Unknown display backend.\n Assuming Xorg and using Flameshot.\n"
    takeFlameshot > ./Flameshot.log # will be full of gibberish, but we try it anyway
    echo -en "Done. Make sure you check for any errors and report them.\nLogfile located in $(pwd)\n"
fi

# check if the screenshot file actually exists before proceeding with uploading/copying to clipboard
if [[ -f "${FILE}.png" ]]; then
    # check if KEY and DOMAIN are correct,
    # if they are, upload the file to the ass instance
    # if not, copy the image to clipboard and exit
    if [[ ( -n "${KEY}" && -n "${DOMAIN}" ) ]]; then
        echo -en "KEY & DOMAIN are set\nAttempting to upload to your ass instance.\n"
        URL=$(curl -X POST \
            -H "Content-Type: multipart/form-data" \
            -H "Accept: application/json" \
            -H "User-Agent: ShareX/13.4.0" \
            -H "Authorization: $KEY" \
            -F "file=@${FILE}.png" "https://$DOMAIN/" | grep -Po '(?<="resource":")[^"]+')
        if [[ "${XDG_SESSION_TYPE}" == x11 ]]; then
            # printf instead of echo as echo appends a newline
            printf "%s" "$URL" | xclip -sel clip # it is safe to use xclip on xorg, so we don't need wl-copy
        elif [[ "${XDG_SESSION_TYPE}" == wayland ]]; then
            # if desktop session is wayland instead of xclip, use wl-copy (wl-clipboard)
            printf "%s" "$URL" | wl-copy
        else
            echo -en "Invalid desktop session!\n Exiting.\n"
            exit 1
        fi
        echo -en "Process complete.\nRemoving image.\n"
        rm "${FILE}.png" # Delete the image locally
    else
        echo -en "KEY & DOMAIN are not set\nAttempting local screenshot.\n"
        # If domain & key are not set, assume it is a local screenshot and copy the image directly to clipboard
        if [[ "${XDG_SESSION_TYPE}" == x11 ]]; then # if display backend is x11, use xclip
            xclip -sel clip -target image/png < "${FILE}.png"
        elif [[ "${XDG_SESSION_TYPE}" == wayland ]]; then # if display backend is wayland, use wl-clipboard (available on AUR or can be self-compiled)
            wl-copy < "${FILE}"
        else
            echo -en "Unknown display backend...\nAssuming Xorg and using xclip...\n"
            xclip -sel clip -target image/png < "${FILE}.png"
        fi
        echo -en "Process complete.\nRemoving image.\n"
        rm "${FILE}.png"
    fi
else
    # Abort screenshot if $FILE.png does not exist
    echo -en "Target file was not found.\nAbording screenshot.\n"
fi
