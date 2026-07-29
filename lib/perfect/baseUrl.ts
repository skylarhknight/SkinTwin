/**
 * Perfect endpoint paths are absolute ("/s2s/v2.0/task/skin-simulation"), so the
 * configured base URL has to be the host alone.
 *
 * The Perfect Console hands out a versioned base such as
 * "https://yce-api-01.makeupar.com/s2s/v2.1/", which naively concatenates into
 * ".../s2s/v2.1/s2s/v2.0/task/skin-simulation" and 404s. Strip any trailing
 * "/s2s" or "/s2s/vX.Y" so either form of the env var works.
 */
export function normalizePerfectBaseUrl(url: string): string {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/s2s(\/v\d+(\.\d+)?)?$/i, "");
}
