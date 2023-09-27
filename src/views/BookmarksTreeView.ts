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
} from '../constants';
import { registerCommand } from '../utils';
import { updateDecorationsByEditor } from '../decorations';
import { BookmarksController } from '../controllers/BookmarksController';
import { createHash } from '../utils/hash';
import { BookmarkLevel, BookmarkMeta } from '../types';
import { BookmarksTreeProvider } from '../providers/BookmarksTreeProvider';

export class BookmarksTreeView {
  private _provider: BookmarksTreeProvider;
  private _controller: BookmarksController;
  constructor(
    context: vscode.ExtensionContext,
    controller: BookmarksController
  ) {
    this._controller = controller;
    this._provider = new BookmarksTreeProvider(controller);

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
      const editors = vscode.window.visibleTextEditors;
      if (!editors.length) {
        return;
      }
      for (const editor of editors) {
        updateDecorationsByEditor(editor, true);
      }
      this._controller.clearAll();
    });

    registerCommand(context, CMD_DELETE_BOOKMARK, (args) => {});

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
      const bookmark = args.meta;
      this.gotoSourceLocation(bookmark);
    });

    vscode.window.createTreeView(EXTENSION_VIEW_ID, {
      treeDataProvider: new BookmarksTreeProvider(controller),
      showCollapseAll: true,
      canSelectMany: false,
    });
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

    const hash = createHash(fileUri.toString() + selection.active.line);
    // 整行文字
    this._controller.add(editor, {
      id: hash,
      level,
      fileUri,
      label: editor.document.lineAt(selection.start.line).text.trim(),
      rangesOrOptions: {
        range: editor.selection,
        hoverMessage: 'Hover Message',
        renderOptions: {
          after: {
            contentText: 'After....',
            borderColor: '#ffff',
          },
          before: {
            contentText: 'Before....',
          },
        },
      },
    });

    updateDecorationsByEditor(editor);
  }

  gotoSourceLocation(bookmark: BookmarkMeta) {
    const activeEditor = vscode.window.activeTextEditor;
    const { fileUri, rangesOrOptions } = bookmark;
    let range: vscode.Range;
    if ('start' in rangesOrOptions) {
      range = rangesOrOptions;
    } else {
      range = rangesOrOptions.range;
    }
    if (activeEditor) {
      if (activeEditor.document.uri.fsPath === fileUri.fsPath) {
        activeEditor.revealRange(range);
        const { start } = range;
        const line = activeEditor.document.lineAt(
          new vscode.Position(start.line, 0)
        );
        const lineRange = line.range;
        this._highlightSelection(
          activeEditor,
          lineRange,
          new vscode.Position(lineRange.start.line, 0),
          new vscode.Position(lineRange.end.line, line.text.length)
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
      new vscode.Position(lineRange.end.line, line.text.length)
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

  async _createHoverMessage(): Promise<vscode.MarkdownString> {
    // let rangesOrOptions: Partial<vscode.DecorationOptions> = {
    //   range: undefined,
    // };
    // const existedRenderOptions = existed.rangesOrOptions;
    // const { label, description, ...rest } = bookmarkDto;
    // if (label || description) {
    //   let hoverMessage: vscode.MarkdownString =
    //     new vscode.MarkdownString(label || description || '');
    //   // 代表类型为 Range
    //   if ('start' in existedRenderOptions) {
    //     rangesOrOptions = {
    //       range: existedRenderOptions,
    //     };
    //     rangesOrOptions.hoverMessage = hoverMessage;
    //   } else {
    //     rangesOrOptions = {
    //       ...existedRenderOptions,
    //       hoverMessage,
    //     };
    //   }
    // }
    let message = new vscode.MarkdownString('', true);
    message.supportHtml = true;
    message.supportThemeIcons = true;
    return message;
  }
}
