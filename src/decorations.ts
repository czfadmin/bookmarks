import {
  DecorationRangeBehavior,
  ExtensionContext,
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
import { DEFAULT_BOOKMARK_COLOR } from './constants';
import { getAllColors, getCreateDecorationOptions } from './configurations';
import gutters from './gutter';

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
  const colors = getAllColors(true);
  const options: CreateDecorationOptions = getCreateDecorationOptions();
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
  let color = colors[colorLabel];
  const gutterIconPath = svgToUri(createBookmarkIcon(color || defaultColor));
  // 用户配置
  const {
    fontWeight,
    showTextDecoration,
    showGutterIcon,
    showGutterInOverviewRuler,
    alwaysUseDefaultColor,
    wholeLine,
    textDecorationLine,
    textDecorationStyle,
    textDecorationThickness,
    highlightBackground,
    showBorder,
    border,
    showOutline,
    outline,
  } = options;

  // 初始化gutter 颜色
  gutters[colorLabel] = gutterIconPath;

  let overviewRulerColor;
  let overviewRulerLane: OverviewRulerLane | undefined = undefined;

  if (showGutterInOverviewRuler) {
    overviewRulerColor = color;
    overviewRulerLane = OverviewRulerLane.Center;
  } else {
    overviewRulerColor = undefined;
  }
  let _showGutterIfon = showGutterIcon;

  if (!(showGutterIcon || showGutterInOverviewRuler || showTextDecoration)) {
    window.showInformationMessage(
      `'showGutterIcon', 'showGutterInOverviewRuler','showTextDecoration'不可以同时这只为'false'`
    );
    _showGutterIfon = true;
  }

  if (alwaysUseDefaultColor) {
    color = colors.default;
  }

  const decoration = window.createTextEditorDecorationType({
    isWholeLine: wholeLine,
    borderRadius: '2px',
    borderColor: color,
    outlineColor: color,
    fontWeight,
    overviewRulerLane,
    overviewRulerColor,
    rangeBehavior: DecorationRangeBehavior.ClosedClosed,
    gutterIconPath: _showGutterIfon ? gutterIconPath : undefined,
    border: showBorder ? border : '',
    outline: showOutline ? outline : '',
    backgroundColor: highlightBackground ? color : '',
    textDecoration: showTextDecoration
      ? buildTextDecoration({
          color,
          textDecorationLine,
          textDecorationStyle,
          textDecorationThickness,
        })
      : '',
  });

  return decoration;
}

/**
 * 构建文本装饰器样式
 * @param decorationOptions
 * @returns
 */
function buildTextDecoration(decorationOptions: {
  textDecorationLine: string;
  textDecorationStyle: string;
  textDecorationThickness: string;
  color: string;
}) {
  const {
    textDecorationLine,
    textDecorationStyle,
    textDecorationThickness,
    color,
  } = decorationOptions;
  return `${textDecorationLine} ${textDecorationStyle} ${textDecorationThickness} ${color}`;
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
  return bookmarks.map((bookmark) => bookmark.rangesOrOptions);
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
