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
  }
}
