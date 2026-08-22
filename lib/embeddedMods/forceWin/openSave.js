// Small shared helpers used throughout the Force Win engine. Kept as its own
// file (rather than folded into io/saveFile.js) so it mirrors the layout of
// the upstream Ace's CFB Toolkit 0.9.3 "Automatic Force Win" tool this was
// ported from, which makes it much easier to diff against future upstream
// versions if Ace ships an update.

/** Parse a madden-franchise binary reference string into { tableId, row }. */
function parseRef(bin) {
  if (typeof bin !== 'string' || bin.length < 32 || !/[1-9]/.test(bin)) return null;
  return { tableId: parseInt(bin.slice(0, 15), 2), row: parseInt(bin.slice(15), 2) };
}

/** Safe field getter -- some record proxies throw on unknown/empty fields. */
function sf(record, field) {
  try {
    return record[field];
  } catch {
    return undefined;
  }
}

module.exports = { parseRef, sf };
