import { Uri } from 'vscode';

export function svgToUri(svg: any) {
  return Uri.parse(`data:image/svg+xml;utf8,${svg}`);
}

/**
 * Create circle gutter icons with different colors.
 */
export function createCircleIcon(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30"><circle cx="15" cy="15" r="7" fill="${escapeColor(
    color
  )}"/></svg>`;
}

/**
 * `%23` is encoded `#` sign (need it to work).
 */
function escapeColor(color: string): string {
  return `%23${color.slice(1)}`;
}
