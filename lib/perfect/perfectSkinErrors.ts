/** Thrown when Perfect skin task completes with error/failed (e.g. bad framing). */
export class PerfectSkinAnalysisRejectedError extends Error {
  readonly code?: string;
  readonly title: string;
  readonly hint: string;

  constructor(code: string | undefined, hint: string) {
    super(hint);
    this.name = "PerfectSkinAnalysisRejectedError";
    this.code = code || undefined;
    this.hint = hint;
    this.title = rejectedTitleForCode(code);
  }
}

export function rejectedTitleForCode(code: string | undefined): string {
  if (!code) return "Photo not accepted";
  if (code === "error_src_face_too_small") return "Face too small or resolution too low";
  if (code === "error_src_face_out_of_bound") return "Face not centered or cut off";
  return "Photo not accepted";
}
