import {EXTENSION_ID} from '../constants';
import {BookmarkMeta, BookmarkStoreRootType, BookmarkStoreType} from '../types';
import {generateUUID} from '../utils';
import {createHoverMessage, sortBookmarksByLineNumber} from '../utils/bookmark';
import {
  Event,
  EventEmitter,
  ExtensionContext,
  Memento,
  Selection,
  Uri,
} from 'vscode';
import IController, {SortType, ViewType} from './IController';
import {configUtils} from '../configurations';
import {registerExtensionCustomContextByKey} from '../context';

export type GroupedByFileType = BookmarkStoreType;

export default class BookmarksController implements IController {
  private _context: ExtensionContext;

  private _onDidChangeEvent = new EventEmitter<void>();

  public onDidChangeEvent: Event<void> = this._onDidChangeEvent.event;

  private _datasource: BookmarkStoreRootType;

  private _groupedByFile: GroupedByFileType[] = [];

  public viewType: ViewType = 'tree';

  public get groupedByFileBookmarks(): GroupedByFileType[] {
    return this._groupedByFile;
  }
  public get workspaceState(): Memento {
    return this._context.workspaceState;
  }

  public get datasource(): BookmarkStoreRootType | undefined {
    return this._datasource;
  }

  /**
   * 返回书签的总个数
   */
  public get totalCount(): number {
    if (!this._datasource) return 0;
    return this._datasource.bookmarks.length;
  }

  /**
   * 获取带有标签的书签
   */
  public get labeledCount(): number {
    if (!this._datasource) return 0;
    return this._datasource.bookmarks.filter(it => it.label).length;
  }

  constructor(context: ExtensionContext) {
    this._context = context;
    this._initial();

    const _datasource = this.workspaceState.get<any>(EXTENSION_ID);

    if (!_datasource) {
      this._datasource = {
        workspace: context.storageUri?.toString() || '',
        bookmarks: [],
      };
      this.save(this._datasource);
    } else {
      // 针对以前存在的书签, 进行扁平化成列表
      let _newDatasouce: BookmarkStoreRootType = {
        workspace: context.storageUri?.toString() || '',
        bookmarks: [],
      };
      if (_datasource.data && _datasource.data.length) {
        _newDatasouce.bookmarks = this._flatToList(_datasource.data);
        this._datasource = _newDatasouce;
        this.save();
      } else {
        this._datasource = _datasource as BookmarkStoreRootType;
        if (this.viewType === 'tree') {
          this._groupedByFile = (this._getBookmarksGroupedByFile() || []).map(
            it => {
              sortBookmarksByLineNumber(it.bookmarks);
              return it;
            },
          );
        }
      }
    }
  }
  changeSortType(sortType: SortType): void {}

  private _initial() {
    this.viewType = configUtils.getValue('code.viewType', 'tree');
    registerExtensionCustomContextByKey(
      'code.viewAsTree',
      this.viewType === 'tree',
    );
  }
  /**
   * 将之前旧的数据转换成list
   * @param arr
   * @returns
   */
  private _flatToList(arr: any[]) {
    const newArr: any[] = [];
    arr.forEach(store => {
      const bookmarks = store.bookmarks.map((bookmark: any) => ({
        ...bookmark,
        filename: store.filename,
        fileId: store.id,
        selection: new Selection(
          bookmark.selection.anchor,
          bookmark.selection.active,
        ),
        rangesOrOptions: {
          ...bookmark.rangesOrOptions,
          hoverMessage: createHoverMessage(bookmark, true),
        },
      }));
      newArr.push(...bookmarks);
    });
    return newArr;
  }

  add(bookmark: Partial<Omit<BookmarkMeta, 'id'>>) {
    // @ts-ignore
    this._datasource.bookmarks.push({
      ...bookmark,
      id: generateUUID(),
    });
    this.save();
  }

  remove(id: string) {
    const bookmarkIdx = this._datasource.bookmarks.findIndex(
      it => it.id === id,
    );
    if (bookmarkIdx === -1) {
      return;
    }
    this._datasource.bookmarks.splice(bookmarkIdx, 1);
    this.save();
  }

  update(id: string, bookmarkDto: Partial<Omit<BookmarkMeta, 'id'>>) {
    let idx = this._datasource.bookmarks.findIndex(it => it.id === id);
    if (idx === -1) {
      return;
    }
    const existed = this._datasource.bookmarks[idx];
    const {rangesOrOptions, ...rest} = bookmarkDto;
    this._datasource.bookmarks[idx] = {
      ...existed,
      ...rest,
      rangesOrOptions: {
        ...(existed.rangesOrOptions || {}),
        ...rangesOrOptions,
      },
    } as BookmarkMeta;
    this.save();
  }

  getBookmarkStoreByFileUri(fileUri: Uri): BookmarkMeta[] {
    return this._datasource.bookmarks.filter(
      it => it.fileId === fileUri.fsPath,
    );
  }

  /**
   *
   * 根据文件名对书签进行分组
   * [
   *  { fileId: xxx ,
   *    bookmarks: [
   *
   *    ]
   *  },
   *   { fileId: xxx ,
   *      bookmarks: [
   *
   *     ]
   *  }
   * ]
   */
  private _getBookmarksGroupedByFile() {
    if (!this._datasource.bookmarks.length) return;
    const groupedList: GroupedByFileType[] = [];
    this._datasource.bookmarks.forEach(it => {
      const existed = groupedList.find(item => item.fileId === it.fileId);
      if (existed) {
        existed.bookmarks.push(it);
        sortBookmarksByLineNumber(existed.bookmarks);
      } else {
        groupedList.push({
          fileId: it.fileId,
          // @ts-ignore
          fileName: it.fileName || it['filename'],
          fileUri: it.fileUri,
          bookmarks: [it],
        });
      }
    });
    return groupedList;
  }

  restore() {
    this.save({
      workspace: this._context.storageUri?.toString() || '',
      bookmarks: [],
    });
  }

  /**
   *
   * 清除所有标签
   */
  clearAll() {
    if (!this._datasource.bookmarks.length) {
      return;
    }
    this.restore();
  }

  /**
   * 清除指定文件上的所有的标签,并删除此文件存储信息
   * @param fileUri
   * @returns
   */
  clearAllBookmarkInFile(fileUri: Uri) {
    if (!this._datasource.bookmarks.length) {
      return;
    }
    this._datasource.bookmarks = this._datasource.bookmarks.filter(
      it => it.fileId !== fileUri.fsPath,
    );
    this.save();
    this.refresh();
  }

  save(store?: BookmarkStoreRootType) {
    this._groupedByFile = (this._getBookmarksGroupedByFile() || []).map(it => {
      sortBookmarksByLineNumber(it.bookmarks);
      return it;
    });
    this.workspaceState.update(EXTENSION_ID, store || this._datasource).then();
    this._fire();
  }
  /**
   *
   * @param bookmark
   * @param label
   */
  editLabel(bookmark: BookmarkMeta, label: string) {
    bookmark.label = label;

    this.update(bookmark.id, {
      label,
      rangesOrOptions: {
        ...bookmark.rangesOrOptions,
        hoverMessage: createHoverMessage(bookmark, true, true),
      },
    });
  }

  refresh() {
    this._fire();
  }

  changeViewType(viewType: ViewType) {
    this.viewType = viewType;
    configUtils.updateValue('code.viewType', viewType);

    registerExtensionCustomContextByKey(
      'code.viewAsTree',
      this.viewType === 'tree',
    );
    this.refresh();
  }

  private _fire() {
    this._onDidChangeEvent.fire();
  }
}
