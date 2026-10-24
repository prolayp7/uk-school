# UK School website

Next.js App Router website for public school information and the API-backed
Website CMS. The website API remains the source of truth; this project adds no
content database or local demo data.

## Run locally

Requirements: Node.js 20.9 or newer and pnpm 9.

1. Install packages with `pnpm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `API_BASE_URL` to the API's `/api/v1` base URL and `SCHOOL_CODE` to the
   school's active API code.
4. Configure the API's `WEBSITE_REVALIDATE_URL` to this site's
   `https://<site-host>/api/revalidate` endpoint and set the same
   `WEBSITE_REVALIDATE_SECRET` on both services. Use HTTPS in production.
5. Start the API on port 3000, then start this site on port 3001:

   ```sh
   pnpm dev -- --port 3001
   ```

The API defaults to port 3000, so the separate website port avoids a local
port conflict. The CMS sends the API session token only from server-side route
handlers and stores it in an HttpOnly cookie. The browser never receives the
API token in a response body or client-side bundle.

## Implemented API surfaces

Public pages use the documented `/website` projections for homepage,
navigation, published pages, news, events, admissions, school information,
staff, policies, documents and results. Each request includes the configured
`schoolCode`; public responses are cached for 60 seconds and use the API's
signed on-demand revalidation callback.

The staff CMS uses `/auth/sessions`, `/auth/sessions/current`, and the
school-scoped `/erp/website` endpoints for page listing, page creation,
immutable revisions, review, approval, scheduling, publishing, unpublishing,
archiving and retrying cache revalidation. The API enforces membership,
`website.edit` and `website.publish` permissions, including the distinct-author
approval rule. The site does not infer permission from hidden navigation or
client state.

Content forms expose only fields and content types declared by the API
contract. The API does not currently provide a media upload or gallery
resource, a website enquiry-submission endpoint, a search endpoint, or an
individual event detail route. Those features are not presented as working.
News and policy detail pages are resolved from their documented published
collections. Enquiry submission is intentionally omitted rather than showing
a false success state.

The Pages content builder uses a WYSIWYG editor for headings and text-based
sections, with formatting, lists, links, and tables. Images and videos remain
separate content sections rather than text-editor tools. Page content is stored
in the API's existing text fields as HTML; public rendering converts only an
explicit safe HTML allowlist to React elements, and unsupported embedded
content is omitted. Page saves respect the API's existing per-field character
limits.

The Blog add/edit screens use a separate block editor preview with an SEO panel,
context-menu insertion for images, videos, side-by-side media and text, tables,
tables of contents, and callouts. Hover controls format text, change media
placement, reorder, or remove blocks. SEO controls include meta keywords,
Open Graph and Twitter tag fields, and a selectable JSON-LD schema preview
with copy support. Its content and SEO fields are not connected to the API and
cannot be saved or published. Images can be selected from the user's device for
the in-browser preview, but the API has no media upload endpoint, so local
images are not uploaded and are temporary.

## Configuration and design notes

- `API_BASE_URL`: API origin and version prefix, for example
  `http://localhost:3000/api/v1`.
- `SCHOOL_CODE`: active school code used by public projections.
- `WEBSITE_REVALIDATE_SECRET`: shared HMAC secret for API-triggered cache
  invalidation. It must be kept private and configured on both services.
- No credentials, sample school facts, testimonials, awards, school dates or
  contact details are bundled in the public pages.
- The target repository had no Stitch exports, approved school photography,
  logo, or API credentials at implementation time. CMS-managed images are
  displayed only when present. The home page uses a restrained brand-colour
  fallback rather than stock imagery.
- The design brief names burgundy; it is used as the primary accent alongside
  warm neutral surfaces. No custom school name, marks, claims or statistics
  have been invented.

## Validation

```sh
pnpm lint
pnpm typecheck
pnpm build
```