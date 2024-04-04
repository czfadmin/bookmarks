import {resolveBookmarkController} from '../../bootstrap';

/**
 * 按照树格式展示
 */
export function viewAsTree(args: any) {
  const controller = resolveBookmarkController();
  controller.changeViewType('tree');
}

/**
 * 按照列表方式显示
 */
export function viewAsList(args: any) {
  const controller = resolveBookmarkController();
  controller.changeViewType('list');
}
