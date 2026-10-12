import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/maplibre';
import { loadData, servesZip } from './data.js';
import { getStrings, initialLang, TABS, TAB_COLORS } from './i18n.js';
import ProgramCard from './ProgramCard.jsx';

// Centered on the extent of all mapped locations (Hempstead to Deer Park)
const HOUSTON = { longitude: -95.607, latitude: 29.877, zoom: 9.2 };
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

export default function App() {
  const [lang, setLang] = useState(initialLang);
  const t = getStrings(lang);
  const [data, setData] = useState(null);
  const [activeTabs, setActiveTabs] = useState([]); // empty = all
  const [zipInput, setZipInput] = useState('');
  const [zip, setZip] = useState('');
  const [hoverLoc, setHoverLoc] = useState(null);
  const [pinnedLoc, setPinnedLoc] = useState(null);
  const [clusterHover, setClusterHover] = useState(null);
  const [mobileView, setMobileView] = useState('map');
  const [filterOpen, setFilterOpen] = useState(false);
  const [listTab, setListTab] = useState('map'); // 'map' | 'regional' | 'everywhere'
  const [bounds, setBounds] = useState(null);
  const isDesktop = useMediaQuery('(min-width: 761px)');
  const mapRef = useRef(null);
  const closeTimer = useRef(null);
  const inPopup = useRef(false);
  const embedded = window.self !== window.top;

  useEffect(() => { loadData().then(setData); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const zinfo = zip && data ? data.zipIndex[zip] : undefined;

  const visible = useMemo(() => {
    if (!data) return [];
    return data.programs.filter((p) =>
      (activeTabs.length === 0 || activeTabs.includes(p.tab)) && (!zip || servesZip(p, zip, zinfo)));
  }, [data, activeTabs, zip, zinfo]);

  const groups = useMemo(() => {
    const by = (a, b) => a.name.localeCompare(b.name);
    // With a ZIP searched: programs naming that ZIP first, then nearest sites first.
    const named = (p) => (zip && p.zips.includes(zip) ? 0 : 1);
    const dist = (p) => (zinfo ? (p.location.lat - zinfo.lat) ** 2 + ((p.location.lng - zinfo.lng) * 0.87) ** 2 : 0);
    const bySite = (a, b) => named(a) - named(b) || dist(a) - dist(b) || by(a, b);
    const byNamed = (a, b) => named(a) - named(b) || by(a, b);
    return {
      site: visible.filter((p) => p.scope === 'site').sort(bySite),
      regional: visible.filter((p) => p.scope === 'regional').sort(byNamed),
      everywhere: visible.filter((p) => p.scope === 'everywhere').sort(byNamed),
    };
  }, [visible, zip, zinfo]);

  const programsAt = useMemo(() => {
    const m = {};
    for (const p of groups.site) (m[p.location.id] ||= []).push(p);
    return m;
  }, [groups]);

  const points = useMemo(() => ({
    type: 'FeatureCollection',
    features: Object.entries(programsAt).map(([id, ps]) => {
      const loc = ps[0].location;
      const tabs = new Set(ps.map((p) => p.tab));
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
        properties: { id, count: ps.length, color: TAB_COLORS[tabs.size === 1 ? ps[0].tab : 'multi'] },
      };
    }),
  }), [programsAt]);

  // Desktop: the location list follows the map view.
  const inView = useMemo(() => {
    if (!isDesktop || !bounds) return groups.site;
    return groups.site.filter((p) => bounds.contains([p.location.lng, p.location.lat]));
  }, [groups, bounds, isDesktop]);

  const activeLoc = pinnedLoc || hoverLoc;
  const activePrograms = activeLoc ? programsAt[activeLoc] : null;

  const highlightZips = useMemo(() => {
    const s = new Set();
    for (const p of activePrograms || []) p.zips.forEach((z) => s.add(z));
    return [...s];
  }, [activePrograms]);

  // ---- interactions --------------------------------------------------------
  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => { setHoverLoc(null); setClusterHover(null); }, 250);
  };

  const onMouseMove = useCallback((e) => {
    if (inPopup.current) return; // map still fires mousemove under the popup
    const f = e.features && e.features[0];
    const canvas = mapRef.current?.getCanvas();
    if (!f) { if (canvas) canvas.style.cursor = ''; scheduleClose(); return; }
    if (canvas) canvas.style.cursor = 'pointer';
    cancelClose();
    if (f.layer.id === 'points') {
      setClusterHover(null);
      setHoverLoc(f.properties.id);
    } else if (f.layer.id === 'clusters') {
      setHoverLoc(null);
      const src = mapRef.current.getSource('locations');
      const [lng, lat] = f.geometry.coordinates;
      const n = f.properties.point_count;
      src.getClusterLeaves(f.properties.cluster_id, 50, 0).then((leaves) => {
        const names = leaves.flatMap((l) => (programsAt[l.properties.id] || []).map((p) => p.name));
        setClusterHover({ lng, lat, n, names });
      });
    }
  }, [programsAt]);

  const onClick = useCallback((e) => {
    const f = e.features && e.features[0];
    if (!f) { setPinnedLoc(null); return; }
    if (f.layer.id === 'clusters') {
      const src = mapRef.current.getSource('locations');
      src.getClusterExpansionZoom(f.properties.cluster_id).then((zoom) => {
        mapRef.current.easeTo({ center: f.geometry.coordinates, zoom: zoom + 0.5 });
      });
    } else {
      setPinnedLoc(f.properties.id);
      if (!isDesktop) mapRef.current.easeTo({ center: f.geometry.coordinates, offset: [0, -120] });
    }
  }, [isDesktop]);

  const focusProgram = (p) => {
    if (!p.location) return;
    setMobileView('map');
    setPinnedLoc(p.location.id);
    mapRef.current?.flyTo({ center: [p.location.lng, p.location.lat], zoom: Math.max(mapRef.current.getZoom(), 13) });
  };

  const submitZip = (e) => {
    e.preventDefault();
    const z = zipInput.trim();
    if (!/^\d{5}$/.test(z)) return;
    setZip(z);
    setPinnedLoc(null);
    const zi = data?.zipIndex[z];
    if (zi) mapRef.current?.flyTo({ center: [zi.lng, zi.lat], zoom: 11.5 });
  };

  const clearZip = () => { setZip(''); setZipInput(''); resetView(); };
  const resetView = () => { setPinnedLoc(null); mapRef.current?.flyTo({ center: [HOUSTON.longitude, HOUSTON.latitude], zoom: HOUSTON.zoom }); };
  const toggleTab = (tab) => setActiveTabs((cur) => (cur.includes(tab) ? cur.filter((x) => x !== tab) : [...cur, tab]));

  // ---- render -------------------------------------------------------------
  const total = visible.length;

  return (
    <div className="app">
      <header className="topbar">
        <h1>{t.title}</h1>
        <button className="lang" onClick={() => setLang(lang === 'en' ? 'es' : 'en')} lang={lang === 'en' ? 'es' : 'en'}>
          {t.language}
        </button>
      </header>

      <div className="controls">
        <form className="zip" onSubmit={submitZip} role="search">
          <input
            inputMode="numeric" maxLength={5} pattern="\d{5}" aria-label={t.searchPlaceholder}
            placeholder={t.searchPlaceholder} value={zipInput}
            onChange={(e) => setZipInput(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit">{t.search}</button>
          {zip && <button type="button" className="ghost" onClick={clearZip}>{t.clear}</button>}
        </form>
        <div className="chips" role="group">
          <button className={`chip ${activeTabs.length === 0 ? 'on' : ''}`} aria-pressed={activeTabs.length === 0} onClick={() => setActiveTabs([])}>
            {t.all}
          </button>
          {TABS.map((tab) => (
            <button key={tab} className={`chip ${activeTabs.includes(tab) ? 'on' : ''}`} aria-pressed={activeTabs.includes(tab)}
              style={{ '--c': TAB_COLORS[tab] }} onClick={() => toggleTab(tab)}>
              <span className="dot" />{t.tabs[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="mobile-bar">
        <div className="mobile-toggle">
          <button className={mobileView === 'map' ? 'on' : ''} onClick={() => setMobileView('map')}>{t.showMap}</button>
          <button className={mobileView === 'list' ? 'on' : ''} onClick={() => setMobileView('list')}>{t.showList} · {total}</button>
        </div>
        <button className={`filter-btn ${activeTabs.length ? 'active' : ''}`} aria-expanded={filterOpen}
          onClick={() => setFilterOpen(!filterOpen)}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          {t.types}{activeTabs.length > 0 && <span className="filter-count">{activeTabs.length}</span>}
        </button>
        {filterOpen && (
          <>
            <div className="filter-backdrop" onClick={() => setFilterOpen(false)} />
            <div className="filter-menu" role="group" aria-label={t.types}>
              <button className={`filter-row ${activeTabs.length === 0 ? 'on' : ''}`} aria-pressed={activeTabs.length === 0}
                onClick={() => setActiveTabs([])}>
                <span className="check" />{t.allTypes}
              </button>
              {TABS.map((tab) => (
                <button key={tab} className={`filter-row ${activeTabs.includes(tab) ? 'on' : ''}`} aria-pressed={activeTabs.includes(tab)}
                  style={{ '--c': TAB_COLORS[tab] }} onClick={() => toggleTab(tab)}>
                  <span className="check" /><span className="dot" />{t.tabs[tab]}
                </button>
              ))}
              <button className="filter-done" onClick={() => setFilterOpen(false)}>{t.showResults(total)}</button>
            </div>
          </>
        )}
      </div>

      <main className={`body view-${mobileView}`}>
        <section className="map-wrap">
          <Map
            ref={mapRef}
            initialViewState={HOUSTON}
            mapStyle={MAP_STYLE}
            interactiveLayerIds={['points', 'clusters']}
            onMouseMove={onMouseMove}
            onMouseLeave={scheduleClose}
            onClick={onClick}
            onLoad={(e) => setBounds(e.target.getBounds())}
            onMoveEnd={(e) => setBounds(e.target.getBounds())}
            cooperativeGestures={embedded}
            locale={t.mapLocale}
            attributionControl={{ compact: true }}
          >
            <NavigationControl position="top-left" showCompass={false} />

            {data && (
              <Source id="zips" type="geojson" data={data.zips}>
                <Layer id="zip-hl" type="fill" filter={['in', ['get', 'zip'], ['literal', highlightZips]]}
                  paint={{ 'fill-color': '#00205B', 'fill-opacity': 0.12 }} />
                <Layer id="zip-hl-line" type="line" filter={['in', ['get', 'zip'], ['literal', highlightZips]]}
                  paint={{ 'line-color': '#00205B', 'line-opacity': 0.45, 'line-width': 1 }} />
                <Layer id="zip-search" type="line" filter={['==', ['get', 'zip'], zip || '']}
                  paint={{ 'line-color': '#00205B', 'line-width': 2.5, 'line-dasharray': [2, 1] }} />
              </Source>
            )}

            <Source id="locations" type="geojson" data={points} cluster clusterRadius={36} clusterMaxZoom={13}>
              <Layer id="clusters" type="circle" filter={['has', 'point_count']}
                paint={{
                  'circle-color': '#00205B', 'circle-opacity': 0.9,
                  'circle-radius': ['step', ['get', 'point_count'], 15, 5, 19, 15, 24],
                  'circle-stroke-color': '#9FDDF9', 'circle-stroke-width': 3,
                }} />
              <Layer id="cluster-count" type="symbol" filter={['has', 'point_count']}
                layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13, 'text-font': ['Noto Sans Bold'] }}
                paint={{ 'text-color': '#ffffff' }} />
              <Layer id="points" type="circle" filter={['!', ['has', 'point_count']]}
                paint={{
                  'circle-color': ['get', 'color'],
                  'circle-radius': ['case', ['==', ['get', 'id'], activeLoc || ''], 11, ['>', ['get', 'count'], 1], 9, 7],
                  'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2,
                }} />
              <Layer id="point-count" type="symbol" filter={['all', ['!', ['has', 'point_count']], ['>', ['get', 'count'], 1]]}
                layout={{ 'text-field': ['to-string', ['get', 'count']], 'text-size': 10, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }}
                paint={{ 'text-color': '#ffffff' }} />
            </Source>

            {activePrograms && isDesktop && (
              <Popup
                longitude={activePrograms[0].location.lng} latitude={activePrograms[0].location.lat}
                offset={14} closeButton={!!pinnedLoc} closeOnClick={false} focusAfterOpen={false}
                onClose={() => { inPopup.current = false; setPinnedLoc(null); setHoverLoc(null); }} maxWidth="320px"
              >
                <div className="popup"
                  onMouseEnter={() => { inPopup.current = true; cancelClose(); }}
                  onMouseLeave={() => { inPopup.current = false; if (!pinnedLoc) scheduleClose(); }}>
                  {activePrograms.length > 1 && <div className="popup-head">{t.programsHere(activePrograms.length)}</div>}
                  {activePrograms.map((p) => <ProgramCard key={p.id} p={p} t={t} compact />)}
                </div>
              </Popup>
            )}

            {clusterHover && !activePrograms && (
              <Popup longitude={clusterHover.lng} latitude={clusterHover.lat} offset={20}
                closeButton={false} closeOnClick={false} focusAfterOpen={false} maxWidth="260px">
                <div className="popup cluster-pop">
                  <strong>{t.count(clusterHover.names.length)}</strong>
                  <ul>{clusterHover.names.slice(0, 4).map((n) => <li key={n}>{n}</li>)}</ul>
                  <span className="muted">{t.zoomIn}{clusterHover.names.length > 4 ? ` +${clusterHover.names.length - 4}` : ''}</span>
                </div>
              </Popup>
            )}
          </Map>
          <button className="reset" onClick={resetView}>{t.resetView}</button>
          {activePrograms && !isDesktop && (
            <div className="sheet" role="dialog" aria-label={activePrograms[0].location.address}>
              <div className="sheet-handle" aria-hidden="true" />
              <button className="sheet-close" aria-label={t.close} onClick={() => { setPinnedLoc(null); setHoverLoc(null); }}>×</button>
              {activePrograms.length > 1 && <div className="popup-head">{t.programsHere(activePrograms.length)}</div>}
              {activePrograms.map((p) => <ProgramCard key={p.id} p={p} t={t} compact />)}
            </div>
          )}
        </section>

        <aside className="list-pane">
          <div className="list-tabs" role="tablist">
            {[
              ['map', isDesktop ? t.tabInView : t.tabLocations, inView.length],
              ['regional', t.tabRegional, groups.regional.length],
              ['everywhere', t.tabEverywhere, groups.everywhere.length],
            ].map(([key, label, n]) => (
              <button key={key} role="tab" aria-selected={listTab === key} className={listTab === key ? 'on' : ''}
                onClick={() => setListTab(key)}>
                <span>{label}</span><span className="badge">{n}</span>
              </button>
            ))}
          </div>
          <div className="list" aria-live="polite">
            {zip && <div className="zip-banner">{zinfo ? t.resultsFor(zip) : t.unknownZip(zip)}</div>}
            <p className="tab-desc">
              {listTab === 'map' ? (isDesktop ? t.descInView : t.descLocations)
                : listTab === 'regional' ? t.descRegional : t.descEverywhere}
            </p>
            {listTab === 'map' && (
              inView.length ? inView.map((p) => (
                <ProgramCard key={p.id} p={p} t={t} active={activeLoc === p.location.id}
                  onFocus={() => focusProgram(p)} onHover={(q) => setHoverLoc(q ? q.location.id : null)} />
              )) : <p className="muted pad">{groups.site.length ? t.noneInView : t.noResults}</p>
            )}
            {listTab === 'regional' && groups.regional.map((p) => <ProgramCard key={p.id} p={p} t={t} />)}
            {listTab === 'everywhere' && groups.everywhere.map((p) => <ProgramCard key={p.id} p={p} t={t} />)}
          </div>
        </aside>
      </main>
    </div>
  );
}

function useMediaQuery(q) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}
