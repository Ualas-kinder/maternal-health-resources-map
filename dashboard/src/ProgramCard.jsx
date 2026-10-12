import { TAB_COLORS } from './i18n.js';

function firstPhone(phone) {
  if (!phone) return null;
  const m = phone.match(/(1-)?\(?\d{3}\)?[-.\s]?[\dA-Z]{3}[-.\s]?[\dA-Z]{4}|\b988\b/);
  return m ? m[0] : null;
}

function telHref(phone) {
  // map letters (e.g. 1-800-799-SAFE) to keypad digits
  const keys = 'ABC2DEF3GHI4JKL5MNO6PQRS7TUV8WXYZ9';
  const digits = phone.toUpperCase().replace(/[A-Z]/g, (ch) => {
    const i = keys.indexOf(ch); let j = i; while (!/\d/.test(keys[j])) j++; return keys[j];
  });
  return `tel:${digits.replace(/[^\d]/g, '')}`;
}

export default function ProgramCard({ p, t, compact, active, onFocus, onHover }) {
  const phone = firstPhone(p.phone);
  const address = p.location ? p.location.address : (p.scope === 'regional' && /^\d/.test(p.address || '') ? p.address : null);
  const serves = p.zipsComplete ? p.zips.join(', ') : t.areas[p.area];
  const color = TAB_COLORS[p.tab];

  return (
    <article
      className={`card ${compact ? 'compact' : ''} ${active ? 'active' : ''}`}
      style={{ '--c': color }}
      onMouseEnter={onHover ? () => onHover(p) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      <div className="cat"><span className="dot" />{t.categories[p.category] || t.tabs[p.tab]}</div>
      {onFocus ? (
        <h3><button className="name-btn" onClick={onFocus}>{p.name}</button></h3>
      ) : (
        <h3>{p.name}</h3>
      )}
      {address && <p className="addr">{address}</p>}
      {p.multipleLocations && <p className="muted small">{t.multipleLocations}</p>}
      {!compact && <p className="muted small">{t.serves}: {serves}</p>}
      {compact && p.zipsComplete && <p className="muted small">{t.serves}: {serves}</p>}
      <div className="actions">
        {phone && <a href={telHref(phone)}>{t.call} {phone}</a>}
        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">{t.website} ↗</a>}
        {address && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
            target="_blank" rel="noopener noreferrer">{t.directions} ↗</a>
        )}
      </div>
    </article>
  );
}
