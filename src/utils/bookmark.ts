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
  ThemeIcon,
} from 'vscode';
import {
  BookmarkTreeItemCtxValueEnum,
  BookmarkTypeEnum,
  BookmarkActionContext,
  TreeViewGroupEnum,
  TreeViewSortedEnum,
} from '../types';
import {resolveBookmarkController} from '../bootstrap';
import resolveServiceManager from '../services/ServiceManager';
import {IBookmark} from '../stores/bookmark';
import {IBookmarkGroup} from '../stores';
import {DEFAULT_BOOKMARK_GROUP_ID} from '../constants/bookmark';
import BookmarkTreeItem from '../providers/BookmarksTreeItem';
import {EXTENSION_NAME} from '../constants';

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
  let item: any;
  let matched: any[] = [];

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
): IBookmark | undefined {
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
): IBookmark[] | undefined {
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
  return bookmarks
    .sort((a, b) => a.selection.start.line - b.selection.start.line)
    .filter(it => it.selection.start.line > lineNumber);
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
export async function gotoSourceLocation(bookmark?: IBookmark) {
  if (!bookmark) {
    return;
  }
  const activeEditor = window.activeTextEditor;
  const {fileId, rangesOrOptions, selection} = bookmark;

  const range = selection || rangesOrOptions?.range;
  const openedUri = Uri.from({
    scheme: 'file',
    path: fileId,
  });

  if (!range) {
    const doc = await workspace.openTextDocument(openedUri);

    if (!doc) {
      return;
    }
    await window.showTextDocument(doc);
    return;
  }

  if (activeEditor) {
    if (activeEditor.document.uri.fsPath === fileId) {
      activeEditor.revealRange(range);
      const {start, end} = range;
      highlightSelection(
        activeEditor,
        range,
        new Position(start.line, start.character),
        new Position(end.line, end.character),
      );
    } else {
      openDocumentAndGotoLocation(openedUri, range);
    }
  } else {
    openDocumentAndGotoLocation(openedUri, range);
  }
}

/**
 * 打开文档并跳转高亮对应的选择区域
 * @param fileUri
 * @param range
 * @returns
 */
export async function openDocumentAndGotoLocation(fileUri: Uri, range: Range) {
  const doc = await workspace.openTextDocument(fileUri);

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
 * 开启选择区域的书签,并包含标签
 * @param label
 * @returns
 */
export async function toggleBookmarksWithSelections(label: string) {
  toggleBookmark(undefined, {
    type: BookmarkTypeEnum.SELECTION,
    label,
  });
}

/**
 * 开启行书签
 * @param extra 额外信息
 * @returns
 */
export async function toggleBookmark(
  context: BookmarkActionContext,
  extra: {
    type: BookmarkTypeEnum;
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

  const {type: bookmarkType, label = '', withColor = false} = extra;

  let range, selectionContent;
  const activeLine = editor.document.lineAt(selection.active.line);
  if (bookmarkType === BookmarkTypeEnum.LINE) {
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
    bookmarkType === BookmarkTypeEnum.LINE &&
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

  const bookmark: any = {
    type: bookmarkType,
    label,
    color: chosenColor,
    description: '',
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
    workspaceFolder: workspace.getWorkspaceFolder(editor.document.uri!)!,
  };

  controller.add(bookmark);
}
/**
 * 删除行标签
 * @param context
 * @returns
 */
export function deleteBookmark(context?: BookmarkActionContext) {
  const editor = window.activeTextEditor;
  const controller = resolveBookmarkController();
  let _lineNumber = -1,
    bookmark: IBookmark | undefined;

  // 从 `command palette` 中调用删除操作
  if (!context) {
    if (!editor) {
      return;
    }
    _lineNumber = editor.selection.active.line;
  } else {
    // 从打开的文本编辑器的菜单中调用
    if ('scheme' in context && context.scheme === 'file' && editor) {
      _lineNumber = editor.selection.active.line;
    }

    // 树视图中调用删除命令
    if ('meta' in context) {
      bookmark = context.meta as IBookmark;
    }

    // 从装饰器上调用
    if ('lineNumber' in context) {
      _lineNumber = context.lineNumber - 1;
    }
  }

  if (_lineNumber !== -1) {
    bookmark = getBookmarkFromLineNumber(_lineNumber);
  }
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
  const colors = {...sm.configService.colors};

  const pickItems = Object.keys(colors).map(color => {
    return {
      label: color,
      description: colors[color] || color,
      // TODO: 使用其他图标代替
      // iconPath: (
      //   gutterService.gutters.get(color) || gutterService.gutters.get('default')
      // )?.iconPath,
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
  const chosenBookmarks = await showBookmarksQuickPick();
  if (!chosenBookmarks) {
    return;
  }

  // @ts-ignore
  gotoSourceLocation(chosenBookmarks.meta);
}

/**
 * 创建`hoverMessage`
 * @param bookmark
 * @returns
 */
export function createHoverMessage(
  bookmark: Omit<IBookmark, 'id'>,
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
  bookmark: Omit<IBookmark, 'id'>,
  markdownString: MarkdownString,
  showExtIcon: boolean = false,
) {
  appendExtensionName(bookmark, markdownString, showExtIcon);
  appendGroupInfo(bookmark, markdownString);
  appendLabelOrDescription(bookmark, markdownString);
  appendSelectionContent(bookmark, markdownString);
}

function appendExtensionName(
  bookmark: Omit<IBookmark, 'id'>,
  markdownString: MarkdownString,
  showExtIcon: boolean = false,
) {
  markdownString.appendMarkdown(
    `### ${showExtIcon ? `${bookmark.label || bookmark.description ? '$(tag-add)' : '$(bookmark~sync)'} ${EXTENSION_NAME}\n#### ` : ''}`,
  );
}
function appendLabelOrDescription(
  bookmark: Omit<IBookmark, 'id'>,
  markdownString: MarkdownString,
) {
  markdownString.appendMarkdown(`${bookmark.label || ''}`);
  if (bookmark.description) {
    markdownString.appendMarkdown(`\n${bookmark.description} `);
  }
}

function appendSelectionContent(
  bookmark: Omit<IBookmark, 'id'>,
  markdownString: MarkdownString,
) {
  if (bookmark.selectionContent) {
    const code = resolveMarkdownLineNumber(
      bookmark.rangesOrOptions.range,
      bookmark.selectionContent,
    );
    markdownString.appendCodeblock(code, bookmark.languageId || 'javascript');
  }
}

function appendGroupInfo(
  bookmark: Omit<IBookmark, 'id'>,
  markdownString: MarkdownString,
) {
  if (!bookmark.groupId) {
    return;
  }

  const customParams = {
    type: TreeViewGroupEnum.CUSTOM,
    id: bookmark.groupId,
  };

  const colorParams = {
    type: TreeViewGroupEnum.COLOR,
    id: bookmark.color,
  };

  markdownString.isTrusted = true;

  markdownString.appendMarkdown(
    `[${bookmark.group?.label}](command:bookmark-manager.revealInExplorer?${generateCMDArgs(customParams)}) | [${bookmark.color}](command:bookmark-manager.revealInExplorer?${generateCMDArgs(colorParams)}) | ${bookmark.createdAt.toLocaleString()}\n`,
  );
}

function generateCMDArgs(params: any) {
  return encodeURI(JSON.stringify(params));
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
  const sm = resolveServiceManager();
  const changeText = change.text;
  const isNewLine = REGEXP_NEWLINE.test(changeText);
  const isDeleteLine = change.range.end.line > change.range.start.line;
  const isLineStart = change.range.start.character === 0;
  const bookmarkInCurrentLine = getBookmarkFromLineNumber();
  const {autoSwitchSingleToMultiWhenLineWrap} = sm.configure.configure;
  const cursorLine = document.lineAt(change.range.start.line);
  const bookmarkInCursor = getBookmarkFromLineNumber(
    cursorLine.range.start.line,
  );
  let needUpdateDecorations = false;
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
      if (isDeleteLine && bookmarkType === BookmarkTypeEnum.SELECTION) {
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
      } else if (bookmarkType !== BookmarkTypeEnum.SELECTION) {
        // 当在行标签上发生编辑时
        selection = new Selection(
          new Position(changedLine.lineNumber, startPos),
          new Position(changedLine.lineNumber, changedLine.range.end.character),
        );
        selectionContent = changedLine.text.trim();
        hasChanged = true;
      } else if (!isDeleteLine && bookmarkType === BookmarkTypeEnum.SELECTION) {
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
    } else {
      let newLines = 1;
      const matches = change.text.match(REGEXP_NEWLINE);
      if (matches) {
        newLines = matches.length;
      }
      let startLine = originalSelection.start.line;
      let endLine = originalSelection.end.line;
      let startChar = originalSelection.start.character;
      let endCharacter = changedLine.range.end.character;
      if (autoSwitchSingleToMultiWhenLineWrap) {
        startLine = isLineStart
          ? originalSelection.start.line + newLines
          : originalSelection.start.line;
        endLine += newLines;
        bookmarkType = BookmarkTypeEnum.SELECTION;
        endCharacter = document.lineAt(endLine).range.end.character;
      } else {
        // 如果从行的开头进行换行
        if (isLineStart) {
          startLine += newLines;
          endLine += newLines;
          endCharacter = document.lineAt(endLine).range.end.character;
        }
      }
      const anchor = new Position(startLine, startChar);

      const active = new Position(endLine, endCharacter);

      selection = new Selection(anchor, active);
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
    needUpdateDecorations = true;
  }

  // 如果改动的当前行不存在书签,但是光标移动到新的行存在标签的时候, 需要将当前行的标签range 补充全(要求是单行书签情况下)
  if (
    bookmarkInCursor &&
    bookmarkInCursor.type === BookmarkTypeEnum.LINE &&
    !isLineStart
  ) {
    const selection = new Selection(
      new Position(
        bookmarkInCursor.selection.start.line,
        bookmarkInCursor.selection.start.character,
      ),
      new Position(
        bookmarkInCursor.selection.end.line,
        cursorLine.range.end.character,
      ),
    );
    // 更新当前行的书签信息
    updateLineBookmarkRangeWhenDocumentChange(bookmarkInCursor, {
      selection,
      type: BookmarkTypeEnum.LINE,
      selectionContent: document.getText(selection),
    });

    needUpdateDecorations = true;
  }

  // 2. 当前所发生改变的change 不存在书签 1> 发生改变的行下方的书签, 回车, 新增 , 以及删除
  const blowCursorLine = cursorLine.range.end.line + (bookmarkInCursor ? 1 : 0);
  const bookmarksBlowChangedLine = getBookmarksBelowChangedLine(blowCursorLine);
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
      const {rangesOrOptions} = bookmark;
      startLine = rangesOrOptions.range.start.line + changeLines;
      line = document.lineAt(startLine);
      startPos = line.text.indexOf(line.text.trim());
      selection = rangesOrOptions.range;
      // 当书签为行标签时
      if (bookmark.type === BookmarkTypeEnum.LINE) {
        selection = new Selection(
          new Position(startLine, rangesOrOptions.range.start.character),
          new Position(startLine, line.range.end.character),
        );
      } else {
        // 当是区域标签的时候, 同时更新end的行数
        const endLine = rangesOrOptions.range.end.line + changeLines;
        startPos = rangesOrOptions.range.start.character;
        selection = new Selection(
          new Position(startLine, startPos),
          new Position(endLine, rangesOrOptions.range.end.character),
        );
      }

      // 更新当前行的书签信息
      updateLineBookmarkRangeWhenDocumentChange(bookmark, {
        selection,
        selectionContent: bookmark.selectionContent,
      });
    }
    needUpdateDecorations = true;
  }

  if (needUpdateDecorations) {
    // 这时候要刷新下打开的编辑器的装饰器样式, 要不然会被用户误认为还是将单行书签转换为多行书签显示
    sm.decorationService.updateActiveEditorAllDecorations();
  }
}
/**
 * 更新书签信息辅助函数
 * @param bookmark
 * @param dto
 */
export function updateLineBookmarkRangeWhenDocumentChange(
  bookmark: IBookmark,
  dto: Partial<IBookmark>,
) {
  const {selection, selectionContent, ...rest} = dto;
  bookmark.update({
    selectionContent,
    type: rest.type || bookmark.type,
    rangesOrOptions: {
      ...bookmark.rangesOrOptions,
      range: selection as Range,
    },
  });
}

/**
 * 获取书签的选择区域信息
 * @param bookmark
 * @returns
 */
export function getLineInfoFromBookmark(bookmark: IBookmark) {
  const {start, end} = bookmark.selection;
  if (bookmark.type === BookmarkTypeEnum.LINE) {
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

export function getLineInfoStrFromBookmark(bookmark: IBookmark) {
  const lineInfo = getLineInfoFromBookmark(bookmark);
  return bookmark.type === BookmarkTypeEnum.LINE
    ? `Ln: ${lineInfo.line}`
    : `Start { Ln: ${lineInfo.start?.line}, Col: ${lineInfo.start?.col} }. End { Ln: ${lineInfo.end?.line}, Col: ${lineInfo.end?.col} }`;
}

export function sortBookmarks(
  bookmarks: IBookmark[],
  sortedType: TreeViewSortedEnum,
  groupViewType: TreeViewGroupEnum,
) {
  switch (sortedType) {
    case TreeViewSortedEnum.CUSTOM:
      return bookmarks.sort((a, b) => {
        if (groupViewType === TreeViewGroupEnum.CUSTOM) {
          return a.sortedInfo.custom - b.sortedInfo.custom;
        }
        if (groupViewType === TreeViewGroupEnum.COLOR) {
          return a.sortedInfo.color - b.sortedInfo.color;
        }

        if (
          groupViewType === TreeViewGroupEnum.DEFAULT ||
          groupViewType === TreeViewGroupEnum.FILE
        ) {
          return a.sortedInfo.file - b.sortedInfo.file;
        }

        if (groupViewType === TreeViewGroupEnum.WORKSPACE) {
          return a.sortedInfo.workspace - b.sortedInfo.workspace;
        }
        return a.selection.start.line - b.selection.start.line;
      });

    case TreeViewSortedEnum.CREATED_TIME:
      return bookmarks.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
    case TreeViewSortedEnum.LINENUMBER:
    default:
      return sortBookmarksByLineNumber(bookmarks);
  }
}

/**
 * 对书签进行按照行号排序
 * @param bookmarks
 */
export function sortBookmarksByLineNumber(bookmarks: IBookmark[]) {
  return bookmarks.sort(
    (a, b) => a.selection.start.line - b.selection.start.line,
  );
}

export function getBookmarksFromFileUri(uri: Uri) {
  const controller = resolveBookmarkController();
  return controller.getBookmarkStoreByFileUri(uri);
}

export async function showGroupQuickPick(
  all: boolean = false,
  selectedGroupId?: string,
): Promise<IBookmarkGroup | undefined> {
  const controller = resolveBookmarkController();
  const groups = all
    ? controller.groups
    : controller.groups.filter(it => it.id !== DEFAULT_BOOKMARK_GROUP_ID);

  const placeHolder =
    groups.find(it => it.id === selectedGroupId)?.label || 'Select a group';

  let groupPickItems: QuickPickItem[] = groups.map(it => ({
    label: it.label,
    iconPath: ThemeIcon.Folder,
  }));

  const selectedGroup = await window.showQuickPick(groupPickItems, {
    title: l10n.t('Change bookmark grouping'),
    matchOnDescription: true,
    matchOnDetail: true,
    placeHolder,
  });

  if (!selectedGroup) {
    return;
  }

  return controller.groups.find(it => it.label === selectedGroup.label);
}

/**
 * 从`context`获取书签数据
 * @param cb
 * @returns
 */
export function getBookmarkFromCtx(
  context: BookmarkActionContext,
  cb?: () => void,
) {
  let bookmark: IBookmark | undefined;
  if (
    context &&
    'contextValue' in context &&
    context.contextValue === BookmarkTreeItemCtxValueEnum.BOOKMARK
  ) {
    bookmark = context.meta as IBookmark;
  } else {
    bookmark = getBookmarkFromLineNumber();
  }

  if (!bookmark && cb) {
    cb();
    return;
  }
  return bookmark;
}

/**
 * 从`context`获取书签数据
 * @param cb
 * @returns
 */
export function getBookmarkColorFromCtx(
  context: BookmarkActionContext | BookmarkTreeItem | undefined,
  cb?: () => void,
) {
  let bookmark: IBookmark | undefined;
  if (
    context &&
    'contextValue' in context &&
    context.contextValue === BookmarkTreeItemCtxValueEnum.COLOR
  ) {
    bookmark = context.meta as IBookmark;
  }

  if (!bookmark && cb) {
    cb();
    return;
  }
  return bookmark;
}

export async function showBookmarksQuickPick(bookmarks?: IBookmark[]) {
  let _bookmarks = bookmarks;
  const sm = resolveServiceManager();
  if (!_bookmarks) {
    _bookmarks = resolveBookmarkController().store.bookmarks;
  }

  const quickItems = _bookmarks?.map(it => ({
    label:
      it.label || it.description || it.selectionContent?.slice(0, 120) || '',
    description: getLineInfoStrFromBookmark(it),
    detail: it.fileId,
    meta: it,
    iconPath: it.iconPath,
  }));

  // @ts-ignore
  const selectedBookmark = await window.showQuickPick(quickItems, {
    title: l10n.t('Select a bookmark to jump to the corresponding location.'),
    placeHolder: l10n.t('Please select the bookmark you want to open'),
    matchOnDescription: true,
    matchOnDetail: true,
    ignoreFocusOut: false,
    onDidSelectItem: async (item: QuickPickItem & {meta: IBookmark}) => {
      // @ts-ignore
      let bookmark = typeof item === 'object' ? item.meta : undefined;
      if (bookmark) {
        const doc = await workspace.openTextDocument(
          Uri.from({
            scheme: 'file',
            path: item.meta.fileId,
          }),
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
  if (!selectedBookmark) {
    return;
  }
  // @ts-ignore
  return selectedBookmark.meta;
}
