import {
  DecorationOptions,
  ExtensionContext,
  Range,
  TextEditor,
  TextEditorDecorationType,
  ThemeColor,
  window,
} from 'vscode';

import { getGutters } from './gutter';
import { BookmarkLevel } from './types';
import { BookmarksController } from './controllers/BookmarksController';

export type BookmarkDecorationKey = 'low' | 'normal' | 'high';

export const decorations = {} as Record<
  BookmarkDecorationKey,
  TextEditorDecorationType
>;
export function initDecorations(context: ExtensionContext) {
  const gutter = getGutters(context);
  decorations.normal = window.createTextEditorDecorationType({
    gutterIconPath: gutter.normal,
    // overviewRulerColor: new ThemeColor('inputValidation.errorBackground'),
  });
  decorations.low = window.createTextEditorDecorationType({
    gutterIconPath: gutter.low,
  });
  decorations.high = window.createTextEditorDecorationType({
    gutterIconPath: gutter.high,
  });
}

export function updateDecoration(
  editor: TextEditor,
  options: {
    level: BookmarkLevel;
    rangesOrOptions: readonly Range[] | readonly DecorationOptions[];
  }
) {
  editor?.setDecorations(decorations[options.level], options.rangesOrOptions);
}

/**
 * 更新给定的编辑器中的decorations
 * @param editor {TextEditor}
 * @returns
 */
export const updateDecorationsByEditor = (
  editor: TextEditor,
  clear: boolean = false
) => {
  if (!editor) {
    return;
  }
  if (!BookmarksController.instance) {
    return;
  }
  const bookmarkStore = BookmarksController.instance.getBookmarkStoreByFileUri(
    editor.document.uri
  );
  const bookmarks = bookmarkStore?.bookmarks || [];
  const decorationsGroupByLevel = bookmarks.reduce(
    (a, b) => {
      a[b.level].push(b.rangesOrOptions);
      return a;
    },
    { low: [] as any[], normal: [] as any[], high: [] as any[] }
  ) as { [key: string]: any[] };
  Object.keys(decorationsGroupByLevel).forEach((it) => {
    updateDecoration(editor, {
      level: it as BookmarkLevel,
      rangesOrOptions: clear ? [] : (decorationsGroupByLevel[it] as any[]),
    });
  });
};

/**
 * Dispose all decorations
 */
export function disposeAllDiscorations() {
  for (let decoration of Object.values(decorations)) {
    decoration?.dispose();
  }
}
