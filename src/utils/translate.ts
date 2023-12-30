import {l10n} from 'vscode';

export function translate(
  message: string,
  args?: Record<string, any> | Array<string | number | boolean>,
) {
  return l10n.t(message, args || []);
}
