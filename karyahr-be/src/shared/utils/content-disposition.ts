/**
 * Builds a Content-Disposition attachment header that cannot inject extra headers.
 */
export function attachmentContentDisposition(fileName: string): string {
  const safe = fileName.replace(/["\\\r\n]/g, "_").trim().slice(0, 200) || "download";
  return `attachment; filename="${safe}"`;
}
