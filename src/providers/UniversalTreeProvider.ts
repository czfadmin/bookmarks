import {ProviderResult, TreeItemCollapsibleState} from 'vscode';
import {resolveUniversalController} from '../bootstrap';
import BaseTreeProvider from './BaseTreeProvider';
import {UniversalTreeItem} from './UniversalTreeItem';
import UniversalBookmarkController, {
  UniversalStoreType,
} from '../controllers/UniversalBookmarkController';

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
      const arr = (this.datastore as UniversalStoreType).bookmarks || [];

      const children = arr.map(it => {
        let label = '';
        if (it.type === 'link') {
          label = it.label || it.link;
        } else if (it.type === 'command') {
          label = it.label || it.command;
        } else if (it.type === 'code') {
          label = it.label || it.code;
        }
        return new UniversalTreeItem(
          label,
          TreeItemCollapsibleState.None,
          it.type,
          it,
        );
      });
      return Promise.resolve(children);
    }
  }
}
