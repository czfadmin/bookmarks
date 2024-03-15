import {Event, Disposable} from 'vscode';
import {
  BaseMeta,
  TreeViewGroupType,
  TreeViewSortedType,
  TreeViewType,
} from '../types';
import {UniversalStoreType} from './UniversalBookmarkController';
import {IBookmarksStore} from '../stores';

export default interface IController extends Disposable {
  get store(): IBookmarksStore | UniversalStoreType | undefined;

  get totalCount(): number;

  get labeledCount(): number;

  get viewType(): TreeViewType;

  get groupView(): TreeViewGroupType;

  onDidChangeEvent: Event<void>;

  save(): void;
  remove(id: string): void;

  update(id: string, dto: Partial<Omit<BaseMeta, 'id'>>): void;

  restore(): void;

  clearAll(): void;

  refresh(): void;
  changeViewType(viewType: TreeViewType): void;

  changeSortType(sortType: TreeViewSortedType): void;
}
