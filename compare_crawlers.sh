#!/bin/bash

DATE=`date -u +"%Y-%m-%dT%H-%M-%SZ"`
COMPARE_DIR=compare/$DATE
mkdir -p $COMPARE_DIR

function run_crawl() {
    local crawl_name=$1
    local crawl_seconds=$2
    local crawl_command=$3

    local output_prefix=$COMPARE_DIR/$crawl_name
    local output_file=$output_prefix.out

    gtimeout $crawl_seconds bash -c "$crawl_command" > $output_file 2> $output_prefix.error

    local fetch_count=$((`cat $output_file | grep '^http' | wc -l` + 0))
    local failure_count=$((`cat $output_file | grep '^FAIL' | wc -l` + 0))
    local link_count=$((`cat $output_file | grep '^  ' | wc -l` + 0))
    echo $crawl_name fetched $fetch_count pages, with $failure_count failures, finding $link_count links.
}

function usage() {
    echo "Usage:"
    echo "compare_crawlers.sh <URL_START> [<SECONDS_TO_RUN_EACH_CRAWL>]"
    exit 1
}

CRAWL_TIME=$2
FIRST_URL=$1

# Set default CRAWL_TIME
if [ -z "$CRAWL_TIME" ]
then
    CRAWL_TIME=20
fi

if [ -z "$FIRST_URL" ]
then
    echo "Please specify starting URL."
    usage
fi

run_crawl bash $CRAWL_TIME "./crawl.sh $FIRST_URL"
run_crawl node_sequential $CRAWL_TIME "./crawl.js $FIRST_URL"
run_crawl node_5x $CRAWL_TIME "./crawl.js $FIRST_URL 5"
run_crawl node_20x $CRAWL_TIME "./crawl.js $FIRST_URL 20"
run_crawl node_100x $CRAWL_TIME "./crawl.js $FIRST_URL 100"
run_crawl worker_sequential $CRAWL_TIME "./crawl_using_worker.js $FIRST_URL 1"
run_crawl worker_5x $CRAWL_TIME "./crawl_using_worker.js $FIRST_URL 5"
run_crawl worker_20x $CRAWL_TIME "./crawl_using_worker.js $FIRST_URL 20"
run_crawl worker_100x $CRAWL_TIME "./crawl_using_worker.js $FIRST_URL 100"

