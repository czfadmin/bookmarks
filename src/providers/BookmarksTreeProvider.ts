import * as vscode from 'vscode';
import { EXTENSION_ID, EXTENSION_VIEW_ID } from '../constants';
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
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand(
      `${EXTENSION_ID}.addLineBookmarks`,
      () => {}
    );

    context.subscriptions.push(disposable);
  }
}
