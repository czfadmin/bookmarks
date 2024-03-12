import {Event, EventEmitter, ExtensionContext, Uri} from 'vscode';
import {BaseMeta, BookmarkColor} from '../types';
import {generateUUID} from '../utils';
import IController, {
  TreeViewSortedByType,
  TreeGroupView,
  ViewType,
} from './IController';
import resolveServiceManager, {
  ServiceManager,
} from '../services/ServiceManager';
export const UNIVERSAL_STORE_KEY = 'bookmark-manager.universal';
export type UniversalBookmarkType = 'file' | 'link' | 'command' | 'code';

export type UniversalBase = BaseMeta & {
  color?: BookmarkColor;
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
  public sortedType: Omit<TreeViewSortedByType, 'linenumber'> = 'linenumber';
  public onDidChangeEvent: Event<void> = this._onDidChangeEvent.event;

  get globalState() {
    return this._context.globalState;
  }

  get datastore(): UniversalStoreType | undefined {
    return this._datastore;
  }

  get totalCount(): number {
    return this.datastore?.bookmarks.length || 0;
  }
  get labeledCount(): number {
    return 0;
  }

  constructor(context: ExtensionContext) {
    this._context = context;
    this._serviceManager = resolveServiceManager();
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
  get viewType(): ViewType {
    return 'list';
  }
  get groupView(): TreeGroupView {
    return 'default';
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
    this.datastore!.bookmarks.push({
      id,
      ...bookmark,
    } as UniversalBookmarkMeta);
    this._save();
  }
  remove(id: string) {
    const idx = this.datastore?.bookmarks.findIndex(it => it.id === id);
    if (idx === -1) {
      return;
    }
    this.datastore!.bookmarks = this.datastore!.bookmarks.filter(
      it => it.id !== id,
    );
    this._save();
  }
  update(id: string, bookmarkDto: Partial<Omit<UniversalBookmarkMeta, 'id'>>) {
    if (!this.datastore) {
      return;
    }
    const idx = this.datastore.bookmarks.findIndex(it => it.id === id);
    if (idx === -1) {
      return;
    }

    const existed = this.datastore.bookmarks[idx];
    this.datastore.bookmarks[idx] = {
      ...existed,
      ...bookmarkDto,
    } as UniversalBookmarkMeta;
    this._save();
  }
  clearAll() {
    if (!this.datastore) {
      return;
    }
    this.datastore.bookmarks = [];
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
  changeViewType(viewType: ViewType): void {}

  changeSortType(sortType: TreeViewSortedByType): void {
    this.sortedType = sortType;
  }
}
