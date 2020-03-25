const hrefRegEx = /<a [^>]*href="([^"]*)"/g;
export function* listHtmlLinks(html: string, baseUrl : URL) {
    for (const match of html.matchAll(hrefRegEx)) {
    // TODO Handle unescaping of XML attributes (e.g. &amp; -> &).
    const linkUrl = new URL(match[1], baseUrl);
    yield linkUrl.href;
  }
}

export class FetchResult {
    startTime: number;
    headerTime: number;
    bodyTime: number;
    bodyLength: number;
    headers: {[key: string]:string};
    status: number;
    statusText: string;
    url: string = ""
    links: string[] = [];
    success = false;
    error = "";

    constructor (url: string) {
        this.url = url;
        this.startTime = Date.now();
    }

    static async fromUrl(url: string) {
        const result = new FetchResult(url);

        let response: Response;
        try {
            response = await fetch(url, {redirect: 'manual'});
            result.headerTime = Date.now();
        } catch (err) {
            result.headerTime = Date.now();
            result.error = err.toString();
            result.success = false;
            return result;
        }

        result.status = response.status;
        result.statusText = response.statusText;
        //@ts-ignore entries() does exist.
        result.headers = Object.fromEntries(response.headers.entries())
        result.success = true;

        switch (response.status) {
            case 200:
              // Only parse body for HTML results.
              const contentType = result.headers["content-type"];
              if (!contentType.includes("text/html")) {
                  result.error = `is not HTML (found ${contentType})`
                  result.success = false;
                break;
              }
              let html = await response.text();
              result.bodyTime = Date.now();
              result.bodyLength = html.length;
      
              for (const link of listHtmlLinks(await html, new URL(response.url))) {
                  result.links.push(link);
              }
              break;
            case 301:
            case 302:
              const redirectLocation = result.headers.location;
              if (!redirectLocation) {
                  result.error = "redirect location missing";
                  result.success = false;
                  break;
              }
              result.links = [redirectLocation];
              break;
            case 404:
                result.success = false;
                break;
            default:
                result.success = false;
                break;
        }
        return result;
    }
}