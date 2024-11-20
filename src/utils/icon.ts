import {Uri} from 'vscode';

/**
 * `%23` is encoded `#` sign (need it to work).
 */
export function escapeColor(color: string): string {
  return `%23${color.slice(1)}`;
}
