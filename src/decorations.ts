import {
  DecorationOptions,
  DecorationRangeBehavior,
  ExtensionContext,
  Range,
  TextEditor,
  TextEditorDecorationType,
  ThemeColor,
  window,
} from 'vscode';

import { BookmarkLevel } from './types';
import { BookmarksController } from './controllers/BookmarksController';
import { createBookmarkIcon, svgToUri } from './utils/icon';
import logger from './utils/logger';

export type BookmarkDecorationKey =
  | 'low'
  | 'normal'
  | 'high'
  | 'lowHintMessage'
  | 'normalHintMessage'
  | 'highHintMessage';

export const decorations = {} as Record<
  BookmarkDecorationKey,
  TextEditorDecorationType
>;
export function initDecorations(context: ExtensionContext) {
  decorations.normal = createDecoration('#0e69d8');
  decorations.low = createDecoration('#42dd00');
  decorations.high = createDecoration('#ff0000');
}

export function createDecoration(color: string) {
  const gutterIconPath = svgToUri(createBookmarkIcon(color));
  const decoration = window.createTextEditorDecorationType({
    gutterIconPath,
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
    textDecoration: `underline ${color}BF`,
    isWholeLine: false,
    borderRadius: '2px',
    borderColor: `${color}CF`,
    border: `0 solid ${color}AF`,
    fontWeight: 'bold',
    after: {
      backgroundColor: `${color}AA`,
      color: '#ffff',
      margin: '0 6px 0 6px',
    },
  });
  return decoration;
}

export function updateDecoration(
  editor: TextEditor,
  options: {
    level: BookmarkLevel;
    rangesOrOptions: readonly Range[] | readonly DecorationOptions[];
  }
) {
  try {
    editor?.setDecorations(decorations[options.level], options.rangesOrOptions);
  } catch (error) {
    logger.error(error);
  }
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
