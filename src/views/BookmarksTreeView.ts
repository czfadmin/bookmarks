import {EXTENSION_VIEW_ID} from '../constants';
import BookmarksTreeItem from '../providers/BookmarksTreeItem';
import BaseTreeView, {TreeViewEnum} from './BaseTreeView';
import {BookmarksTreeProvider} from '../providers/BookmarksTreeProvider';
import BookmarksController from '@/controllers/BookmarksController';

export class BookmarksTreeView extends BaseTreeView<
  BookmarksTreeItem,
  BookmarksController
> {
  type: TreeViewEnum = TreeViewEnum.CODE;
  constructor() {
    super(EXTENSION_VIEW_ID, new BookmarksTreeProvider());
    this._buildViewBadge();
    this.disposables.push(
      this.controller.onDidChangeEvent(() => {
        this._buildViewBadge();
      }),
    );
  }

  /**
   * 构建treeView中的 Badge
   */
  private _buildViewBadge() {
    if (this.type !== TreeViewEnum.CODE) return;
    const totalBookmarksNum = this.controller.totalCount;
    this.bookmarkTreeView.badge =
      totalBookmarksNum === 0
        ? undefined
        : {
            tooltip: this._createTooltip(),
            value: totalBookmarksNum,
          };
  }

  private _createTooltip() {
    const total = this.controller.totalCount;
    const labeled = this.controller.labeledCount;
    return `Total: ${total}; Labeled ${labeled}`;
  }
}
