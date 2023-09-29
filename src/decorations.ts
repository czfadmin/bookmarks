import {
  DecorationRangeBehavior,
  ExtensionContext,
  MarkdownString,
  TextEditor,
  TextEditorDecorationType,
  window,
} from 'vscode';

import { BookmarkLevel, BookmarkMeta } from './types';
import { BookmarksController } from './controllers/BookmarksController';
import { createBookmarkIcon, svgToUri } from './utils/icon';
import logger from './utils/logger';
import { EXTENSION_ID } from './constants';

export type BookmarkDecorationKey =
  | 'low'
  | 'normal'
  | 'high'
  | 'none'
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
  decorations.none = createDecoration('#faafff');
}

export function createDecoration(color: string) {
  const gutterIconPath = svgToUri(createBookmarkIcon(color));
  const decoration = window.createTextEditorDecorationType({
    gutterIconPath,
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
    textDecoration: `underline ${color}DF`,
    isWholeLine: false,
    borderRadius: '2px',
    borderColor: `${color}DF`,
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
    bookmarks: BookmarkMeta[];
  }
) {
  try {
    const rangeOrOptions = createRangeOrOptions(options.bookmarks);
    editor?.setDecorations(decorations[options.level], rangeOrOptions);
  } catch (error) {
    logger.error(error);
  }
}

/**
 * 创建`rangeOrOptions`
 * @param bookmarks
 * @returns
 */
export function createRangeOrOptions(bookmarks: BookmarkMeta[]) {
  const appendMarkdown = (
    bookmark: BookmarkMeta,
    markdownString: MarkdownString
  ) => {
    if (bookmark.label) {
      markdownString.appendMarkdown(
        `### $(bookmark~sync) ${EXTENSION_ID} \n#### ${bookmark.label}`
      );
    }
    if (bookmark.description) {
      markdownString.appendMarkdown(`\n ${bookmark.description}`);
    }
  };

  return bookmarks.map((bookmark) => {
    let hoverMessage =
      bookmark.rangesOrOptions.hoverMessage || new MarkdownString('', true);

    if (Array.isArray(hoverMessage)) {
      const markdownString = new MarkdownString('', true);
      appendMarkdown(bookmark, markdownString);
      hoverMessage.push(markdownString);
    } else if (hoverMessage instanceof MarkdownString) {
      appendMarkdown(bookmark, hoverMessage);
    } else if (!Object.keys(hoverMessage).length) {
      hoverMessage = new MarkdownString('', true);
      appendMarkdown(bookmark, hoverMessage);
    }
    return {
      ...bookmark.rangesOrOptions,
      hoverMessage,
    };
  });
}

/**
 * 更新给定的编辑器中的`decorations`
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
      a[b.level].push(b);
      return a;
    },
    {
      low: [] as any[],
      normal: [] as any[],
      high: [] as any[],
      none: [] as any[],
    }
  ) as { [key: string]: any[] };
  Object.keys(decorationsGroupByLevel).forEach((it) => {
    updateDecoration(editor, {
      level: it as BookmarkLevel,
      bookmarks: clear ? [] : decorationsGroupByLevel[it],
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
