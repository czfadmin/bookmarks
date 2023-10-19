import {
  TextEditor,
  Uri,
  Range,
  Position,
  QuickPickItem,
  Selection,
  TextEditorRevealType,
  window,
  workspace,
  TextLine,
  MarkdownString,
} from 'vscode';
import { BookmarksController } from '../controllers/BookmarksController';
import {
  updateActiveEditorAllDecorations,
  updateDecorationsByEditor,
} from '../decorations';
import { getAllColors } from '../configurations';
import gutters from '../gutter';
import { BookmarkMeta, BookmarkStoreType, LineBookmarkContext } from '../types';
import { DEFAULT_BOOKMARK_COLOR } from '../constants';

/**
 * 检查当前行是否存在标签
 */
export function checkIfBookmarkIsInGivenSelection(
  editor: TextEditor | undefined,
  range: Range
) {
  if (!editor) {
    return;
  }
  const bookmarkStore = BookmarksController.instance.getBookmarkStoreByFileUri(
    editor.document.uri
  );
  if (bookmarkStore) {
    const existedBookmaks = bookmarkStore.bookmarks;
    let item;
    try {
      for (item of existedBookmaks) {
        if (range.isEqual(item.selection)) {
          throw new Error(item.id);
        }
      }
    } catch (error) {
      const _bookmark = existedBookmaks.find(
        (it) => it.id === (error as any).message
      );
      if (_bookmark) {
        BookmarksController.instance.remove(_bookmark);
        updateDecorationsByEditor(editor);
        return true;
      }
    }
  }
  return false;
}

/**
 * 检查给定的editor中是否存在书签
 * @param editor
 */
export function checkIfBookmarksIsInCurrentEditor(editor: TextEditor) {
  const bookmarkStore = BookmarksController.instance.getBookmarkStoreByFileUri(
    editor.document.uri
  );
  return bookmarkStore && bookmarkStore.bookmarks.length;
}

/**
 * 从当前的行或者选取筛选出书签
 * @param editor
 */
export function getBookmarkFromSelection(editor: TextEditor, ranges: Range[]) {
  const bookmarkStore = BookmarksController.instance.getBookmarkStoreByFileUri(
    editor.document.uri
  );
  if (bookmarkStore) {
    const existedBookmaks = bookmarkStore.bookmarks;
    let item;
    try {
      for (item of existedBookmaks) {
        let range: Range;
        for (range of ranges) {
          if (range.isEqual(item.selection)) {
            throw new Error(item.id);
          }
        }
      }
    } catch (error) {
      const _bookmark = existedBookmaks.find(
        (it) => it.id === (error as any).message
      );
      if (_bookmark) {
        return _bookmark;
      }
    }
  }
}

/**
 * 高亮选择区域并跳转到对应选择区域
 *
 * @param editor
 * @param range
 * @param start
 * @param end
 */
export function highlightSelection(
  editor: TextEditor,
  range: Range,
  start: Position,
  end: Position
) {
  editor.selection = new Selection(start, end);
  editor.revealRange(range);
}

/**
 * 调转到对应的书签所在地,并进行高亮选区
 * @param bookmark
 */
export function gotoSourceLocation(bookmark: BookmarkMeta) {
  const activeEditor = window.activeTextEditor;
  const { fileUri, rangesOrOptions, selection } = bookmark;

  const range = selection || rangesOrOptions.range;
  if (activeEditor) {
    if (activeEditor.document.uri.fsPath === fileUri.fsPath) {
      activeEditor.revealRange(range);
      const { start, end } = range;
      highlightSelection(
        activeEditor,
        range,
        new Position(start.line, start.character),
        new Position(end.line, end.character)
      );
    } else {
      openDocumentAndGotoLocation(fileUri, range);
    }
  } else {
    openDocumentAndGotoLocation(fileUri, range);
  }
}

/**
 * 打开文档并跳转高亮对应的选择区域
 * @param fileUri
 * @param range
 * @returns
 */
export async function openDocumentAndGotoLocation(fileUri: Uri, range: Range) {
  const doc = await workspace.openTextDocument(Uri.parse(fileUri.path));

  if (!doc) {
    return;
  }
  const editor = await window.showTextDocument(doc);
  if (!editor) {
    return;
  }
  const { start, end } = range;
  highlightSelection(
    editor,
    range,
    new Position(start.line, start.character),
    new Position(end.line, end.character)
  );
}

/**
 * 编辑对应书签的描述
 * @param bookmark
 * @param memo
 */
export function editBookmarkDescription(bookmark: BookmarkMeta, memo: string) {
  BookmarksController.instance.update(bookmark, {
    description: memo,
  });
  updateActiveEditorAllDecorations();
  BookmarksController.instance.refresh();
}

/**
 * 开启选择区域的书签,并包含标签
 * @param label
 * @returns
 */
export async function toggleBookmarksWithSelections(label: string) {
  toggleBookmark(undefined, {
    type: 'selection',
    label,
  });
}

/**
 * 开启行书签
 * @param level
 * @param extra 额外信息
 * @returns
 */
export async function toggleBookmark(
  context: LineBookmarkContext | undefined,
  extra: {
    type: 'line' | 'selection';
    label?: string;
    withColor?: boolean;
  }
) {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  if (editor.document.isUntitled) {
    return;
  }

  if (!BookmarksController.instance) {
    return;
  }

  let selection = editor.selection;

  if (context && 'lineNumber' in context) {
    const { lineNumber } = context;
    const line = editor.document.lineAt(lineNumber - 1);
    selection = getSelectionFromLine(line);
  }

  if (!selection) {
    return;
  }

  const { type: bookmarkType, label: _label, withColor = false } = extra;

  let label, range, selectionContent;
  if (bookmarkType === 'line') {
    const line = editor.document.lineAt(selection.active.line);
    const startPos = line.text.indexOf(line.text.trim());
    range = new Selection(
      line.lineNumber,
      startPos,
      line.lineNumber,
      line.range.end.character
    );
    label = _label || line.text.trim();
    selectionContent = line.text.trim();
  } else {
    label = _label;
    range = editor.selection;
    if (range.isEmpty) {
      return;
    }
    selectionContent = editor.document.getText(range);
  }

  if (
    bookmarkType === 'line' &&
    checkIfBookmarkIsInGivenSelection(editor, range)
  ) {
    return;
  }

  let choosedColor: string | undefined = getAllColors().default;
  if (withColor) {
    choosedColor = await chooseBookmarkColor();
    if (!choosedColor) {
      return;
    }
  }

  const bookmark: Omit<BookmarkMeta, 'id'> = {
    type: bookmarkType,
    label: _label,
    color: choosedColor,
    selection: range,
    fileUri: editor.document.uri,
    languageId: editor.document.languageId,
    selectionContent,
    rangesOrOptions: {
      range,
      hoverMessage: '',
      renderOptions: {
        after: {},
      },
    },
  };

  bookmark.rangesOrOptions.hoverMessage = createHoverMessage(bookmark, true);
  BookmarksController.instance.add(editor, bookmark);
  updateDecorationsByEditor(editor);
}
/**
 * 删除行标签
 * @param context
 * @returns
 */
export function deleteLineBookmark(context: LineBookmarkContext) {
  if (!context) {
    return;
  }
  let ranges: Range[] = [];
  const editor = window.activeTextEditor;

  if (!editor) {
    return;
  }
  const doc = editor.document;

  ranges.push(
    getSelectionFromLine(
      doc.lineAt(
        'lineNumber' in context
          ? context.lineNumber - 1
          : editor.selection.active.line
      )
    )
  );
  // 获取当前行所在的`bookmark`信息
  const bookmark = getBookmarkFromSelection(editor, ranges);
  if (!bookmark) {
    return;
  }
  BookmarksController.instance.remove(bookmark);
  updateDecorationsByEditor(editor);
}

/**
 * 从当前行中获取`Selection`元素, 其中移除前后空格
 * @param line
 * @returns
 */
export function getSelectionFromLine(
  line: TextLine,
  retainWhitespace: boolean = false
) {
  const startPos = retainWhitespace
    ? line.range.start.character
    : line.text.indexOf(line.text.trim());
  const endPos = line.range.end.character;
  return new Selection(
    new Position(line.lineNumber, startPos),
    new Position(line.lineNumber, endPos)
  );
}

/**
 * 用户所选择的颜色
 * @returns 用户选取的颜色
 */
export async function chooseBookmarkColor() {
  const colors = getAllColors();
  const pickItems = Object.keys(colors).map((color) => {
    return {
      label: color,
      iconPath: gutters[color] || gutters['default'],
    } as QuickPickItem;
  });
  const choosedColor = await window.showQuickPick(pickItems, {
    title: "选择书签颜色.按下'ENTER'键确认,按下'EAPSE'键取消",
    placeHolder: '请选择书签颜色',
    canPickMany: false,
  });
  return choosedColor?.label;
}

/**
 * 快速跳转到书签指定位置
 */
export async function quicklyJumpToBookmark() {
  const datasource = BookmarksController.instance.datasource;
  if (!datasource) {
    return;
  }
  const bookmarksGroupByFile = datasource?.data;
  const pickItems = bookmarksGroupByFile.reduce((arr, b) => {
    arr.push(
      ...b.bookmarks.map((it) => ({
        filename: b.filename,
        label: it.label,
        description: it.description || it.label,
        detail: b.filename,
        iconPath: gutters[it.color] || gutters['default'],
        meta: {
          ...it,
          selection: new Selection(it.selection.anchor, it.selection.active),
        },
      }))
    );
    return arr;
  }, [] as any[]);
  const choosedBookmarks = await window.showQuickPick(pickItems, {
    title: '选择书签以跳转到对应所在位置',
    placeHolder: '请选择想要打开的书签',
    canPickMany: false,
    ignoreFocusOut: false,
    async onDidSelectItem(item: QuickPickItem & { meta: BookmarkMeta }) {
      // @ts-ignore
      let bookmark = typeof item === 'object' ? item.meta : undefined;
      if (bookmark) {
        const doc = await workspace.openTextDocument(
          Uri.parse(bookmark.fileUri.path)
        );
        const editor = await window.showTextDocument(doc, {
          preview: true,
          preserveFocus: true,
        });
        editor.selection = new Selection(
          bookmark.selection.start,
          bookmark.selection.end
        );
        editor.revealRange(
          bookmark.selection,
          TextEditorRevealType.InCenterIfOutsideViewport
        );
      }
    },
  });
  if (!choosedBookmarks) {
    return;
  }

  gotoSourceLocation(choosedBookmarks.meta);
}

function appendMarkdown(
  bookmark: Omit<BookmarkMeta, 'id'>,
  markdownString: MarkdownString,
  showExtIcon: boolean = false
) {
  if (bookmark.label) {
    markdownString.appendMarkdown(
      `### ${showExtIcon ? `$(bookmark~sync) Bookmarks\n#### ` : ''}${
        bookmark.label
      }`
    );
  }
  if (bookmark.description) {
    markdownString.appendMarkdown(`\n${bookmark.description} `);
  }
  if (bookmark.selectionContent) {
    markdownString.appendMarkdown(
      `\n\`\`\`${bookmark.languageId || 'javascript'} \n${
        bookmark.selectionContent
      }\n\`\`\``
    );
  }
}

/**
 * 创建`hoverMessage`
 * @param bookmark
 * @returns
 */
export function createHoverMessage(
  bookmark: Omit<BookmarkMeta, 'id'>,
  showExtIcon: boolean = false
) {
  const {
    rangesOrOptions: { hoverMessage: _hoverMessage },
  } = bookmark;
  let markdownString = _hoverMessage || new MarkdownString('', true);
  if (Array.isArray(markdownString)) {
    const _markdownString = new MarkdownString('', true);
    appendMarkdown(bookmark, _markdownString, showExtIcon);
    markdownString.push(_markdownString);
  } else if (markdownString instanceof MarkdownString) {
    appendMarkdown(bookmark, markdownString, showExtIcon);
  } else if (!Object.keys(markdownString).length) {
    markdownString = new MarkdownString('', true);
    appendMarkdown(bookmark, markdownString, showExtIcon);
  }
  return markdownString;
}
