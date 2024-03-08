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
  TextDocumentChangeEvent,
  l10n,
} from 'vscode';
import {BookmarkMeta, LineBookmarkContext} from '../types';
import {resolveBookmarkController} from '../bootstrap';
import resolveServiceManager from '../services/ServiceManager';
import {defaultColors} from '../constants/colors';

const REGEXP_NEWLINE = /(\r\n)|(\n)/g;
/**
 * 检查当前行是否存在标签, 并移除对应标签
 * @TODO: 将两个操作拆分出来
 */
export function checkIfBookmarkIsInGivenSelectionAndRemove(
  editor: TextEditor | undefined,
  range: Range,
) {
  const controller = resolveBookmarkController();
  if (!editor || !controller) {
    return;
  }
  const bookmarks = controller.getBookmarkStoreByFileUri(editor.document.uri);
  if (!bookmarks.length) {
    return;
  }
  let item;
  let matched = [];

  for (item of bookmarks) {
    if (range.isEqual(item.selection)) {
      matched.push(item.id);
      controller.remove(item.id);
    }
  }
  return matched.length > 0;
}

/**
 * 检查给定的editor中是否存在书签
 * @param editor
 */
export function checkIfBookmarksIsInCurrentEditor(editor: TextEditor) {
  const controller = resolveBookmarkController();
  const bookmarks = controller.getBookmarkStoreByFileUri(editor.document.uri);
  return bookmarks.length;
}

/**
 * 从当前编辑的行号获取当前位置存在的书签
 */
export function getBookmarkFromLineNumber(
  line?: number,
): BookmarkMeta | undefined {
  const editor = window.activeTextEditor;
  const controller = resolveBookmarkController();
  if (!editor) {
    return;
  }
  const bookmarks = controller.getBookmarkStoreByFileUri(editor.document.uri);
  if (!bookmarks.length) {
    return;
  }

  const lineNumber = line || editor.selection.active.line;
  let bookmark;
  const _bookmarks = bookmarks.map(it => ({
    ...it,
    startLine: it.selection.start.line,
    endLine:
      it.selection.end.line > it.selection.start.line
        ? it.selection.end.line
        : it.selection.start.line,
  }));
  try {
    for (bookmark of _bookmarks) {
      if (bookmark.startLine <= lineNumber && lineNumber <= bookmark.endLine) {
        throw new Error(bookmark.id);
      }
    }
  } catch (error) {
    const id = (error as any).message;
    return bookmarks.find(it => it.id === id);
  }
}

/**
 * 从当前编辑的行号获取当前位置存在的书签
 * @param store {BookmarkStoreType | undefined}
 * @returns  返回书签列表或者 `undefined`
 */
export function getBookmarksBelowChangedLine(
  line?: number,
): BookmarkMeta[] | undefined {
  const editor = window.activeTextEditor;
  const controller = resolveBookmarkController();
  if (!editor) {
    return;
  }

  const bookmarks = controller.getBookmarkStoreByFileUri(editor.document.uri);

  if (!bookmarks.length) {
    return;
  }

  const lineNumber = line || editor.selection.active.line;
  const _bookmarks = bookmarks
    .map(it => ({
      ...it,
      startLine: it.selection.start.line,
      endLine: it.selection.end.line,
    }))
    .sort((a, b) => a.startLine - b.startLine);

  return _bookmarks.filter(it => it.startLine > lineNumber);
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
  end: Position,
) {
  editor.selection = new Selection(start, end);
  editor.revealRange(range);
}

/**
 * 调转到对应的书签所在地,并进行高亮选区
 * @param bookmark
 */
export async function gotoSourceLocation(bookmark?: BookmarkMeta) {
  if (!bookmark) {
    return;
  }
  const activeEditor = window.activeTextEditor;
  const {fileUri, rangesOrOptions, selection} = bookmark;

  const range = selection || rangesOrOptions?.range;
  if (!range) {
    const doc = await workspace.openTextDocument(Uri.parse(fileUri.path));

    if (!doc) {
      return;
    }
    await window.showTextDocument(doc);
    return;
  }

  if (activeEditor) {
    if (activeEditor.document.uri.fsPath === fileUri.fsPath) {
      activeEditor.revealRange(range);
      const {start, end} = range;
      highlightSelection(
        activeEditor,
        range,
        new Position(start.line, start.character),
        new Position(end.line, end.character),
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
  const {start, end} = range;
  highlightSelection(
    editor,
    range,
    new Position(start.line, start.character),
    new Position(end.line, end.character),
  );
}

/**
 * 编辑对应书签的描述
 * @param bookmark
 * @param memo
 */
export function editBookmarkDescription(bookmark: BookmarkMeta, memo: string) {
  bookmark.description = memo;
  const controller = resolveBookmarkController();
  controller.update(bookmark.id, {
    description: memo,
    rangesOrOptions: {
      ...bookmark.rangesOrOptions,
      hoverMessage: createHoverMessage(bookmark, true, true),
    },
  });
}

export function editBookmarkLabel(bookmark: BookmarkMeta, label: string) {
  const controller = resolveBookmarkController();
  controller.editLabel(bookmark, label);
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
 * @param extra 额外信息
 * @returns
 */
export async function toggleBookmark(
  context: LineBookmarkContext | undefined,
  extra: {
    type: 'line' | 'selection';
    label?: string;
    withColor?: boolean;
  },
) {
  const controller = resolveBookmarkController();
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  if (editor.document.isUntitled) {
    return;
  }

  let selection = editor.selection;

  if (context && 'lineNumber' in context) {
    const {lineNumber} = context;
    const line = editor.document.lineAt(lineNumber - 1);
    selection = getSelectionFromLine(line);
  }

  if (!selection) {
    return;
  }

  const {type: bookmarkType, label, withColor = false} = extra;

  let range, selectionContent;
  const activeLine = editor.document.lineAt(selection.active.line);
  if (bookmarkType === 'line') {
    const startPos = activeLine.text.indexOf(activeLine.text.trim());
    range = new Selection(
      activeLine.lineNumber,
      startPos,
      activeLine.lineNumber,
      activeLine.range.end.character,
    );

    selectionContent = activeLine.text.trim();
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

  let chosenColor: string | undefined = 'default';
  if (withColor) {
    chosenColor = await chooseBookmarkColor();
    if (!chosenColor) {
      return;
    }
  }
  const fileUri = editor.document.uri;
  const bookmark: Omit<BookmarkMeta, 'id'> = {
    type: bookmarkType,
    label,
    color: chosenColor,
    selection: range,
    fileUri: editor.document.uri,
    languageId: editor.document.languageId,
    selectionContent,
    fileId: fileUri.fsPath,
    fileName: editor.document.fileName,
    rangesOrOptions: {
      range,
      hoverMessage: '',
      renderOptions: {
        after: {},
      },
    },
  };

  bookmark.rangesOrOptions.hoverMessage = createHoverMessage(
    bookmark,
    true,
    true,
  );
  controller.add(bookmark);
}
/**
 * 删除行标签
 * @param context
 * @returns
 */
export function deleteBookmark(context: LineBookmarkContext) {
  const editor = window.activeTextEditor;
  const controller = resolveBookmarkController();
  if (!context || !editor || !controller) {
    return;
  }

  // 获取当前行所在的`bookmark`信息
  const bookmark = getBookmarkFromLineNumber(
    'lineNumber' in context
      ? context.lineNumber - 1
      : editor.selection.active.line,
  );
  if (!bookmark) {
    return;
  }
  controller.remove(bookmark.id);
}

/**
 * 从当前行中获取`Selection`元素, 其中移除前后空格
 * @param line
 * @returns
 */
export function getSelectionFromLine(
  line: TextLine,
  retainWhitespace: boolean = false,
) {
  const startPos = retainWhitespace
    ? line.range.start.character
    : line.text.indexOf(line.text.trim());
  const endPos = line.range.end.character;
  return new Selection(
    new Position(line.lineNumber, startPos),
    new Position(line.lineNumber, endPos),
  );
}

/**
 * 用户所选择的颜色
 * @returns 用户选取的颜色
 */
export async function chooseBookmarkColor() {
  const sm = resolveServiceManager();
  const gutterService = sm.gutterService;
  const colors = {...sm.configService.colors};
  if (
    !sm.configService.configuration.useBuiltInColors &&
    Object.keys(sm.configService.customColors).length
  ) {
    Object.keys(defaultColors).forEach(it => delete colors[it]);
  }

  const pickItems = Object.keys(colors).map(color => {
    return {
      label: color,
      iconPath: (
        gutterService.gutters[color] || gutterService.gutters['default']
      ).iconPath,
    } as QuickPickItem;
  });
  const chosenColor = await window.showQuickPick(pickItems, {
    title: l10n.t(
      "Select bookmark color. Press 'Enter' to confirm, 'Escape' to cancel",
    ),
    placeHolder: l10n.t('Please select bookmark color'),
    canPickMany: false,
  });
  return chosenColor?.label;
}

/**
 * 快速跳转到书签指定位置
 */
export async function quicklyJumpToBookmark() {
  const controller = resolveBookmarkController();
  const sm = resolveServiceManager();
  const gutters = sm.gutterService.gutters;
  const tagGutters = sm.gutterService.tagGutters;
  if (!controller || !controller.datasource) {
    return;
  }

  const pickItems = controller.datasource.bookmarks.map(it => {
    const iconPath = it.label
      ? (tagGutters[it.color] || tagGutters['default']).iconPath
      : (gutters[it.color] || (tagGutters['default'] as any)).iconPath;
    return {
      filename: it.fileName || '',
      label:
        it.label || it.description || it.selectionContent?.slice(0, 120) || '',
      description: getLineInfoStrFromBookmark(it),
      detail: it.fileName,
      iconPath: iconPath as any,
      meta: {
        ...it,
        selection: new Selection(it.selection.anchor, it.selection.active),
      },
    };
  });
  const chosenBookmarks = await window.showQuickPick(pickItems, {
    title: l10n.t('Select a bookmark to jump to the corresponding location.'),
    placeHolder: l10n.t('Please select the bookmark you want to open'),
    canPickMany: false,
    ignoreFocusOut: false,
    async onDidSelectItem(item: QuickPickItem & {meta: BookmarkMeta}) {
      // @ts-ignore
      let bookmark = typeof item === 'object' ? item.meta : undefined;
      if (bookmark) {
        const doc = await workspace.openTextDocument(
          Uri.parse(bookmark.fileUri.path),
        );
        const editor = await window.showTextDocument(doc, {
          preview: true,
          preserveFocus: true,
        });
        editor.selection = new Selection(
          bookmark.selection.start,
          bookmark.selection.end,
        );
        editor.revealRange(
          bookmark.selection,
          TextEditorRevealType.InCenterIfOutsideViewport,
        );
      }
    },
  });
  if (!chosenBookmarks) {
    return;
  }

  gotoSourceLocation(chosenBookmarks.meta);
}

/**
 * 创建`hoverMessage`
 * @param bookmark
 * @returns
 */
export function createHoverMessage(
  bookmark: Omit<BookmarkMeta, 'id'>,
  showExtIcon: boolean = false,
  isRestore: boolean = false,
) {
  const {
    rangesOrOptions: {hoverMessage: _hoverMessage},
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
  showExtIcon: boolean = false,
) {
  markdownString.appendMarkdown(
    `### ${showExtIcon ? `$(bookmark~sync) Bookmarks\n#### ` : ''}${
      bookmark.label || ''
    }`,
  );
  if (bookmark.description) {
    markdownString.appendMarkdown(`\n${bookmark.description} `);
  }
  if (bookmark.selectionContent) {
    const code = resolveMarkdownLineNumber(
      bookmark.selection,
      bookmark.selectionContent,
    );
    markdownString.appendCodeblock(code, bookmark.languageId || 'javascript');
  }
}

/**
 * 为 markdown 增加行信息
 * @param range
 * @param code
 * @returns
 */
function resolveMarkdownLineNumber(range: Range, code: string) {
  const startLine = range.start.line + 1;
  let newCodeStr = `${startLine} ${code.trim()}`;
  const arr = newCodeStr.split('\r\n');
  newCodeStr = arr[0];
  let currentLineNumber = startLine,
    idx;
  for (idx = 1; idx < arr.length; idx++) {
    currentLineNumber += 1;
    newCodeStr = `${newCodeStr}\r\n${currentLineNumber} ${arr[idx]}`;
  }
  return newCodeStr;
}

/**
 * 根据发生的行进行更新书签的位置信息
 * @param store
 * @param event
 * @param change
 * @returns
 */
export function updateBookmarksGroupByChangedLine(
  event: TextDocumentChangeEvent,
  change: TextDocumentContentChangeEvent,
) {
  const {document} = event;

  const changeText = change.text;
  const isNewLine = REGEXP_NEWLINE.test(changeText);

  const isDeleteLine = change.range.end.line > change.range.start.line;

  const bookmarkInCurrentLine = getBookmarkFromLineNumber();
  // 1. 当发生改变的区域存在行书签
  if (bookmarkInCurrentLine) {
    // 发生改变的行
    const changedLine = document.lineAt(change.range.start.line);
    let selection,
      startPos,
      selectionContent,
      bookmarkType = bookmarkInCurrentLine.type,
      hasChanged = false;
    startPos = changedLine.text.indexOf(changedLine.text.trim());
    // 取已保存的书签的其实位置
    const originalSelection = bookmarkInCurrentLine.selection;
    // 只在当前行上进行编辑操作, 未进行换行操作
    if (!isNewLine) {
      if (isDeleteLine && bookmarkType === 'selection') {
        const startLineNumber =
          originalSelection.start.line < changedLine.lineNumber
            ? originalSelection.start.line
            : changedLine.lineNumber;
        const startLine = document.lineAt(startLineNumber);

        const endLineNumber =
          originalSelection.end.line > changedLine.lineNumber
            ? originalSelection.end.line +
              (change.range.start.line - change.range.end.line)
            : originalSelection.end.line;
        const endLine = document.lineAt(endLineNumber);

        selection = new Selection(
          new Position(startLineNumber, startLine.range.start.character),
          new Position(endLineNumber, endLine.range.end.character),
        );
        selectionContent = document.getText(selection);
        hasChanged = true;
      } else if (bookmarkType !== 'selection') {
        // 当在行标签上发生编辑时
        selection = new Selection(
          new Position(changedLine.lineNumber, startPos),
          new Position(changedLine.lineNumber, changedLine.range.end.character),
        );
        selectionContent = changedLine.text.trim();
        hasChanged = true;
      } else if (!isDeleteLine && bookmarkType === 'selection') {
        // 更新区域标签内容
        const startLine = originalSelection.start.line;
        const startText = document.lineAt(startLine).text;
        const startPos = startText.indexOf(startText.trim());
        const endLine = originalSelection.end.line;
        selection = new Selection(
          new Position(startLine, startPos),
          new Position(endLine, document.lineAt(endLine).range.end.character),
        );
        selectionContent = document.getText(selection);
        hasChanged = true;
      }
    } else if (isNewLine) {
      // 进行换行操作, 转换为区域标签
      let newLines = 1;
      const matches = change.text.match(REGEXP_NEWLINE);
      if (matches) {
        newLines = matches.length;
      }
      selection = new Selection(
        new Position(
          originalSelection.start.line,
          originalSelection.start.character,
        ),
        new Position(
          originalSelection.end.line + newLines,
          originalSelection.end.character,
        ),
      );
      bookmarkType = 'selection';
      selectionContent = document.getText(selection);
      hasChanged = true;
    }

    if (!hasChanged) {
      return;
    }
    // 更新当前行的书签信息
    updateLineBookmarkRangeWhenDocumentChange(bookmarkInCurrentLine, {
      selection,
      type: bookmarkType,
      selectionContent,
    });
    return;
  }

  if (!isNewLine && !isDeleteLine) {
    return;
  }
  // 2. 当前所发生改变的change 不存在书签 1> 发生改变的行下方的书签, 回车, 新增 , 以及删除
  const bookmarksBlowChangedLine = getBookmarksBelowChangedLine();
  if (bookmarksBlowChangedLine && bookmarksBlowChangedLine.length) {
    let bookmark,
      selection,
      line,
      startLine,
      startPos,
      matchedNewLines,
      newLines = 1;
    matchedNewLines = change.text.match(REGEXP_NEWLINE);
    if (matchedNewLines) {
      newLines = matchedNewLines.length;
    }
    const changeLines = isDeleteLine
      ? change.range.start.line - change.range.end.line
      : isNewLine
      ? newLines
      : 0;
    for (bookmark of bookmarksBlowChangedLine) {
      startLine = bookmark.rangesOrOptions.range.start.line + changeLines;
      line = document.lineAt(startLine);
      startPos = line.text.indexOf(line.text.trim());
      selection = bookmark.rangesOrOptions.range;
      // 当书签为行标签时
      if (bookmark.type === 'line') {
        selection = new Selection(
          new Position(startLine, startPos),
          new Position(startLine, line.range.end.character),
        );
      } else {
        // 当是区域标签的时候, 同时更新end的行数
        const endLine = bookmark.rangesOrOptions.range.end.line + changeLines;
        selection = new Selection(
          new Position(startLine, startPos),
          new Position(endLine, bookmark.rangesOrOptions.range.end.character),
        );
      }

      // 更新当前行的书签信息
      updateLineBookmarkRangeWhenDocumentChange(bookmark, {
        selection,
        selectionContent: bookmark.selectionContent,
      });
    }
  }
}
/**
 * 更新书签信息辅助函数
 * @param bookmark
 * @param dto
 */
export function updateLineBookmarkRangeWhenDocumentChange(
  bookmark: any,
  dto: any,
) {
  const controller = resolveBookmarkController();
  const {selection, selectionContent, ...rest} = dto;
  if (selectionContent) {
    bookmark.selectionContent = selectionContent;
  }
  // 更新当前行的书签信息
  controller.update(bookmark.id, {
    selection,
    selectionContent,
    ...(rest || {}),
    rangesOrOptions: {
      ...bookmark.rangesOrOptions,
      range: selection,
      hoverMessage: createHoverMessage(bookmark, true, true),
    },
  });
}

/**
 * 获取书签的选择区域信息
 * @param bookmark
 * @returns
 */
export function getLineInfoFromBookmark(bookmark: BookmarkMeta) {
  const {start, end} = bookmark.selection;
  if (bookmark.type === 'line') {
    return {
      line: start.line + 1,
    };
  } else {
    return {
      start: {line: start.line + 1, col: start.character + 1},
      end: {
        line: end.line + 1,
        col: end.character + 1,
      },
    };
  }
}

export function getLineInfoStrFromBookmark(bookmark: BookmarkMeta) {
  const lineInfo = getLineInfoFromBookmark(bookmark);
  return bookmark.type === 'line'
    ? `Ln: ${lineInfo.line}`
    : `Start { Ln: ${lineInfo.start?.line}, Col: ${lineInfo.start?.col} }. End { Ln: ${lineInfo.end?.line}, Col: ${lineInfo.end?.col} }`;
}

/**
 * 对书签进行按照行号排序
 * @param bookmarks
 */
export function sortBookmarksByLineNumber(bookmarks: BookmarkMeta[]) {
  bookmarks.sort((a, b) => a.selection.start.line - b.selection.start.line);
}

export function getBookmarksFromFileUri(uri: Uri) {
  const controller = resolveBookmarkController();
  return controller.getBookmarkStoreByFileUri(uri);
}
