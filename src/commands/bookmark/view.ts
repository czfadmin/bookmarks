import {resolveBookmarkController} from '../../bootstrap';
import {TreeViewStyleEnum} from '../../types';

/**
 * 按照树格式展示
 */
export function viewAsTree(args: any) {
  const controller = resolveBookmarkController();
  controller.changeViewType(TreeViewStyleEnum.TREE);
}

/**
 * 按照列表方式显示
 */
export function viewAsList(args: any) {
  const controller = resolveBookmarkController();
  controller.changeViewType(TreeViewStyleEnum.LIST);
}
