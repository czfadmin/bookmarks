import * as vscode from 'vscode';
import { MarkdownString } from 'vscode';

import { BookmarksController } from '../controllers/BookmarksController';
import { BookmarkMeta, BookmarkStoreType } from '../types';
import gutters from '../gutter';
import { getAllPrettierConfiguration } from '../configurations';
import { getRelativePath } from '../utils';

export class BookmarksTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    contextValue: string,
    public meta: BookmarkStoreType | BookmarkMeta
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    if ('color' in this.meta) {
      this.iconPath = gutters[this.meta.color] || gutters['default'];
    }
    this._createTooltip();
  }

  private _createTooltip() {
    if (this.contextValue === 'item' && 'color' in this.meta) {
      const hoverMessage = this.meta.rangesOrOptions.hoverMessage as
        | MarkdownString
        | MarkdownString[]
        | string;
      this.tooltip = Array.isArray(hoverMessage)
        ? hoverMessage.join('\n')
        : hoverMessage;
      this.description = this.meta.selectionContent?.trim();
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
      const configuration = getAllPrettierConfiguration();
      const isRelativePath = configuration.relativePath;
      const children = bookmarkRootStoreArr.map((it) => {
        let label = it.filename;
        if (isRelativePath) {
          label = getRelativePath(it.filename);
        }
        return new BookmarksTreeItem(
          label,
          vscode.TreeItemCollapsibleState.Collapsed,
          'file',
          it
        );
      });
      return Promise.resolve(children);
    }
    let children: BookmarksTreeItem[] = [];
    try {
      children = (element.meta as BookmarkStoreType).bookmarks.map((it) => {
        const selection = new vscode.Selection(
          it.selection.anchor,
          it.selection.active
        );

        return new BookmarksTreeItem(
          it.label || it.selectionContent || it.id,
          vscode.TreeItemCollapsibleState.None,
          'item',
          {
            ...it,
            selection,
          }
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
