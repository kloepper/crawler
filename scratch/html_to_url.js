#!/usr/bin/env node

const hrefRegEx = /<a [^>]*href="([^"]*)"/g;
function* htmlHrefListAll(html, baseUrl) {
  for (const match of input.matchAll(hrefRegEx)) {
    // TODO Handle unescaping of XML attributes (e.g. &amp; -> &).
    const linkUrl = new URL(match[1], baseUrl);
    yield linkUrl.href;
  }
}

process.stdin.setEncoding('utf8');

let input = "";
process.stdin.on('readable', () => {
  let chunk;
  // Use a loop to make sure we read all available data.
  while ((chunk = process.stdin.read()) !== null) {
    input += chunk;
  }
});

process.stdin.on('end', () => {
  for (const link of htmlHrefListAll(input, "https://example.com")) {
    console.log(link);
  }
});
