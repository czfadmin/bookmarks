import {
  ExtensionContext,
  Position,
  Range,
  Selection,
  TextEditor,
  Uri,
  window,
  workspace,
} from 'vscode';
import { registerCommand } from './utils';
import {
  CMD_TOGGLE_NORMAL_BOOKMARK,
  CMD_TOGGLE_LOW_BOOKMARK,
  CMD_TOGGLE_HIGH_BOOKMARK,
  CMD_TOGGLE_BOOKMARK_WITH_LABEL,
  CMD_CLEAR_ALL,
  CMD_DELETE_BOOKMARK,
  CMD_EDIT_LABEL,
  CMD_GO_TO_SOURCE_LOCATION,
  CMD_TOGGLE_BOOKMARK_WITH_SECTIONS,
  CMD_BOOKMARK_ADD_MORE_MEMO,
} from './constants';
import {
  updateActiveEditorAllDecorations,
  updateDecorationsByEditor,
} from './decorations';
import { BookmarkLevel, BookmarkMeta } from './types';
import { BookmarksController } from './controllers/BookmarksController';

/**
 * 注册所需要的命令
 * @param context
 */
export function registerCommands(context: ExtensionContext) {
  registerCommand(context, CMD_TOGGLE_NORMAL_BOOKMARK, (args) => {
    toggleLineBookmark('normal');
  });
  registerCommand(context, CMD_TOGGLE_LOW_BOOKMARK, (args) => {
    toggleLineBookmark('low');
  });
  registerCommand(context, CMD_TOGGLE_HIGH_BOOKMARK, (args) => {
    toggleLineBookmark('high');
  });
  registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_LABEL, (args) => {});

  registerCommand(context, CMD_CLEAR_ALL, (args) => {
    updateActiveEditorAllDecorations(true);
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
  const { start } = range;
  const line = editor.document.lineAt(new Position(start.line, 0));
  const lineRange = line.range;
  highlightSelection(
    editor,
    lineRange,
    new Position(lineRange.start.line, 0),
    new Position(lineRange.end.line, 0)
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
export function toggleBookmarksWithSelections(input: string) {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  const range = editor.selection;
  if (range.isEmpty) {
    window.showInformationMessage('所选内容不可以为空,请重新操作!');
    return;
  }

  const bookmark: Partial<BookmarkMeta> = {
    selection: range,
    label: input,
    level: 'none',
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
function toggleLineBookmark(level: BookmarkLevel) {
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
  BookmarksController.instance.add(editor, {
    level,
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
