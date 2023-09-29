import { Uri, workspace } from 'vscode';
import { createBookmarkIcon, svgToUri } from './utils/icon';
import { DEFAULT_BOOKMARK_COLOR, EXTENSION_ID } from './constants';

export interface Gutter {
  [key: string]: Uri | string;
}
let gutters: Gutter = {};
export function initGutters() {
  const config = workspace.getConfiguration(`${EXTENSION_ID}`);
  gutters['default'] = svgToUri(
    createBookmarkIcon(
      config.get('defaultBookmarkIconColor') || DEFAULT_BOOKMARK_COLOR
    )
  );
}

export default gutters;
