// Pure helpers for showing API values. Nothing here touches the network
// or the page; every function takes a value and returns a string.

/** Escape text so it can never become markup when placed inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** A dollar value (number or numeric string) as "$641" or "$0.50". */
export function usd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A whole number with thousands separators. */
export function whole(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

/** An ISO date as "Nov 15, 2026, 2:30 PM UTC". */
export function stamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** An ISO date as "Nov 15, 2026". */
export function dayOnly(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

/** An ISO time as "14:32 UTC". */
export function clockOnly(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} UTC`;
}

/** Time until a deadline: "2d 4h left", "3h 12m left", "45m left", "closes soon", "ended". */
export function remaining(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  if (mins > 0) return `${mins}m left`;
  return 'closes soon';
}

/**
 * A deadline's state: "open", "soon" (inside 24h) or "ended".
 * A bounty past its deadline can still read status open until results are
 * published, so the deadline — never the status alone — decides.
 */
export function deadlineKind(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 'ended';
  if (ms <= 86400000) return 'soon';
  return 'open';
}

/** "1 entry" / "5 entries". */
export function entryWords(n) {
  const v = Number(n) || 0;
  return `${whole(v)} ${v === 1 ? 'entry' : 'entries'}`;
}

/** A byte count as "12.4 KB" or "660,778 bytes". */
export function byteWords(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v < 1024) return `${whole(v)} bytes`;
  if (v < 1048576) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1048576).toFixed(2)} MB`;
}

/** A win-rate micro value (0..1,000,000) as "62.5%". */
export function ratePct(micro) {
  const v = Number(micro);
  if (!Number.isFinite(v)) return '—';
  return `${(v / 10000).toFixed(1)}%`;
}

/** Initials for an avatar fallback: "clever-puffin-10" -> "CP". */
export function initials(handle) {
  const parts = String(handle || '?').split(/[-_ ]+/).filter(Boolean);
  return ((parts[0] ? parts[0][0] : '?') + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
