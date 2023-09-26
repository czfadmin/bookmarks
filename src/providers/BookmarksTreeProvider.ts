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
} from '../constants';

import { registerCommand } from '../utils';
import { updateDecorationsByEditor } from '../decorations';
import { BookmarksController } from '../controllers/BookmarksController';
import { createHash } from '../utils/hash';
import { BookmarkLevel, BookmarkMeta, BookmarkStoreType } from '../types';
import gutters from '../gutter';

export class BookmarksTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    contextValue: string,
    public meta: BookmarkStoreType | BookmarkMeta
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    if ('level' in this.meta) {
      this.iconPath = gutters[this.meta.level];
    }
  }
}

export class BookmarksTreeProvider
  implements vscode.TreeDataProvider<BookmarksTreeItem>
{
  private _onDidChangeEvent = new vscode.EventEmitter<BookmarksTreeItem>();
  private _controller: BookmarksController;

  get datasource() {
    return this._controller.datasource;
  }

  onDidChangeTreeData?:
    | vscode.Event<
        void | BookmarksTreeItem | BookmarksTreeItem[] | null | undefined
      >
    | undefined = this._onDidChangeEvent.event;

  constructor(controller: BookmarksController) {
    this._controller = controller;
    this._controller.updateChangeEvent(this._onDidChangeEvent);
  }

  getTreeItem(
    element: BookmarksTreeItem
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(
    element?: BookmarksTreeItem | undefined
  ): vscode.ProviderResult<BookmarksTreeItem[]> {
    if (!element) {
      const bookmarkRootStoreArr = this.datasource?.data || [];
      const children = bookmarkRootStoreArr.map(
        (it) =>
          new BookmarksTreeItem(
            it.filename,
            vscode.TreeItemCollapsibleState.Collapsed,
            'file',
            it
          )
      );
      return Promise.resolve(children);
    }
    let children: BookmarksTreeItem[] = [];
    try {
      children = (element.meta as BookmarkStoreType).bookmarks.map(
        (it) =>
          new BookmarksTreeItem(
            it.label || it.id,
            vscode.TreeItemCollapsibleState.None,
            'item',
            it
          )
      );
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }
}

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
      const element = args[0];
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
          this._controller.editLabel(element, input);
        });
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
      rangesOrOptions: editor.selection,
    });

    updateDecorationsByEditor(editor);
  }
}
