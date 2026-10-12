# Houston Maternal Health Resource Map

React + MapLibre map of the Community Resource Directory, built to embed in
maternal-health-resources-hou.com.

## Run locally

```bash
npm install
npm run dev
```

## Data

- `public/data/programs.json` — all 113 programs, converted once from
  `Community_Resource_Directory_September_Update.xlsx`. Edit this file directly to update.
  - `locations[]` — one entry per physical address (`lat`/`lng`). Several programs can share a location.
  - `programs[].scope` — `site` (pin on map), `regional` (Houston area, no public address),
    `everywhere` (online / hotline / statewide / national).
  - `programs[].area` — `harris | city-houston | greater-houston | texas | us`, used for ZIP search.
  - `programs[].zips` + `zipsComplete` — ZIPs named in the directory; if `zipsComplete` is true the
    program serves only those ZIPs.
  - Locations with `needsReview: true` failed geocoding; their programs show in the list but not on
    the map until `lat`/`lng` are filled in.
- `public/data/zips.geojson` — 2020 Census ZCTAs for the 9-county Houston metro, with county and centroid.

## Deploy to S3

```bash
npm run build
aws s3 sync dist/ s3://YOUR-BUCKET/map/ --delete
```

Serve the bucket through CloudFront (HTTPS is required for embedding in an HTTPS site).
After editing `programs.json`, clear the CDN cache so visitors see the update:

```bash
aws cloudfront create-invalidation --distribution-id YOUR-DIST-ID --paths "/map/*"
```

## Embed

**Canva website (current host):** Canva does not accept pasted HTML. Its Embed element only renders
URLs its embed service (Iframely) recognizes, so try pasting the CloudFront URL into Canva's Embed app;
if it shows a link card instead of the live map, add a button ("Open the resource map" /
"Abrir el mapa de recursos") that links to the URL instead.

**Any HTML site (WordPress, Squarespace code block, etc.):**

```html
<iframe src="https://YOUR-CLOUDFRONT-DOMAIN/map/index.html?lang=en"
        title="Maternal health resource map"
        style="width:100%;height:720px;border:0" loading="lazy"></iframe>
```

Use `?lang=es` for the Spanish page.
