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
      protocol.get(fetchUrl.href, handleResponse);
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


async function run(firstUrl) {
  for (const fetchQueue = [firstUrl]; fetchQueue.length > 0; fetchQueue.shift()) {
    const url = fetchQueue[0];
    try {
      const fetchResult = await fetch(url);
      switch (fetchResult.status) {
      case 200:
        // Only parse body for HTML results.
        const contentType = fetchResult.headers["content-type"];
        if (!contentType.includes("text/html")) {
          console.log(`${url} is not HTML (found ${contentType})`);
          break;
        }

        console.log(url);
        for (const link of htmlHrefListAll(fetchResult.bodyText, fetchResult.url)) {
          console.log(`  ${link}`);
          if (shouldFetch(link)) {
            fetchQueue.push(link);
          }
        }
        break;
      case 301:
        const redirectLocation = fetchResult.headers.location;
        if (!redirectLocation) {
          delete(fetchResult.bodyText);
          console.log(fetchResult);
          throw new Error("Redirect missing location");
        }
        console.log(`${url} -> ${redirectLocation}`);
        fetchQueue.push(redirectLocation)
        break;
      default:
        delete(fetchResult.bodyText);
        console.log(fetchResult);
      }
    } catch (err) {
      console.error(`Error fetching ${url}: ${err.stack}`);
    }
  }
}

run('https://www.rescale.com');
