import {Event, EventEmitter, ExtensionContext, Uri} from 'vscode';
import {
  BaseMeta,
  TreeViewGroupEnum,
  TreeViewSortedEnum,
  TreeViewStyleEnum,
} from '../types';
import {generateUUID} from '../utils';
import IController from './IController';
import {ServiceManager} from '../services/ServiceManager';
import {_NotCustomized} from 'mobx-state-tree';
import {BookmarkColorType} from '../stores';
export const UNIVERSAL_STORE_KEY = 'bookmark-manager.universal';
export type UniversalBookmarkType = 'file' | 'link' | 'command' | 'code';

export type UniversalBase = BaseMeta & {
  color?: BookmarkColorType;
  icon?: string;
  [index: string]: any;
};

export interface UniversalFile extends UniversalBase {
  type: 'file';
  fileUri?: Uri;
  fileName?: string;
  languageId?: string;
}

export interface UniversalCode extends UniversalBase {
  type: 'code';
  code: string;
  languageId?: string;
}

export interface UniversalLink extends UniversalBase {
  type: 'link';
  link: string;
}

export interface UniversalCommand extends UniversalBase {
  type: 'command';
  command: string;
}
export type UniversalBookmarkMeta =
  | UniversalLink
  | UniversalCode
  | UniversalCommand;

export interface UniversalStoreType {
  createdTime: string;
  bookmarks: UniversalBookmarkMeta[];
}

/**
 * 更通用的书签控制器
 * - 用户保存的代码片段/备忘录/命令
 * - 用户保存的网址链接
 * - 非工程目录下的文件(无法保证书签跟随文件中的内容改动相同步)
 *   - 此文件中的书签(暂时不考虑)
 */
export default class UniversalBookmarkController implements IController {
  private _context: ExtensionContext;
  private _datastore: UniversalStoreType | undefined;
  private _onDidChangeEvent: EventEmitter<void> = new EventEmitter<void>();

  private _serviceManager: ServiceManager;
  public sortedType: Omit<TreeViewSortedEnum, TreeViewSortedEnum.LINENUMBER> =
    TreeViewSortedEnum.CREATED_TIME;
  public onDidChangeEvent: Event<void> = this._onDidChangeEvent.event;

  get globalState() {
    return this._context.globalState;
  }

  get store(): UniversalStoreType | undefined {
    return this._datastore;
  }

  get totalCount(): number {
    return this.store?.bookmarks.length || 0;
  }
  get labeledCount(): number {
    return 0;
  }

  constructor(context: ExtensionContext, serviceManager: ServiceManager) {
    this._context = context;
    this._serviceManager = serviceManager;
    this._datastore =
      this._context.globalState.get<UniversalStoreType>(UNIVERSAL_STORE_KEY);
    if (!this._datastore) {
      this._context.globalState.update(UNIVERSAL_STORE_KEY, {
        createdTime: new Date().toLocaleDateString(),
        bookmarks: [],
      });
      this._datastore =
        this._context.globalState.get<UniversalStoreType>(UNIVERSAL_STORE_KEY);
    }
    this._initial();
  }
  updateBookmarkSortedInfo(bookmark: any, idx: number): void {
    throw new Error('Method not implemented.');
  }
  get viewType(): TreeViewStyleEnum {
    return TreeViewStyleEnum.LIST;
  }
  get groupView(): TreeViewGroupEnum {
    return TreeViewGroupEnum.DEFAULT;
  }

  dispose() {}

  /**
   * 初始化内部配置
   */
  private _initial() {
    this.sortedType = this._serviceManager.configService.getGlobalValue(
      'universal.sorttype',
      'time',
    );
  }

  add(bookmark: Omit<UniversalBookmarkMeta, 'id'>) {
    const id = generateUUID();
    this.store!.bookmarks.push({
      id,
      ...bookmark,
    } as UniversalBookmarkMeta);
    this._save();
  }
  remove(id: string) {
    const idx = this.store?.bookmarks.findIndex(it => it.id === id);
    if (idx === -1) {
      return;
    }
    this.store!.bookmarks = this.store!.bookmarks.filter(it => it.id !== id);
    this._save();
  }
  update(id: string, bookmarkDto: Partial<Omit<UniversalBookmarkMeta, 'id'>>) {
    if (!this.store) {
      return;
    }
    const idx = this.store.bookmarks.findIndex(it => it.id === id);
    if (idx === -1) {
      return;
    }

    const existed = this.store.bookmarks[idx];
    this.store.bookmarks[idx] = {
      ...existed,
      ...bookmarkDto,
    } as UniversalBookmarkMeta;
    this._save();
  }
  clearAll() {
    if (!this.store) {
      return;
    }
    this.store.bookmarks = [];
    this._save();
  }
  save() {
    this._save();
  }

  private _save() {
    this.globalState.update(UNIVERSAL_STORE_KEY, this._datastore).then();
    this.refresh();
  }

  restore(): void {
    this._datastore = {
      createdTime: new Date().toLocaleDateString(),
      bookmarks: [],
    };
    this._save();
  }

  refresh() {
    this._onDidChangeEvent.fire();
  }
  changeViewType(viewType: TreeViewStyleEnum): void {}

  changeSortType(sortType: TreeViewSortedEnum): void {
    this.sortedType = sortType;
  }
}
