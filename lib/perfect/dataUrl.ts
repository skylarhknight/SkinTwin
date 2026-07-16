/** Decode a browser data URL to bytes (API routes run on Node). */
export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const m = /^data:([^;]*);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) throw new Error("Invalid or unsupported data URL (expected base64).");
  const b64 = m[2].replace(/\s/g, "");
  const buf = Buffer.from(b64, "base64");
  const copy = new Uint8Array(buf.length);
  copy.set(buf);
  return copy.buffer;
}
