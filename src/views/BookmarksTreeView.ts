import {EXTENSION_VIEW_ID} from '../constants';
import BookmarkTreeItem from '../providers/BookmarksTreeItem';
import BaseTreeView, {TreeViewEnum} from './BaseTreeView';
import {BookmarksTreeProvider} from '../providers/BookmarksTreeProvider';
import BookmarksController from '../controllers/BookmarksController';

export class BookmarksTreeView extends BaseTreeView<
  BookmarkTreeItem,
  BookmarksController
> {
  type: TreeViewEnum = TreeViewEnum.CODE;
  constructor() {
    super(EXTENSION_VIEW_ID, new BookmarksTreeProvider());
    this._buildViewBadge();
    this.controller.onDidChangeEvent(() => {
      this._buildViewBadge();
    });
  }

  /**
   * 构建treeView中的 Badge
   */
  private _buildViewBadge() {
    if (this.type !== TreeViewEnum.CODE) {
      return;
    }
    const totalBookmarksNum = this.controller.totalCount;
    // 设置 为 undefined 会出现保留之前的badge状态, 需要设置成下面的数据才可以将badge隐藏
    let badge = {
      tooltip: '',
      value: 0,
    };

    if (totalBookmarksNum !== 0) {
      badge = {
        tooltip: this._createTooltip(),
        value: totalBookmarksNum,
      };
    }

    this.bookmarkTreeView.badge = badge;
  }

  private _createTooltip() {
    const total = this.controller.totalCount;
    const labeled = this.controller.labeledCount;
    return `Total: ${total}; Labeled ${labeled}`;
  }
}
