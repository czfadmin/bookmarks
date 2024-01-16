import {TreeItem, TreeItemCollapsibleState} from 'vscode';

export default class BaseTreeItem extends TreeItem {
  public meta: any;
  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState,
    contextValue: string,
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
  }
}
