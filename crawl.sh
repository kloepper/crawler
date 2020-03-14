#!/bin/bash


function get_unique_links() {
    local url=$1
    lynx -dump -listonly $url | # Use lynx text browser to list all links.
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

get_unique_links $FIRST_URL

