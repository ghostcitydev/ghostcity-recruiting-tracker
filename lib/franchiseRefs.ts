// Helpers for resolving madden-franchise's 32-char binary-string references
// (15 bits table id + 17 bits row) into actual records. Same technique used
// by the community's `openSave.js` pattern for this file format.

export type TableRef = { tableId: number; row: number };

export function parseRef(bin: unknown): TableRef | null {
  if (typeof bin !== 'string' || bin.length < 32 || !/[1-9]/.test(bin)) return null;
  return { tableId: parseInt(bin.slice(0, 15), 2), row: parseInt(bin.slice(15), 2) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tableByName(franchise: any, name: string) {
  const hits = franchise.tables.filter((t: any) => t.name === name); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!hits.length) throw new Error(`table not found: ${name}`);
  return hits.sort((a: any, b: any) => b.header.recordCapacity - a.header.recordCapacity)[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
}
