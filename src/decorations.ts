import {
  DecorationRangeBehavior,
  ExtensionContext,
  MarkdownString,
  TextEditor,
  TextEditorDecorationType,
  window,
  workspace,
} from 'vscode';

import { BookmarkColor, BookmarkMeta } from './types';
import { BookmarksController } from './controllers/BookmarksController';
import { createBookmarkIcon, svgToUri } from './utils/icon';
import logger from './utils/logger';
import { DEFAULT_BOOKMARK_COLOR, EXTENSION_ID } from './constants';
import { getAllColors } from './configurations';
import gutters from './gutter';

export type BookmarkDecorationKey = string | 'default';

export let decorations = {} as Record<
  BookmarkDecorationKey,
  TextEditorDecorationType
>;
export function initDecorations(context: ExtensionContext) {
  decorations = {};
  const colors = getAllColors(true);
  Object.keys(colors).forEach((item) => {
    decorations[item] = createDecoration(item);
  });
  const config = workspace.getConfiguration(`${EXTENSION_ID}`);
  decorations.default = createDecoration(
    'default',
    config.get('defaultBookmarkIconColor')
  );
}

export function createDecoration(
  colorLabel: string,
  defaultColor: string = DEFAULT_BOOKMARK_COLOR
) {
  const colors = getAllColors();
  const color = colors[colorLabel];
  const gutterIconPath = svgToUri(createBookmarkIcon(color || defaultColor));

  // 初始化gutter 颜色
  gutters[colorLabel] = gutterIconPath;

  const decoration = window.createTextEditorDecorationType({
    gutterIconPath,
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
    textDecoration: `underline ${color}`,
    isWholeLine: false,
    borderRadius: '2px',
    borderColor: `${color}`,
    border: `0 solid ${color}`,
    fontWeight: 'bold',
    after: {
      backgroundColor: `${color}`,
      color: '#ffff',
      margin: '0 6px 0 6px',
    },
  });
  return decoration;
}

export function updateDecoration(
  editor: TextEditor,
  options: {
    color: BookmarkColor;
    bookmarks: BookmarkMeta[];
  }
) {
  try {
    const rangeOrOptions = createRangeOrOptions(options.bookmarks);
    const _decorations = decorations;
    editor?.setDecorations(
      decorations[options.color] || _decorations['default'],
      rangeOrOptions
    );
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
  const decorationsGroupByLevel = bookmarks.reduce((a, b) => {
    if (!a[b.color]) {
      a[b.color] = [];
    }
    a[b.color].push(b);
    return a;
  }, {} as { [key: string]: any }) as { [key: string]: any[] };
  Object.keys(decorationsGroupByLevel).forEach((it) => {
    updateDecoration(editor, {
      color: it as BookmarkColor,
      bookmarks: clear ? [] : decorationsGroupByLevel[it],
    });
  });
};

/**
 * 更新激活的编辑器的所有的`Decorations`
 * @param clear 是否要清除`bookmarks`
 * @returns
 */
export function updateActiveEditorAllDecorations(clear: boolean = false) {
  const editors = window.visibleTextEditors;
  if (!editors.length) {
    return;
  }
  for (const editor of editors) {
    updateDecorationsByEditor(editor, clear);
  }
}
/**
 * Dispose all decorations
 */
export function disposeAllDiscorations() {
  for (let decoration of Object.values(decorations)) {
    decoration?.dispose();
  }
}
