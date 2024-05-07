import {Event, Disposable} from 'vscode';
import {
  BaseMeta,
  TreeViewGroupEnum,
  TreeViewSortedTypeEnum,
  TreeViewStyleEnum,
} from '../types';
import {UniversalStoreType} from './UniversalBookmarkController';
import {IBookmarksStore} from '../stores';

export default interface IController extends Disposable {
  get store(): IBookmarksStore | UniversalStoreType | undefined;

  get totalCount(): number;

  get labeledCount(): number;

  get viewType(): TreeViewStyleEnum;

  get groupView(): TreeViewGroupEnum;

  onDidChangeEvent: Event<void>;

  save(): void;
  remove(id: string): void;

  update(id: string, dto: Partial<Omit<BaseMeta, 'id'>>): void;

  restore(): void;

  clearAll(): void;

  refresh(): void;
  changeViewType(viewType: TreeViewStyleEnum): void;

  changeSortType(sortType: TreeViewSortedTypeEnum): void;
}
