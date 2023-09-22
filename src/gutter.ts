import { ExtensionContext, Uri } from 'vscode';
import { createBookmarkIcon, svgToUri } from './utils/icon';

export interface Gutter {
  normal: Uri | string;
  low: Uri | string;
  high: Uri | string;
}

export function getGutters(context: ExtensionContext): Gutter {
  const $gutter: Gutter = {
    normal: svgToUri(createBookmarkIcon('#0e69d8')),
    low: svgToUri(createBookmarkIcon('#42dd00')),
    high: svgToUri(createBookmarkIcon('#ff0000')),
  };
  return {
    ...$gutter,
  };
}
