import {BookmarksTreeItem} from './BookmarksTreeItem';
import BaseTreeProvider from './BaseTreeProvider';
import {ProviderResult, Selection, TreeItemCollapsibleState} from 'vscode';
import {BookmarkMeta, BookmarkStoreRootType, BookmarkStoreType} from '../types';
import {resolveBookmarkController} from '../bootstrap';
import BookmarksController from '@/controllers/BookmarksController';

export class BookmarksTreeProvider extends BaseTreeProvider<
  BookmarksTreeItem,
  BookmarksController
> {
  constructor() {
    super(resolveBookmarkController());
  }

  getChildren(
    element?: BookmarksTreeItem | undefined,
  ): ProviderResult<BookmarksTreeItem[]> {
    if (this.controller.viewType === 'tree') {
      return this.getChildrenByFile(element);
    } else {
      return this.getChildrenByList(element);
    }
  }

  getChildrenByFile(element?: BookmarksTreeItem | undefined) {
    if (!element) {
      const bookmarkRootStoreArr = this.controller.groupedByFileBookmarks;
      const children = bookmarkRootStoreArr.map(it => {
        let label = this.isRelativePath
          ? this.getRelativePath(it.fileName)
          : it.fileName;
        return new BookmarksTreeItem(
          label,
          TreeItemCollapsibleState.Collapsed,
          'file',
          it,
        );
      });

      return Promise.resolve(children);
    }
    let children: BookmarksTreeItem[] = [];
    try {
      children = (element.meta as BookmarkStoreType).bookmarks.map(it => {
        const selection = new Selection(
          it.selection.anchor,
          it.selection.active,
        );

        return new BookmarksTreeItem(
          it.label || it.selectionContent || it.id,
          TreeItemCollapsibleState.None,
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
  getChildrenByList(element?: BookmarksTreeItem | undefined) {
    if (!element) {
      const children = (
        this.datasource as BookmarkStoreRootType
      )?.bookmarks.map((it: BookmarkMeta) => {
        const selection = new Selection(
          it.selection.anchor,
          it.selection.active,
        );

        return new BookmarksTreeItem(
          it.label || it.selectionContent || it.id,
          TreeItemCollapsibleState.None,
          'bookmark',
          {
            ...it,
            selection,
          },
        );
      });
      return Promise.resolve(children);
    }
    return Promise.resolve([]);
  }
}
