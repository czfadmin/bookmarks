import { ExtensionContext, Uri } from 'vscode';
import { createBookmarkIcon, svgToUri } from './utils/icon';

export interface Gutter {
  normal: Uri | string;
  low: Uri | string;
  high: Uri | string;
  none: Uri | string;
}
let gutters: Gutter = {
  normal: svgToUri(createBookmarkIcon('#0e69d8')),
  low: svgToUri(createBookmarkIcon('#42dd00')),
  high: svgToUri(createBookmarkIcon('#ff0000')),
  none: svgToUri(createBookmarkIcon('#faafff')),
};

export function getGutters(context: ExtensionContext): Gutter {
  let gutters = {
    normal: svgToUri(createBookmarkIcon('#0e69d8')),
    low: svgToUri(createBookmarkIcon('#42dd00')),
    high: svgToUri(createBookmarkIcon('#ff0000')),
    none: svgToUri(createBookmarkIcon('#faafff')),
  };
  return gutters;
}

export default gutters;
