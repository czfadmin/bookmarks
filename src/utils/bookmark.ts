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
  TextDocumentContentChangeEvent,
  TextDocument,
  TextDocumentChangeEvent,
} from 'vscode';
import { BookmarksController } from '../controllers/BookmarksController';
import {
  updateActiveEditorAllDecorations,
  updateDecorationsByEditor,
} from '../decorations';
import { getAllColors } from '../configurations';
import gutters from '../gutter';
import { BookmarkMeta, BookmarkStoreType, LineBookmarkContext } from '../types';

/**
 * 检查当前行是否存在标签, 并移除对应标签
 */
export function checkIfBookmarkIsInGivenSelectionAndRemove(
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
 * 从当前行获取书签,如果存在返回书签, 反之undefined
 * @returns
 */
export function getBookmarkFromCurrentActivedLine(): BookmarkMeta | undefined {
  const editor = window.activeTextEditor;
  if (!editor) return;

  const store = BookmarksController.instance.getBookmarkStoreByFileUri(
    editor.document.uri
  );
  if (!store) return;
  const lineNumber = editor.selection.active.line;
  const line = editor.document.lineAt(lineNumber);
  const range = new Selection(
    line.lineNumber,
    line.text.indexOf(line.text.trim()),
    line.lineNumber,
    line.range.end.character
  );

  return getBookmarkFromSelection(store, [range]);
}

/**
 * 从当前编辑的行号获取当前位置存在的书签
 */
export function getBookmarkFromLineNumber(
  store?: BookmarkStoreType
): BookmarkMeta | undefined {
  const editor = window.activeTextEditor;
  if (!editor) return;

  let _store = store;
  if (!_store) {
    _store = BookmarksController.instance.getBookmarkStoreByFileUri(
      editor.document.uri
    );
  }
  if (!store) return;

  const lineNumber = editor.selection.active.line;
  let bookmark;
  const bookmarks = store.bookmarks;
  try {
    for (bookmark of bookmarks) {
      if (bookmark.selection.active.line === lineNumber) {
        throw new Error(bookmark.id);
      }
    }
  } catch (error) {
    const id = (error as any).message;
    return bookmarks.find((it) => it.id === id);
  }
}

/**
 * 从当前编辑的行号获取当前位置存在的书签
 * @param store {BookmarkStoreType | undefined}
 * @returns  返回书签列表或者 `undefined`
 */
export function getBookmarksBelowChangedLine(
  store?: BookmarkStoreType
): BookmarkMeta[] | undefined {
  const editor = window.activeTextEditor;
  if (!editor) return;

  let _store = store;
  if (!_store) {
    _store = BookmarksController.instance.getBookmarkStoreByFileUri(
      editor.document.uri
    );
  }
  if (!store) return;

  const lineNumber = editor.selection.active.line;
  const bookmarks = store.bookmarks
    .map((it) => ({
      ...it,
      startLine: it.selection.start.line,
      endLine: it.selection.end.line,
    }))
    .sort((a, b) => a.startLine - b.startLine);

  return bookmarks.filter((it) => it.startLine > lineNumber);
}

/**
 * 从当前的行或者选择区域筛选出书签
 * @param bookmarkStore {BookmarkStoreType}
 * @param ranges {Range[]}
 */
export function getBookmarkFromSelection(
  bookmarkStore: BookmarkStoreType | undefined,
  ranges: Range[]
): BookmarkMeta | undefined {
  if (bookmarkStore) {
    const existedBookmaks = bookmarkStore.bookmarks;
    let item;
    try {
      for (item of existedBookmaks) {
        let range: Range;
        for (range of ranges) {
          if (item.type === 'line' && range.isEqual(item.selection)) {
            throw new Error(item.id);
          }
          if (item.type === 'selection' && item.selection.contains(range)) {
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
 * 从当前选中区域选取筛选出书签
 * @param bookmarkStore {BookmarkStoreType}
 * @param ranges {Range[]}
 */
export function getBookmarkFromRanges(
  bookmarkStore: BookmarkStoreType | undefined,
  ranges: Range[]
): BookmarkMeta | undefined {
  if (bookmarkStore) {
    const existedBookmaks = bookmarkStore.bookmarks;
    let item;
    try {
      for (item of existedBookmaks) {
        let range: Range;
        for (range of ranges) {
          if (item.selection.contains(range)) {
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
  bookmark.description = memo;
  BookmarksController.instance.update(bookmark, {
    description: memo,
    rangesOrOptions: {
      ...bookmark.rangesOrOptions,
      hoverMessage: createHoverMessage(bookmark, true, true),
    },
  });
  updateActiveEditorAllDecorations();
  BookmarksController.instance.refresh();
}

export function editBookmarkLabel(bookmark: BookmarkMeta, label: string) {
  BookmarksController.instance.editLabel(bookmark, label);
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
  const activedLine = editor.document.lineAt(selection.active.line);
  label = _label || activedLine.text.trim();
  if (bookmarkType === 'line') {
    const startPos = activedLine.text.indexOf(activedLine.text.trim());
    range = new Selection(
      activedLine.lineNumber,
      startPos,
      activedLine.lineNumber,
      activedLine.range.end.character
    );

    selectionContent = activedLine.text.trim();
  } else {
    range = editor.selection;
    if (range.isEmpty) {
      return;
    }
    selectionContent = editor.document.getText(range);
  }

  if (
    bookmarkType === 'line' &&
    checkIfBookmarkIsInGivenSelectionAndRemove(editor, range)
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
    label,
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
  const bookmark = getBookmarkFromSelection(
    BookmarksController.instance.getBookmarkStoreByFileUri(doc.uri),
    ranges
  );
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

/**
 * 创建`hoverMessage`
 * @param bookmark
 * @returns
 */
export function createHoverMessage(
  bookmark: Omit<BookmarkMeta, 'id'>,
  showExtIcon: boolean = false,
  isRestore: boolean = false
) {
  const {
    rangesOrOptions: { hoverMessage: _hoverMessage },
  } = bookmark;
  let markdownString = isRestore
    ? new MarkdownString('', true)
    : _hoverMessage || new MarkdownString('', true);
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

const isNewLineRegex = /\r\n(\s.*?)/g;
export function updateBookmarksGroupByChangedLine(
  store: BookmarkStoreType,
  event: TextDocumentChangeEvent,
  change: TextDocumentContentChangeEvent,
  changeNumber: number
) {
  const { document } = event;
  const isNewLine = isNewLineRegex.test(change.text);

  const isDeleteLine = change.range.end.line > change.range.start.line;
  const bookmarkInCurrentLine = getBookmarkFromLineNumber(store);
  // 1. 当发生改变的区域存在行书签
  if (bookmarkInCurrentLine) {
    // 发生改变的行
    const changedLine = document.lineAt(change.range.start.line);
    // 当前所在行的位置
    const range = new Selection(
      new Position(
        changedLine.lineNumber,
        changedLine.text.indexOf(changedLine.text.trim())
      ),
      new Position(changedLine.lineNumber, changedLine.range.end.character)
    );
    // 更新当前行的书签信息
    updateLineBookmarkRangeWhenDocumentChange(bookmarkInCurrentLine, {
      range,
      selectionContent: changedLine.text.trim(),
    });
    // TODO: 当前行存在行书签, 进行回车, 转换成区域书签,后续可能删除之前新增的行, 重新计算 range
    return;
  }

  if (!isNewLine && !isDeleteLine) return;
  // 2. 当前所发生改变的change 不存在书签 1> 发生改变的行下方的书签, 回车, 新增 , 以及删除
  const bookmarksBlowChangedLine = getBookmarksBelowChangedLine(store);
  if (bookmarksBlowChangedLine && bookmarksBlowChangedLine.length) {
    const changeLines = isDeleteLine
      ? change.range.start.line - change.range.end.line
      : isNewLine
      ? change.text.match(/\r\n/g)!.length
      : 0;
    console.log(bookmarksBlowChangedLine);
    let bookmark, range, line, startLine, startPos;
    for (bookmark of bookmarksBlowChangedLine) {
      startLine = bookmark.rangesOrOptions.range.start.line + changeLines;
      line = document.lineAt(startLine);
      startPos = line.text.indexOf(line.text.trim());
      range = bookmark.rangesOrOptions.range;
      // TODO: 判断 文档改变的类型,是新增还是删除
      range = new Selection(
        new Position(startLine, startPos),
        new Position(startLine, line.range.end.character)
      );

      // 更新当前行的书签信息
      updateLineBookmarkRangeWhenDocumentChange(bookmark, {
        range,
        selectionContent: bookmark.selectionContent,
      });
    }
  }
}
export function updateLineBookmarkRangeWhenDocumentChange(
  bookmark: any,
  dto: any
) {
  const { range, selectionContent } = dto;
  // 更新当前行的书签信息
  BookmarksController.instance.update(bookmark, {
    selection: range,
    selectionContent,
    rangesOrOptions: {
      ...bookmark.rangesOrOptions,
      range,
      hoverMessage: createHoverMessage(bookmark, true, true),
    },
  });
}
/**
 * TODO: 当change关联区域标签
 * @param store
 * @param extra
 */
export function updateBookmarksBySelection(
  store: BookmarkStoreType,
  extra: {
    event: TextDocumentChangeEvent;
    change: TextDocumentContentChangeEvent;
  }
) {}
