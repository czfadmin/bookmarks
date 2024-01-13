import {ProviderResult, Selection, TreeItemCollapsibleState} from 'vscode';
import {resolveUniversalController} from '../bootstrap';
import BaseTreeProvider from './BaseTreeProvider';
import {UniversalTreeItem} from './UniversalTreeItem';
import UniversalBookmarkController, {
  UniversalStoreType,
} from '@/controllers/UniversalBookmarkController';

export class UniversalTreeProvider extends BaseTreeProvider<
  UniversalTreeItem,
  UniversalBookmarkController
> {
  constructor() {
    super(resolveUniversalController());
  }

  getChildren(
    element?: UniversalTreeItem | undefined,
  ): ProviderResult<UniversalTreeItem[]> {
    if (!element) {
      const arr = (this.datasource as UniversalStoreType).bookmarks || [];

      // const children = arr.map(it => {
      //   let label = it.filename || '';
      //   if (it.filename && this.isRelativePath) {
      //     label = this.getRelativePath(it.filename);
      //   } else {
      //     if (it.type === 'link') {
      //       label = it.label || it.link;
      //     } else if (it.type === 'command') {
      //       label = it.label || it.command;
      //     } else if (it.type === 'code') {
      //       label = it.label || it.code;
      //     }
      //   }
      //   return new UniversalTreeItem(
      //     label,
      //     TreeItemCollapsibleState.Collapsed,
      //     'file',
      //     it,
      //   );
      // });
      return Promise.resolve([]);
    }
    let children: UniversalTreeItem[] = [];
    try {
      // children = (element.meta as BookmarkStoreType).bookmarks.map(it => {
      //   const selection = new Selection(
      //     it.selection.anchor,
      //     it.selection.active,
      //   );

      //   return new UniversalTreeItem(
      //     it.label || it.selectionContent || it.id,
      //     TreeItemCollapsibleState.None,
      //     'bookmark',
      //     {
      //       ...it,
      //       selection,
      //     },
      //   );
      // });
      // return Promise.resolve(children);
      return [];
    } catch (error) {
      return Promise.resolve([]);
    }
  }
}
