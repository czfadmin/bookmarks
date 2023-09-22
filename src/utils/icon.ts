import { Uri } from 'vscode';

export function svgToUri(svg: any) {
  return Uri.parse(`data:image/svg+xml;utf8,${svg}`);
}

/**
 * Create bookmakr gutter icons with different colors.
 */
export function createBookmarkIcon(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${escapeColor(
    color
  )}" fill-rule="evenodd" d="M8 2a3 3 0 0 0-3 3v16a1 1 0 0 0 1.447.894L12 19.118l5.553 2.776A1 1 0 0 0 19 21V5a3 3 0 0 0-3-3H8Z"/></svg>`;
}

/**
 * `%23` is encoded `#` sign (need it to work).
 */
function escapeColor(color: string): string {
  return `%23${color.slice(1)}`;
}
