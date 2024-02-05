import {UniversalBookmarkMeta} from '../controllers/UniversalBookmarkController';
import BaseTreeItem from './BaseTreeItem';
import {ThemeIcon, TreeItemCollapsibleState} from 'vscode';

export class UniversalTreeItem extends BaseTreeItem {
  public meta: UniversalBookmarkMeta;
  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState,
    contextValue: string,
    meta: UniversalBookmarkMeta,
  ) {
    super(label, collapsibleState, contextValue);
    this.meta = meta;
    this.iconPath = new ThemeIcon(this.meta.icon || 'file');
  }
}
