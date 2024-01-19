import {UniversalTreeItem} from '@/providers/UniversalTreeItem';
import BaseTreeView, {TreeViewEnum} from './BaseTreeView';
import {UniversalTreeProvider} from '../providers/UniversalTreeProvider';
import {EXTENSION_UNIVERSAL_VIEW_ID} from '../constants';
import UniversalBookmarkController from '@/controllers/UniversalBookmarkController';

/**
 * 通用的书签视图
 * 主要记录不是根据项目的代码相关的书签视图
 * 比如: 链接书签, 非工程项目中的保存的书签(全局的)
 */
export class UniversalBookmarksTreeView extends BaseTreeView<
  UniversalTreeItem,
  UniversalBookmarkController
> {
  type: TreeViewEnum = TreeViewEnum.UNIVERSAL;
  constructor() {
    super(EXTENSION_UNIVERSAL_VIEW_ID, new UniversalTreeProvider());
  }
}
