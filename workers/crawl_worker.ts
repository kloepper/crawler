import { FetchResult } from "../lib/crawl";

async function handleVersion() {
  // @ts-ignore BUILD_VERSION and BUILD_TIME injected by build.
  let response = [BUILD_VERSION, BUILD_TIME];
  return new Response(JSON.stringify(response));
}

async function handle(event: FetchEvent) {
  if (event.request.url.endsWith("/_/version")) { return handleVersion(); }

  let fetchUrl = await event.request.text();

  let result = await FetchResult.fromUrl(fetchUrl);
  return new Response(JSON.stringify(result));
}

addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handle(event).catch((err) => {
    return new Response(err.toString(), {status: 500});
  }));
});