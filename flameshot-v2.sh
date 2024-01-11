#!/bin/bash

## * ass & cheek flameshot script * ##
#
# Required packages: flameshot, curl, xclip, libnotify
#
# Authors:
# - ToxicAven (https://github.com/ToxicAven)
# - tycrek (https://github.com/tycrek)
# - Metacinnabar (https://github.com/Metacinnabar)
# - NotAShelf (https://github.com/NotAShelf)

# ! Upload mode (ass=0,cheek=1)
MODE=0

# Function to check if a tool is installed
check_tool() {
	command -v "$1" >/dev/null 2>&1
}

# Mode string switcher
get_mode() {
    if [[ $MODE -eq 0 ]];
        then echo "ass"
        else echo "cheek"
    fi
}

# File details
IMGPATH="$HOME/.$(get_mode)"
FILE="$IMGPATH/$(get_mode)-$(date +%s).png"

# ass/cheek configuration (domain should be saved without http(s)://)
TOKEN=$(cat $IMGPATH/.token)
DOMAIN=$(cat $IMGPATH/.domain)

takeScreenshot() {
    REQUIRED_TOOLS=("flameshot" "curl" "xclip" "notify-send")

    # Check if the proper tools are installed
    for tool in "${REQUIRED_TOOLS[@]}"; do
        if ! check_tool "$tool"; then
            echo "Error: $tool is missing!"
            exit 1
        fi
    done

    # Build dynamic Flameshot user-agent
    USERAGENT=$(flameshot -v | sed -n -E 's/(Flameshot) (v[0-9]+\.[0-9]+\.[0-9]+) .+/\1-\2/p')

    # Take screenshot with Flameshot
    flameshot gui -r -p "$FILE" > /dev/null # Append the random gibberish to /dev/null

    # Upload file
    if [ -f "$FILE" ]; then
        echo "Uploading $FILE to $(get_mode)..."

        # Configure upload fields
        FIELD="$([[ $MODE -eq 0 ]] && echo "file" || echo "image")=@$FILE"
        [[ "${DOMAIN%%:*}" = "127.0.0.1" ]] && PROTOCOL="http" || PROTOCOL="https"
        POSTTO="$PROTOCOL://$DOMAIN/$([[ $MODE -eq 0 ]] && echo "" || echo "upload")"

        # Upload the file
        URL=$(curl -sS -X POST \
          -H "Content-Type: multipart/form-data" \
          -H "Accept: application/json" \
          -H "User-Agent: $USERAGENT" \
          -H "Authorization: $TOKEN" \
          -F $FIELD $POSTTO
        )

        # Response parser unique to ass
        if [[ $MODE -eq 0 ]]; then
            URL=$(echo $URL | grep -Po '(?<="resource":")[^"]+')
        fi

        # Copy the URL to clipboard (using printf instead of echo to avoid a newline)
        printf "%s" "$URL" | xclip -sel clip
        echo "URL copied: $URL"
        notify-send -a $(get_mode) -t 4000 "URL copied to clipboard" "<a href=\"$URL\">View in browser</a>"

        # Delete local file
        rm "$FILE"
    else 
        echo "Aborted."
    fi
}

takeScreenshot
