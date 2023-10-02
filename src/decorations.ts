import {
  DecorationRangeBehavior,
  ExtensionContext,
  MarkdownString,
  OverviewRulerLane,
  TextEditor,
  TextEditorDecorationType,
  window,
} from 'vscode';

import {
  BookmarkColor,
  BookmarkDecorationKey,
  BookmarkMeta,
  CreateDecorationOptions,
  StringIndexType,
} from './types';
import { BookmarksController } from './controllers/BookmarksController';
import { createBookmarkIcon, svgToUri } from './utils/icon';
import logger from './utils/logger';
import { DEFAULT_BOOKMARK_COLOR, EXTENSION_ID } from './constants';
import { getAllColors, getConfiguration } from './configurations';
import gutters from './gutter';
import { createHoverMessage } from './utils/bookmark';

export let decorations = {} as Record<
  BookmarkDecorationKey,
  TextEditorDecorationType
>;

/**
 * 初始化`decorations`
 * @param context {ExtensionContext}
 */
export function initDecorations(context?: ExtensionContext) {
  disposeAllDiscorations();
  decorations = {};
  const configuration = getConfiguration();
  const colors = getAllColors(true);
  const options: CreateDecorationOptions = {
    showGutterIcon: configuration.get('showGutterIcon') || false,
    showGutterInOverviewRuler:
      configuration.get('showGutterInOverviewRuler') || false,
  };
  Object.keys(colors).forEach((item) => {
    decorations[item] = createDecoration(item, options);
  });
}

export function createDecoration(
  colorLabel: string,
  options: CreateDecorationOptions,
  defaultColor: string = DEFAULT_BOOKMARK_COLOR
) {
  const colors = getAllColors();
  const color = colors[colorLabel];
  const gutterIconPath = svgToUri(createBookmarkIcon(color || defaultColor));

  // 初始化gutter 颜色
  gutters[colorLabel] = gutterIconPath;

  let overviewRulerColor;
  let overviewRulerLane: OverviewRulerLane | undefined = undefined;

  if (options.showGutterInOverviewRuler) {
    overviewRulerColor = color;
    overviewRulerLane = OverviewRulerLane.Center;
  } else {
    overviewRulerColor = undefined;
  }
  const decoration = window.createTextEditorDecorationType({
    gutterIconPath: options.showGutterIcon ? gutterIconPath : undefined,
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
    textDecoration: `underline ${color}`,
    isWholeLine: false,
    borderRadius: '2px',
    borderColor: `${color}`,
    border: `0 solid ${color}`,
    fontWeight: 'bold',
    overviewRulerLane,
    overviewRulerColor,
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
    let hoverMessage = createHoverMessage(bookmark, true);
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
  const colors = getAllColors();
  const decorationsGroupByLevel: StringIndexType<any[]> = {};
  Object.keys(colors).forEach((color) => {
    if (!decorationsGroupByLevel[color]) {
      decorationsGroupByLevel[color] = [] as any;
    }
    decorationsGroupByLevel[color].push(
      ...bookmarks.filter((it) => it.color == color)
    );
  });
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
