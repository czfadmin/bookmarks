import {
  Event,
  EventEmitter,
  ExtensionContext,
  FileSystemWatcher,
  Memento,
  Selection,
  Uri,
  WorkspaceFolder,
  env,
  workspace,
} from 'vscode';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

import {IDisposable, generateUUID} from '../utils';
import {createHoverMessage, sortBookmarksByLineNumber} from '../utils/bookmark';
import {
  BookmarkColor,
  BookmarkManagerConfigure,
  BookmarkMeta,
  BookmarkStoreRootType,
  BookmarkStoreType,
} from '../types';
import {EXTENSION_ID} from '../constants';

import IController, {SortType, TreeGroupView, ViewType} from './IController';
import {registerExtensionCustomContextByKey} from '../context';
import ConfigService from '../services/ConfigService';
import resolveServiceManager, {
  ServiceManager,
} from '../services/ServiceManager';

export type GroupedByFileType = BookmarkStoreType;

export type GroupedByColorType = {
  color: BookmarkColor;
  bookmarks: BookmarkMeta[];
};

export default class BookmarksController implements IController {
  private _context: ExtensionContext;

  private _onDidChangeEvent = new EventEmitter<void>();

  private _datasource!: BookmarkStoreRootType;

  private _groupedByFile: GroupedByFileType[] = [];

  private _groupedByColor: GroupedByColorType[] = [];

  public viewType: ViewType = 'tree';

  public groupView: TreeGroupView = 'default';

  private _disposables: IDisposable[] = [];

  private _watcher: FileSystemWatcher | undefined;

  private _configuration: BookmarkManagerConfigure;

  private _configService: ConfigService;

  private _serviceManager: ServiceManager;

  public onDidChangeEvent: Event<void> = this._onDidChangeEvent.event;

  public get groupedByFileBookmarks(): GroupedByFileType[] {
    return this._groupedByFile;
  }

  public get groupedByColorBookmarks(): GroupedByColorType[] {
    return this._groupedByColor;
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
    if (!this._datasource) {
      return 0;
    }
    return this._datasource.bookmarks.length;
  }

  /**
   * 获取带有标签的书签
   */
  public get labeledCount(): number {
    if (!this._datasource) {
      return 0;
    }
    return this._datasource.bookmarks.filter(it => it.label).length;
  }

  constructor(context: ExtensionContext) {
    this._context = context;
    this._serviceManager = resolveServiceManager();
    this._configService = this._serviceManager.configService;
    this._configuration = this._configService.configuration;
    this._initial();
  }

  private async _initial() {
    this.viewType = this._configService.getGlobalValue('code.viewType', 'tree');
    this.groupView = this._configService.getGlobalValue(
      'code.groupView',
      'file',
    );

    this._configService.onExtensionConfigChange(configuration => {
      this._configuration = configuration;
    });

    this._configService.onDidChangeConfiguration(ev => {
      if (!ev.affectsConfiguration(`${EXTENSION_ID}.createJsonFile`)) {
        return;
      }
      this._initialDatasource();
      if (!this._configuration.createJsonFile) {
        this._watcher?.dispose();
      }
    });

    registerExtensionCustomContextByKey(
      'code.viewAsTree',
      this.viewType === 'tree',
    );

    registerExtensionCustomContextByKey('code.view.groupView', this.groupView);

    this._initialDatasource();
    this._initialWatcher();
  }

  private async _initialDatasource() {
    let _datasource, _datasourceFromFile;
    _datasourceFromFile = this._resolveDatasourceFromStoreFile() || {
      bookmarks: [],
    };
    if (this._configuration.createJsonFile) {
      _datasource = _datasourceFromFile;
    } else {
      _datasource = this.workspaceState.get<any>(EXTENSION_ID);
      if (!_datasource) {
        this._datasource = _datasourceFromFile;
        this.save(this._datasource);
      } else {
        // 针对以前存在的书签, 进行扁平化成列表
        let _newDatasouce: BookmarkStoreRootType = {
          bookmarks: [],
        };
        if (_datasource.data && _datasource.data.length) {
          _newDatasouce.bookmarks = this._flatToList(_datasource.data);
        } else {
          _newDatasouce.bookmarks = (
            _datasource.data ||
            _datasource.bookmarks ||
            []
          ).map((it: any) => {
            it.selection = new Selection(
              it.selection.anchor,
              it.selection.active,
            );
            it.rangesOrOptions.hoverMessage = createHoverMessage(it, true);
            return it;
          });
        }
        this._datasource = _newDatasouce;
        this.save();
      }
    }
    this._changeView();
  }

  private async _initialWatcher() {
    const existedStoreFile = await workspace.findFiles(
      '**/bookmarks.json',
      '**​/node_modules/**',
      10,
    );
    if (existedStoreFile.length && this._configuration.createJsonFile) {
      if (this._watcher) {
        this._watcher.dispose();
      }
      this._watcher = workspace.createFileSystemWatcher(
        '**/.vscode/bookmarks.json',
      );
      this._watcher.onDidDelete(uri => {
        this._datasource = {
          bookmarks: [],
        };
        this.save();
      });
      this._disposables.push(this._watcher);
    }
  }
  /**
   * 从文件中读取书签数据
   * @returns []
   */
  private _resolveDatasourceFromStoreFile() {
    let ws;
    const wsFolders = workspace.workspaceFolders || [];
    const _datasource: BookmarkStoreRootType = {
      bookmarks: [],
    };
    for (ws of wsFolders) {
      const storeFilePath = path.join(
        ws.uri.fsPath,
        './.vscode/bookmarks.json',
      );
      if (fs.existsSync(storeFilePath)) {
        const _bookmarks = (
          JSON.parse(fs.readFileSync(storeFilePath).toString()) || {content: []}
        ).content;
        if (_bookmarks && _bookmarks.length) {
          _datasource.bookmarks.push(
            ..._bookmarks.map((it: any) => {
              it.selection = new Selection(
                it.selection.anchor,
                it.selection.active,
              );
              it.rangesOrOptions.hoverMessage = createHoverMessage(it, true);
              return it;
            }),
          );
        }
      }
    }
    this.refresh();
    return _datasource;
  }

  private _changeView() {
    if (this.viewType === 'tree') {
      if (this.groupView === 'color') {
        this._groupedByColor = (this._getBookmarksGroupedByColor() || []).map(
          it => {
            sortBookmarksByLineNumber(it.bookmarks);
            return it;
          },
        );
      }
      if (this.groupView === 'default') {
        this._groupedByFile = (this._getBookmarksGroupedByFile() || []).map(
          it => {
            sortBookmarksByLineNumber(it.bookmarks);
            return it;
          },
        );
      }
    }
  }

  /**
   * 获取按照书签颜色设置的书签列表
   * @returns
   */
  private _getBookmarksGroupedByColor() {
    if (!this._datasource || !this._datasource.bookmarks.length) {
      return;
    }
    const groupedList: GroupedByColorType[] = [];
    this._datasource.bookmarks.forEach(it => {
      const existed = groupedList.find(item => item.color === it.color);
      if (!existed) {
        groupedList.push({
          color: it.color,
          bookmarks: [it],
        });
        return;
      }
      existed.bookmarks.push(it);
    });
    return groupedList;
  }

  changeSortType(sortType: SortType): void {}

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
        workspaceFolder: workspace.getWorkspaceFolder(store.fileUri),
      }));
      newArr.push(...bookmarks);
    });
    return newArr;
  }

  add(bookmark: Partial<Omit<BookmarkMeta, 'id'>>) {
    // @ts-ignore
    this._datasource.bookmarks.push({
      ...bookmark,
      workspaceFolder: workspace.getWorkspaceFolder(bookmark.fileUri!),
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
    if (!this._datasource) {
      return [];
    }
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
    if (!this._datasource.bookmarks.length) {
      return;
    }
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
  }

  save(store?: BookmarkStoreRootType) {
    if (store) {
      this._datasource = store;
    }

    this._changeView();

    if (this._configuration.createJsonFile) {
      this._saveToDisk();
    } else {
      this.workspaceState
        .update(EXTENSION_ID, store || this._datasource)
        .then();
    }
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
    this._configService.updateGlobalValue('code.viewType', viewType);

    registerExtensionCustomContextByKey(
      'code.viewAsTree',
      this.viewType === 'tree',
    );
    this._changeView();
    this.refresh();
  }

  changeGroupView(groupType: TreeGroupView) {
    this.groupView = groupType;
    this._configService.updateGlobalValue('code.groupView', groupType);
    this._changeView();

    this.refresh();
  }

  /**
   * 将数据写入到`.vscode/bookmark.json`中
   * @returns {undefined}
   */
  private async _saveToDisk() {
    if (env.appHost == 'desktop') {
      const workspaceFolders = workspace.workspaceFolders || [];
      if (!workspaceFolders.length) {
        return;
      }
      let ws;
      for (ws of workspaceFolders) {
        const workspacePath = ws.uri.fsPath.startsWith('file://')
          ? fileURLToPath(ws.uri.fsPath)
          : ws.uri.fsPath;
        const dotVscodeDir = path.join(workspacePath, '.vscode');
        if (!fs.existsSync(dotVscodeDir)) {
          fs.mkdirSync(dotVscodeDir);
        }
        const bookmarkFile = path.join(
          workspacePath,
          './.vscode/bookmarks.json',
        );
        if (!fs.existsSync(bookmarkFile)) {
          fs.writeFileSync(bookmarkFile, '');
        }
        fs.writeFileSync(bookmarkFile, this._buildBookmarksContent(ws));
        if (!this._watcher) {
          this._initialWatcher();
        }
      }
    }
  }

  private _buildBookmarksContent(workspace: WorkspaceFolder) {
    const content = {
      version: process.env.version,
      workspace: workspace.name,
      updatedDate: new Date().toLocaleDateString(),
      content: this._datasource.bookmarks.filter(
        it => it.workspaceFolder?.uri.fsPath === workspace.uri.fsPath,
      ),
    };
    return JSON.stringify(content);
  }
  dispose(): void {
    this._disposables.filter(it => it).forEach(it => it.dispose());
  }

  private _fire() {
    this._serviceManager.decorationService.updateActiveEditorAllDecorations();
    this._onDidChangeEvent.fire();
  }
}
