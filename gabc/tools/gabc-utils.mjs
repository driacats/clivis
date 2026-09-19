// Shared helpers for working with raw GABC files as downloaded from GregoBase
// (header lines, then `%%`, then the score body exsurge actually parses).

export function splitGabc(raw) {
  const idx = raw.indexOf('%%');
  if (idx === -1) {
    throw new Error('No "%%" header/body separator found in GABC source');
  }
  const header = raw.slice(0, idx).trim();
  const body = raw.slice(idx + 2).trim();
  return { header, body };
}

export function parseHeader(header) {
  const fields = {};
  for (const rawLine of header.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const sepIdx = line.indexOf(':');
    if (sepIdx === -1) continue;
    const key = line.slice(0, sepIdx).trim();
    let value = line.slice(sepIdx + 1).trim();
    if (value.endsWith(';')) value = value.slice(0, -1).trim();
    fields[key] = value;
  }
  return fields;
}
