import { ExtensionContext, Uri } from 'vscode';
import { createCircleIcon, svgToUri } from './utils/icon';
export interface Gutter {
  icon: {
    light: Uri;
    dark: Uri;
  };
}

export function getGutter(context: ExtensionContext): Gutter {
  const $gutter: Gutter = {
    icon: {
      light: svgToUri(createCircleIcon('red')),
      dark: svgToUri(createCircleIcon('white')),
    },
  };
  return {
    ...$gutter,
  };
}
