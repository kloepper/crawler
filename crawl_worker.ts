const hrefRegEx = /<a [^>]*href="([^"]*)"/g;
export function* listHtmlLinks(html: string, baseUrl : URL) {
    for (const match of html.matchAll(hrefRegEx)) {
    // TODO Handle unescaping of XML attributes (e.g. &amp; -> &).
    const linkUrl = new URL(match[1], baseUrl);
    yield linkUrl.href;
  }
}