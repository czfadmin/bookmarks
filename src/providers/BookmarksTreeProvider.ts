import * as vscode from 'vscode';
import {MarkdownString, l10n} from 'vscode';

import {BookmarksController} from '../controllers/BookmarksController';
import {BookmarkMeta, BookmarkStoreType} from '../types';
import gutters, {getTagGutters} from '../gutter';
import {getAllPrettierConfiguration, getConfiguration} from '../configurations';
import {getRelativePath} from '../utils';
import {getLineInfoStrFromBookmark} from '../utils/bookmark';
import {CMD_GO_TO_SOURCE_LOCATION} from '../constants';

export class BookmarksTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    contextValue: string,
    public meta: BookmarkStoreType | BookmarkMeta,
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    const tagGutters = getTagGutters();
    if ('color' in this.meta) {
      if ('label' in this.meta && this.meta.label) {
        this.iconPath = tagGutters[this.meta.color] || tagGutters['default'];
      } else {
        this.iconPath = gutters[this.meta.color] || gutters['default'];
      }
    } else {
      this.iconPath = vscode.ThemeIcon.File;
    }
    this._createTooltip();
    if (getAllPrettierConfiguration().enableDoubleClick) {
      // TODO:优化
      this.command = {
        title: l10n.t('Jump to bookmark position'),
        command: `bookmark-manager.${CMD_GO_TO_SOURCE_LOCATION}`,
        arguments: [this.meta],
      };
    }
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
      this.description = getLineInfoStrFromBookmark(this.meta);
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
    element: BookmarksTreeItem,
  ): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }
  getChildren(
    element?: BookmarksTreeItem | undefined,
  ): vscode.ProviderResult<BookmarksTreeItem[]> {
    if (!element) {
      const bookmarkRootStoreArr = this.datasource?.data || [];
      const configuration = getAllPrettierConfiguration();
      const isRelativePath = configuration.relativePath;
      const children = bookmarkRootStoreArr.map(it => {
        let label = it.filename;
        if (isRelativePath) {
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
          'item',
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
