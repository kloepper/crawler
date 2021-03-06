#!/usr/bin/env node
const https = require('https');
const http = require('http');

const hrefRegEx = /<a [^>]*href="([^"]*)"/g;
function* htmlHrefListAll(html, baseUrl) {
  for (const match of html.matchAll(hrefRegEx)) {
    // TODO Handle unescaping of XML attributes (e.g. &amp; -> &).
    const linkUrl = new URL(match[1], baseUrl);
    yield linkUrl.href;
  }
}

async function fetch(url) {
  return new Promise((resolve, reject) => {
    let fetchUrl;
    try {
      fetchUrl = new URL(url);
    } catch (err) {
      reject(err);
    }

    const handleResponse = (response) => {
      const bodyChunks = [];
      response.on('data', (chunk) => {
        bodyChunks.push(chunk);
      }).on('end', () => {
          const bodyText = Buffer.concat(bodyChunks).toString();
          resolve({
            headers: response.headers,
            status: response.statusCode,
            statusText: response.statusMessage,
            url: fetchUrl.href,
            bodyText: bodyText,
          });
      })
    };


    let protocol;
    switch (fetchUrl.protocol) {
    case "http:":
      protocol = http;
      break;
    case "https:":
      protocol = https;
      break;
    default:
      reject(new Error(`Protocol ${url.protocol} not supported`))
    }

    try {
      protocol.get(fetchUrl.href, handleResponse).on("error", (err) => { reject(err); });
    } catch (err) {
      reject(err);
    }
  });
}

const isDuplicate = {};
function shouldFetch(url) {
  // Only fetch a URL once.
  if (isDuplicate[url]) {
    return false;
  }
  isDuplicate[url] = true;

  // Only fetch HTTP or HTTPS URLs.
  if (!url.startsWith("http")) {
    return false;
  }

  return true;
}

class ConcurrentFetcher {
  constructor(count) {
    // Use limited number of "tokens" to bound number of concurrent fetches.
    this.availableFetchTokens = count;
    this.fetchQueue = [];
    this.fetchResults = [];
  }

  async run(firstUrl) {
    this.fetchQueue.push(firstUrl);

    while (this.fetchQueue.length > 0 || this.fetchResults.length > 0) {
      // Start any asynchronous fetches.
      this.beginFetches();

      // Wait for next fetch result to complete.
      const nextResult = this.fetchResults.shift();
      try {
      this.handleFetchResult(await nextResult);
      } catch (err) {
        console.error(`Error: ${err}`);
      }
    }
    console.log("All done");
  }

  async beginFetches() {
    // The number of concurrent fetches is limited to the minimum of available tokens and 
    // any URLs remaining to fetch.
    while (this.availableFetchTokens > 0 && this.fetchQueue.length > 0) {
      const url = this.fetchQueue.shift();
      this.availableFetchTokens -= 1;

      // Run fetch asynchronously by pushing Promise<FetchResult> onto results queue.
      this.fetchResults.push((async () => {
        const result = await fetch(url);

        // Release token when fetch completes.
        this.availableFetchTokens += 1;
        return result;
      })())
    }
  }

  handleFetchResult(fetchResult) {
    const logFetchFail = (message) => {
      let failMessage = `FAIL ${fetchResult.url}`;
      if (typeof message !== "undefined") {
        failMessage += ` ${message}`;
      }
      failMessage += ` ${fetchResult.status} ${fetchResult.statusText}`;
      console.log(failMessage);
    }

    const debugLogFetchResult = () => {
      fetchResult.bodyText = fetchResult.bodyText.slice(0, 200);
      console.error(fetchResult);
    }

    switch (fetchResult.status) {
      case 200:
        // Only parse body for HTML results.
        const contentType = fetchResult.headers["content-type"];
        if (!contentType.includes("text/html")) {
          logFetchFail(`is not HTML (found ${contentType})`)
          break;
        }

        console.log(fetchResult.url);
        for (const link of htmlHrefListAll(fetchResult.bodyText, fetchResult.url)) {
          console.log(`  ${link}`);
          if (shouldFetch(link)) {
            this.fetchQueue.push(link);
          }
        }
        break;
      case 301:
      case 302:
        const redirectLocation = fetchResult.headers.location;
        if (!redirectLocation) {
          logFetchFail("redirect location missing");
          debugLogFetchResult();
          break;
        }
        console.log(`${fetchResult.url} -> ${redirectLocation}`);
        this.fetchQueue.push(redirectLocation)
        break;
      case 404:
        logFetchFail();
        break;
      default:
        logFetchFail();
        debugLogFetchResult();
        break;
      }
  }
}

const PROGRAM_NAME = "crawl";
function usage() {
    return `${PROGRAM_NAME} is used perform a web crawl starting at specified URL
Usage:
  ${PROGRAM_NAME} <url> [<max_concurrent_fetches>]
    Starts web crawl from specified <url> running at most <max_concurrent_fetches> at the same time.
    Default value for <max_concurrent_fetches> is 1.

    examples:
     - ${PROGRAM_NAME} https://example.com
     - ${PROGRAM_NAME} https://example.com 20`;
}

class ArgumentError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "ArgumentError";
  }
}

async function run() {
  if (process.argv.length < 3) { throw new ArgumentError("Must specify URL."); }
  if (process.argv.length > 4) { throw new ArgumentError(""); } 

  const url = process.argv[2];
  // Validate input URL by constructing a URL object.
  try {
    new URL(url);
  } catch (err) {
    throw new ArgumentError(`Specified URL ${url} is invalid: ${err}`);
  }

  let concurrentCount = 1;
  if (process.argv.length === 4) {
    const concurrentCountText = process.argv[3];
    concurrentCount = parseInt(concurrentCountText);
    if (isNaN(concurrentCount) || concurrentCount < 1) {
      throw new ArgumentError(`Specified concurrent count ${concurrentCountText} must be a valid positive integer.`);
    }
  }

  const fetcher = new ConcurrentFetcher(concurrentCount);
  fetcher.run(url);
}

run().catch((error) => {
  if (error instanceof ArgumentError) {
    console.log(error.toString());
    console.log(usage());
    process.exit(1);
  }

  console.log(`Error running crawler: ${error}`);
  process.exit(1);
});