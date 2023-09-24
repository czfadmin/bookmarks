import { ExtensionContext, Uri } from 'vscode';
import { createBookmarkIcon, svgToUri } from './utils/icon';

export interface Gutter {
  normal: Uri | string;
  low: Uri | string;
  high: Uri | string;
}
let gutters: Gutter = {
  normal: svgToUri(createBookmarkIcon('#0e69d8')),
  low: svgToUri(createBookmarkIcon('#42dd00')),
  high: svgToUri(createBookmarkIcon('#ff0000')),
};

export function getGutters(context: ExtensionContext): Gutter {
  let gutters = {
    normal: svgToUri(createBookmarkIcon('#0e69d8')),
    low: svgToUri(createBookmarkIcon('#42dd00')),
    high: svgToUri(createBookmarkIcon('#ff0000')),
  };
  return gutters;
}

export default gutters;
