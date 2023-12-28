import * as vscode from 'vscode';

import {BookmarksController} from '../controllers/BookmarksController';
import {BookmarkManagerConfigure, BookmarkStoreType} from '../types';
import {getExtensionConfiguration} from '../configurations';
import {getRelativePath} from '../utils';

import {BookmarksTreeItem} from './BookmarksTreeItem';

export class BookmarksTreeProvider
  implements vscode.TreeDataProvider<BookmarksTreeItem>
{
  private _onDidChangeEvent = new vscode.EventEmitter<BookmarksTreeItem>();
  private _controller: BookmarksController;
  private _extensionConfiguration: BookmarkManagerConfigure | undefined;

  get datasource() {
    return this._controller.datasource;
  }

  get extensionConfiguration() {
    if (!this._extensionConfiguration) {
      this._extensionConfiguration = getExtensionConfiguration();
    }
    return this._extensionConfiguration;
  }

  get isRelativePath() {
    return this.extensionConfiguration.relativePath;
  }

  onDidChangeTreeData?:
    | vscode.Event<
        void | BookmarksTreeItem | BookmarksTreeItem[] | null | undefined
      >
    | undefined = this._onDidChangeEvent.event;

  constructor(controller: BookmarksController) {
    this._controller = controller;
  }

  getTreeItem(
    element: BookmarksTreeItem,
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(
    element?: BookmarksTreeItem | undefined,
  ): vscode.ProviderResult<BookmarksTreeItem[]> {
    if (!element) {
      const bookmarkRootStoreArr = this.datasource?.data || [];

      const children = bookmarkRootStoreArr.map(it => {
        let label = it.filename;
        if (this.isRelativePath) {
          label = getRelativePath(it.filename);
        }
        return new BookmarksTreeItem(
          label,
          vscode.TreeItemCollapsibleState.Collapsed,
          'file',
          it,
        );
      });
      return Promise.resolve(children);
    }
    let children: BookmarksTreeItem[] = [];
    try {
      children = (element.meta as BookmarkStoreType).bookmarks.map(it => {
        const selection = new vscode.Selection(
          it.selection.anchor,
          it.selection.active,
        );

        return new BookmarksTreeItem(
          it.label || it.selectionContent || it.id,
          vscode.TreeItemCollapsibleState.None,
          'bookmark',
          {
            ...it,
            selection,
          },
        );
      });
      return Promise.resolve(children);
    } catch (error) {
      return Promise.resolve([]);
    }
  }

  public refresh() {
    // @ts-ignore
    this._onDidChangeEvent.fire();
  }
}
