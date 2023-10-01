import {
  ExtensionContext,
  Position,
  QuickPickItem,
  Range,
  Selection,
  TextEditor,
  TextEditorRevealType,
  Uri,
  window,
  workspace,
} from 'vscode';
import { registerCommand } from './utils';
import {
  CMD_TOGGLE_LINE_BOOKMARK,
  CMD_TOGGLE_BOOKMARK_WITH_LABEL,
  CMD_CLEAR_ALL,
  CMD_DELETE_BOOKMARK,
  CMD_EDIT_LABEL,
  CMD_GO_TO_SOURCE_LOCATION,
  CMD_TOGGLE_BOOKMARK_WITH_SECTIONS,
  CMD_BOOKMARK_ADD_MORE_MEMO,
  CMD_JUMP_TO_BOOKMARK,
  CMD_CHANGE_BOOKMARK_COLOR,
} from './constants';
import {
  updateActiveEditorAllDecorations,
  updateDecorationsByEditor,
} from './decorations';
import { BookmarkMeta } from './types';
import { BookmarksController } from './controllers/BookmarksController';
import { getAllColors } from './configurations';
import gutters from './gutter';

/**
 * 注册所需要的命令
 * @param context
 */
export function registerCommands(context: ExtensionContext) {
  registerCommand(context, CMD_TOGGLE_LINE_BOOKMARK, async (args) => {
    toggleLineBookmark();
  });
  registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_LABEL, (args) => {});

  registerCommand(context, CMD_CLEAR_ALL, (args) => {
    updateActiveEditorAllDecorations(true);
    let fileUri;
    if (args && args.meta) {
      fileUri = args.meta.fileUri;
      BookmarksController.instance.clearAllBookmarkInFile(fileUri);
      return;
    }
    BookmarksController.instance.clearAll();
  });

  registerCommand(context, CMD_DELETE_BOOKMARK, (args) => {
    updateActiveEditorAllDecorations(true);
    BookmarksController.instance.remove(args.meta);
  });

  registerCommand(context, CMD_EDIT_LABEL, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type a label for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((input) => {
        if (!input) {
          return;
        }
        if (args.contextValue === 'item') {
          BookmarksController.instance.editLabel(args.meta, input);
        }
      });
  });

  registerCommand(context, CMD_GO_TO_SOURCE_LOCATION, (args) => {
    gotoSourceLocation(args.meta);
  });

  registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_SECTIONS, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type a label for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((input) => {
        if (!input) {
          return;
        }

        toggleBookmarksWithSelections(input);
      });
  });

  registerCommand(context, CMD_BOOKMARK_ADD_MORE_MEMO, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type more info for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((input) => {
        if (!input) {
          return;
        }

        editBookmarkDescription(args.meta, input);
      });
  });

  registerCommand(context, CMD_JUMP_TO_BOOKMARK, (args) => {
    quicklyJumpToBookmark();
  });

  registerCommand(context, CMD_CHANGE_BOOKMARK_COLOR, async (args) => {
    if (!args || !args.meta) {
      window.showInformationMessage('请选择书签后再更改颜色.', {});
      return;
    }
    const { meta } = args;
    if ('color' in meta) {
      const newColor = await chooseBookmarkColor();
      if (!newColor) {
        return;
      }
      BookmarksController.instance.update(meta, {
        color: newColor,
      });
      updateActiveEditorAllDecorations();
    }
  });
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
 * 调转到对应的书签所在地
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
async function openDocumentAndGotoLocation(fileUri: Uri, range: Range) {
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
function editBookmarkDescription(bookmark: BookmarkMeta, memo: string) {
  BookmarksController.instance.update(bookmark, {
    description: memo,
  });
  updateActiveEditorAllDecorations();
  BookmarksController.instance.refresh();
}

/**
 * 开启选择区域的书签,并包含标签
 * @param input
 * @returns
 */
export async function toggleBookmarksWithSelections(input: string) {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  const range = editor.selection;
  if (range.isEmpty) {
    window.showInformationMessage('所选内容不可以为空,请重新操作!');
    return;
  }

  const color = await chooseBookmarkColor();
  if (!color) {
    return;
  }

  const bookmark: Partial<BookmarkMeta> = {
    selection: range,
    label: input,
    color,
    rangesOrOptions: {
      range: range,
      hoverMessage: '',
      renderOptions: {},
    },
  };
  BookmarksController.instance.add(editor, bookmark);
  updateDecorationsByEditor(editor);
}

/**
 * 开启当前行的行书签
 * @param level
 * @returns
 */
async function toggleLineBookmark() {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  const selection = editor.selection;
  if (!selection) {
    return;
  }

  if (!BookmarksController.instance) {
    return;
  }
  if (editor.document.isUntitled) {
    return;
  }
  const choosedColor = await chooseBookmarkColor();
  if (!choosedColor) {
    return;
  }
  const fileUri = editor.document.uri;

  const line = editor.document.lineAt(selection.active.line);
  const label = line.text.trim();
  const startPos = line.text.indexOf(label);
  const range = new Selection(
    line.lineNumber,
    startPos,
    line.lineNumber,
    line.range.end.character
  );
  const bookmarkStore =
    BookmarksController.instance.getBookmarkStoreByFileUri(fileUri);
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
        return;
      }
    }
  }
  BookmarksController.instance.add(editor, {
    color: choosedColor,
    fileUri,
    label,
    selection: range,
    rangesOrOptions: {
      range,
      hoverMessage: '',
      renderOptions: {
        after: {},
      },
    },
  });

  updateDecorationsByEditor(editor);
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
