# Location Review — Resource Map

**Checked:** 2026-10-12, against each organization's website and Google Maps.
**Source:** `Community_Resource_Directory_September_Update.xlsx` (sheet "All Programs 9.2").
**Data file updated:** `dashboard/public/data/programs.json`

These 6 addresses either failed automatic geocoding or were placed in the wrong spot. Each row says
what was found and what changed in the map data. **The spreadsheet itself has not been edited.**
Please carry confirmed corrections back into it.

## Summary

| # | Program(s) | Spreadsheet address | Found address | Source | Status |
|---|---|---|---|---|---|
| 1 | Bo's Place | 11801 Forest Glen St, Houston, TX 77043 | **10050 Buffalo Speedway, Houston, TX 77054** | bosplace.org homepage; Google Maps | ✅ Verified — update spreadsheet |
| 2 | Target Hunger | 2814 Emile St, Houston, TX 77026 | **1260 Shotwell St, Houston, TX 77020** | targethunger.org (Contact Us footer); Google Maps | ✅ Verified — update spreadsheet |
| 3 | Justice for All Immigrants (JFAI) | 1903 West St, Houston, TX 77007 | **2220 Broadway St, Houston, TX 77012** ("Houston (main)") | justiceforallimmigrants.org/contact; Google Maps | ✅ Verified — update spreadsheet |
| 4 | An-Nisa Hope Center | 8515 Derry Ave, Houston, TX 77083 | **7100 Regency Square Blvd #290, Houston, TX 77036** | Google Maps listing only | ⚠️ Needs confirmation — annisahopecenter.org did not load |
| 5 | Brighter Bites | 1512 Pennsylvania Ave, Houston, TX 77023 | Website lists only **P.O. Box 25456, Houston, TX 77265** | brighterbites.org/contact | ⚠️ Moved off the map to "Serving the Houston area" — confirm whether there is a public site |
| 6 | Harris County Public Health: Black Maternal Health; Healthy Start; Maternal & Child Health; Maternal Mental Health | 2223 West Loop South, Houston, TX 77027 | Address exists (Google Maps). HCPH **main office is now 1111 Fannin St, Houston, TX 77002** | publichealth.harriscountytx.gov Contact Us | ⚠️ Kept at 2223 W Loop S — confirm where these programs serve clients |

## Details and questions for the reviewer

1. **Bo's Place.** The website footer and Google both show 10050 Buffalo Speedway. The old Forest Glen
   address looks out of date. *Map: pin moved (29.67332, -95.424866).*
2. **Target Hunger.** The website's Contact block shows 1260 Shotwell St. *Map: pin moved
   (29.764769, -95.311619).* Also check whether the listed service ZIPs (77020, 77026, 77028, …) are still current.
3. **JFAI.** The Contact page lists 2220 Broadway Street as the Houston main office, plus a San Antonio office.
   Note: **jfai.org is a different organization.** The spreadsheet URL (justiceforallimmigrants.org) is correct.
   *Map: pin moved (29.707223, -95.278104).*
4. **An-Nisa Hope Center.** We have only one source, a Google Maps listing. The website was unreachable.
   Call 832-324-9111 to confirm. *Map: pin moved to Regency Square and still flagged `needsReview`.*
5. **Brighter Bites.** Programs run at partner schools and the organization publishes only a mailing
   address. 1512 Pennsylvania Ave could not be found. Decide whether to keep it as a list-only entry or pin the
   distribution sites. *Map: removed from the map; shown in "Serving the Houston area".*
6. **Harris County Public Health (4 programs).** The spreadsheet uses 2223 West Loop South, but the HCPH
   Contact page lists 1111 Fannin St as the main office. Find out whether maternal programs still operate from
   West Loop South, or whether they should point to Fannin or to specific clinics. *Map: kept at 2223 W Loop S
   (29.744083, -95.456604, from Google) and still flagged `needsReview`.*

## How to apply a correction to the map

In `dashboard/public/data/programs.json`, find the location (`loc12`, `loc24`, `loc29`, `loc36`, `loc44`).
Edit `address`, `lat` and `lng`, and remove `"needsReview": true` once confirmed. Right-click a spot in
Google Maps to copy its coordinates.
