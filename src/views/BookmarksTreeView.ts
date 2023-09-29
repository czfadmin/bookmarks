import * as vscode from 'vscode';
import {
  CMD_TOGGLE_BOOKMARK_WITH_LABEL,
  CMD_CLEAR_ALL,
  CMD_TOGGLE_HIGH_BOOKMARK,
  CMD_TOGGLE_LOW_BOOKMARK,
  CMD_TOGGLE_NORMAL_BOOKMARK,
  EXTENSION_VIEW_ID,
  CMD_DELETE_BOOKMARK,
  CMD_EDIT_LABEL,
  CMD_GO_TO_SOURCE_LOCATION,
  CMD_TOGGLE_BOOKMARK_WITH_SECTIONS,
  CMD_BOOKMARK_ADD_MORE_MEMO,
} from '../constants';
import { registerCommand } from '../utils';
import { updateDecorationsByEditor } from '../decorations';
import { BookmarksController } from '../controllers/BookmarksController';
import { BookmarkLevel, BookmarkMeta } from '../types';
import { BookmarksTreeProvider } from '../providers/BookmarksTreeProvider';

export class BookmarksTreeView {
  private _provider: BookmarksTreeProvider;
  private _controller: BookmarksController;

  constructor(
    private context: vscode.ExtensionContext,
    controller: BookmarksController
  ) {
    this._controller = controller;
    this._provider = new BookmarksTreeProvider(controller);

    vscode.window.createTreeView(EXTENSION_VIEW_ID, {
      treeDataProvider: new BookmarksTreeProvider(controller),
      showCollapseAll: true,
      canSelectMany: false,
    });
    this._registerCommands();
  }

  toggleLineBookmark(level: BookmarkLevel) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const selection = editor.selection;
    if (!selection) {
      return;
    }

    if (!this._controller) {
      return;
    }
    if (editor.document.isUntitled) {
      return;
    }

    const fileUri = editor.document.uri;

    const line = editor.document.lineAt(selection.active.line);
    const label = line.text.trim();
    const startPos = line.text.indexOf(label);
    const range = new vscode.Selection(
      line.lineNumber,
      startPos,
      line.lineNumber,
      line.range.end.character
    );
    // 整行文字
    this._controller.add(editor, {
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

  toggleBookmarksWithSelections(input: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const range = editor.selection;
    if (range.isEmpty) {
      vscode.window.showInformationMessage('所选内容不可以为空,请重新操作!');
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
    this._controller.add(editor, bookmark);
    updateDecorationsByEditor(editor);
  }

  gotoSourceLocation(bookmark: BookmarkMeta) {
    const activeEditor = vscode.window.activeTextEditor;
    const { fileUri, rangesOrOptions, selection } = bookmark;

    const range = selection || rangesOrOptions.range;
    if (activeEditor) {
      if (activeEditor.document.uri.fsPath === fileUri.fsPath) {
        activeEditor.revealRange(range);
        const { start, end } = range;
        this._highlightSelection(
          activeEditor,
          range,
          new vscode.Position(start.line, start.character),
          new vscode.Position(end.line, end.character)
        );
      } else {
        this._openDocumentAndGotoLocation(fileUri, range);
      }
    } else {
      this._openDocumentAndGotoLocation(fileUri, range);
    }
  }

  async _openDocumentAndGotoLocation(fileUri: vscode.Uri, range: vscode.Range) {
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.parse(fileUri.path)
    );

    if (!doc) {
      return;
    }
    const editor = await vscode.window.showTextDocument(doc);
    if (!editor) {
      return;
    }
    const { start } = range;
    const line = editor.document.lineAt(new vscode.Position(start.line, 0));
    const lineRange = line.range;
    this._highlightSelection(
      editor,
      lineRange,
      new vscode.Position(lineRange.start.line, 0),
      new vscode.Position(lineRange.end.line, 0)
    );
  }
  _highlightSelection(
    editor: vscode.TextEditor,
    range: vscode.Range,
    start: vscode.Position,
    end: vscode.Position
  ) {
    editor.selection = new vscode.Selection(start, end);
    editor.revealRange(range);
  }

  private _updateActiveEditorAllDecorations(clear: boolean = false) {
    const editors = vscode.window.visibleTextEditors;
    if (!editors.length) {
      return;
    }
    for (const editor of editors) {
      updateDecorationsByEditor(editor, clear);
    }
  }

  private _addMoreMemo(bookmark: BookmarkMeta, memo: string) {
    this._controller.update(bookmark, {
      description: memo,
    });
    this._updateActiveEditorAllDecorations();
    this._controller.refresh();
  }

  private _registerCommands() {
    const context = this.context;
    registerCommand(context, CMD_TOGGLE_NORMAL_BOOKMARK, (args) => {
      this.toggleLineBookmark('normal');
    });
    registerCommand(context, CMD_TOGGLE_LOW_BOOKMARK, (args) => {
      this.toggleLineBookmark('low');
    });
    registerCommand(context, CMD_TOGGLE_HIGH_BOOKMARK, (args) => {
      this.toggleLineBookmark('high');
    });
    registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_LABEL, (args) => {});

    registerCommand(context, CMD_CLEAR_ALL, (args) => {
      this._updateActiveEditorAllDecorations(true);
      this._controller.clearAll();
    });

    registerCommand(context, CMD_DELETE_BOOKMARK, (args) => {
      this._updateActiveEditorAllDecorations(true);
      this._controller.remove(args.meta);
    });

    registerCommand(context, CMD_EDIT_LABEL, (args) => {
      vscode.window
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
            this._controller.editLabel(args.meta, input);
          }
        });
    });

    registerCommand(context, CMD_GO_TO_SOURCE_LOCATION, (args) => {
      this.gotoSourceLocation(args.meta);
    });

    registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_SECTIONS, (args) => {
      vscode.window
        .showInputBox({
          placeHolder: 'Type a label for your bookmarks',
          title:
            'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
        })
        .then((input) => {
          if (!input) {
            return;
          }

          this.toggleBookmarksWithSelections(input);
        });
    });

    registerCommand(context, CMD_BOOKMARK_ADD_MORE_MEMO, (args) => {
      vscode.window
        .showInputBox({
          placeHolder: 'Type more info for your bookmarks',
          title:
            'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
        })
        .then((input) => {
          if (!input) {
            return;
          }

          this._addMoreMemo(args.meta, input);
        });
    });
  }
}
