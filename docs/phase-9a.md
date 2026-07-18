# Phase 9A landing page

## Scope and architecture

Phase 9A upgrades the existing static frontend and NestJS/Prisma backend without adding a second framework, router, authentication layer, or design system. The public page remains usable when the API is unavailable; authenticated publishing and review operations continue through the existing session, workspace, permission, and audit infrastructure.

The reference image was treated as visual direction only. The page is rebuilt from semantic HTML, CSS, JavaScript, a transparent hero asset, templates, and structured API data.

## Customer entry

- Header and hero `Send a Parcel` actions both call `startSendParcel()`.
- An authenticated customer is taken to the existing customer request flow.
- A signed-out visitor is shown the existing login flow and the delivery intent is retained in session storage.
- `Track` and `Track a Shipment` link to `#home-tracking`, scroll smoothly, and move focus to the tracker.
- The public header uses `Log In`; it has no separate sign-up action.

## Public content API

`GET /api/v1/public/landing-page` returns only approved, published, and currently eligible content. The response is structured JSON, not stored HTML. Safe built-in content and cards are used if no revision has been published.

`GET /api/v1/public/media/:assetId` serves only approved media. Uploads accept PNG, JPEG, WebP, and AVIF signatures up to 5 MB. Non-decorative media requires alternative text. Binary content is stored internally and arbitrary external URLs are not accepted.

The generated initial hero composition uses:

- WebP: `assets/ceylonswift-hero-route.webp`
- PNG alpha fallback: `assets/ceylonswift-hero-route.png`
- Intrinsic dimensions: 1024 x 1536

Final image-generation prompt: "Create a premium transparent-background hero asset for CeylonSwift, inspired by the supplied dark neon logistics reference: a topographic Sri Lanka island, one modern courier rider carrying a parcel, and a luminous cyan delivery route. Isolate the composition on solid magenta chroma for removal, exclude UI cards, text, logos, metrics, and customer data, preserve generous transparent edge space, and use polished cyan/blue/violet lighting suitable for a dark navy website."

## Content workflow

Content revisions move through `DRAFT -> IN_REVIEW -> APPROVED -> PUBLISHED`. A user cannot approve their own revision. Publishing is transactional and archives the previous published revision. A published revision can be restored through the rollback endpoint, with all state-changing actions recorded in the existing audit log.

Campaigns have draft, approval, publish, start, and end controls. Runtime eligibility is evaluated using stored UTC instants; administrators enter ISO timestamps representing the intended Asia/Colombo schedule. Expired campaigns are removed automatically from public results and the default controlled card remains available.

The CMS accepts only supported card enums, icon/action keys, bounded strings, controlled priorities, schedules, visibility, and data-source bindings. It does not accept raw HTML, CSS, JavaScript, arbitrary positioning, external embeds, or arbitrary visual tokens.

## Reviews

Only an authenticated customer in a PERSONAL workspace can review a package they own after it reaches `DELIVERED`. One review is allowed per package. New reviews are `PENDING`; only approved reviews with public-display consent can appear publicly. Moderators can approve, reject, or hide a review. Each decision creates an immutable moderation-event snapshot and an audit-log entry. Public names are reduced to first name plus last initial.

## Official on-time metric

The backend is authoritative. Eligibility is:

- package status is `DELIVERED`;
- package is not soft-deleted;
- both `deliveredAt` and `promisedDeliveryAt` are present;
- delivery occurred during the preceding 90 days.

An eligible package is on time when `deliveredAt <= promisedDeliveryAt`. Prisma timestamps are compared as UTC instants, so the result is independent of display timezone. Cancelled, returned, non-delivered, failed/incomplete, and records missing a promise timestamp are excluded. The public percentage is withheld until at least 20 eligible deliveries exist. Results are cached in-process for five minutes and include a last-updated timestamp.

## Permissions

- Customers: `review.create`
- Office content users: `website_content.read`, `website_content.edit`, `website_content.submit`
- Administrators/owners: approval, publishing, rollback, media approval, and review moderation according to existing seeded roles
- High-risk actions: content approval/publish/rollback, media approval, and review moderation

Permissions added: `website_content.read`, `website_content.edit`, `website_content.submit`, `website_content.approve`, `website_content.publish`, `website_content.rollback`, `website_media.upload`, `website_media.approve`, `review.create`, and `review.moderate`.

## Endpoints

- `GET /api/v1/public/landing-page`
- `GET /api/v1/public/media/:assetId`
- `POST /api/v1/website-content/revisions`
- `POST /api/v1/website-content/revisions/:id/submit|approve|reject|publish|rollback`
- `POST /api/v1/website-content/media`
- `POST /api/v1/website-content/media/:id/approve`
- `POST /api/v1/website-content/campaigns`
- `POST /api/v1/website-content/campaigns/:id/approve|publish`
- `GET /api/v1/reviews/mine`
- `POST /api/v1/reviews`
- `GET /api/v1/reviews/moderation`
- `POST /api/v1/reviews/:id/moderate`

## Accessibility and resilience

The hero and tracker use semantic headings and anchors, focus is visible, public status changes use live regions, reviews expose labelled previous/next/pause controls, motion pauses on hover/focus, and `prefers-reduced-motion` disables automatic rotation and reveal transitions. Skeletons reserve the floating-card area while data loads. Core sending and tracking actions remain available during API failure.

## Deferred work and limitations

- Database migration deployment and seed execution must be performed in the target environment; they were not run against a production database.
- Media bytes are stored in PostgreSQL for this phase. Object storage, responsive server-side derivative generation, and metadata stripping should be added before high-volume media use.
- The public metric cache is per application instance. A shared cache is preferable when the backend is scaled horizontally.
- Campaign authoring currently uses ISO instants. A future admin date/time picker should display and validate Asia/Colombo explicitly.
- No payment, live GPS, mobile application, partner portal, or other later-phase system is implemented.
