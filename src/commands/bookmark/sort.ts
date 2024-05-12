import {resolveBookmarkController} from '../../bootstrap';
import {TreeViewSortedEnum} from '../../types';

const controlller = resolveBookmarkController();
export function sortedByLineNumber(args: any) {
  if (!controlller) {return;}
  controlller.changeSortType(TreeViewSortedEnum.LINENUMBER);
}

export function sortedByCustom(args: any) {
  if (!controlller) {return;}
  controlller.changeSortType(TreeViewSortedEnum.CUSTOM);
}

export function sortedByCreateTime(args: any) {
  if (!controlller) {return;}
  controlller.changeSortType(TreeViewSortedEnum.CREATED_TIME);
}
