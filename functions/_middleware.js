// The site moved from tire-size-tool.pages.dev to tiresizing.pages.dev.
// Both Pages projects build from this repo, so redirect by host:
// requests to the old host (or its preview subdomains) get a 301 to the
// same path and query on the new host; everything else is served as normal.
const OLD_HOST = 'tire-size-tool.pages.dev';
const NEW_ORIGIN = 'https://tiresizing.pages.dev';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  if (host === OLD_HOST || host.endsWith('.' + OLD_HOST)) {
    return Response.redirect(NEW_ORIGIN + url.pathname + url.search, 301);
  }
  return context.next();
}
