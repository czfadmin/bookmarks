import * as vscode from 'vscode';

import { BookmarksController } from '../controllers/BookmarksController';
import { BookmarkMeta, BookmarkStoreType } from '../types';
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
