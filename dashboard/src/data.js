// Loading + ZIP matching for programs.json / zips.geojson
const base = import.meta.env.BASE_URL;

export async function loadData() {
  const [programs, zips] = await Promise.all([
    fetch(`${base}data/programs.json`).then((r) => r.json()),
    fetch(`${base}data/zips.geojson`).then((r) => r.json()),
  ]);
  const zipIndex = {};
  for (const f of zips.features) zipIndex[f.properties.zip] = f.properties;
  const locById = Object.fromEntries(programs.locations.map((l) => [l.id, l]));
  // Programs whose site failed to geocode fall back to the regional list.
  const list = programs.programs.map((p) => {
    const loc = p.locationId ? locById[p.locationId] : null;
    const mapped = loc && loc.lat != null;
    return { ...p, location: mapped ? loc : null, scope: p.scope === 'site' && !mapped ? 'regional' : p.scope };
  });
  return { programs: list, locations: programs.locations, zips, zipIndex };
}

// Does program p serve ZIP code z (whose county info is zinfo, or undefined if outside the Houston area)?
export function servesZip(p, z, zinfo) {
  if (p.area === 'us' || p.area === 'texas') return true;
  if (p.zips.includes(z)) return true;
  if (p.zipsComplete) return false;
  if (!zinfo) return false;
  if (p.area === 'harris' || p.area === 'city-houston') return zinfo.county === 'Harris';
  return true; // greater-houston
}
