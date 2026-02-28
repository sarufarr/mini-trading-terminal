export function parseAccountData(source: Buffer | Uint8Array | unknown): {
  data: Uint8Array;
  view: DataView;
} {
  if (!(source instanceof Uint8Array)) {
    throw new Error(
      `Expected binary account data, got ${typeof source}. ` +
        'Ensure getAccountInfo is called without encoding option.'
    );
  }
  const data = new Uint8Array(
    source.buffer,
    source.byteOffset,
    source.byteLength
  );
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { data, view };
}
