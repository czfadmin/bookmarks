import { Uri } from 'vscode';

export function svgToUri(svg: any) {
  return Uri.parse(`data:image/svg+xml;utf8,${svg}`);
}

/**
 * Create bookmakr gutter icons with different colors.
 */
export function createBookmarkIcon(color: string): string {
  const escappedColor = color.startsWith('#') ? escapeColor(color) : color;
  return `<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${escappedColor}" fill-rule="evenodd" d="M8 2a3 3 0 0 0-3 3v16a1 1 0 0 0 1.447.894L12 19.118l5.553 2.776A1 1 0 0 0 19 21V5a3 3 0 0 0-3-3H8Z"/></svg>`;
}

/**
 * 创建tag 图标
 * @param color
 * @returns
 */
export function createTagIcon(color: string): string {
  const escappedColor = color.startsWith('#') ? escapeColor(color) : color;

  return `<svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M42.1691 29.2451L29.2631 42.1511C28.5879 42.8271 27.6716 43.2069 26.7161 43.2069C25.7606 43.2069 24.8444 42.8271 24.1691 42.1511L8 26V8H26L42.1691 24.1691C43.5649 25.5732 43.5649 27.841 42.1691 29.2451Z" fill="${escappedColor}" stroke="${escappedColor}" stroke-width="3" stroke-linejoin="round"/><path fill-rule="evenodd" clip-rule="evenodd" d="M18.5 21C19.8807 21 21 19.8807 21 18.5C21 17.1193 19.8807 16 18.5 16C17.1193 16 16 17.1193 16 18.5C16 19.8807 17.1193 21 18.5 21Z" fill="white"/></svg>`;
}

/**
 * `%23` is encoded `#` sign (need it to work).
 */
function escapeColor(color: string): string {
  return `%23${color.slice(1)}`;
}
