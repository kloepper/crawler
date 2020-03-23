#!/bin/bash

function get_unique_links() {
    local url=$1
    lynx -dump -listonly $url | # Use lynx text browser to list all links.
        grep "^ *[0-9.]\+ http" | # Do not pass ouptut lines not part of link list.
        grep -o "https*://.*$" |  # Extract only the URL portion of the lynx list output.
        awk '!x[$0]++' # Filter out duplicate links.
}

FIRST_URL=$1
if [ -z "$FIRST_URL" ]
then
    echo "Please specify starting URL."
    echo "Usage:"
    echo "crawl.sh <URL_START>"
    exit 1
fi

DISPLAY_FILE="crawl_$FIRST_URL.display"
OUTPUT_FILE="crawl_$FIRST_URL.urls"
INDEX_FILE="crawl_$FIRST_URL.index"

if [ -f "$INDEX_FILE" ]; then
    INDEX=`cat "$INDEX_FILE"`
else
    INDEX=1
    echo $FIRST_URL > "$OUTPUT_FILE"
fi

while true; do
    CURRENT_URL=`sed -n "$INDEX,1p" "$OUTPUT_FILE"`
    echo $CURRENT_URL | tee -a "$DISPLAY_FILE"
    for URL in `get_unique_links $CURRENT_URL`; do
        echo "  $URL" | tee -a "$DISPLAY_FILE"
        echo $URL >> "$OUTPUT_FILE"
    done

    # Remove duplicate URLs
    TEMP_FILE="$OUTPUT_FILE.filtered"
    cat "$OUTPUT_FILE" | awk '!x[$0]++' > "$TEMP_FILE"
    mv "$TEMP_FILE" "$OUTPUT_FILE"

    INDEX=$(($INDEX+1))
    echo $INDEX > "$INDEX_FILE"
done
