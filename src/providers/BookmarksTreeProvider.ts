import * as vscode from 'vscode';
import {
  CMD_TOGGLE_BOOKMARK_WITH_LABEL,
  CMD_TOGGLE_LINE_BOOKMARK,
  EXTENSION_VIEW_ID,
} from '../constants';

import { registerCommand } from '../utils';
import { decorations, updateDecorations } from '../decorations';
export class BookmarksTreeItem extends vscode.TreeItem {}

export class BookmarksTreeProvider
  implements vscode.TreeDataProvider<BookmarksTreeItem>
{
  private _onDidChangeEvenet = new vscode.EventEmitter<BookmarksTreeItem>();

  onDidChangeTreeData?:
    | vscode.Event<
        void | BookmarksTreeItem | BookmarksTreeItem[] | null | undefined
      >
    | undefined = this._onDidChangeEvenet.event;
  getTreeItem(
    element: BookmarksTreeItem
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(
    element?: BookmarksTreeItem | undefined
  ): vscode.ProviderResult<BookmarksTreeItem[]> {
    if (!element) {
      return [];
    }
  }
}

export class BookmarksTreeView {
  constructor(context: vscode.ExtensionContext) {
    vscode.window.createTreeView(EXTENSION_VIEW_ID, {
      treeDataProvider: new BookmarksTreeProvider(),
      showCollapseAll: true,
    });

    registerCommand(context, CMD_TOGGLE_LINE_BOOKMARK, (args) => {
      console.log(args);
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const selection = editor.selection;
      if (!selection) {
        return;
      }
      updateDecorations(editor, [selection]);
      // editor.setDecorations(decorations.normal, [selection]);
    });
    registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_LABEL, (args) => {});
  }
}
