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
  l10n,
  window,
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
import {EXTENSION_ID, EXTENSION_STORE_FILE_NAME} from '../constants';

import IController, {
  TreeViewSortedByType,
  TreeGroupView,
  ViewType,
} from './IController';
import {registerExtensionCustomContextByKey} from '../context';
import ConfigService from '../services/ConfigService';
import resolveServiceManager, {
  ServiceManager,
} from '../services/ServiceManager';

export type GroupedByFileType = BookmarkStoreType & {
  sortedIndex?: number;
};

export type GroupedByColorType = {
  color: BookmarkColor;
  bookmarks: BookmarkMeta[];
  sortedIndex?: number;
};

export type GroupedByWorkspaceType = {
  workspace: WorkspaceFolder;
  bookmarks: BookmarkMeta[];
  sortedIndex?: number;
};

export default class BookmarksController implements IController {
  private _context: ExtensionContext;

  private _onDidChangeEvent = new EventEmitter<void>();

  private _datastore!: BookmarkStoreRootType;

  private _groupedByFile: GroupedByFileType[] = [];

  private _groupedByColor: GroupedByColorType[] = [];

  private _groupedByWorkspaceFolders: GroupedByWorkspaceType[] = [];

  public viewType: ViewType = 'tree';

  public groupView: TreeGroupView = 'default';

  public sortedType: TreeViewSortedByType = 'linenumber';

  private _disposables: IDisposable[] = [];

  private _watcher: FileSystemWatcher | undefined;

  private _configuration: BookmarkManagerConfigure;

  private _configService: ConfigService;

  private _serviceManager: ServiceManager;

  /**
   * 表示第一次创建存储文件
   */
  private _needWarning: boolean = true;

  public onDidChangeEvent: Event<void> = this._onDidChangeEvent.event;

  public get groupedByFileBookmarks(): GroupedByFileType[] {
    return this._groupedByFile;
  }

  public get groupedByColorBookmarks(): GroupedByColorType[] {
    return this._groupedByColor;
  }

  public get groupedByWorkspaceFolders(): GroupedByWorkspaceType[] {
    return this._groupedByWorkspaceFolders;
  }

  public get workspaceState(): Memento {
    return this._context.workspaceState;
  }

  public get datastore(): BookmarkStoreRootType | undefined {
    return this._datastore;
  }

  /**
   * 返回书签的总个数
   */
  public get totalCount(): number {
    if (!this._datastore) {
      return 0;
    }
    return this._datastore.bookmarks.length;
  }

  /**
   * 获取带有标签的书签
   */
  public get labeledCount(): number {
    if (!this._datastore) {
      return 0;
    }
    return this._datastore.bookmarks.filter(it => it.label).length;
  }

  constructor(context: ExtensionContext) {
    this._context = context;
    this._serviceManager = resolveServiceManager();
    this._configService = this._serviceManager.configService;
    this._configuration = this._configService.configuration;

    this._initial();
  }

  private async _initial() {
    this._needWarning = this._configService.getGlobalValue(
      '_needWarning',
      true,
    );
    this.viewType = this._configService.getGlobalValue('code.viewType', 'tree');
    this.groupView = this._configService.getGlobalValue(
      'code.groupView',
      'file',
    );

    if (!workspace.workspaceFolders || workspace.workspaceFolders!.length < 2) {
      this.groupView = 'default';
    }

    this._configService.onExtensionConfigChange(configuration => {
      this._configuration = configuration;
    });

    this._configService.onDidChangeConfiguration(ev => {
      if (!ev.affectsConfiguration(`${EXTENSION_ID}.createJsonFile`)) {
        return;
      }
      this._initialDatastore();
      if (!this._configuration.createJsonFile) {
        this._watcher?.dispose();
      }
    });

    registerExtensionCustomContextByKey(
      'code.viewAsTree',
      this.viewType === 'tree',
    );

    registerExtensionCustomContextByKey('code.view.groupView', this.groupView);

    this._initialDatastore();
    this._initialWatcher();
  }

  private async _initialDatastore() {
    let _datastore, _datastoreFromFile;
    _datastoreFromFile = this._resolveDatastoreFromStoreFile() || {
      bookmarks: [],
    };
    if (this._configuration.createJsonFile) {
      _datastore = _datastoreFromFile;
      this._datastore = _datastore!;
      this.refresh();
    } else {
      _datastore =
        _datastoreFromFile.bookmarks.length !== 0
          ? _datastoreFromFile
          : this.workspaceState.get<any>(EXTENSION_ID);
      if (!_datastore) {
        this._datastore = _datastoreFromFile;
        this.save(this._datastore);
      } else {
        // 针对以前存在的书签, 进行扁平化成列表
        let _newDatastore: BookmarkStoreRootType = {
          bookmarks: [],
        };
        if (_datastore.data && _datastore.data.length) {
          _newDatastore.bookmarks = this._flatToList(_datastore.data);
        } else {
          _newDatastore.bookmarks = (
            _datastore.data ||
            _datastore.bookmarks ||
            []
          ).map((it: any) => {
            it.selection = new Selection(
              it.selection.anchor,
              it.selection.active,
            );
            it.rangesOrOptions.hoverMessage = createHoverMessage(
              it,
              true,
              true,
            );
            return it;
          });
        }
        this._datastore = _newDatastore;
        this.save();
      }
    }
    this._changeView();
  }

  /**
   * 初始化文件监听器, 监听`bookmark-manager.json`的文件变化
   */
  private async _initialWatcher() {
    const existedStoreFile = await workspace.findFiles(
      '**/bookmark-manager.json',
      '**​/node_modules/**',
      10,
    );
    if (existedStoreFile.length && this._configuration.createJsonFile) {
      if (this._watcher) {
        this._watcher.dispose();
      }
      this._watcher = workspace.createFileSystemWatcher(
        '**/.vscode/bookmark-manager.json',
      );
      this._watcher.onDidDelete(uri => {
        this._datastore = {
          bookmarks: [],
        };
        this.save();
      });
      this._watcher.onDidChange(uri => {
        this._datastore = this._resolveDatastoreFromStoreFile();
        this._changeView();
        this.refresh();
      });
      this._disposables.push(this._watcher);
    }
  }

  /**
   * 从文件中读取书签数据
   * @returns []
   */
  private _resolveDatastoreFromStoreFile() {
    let ws;
    const wsFolders = workspace.workspaceFolders || [];
    const _datastore: BookmarkStoreRootType = {
      bookmarks: [],
    };
    for (ws of wsFolders) {
      const storeFilePath = path.join(
        ws.uri.fsPath,
        './.vscode/bookmark-manager.json',
      );
      if (fs.existsSync(storeFilePath)) {
        const _bookmarks = (
          JSON.parse(fs.readFileSync(storeFilePath).toString()) || {content: []}
        ).content;
        if (_bookmarks && _bookmarks.length) {
          _datastore.bookmarks.push(
            ..._bookmarks.map((it: any) => {
              it.selection = new Selection(
                it.selection.anchor,
                it.selection.active,
              );
              it.rangesOrOptions.hoverMessage = createHoverMessage(
                it,
                true,
                true,
              );
              return it;
            }),
          );
        }
      }
    }
    return _datastore;
  }

  /**
   * 当viewType改变的时候, 转换成对应的格式
   */
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
      if (this.groupView === 'workspace') {
        this._groupedByWorkspaceFolders = (
          this._getBookmarksGroupedByWorkspace() || []
        ).map(it => {
          sortBookmarksByLineNumber(it.bookmarks);
          return it;
        });
      }
    }
  }

  /**
   * 获取按照书签颜色设置的书签列表
   * @returns
   */
  private _getBookmarksGroupedByColor() {
    if (!this._datastore || !this._datastore.bookmarks.length) {
      return;
    }
    const groupedList: GroupedByColorType[] = [];
    this._datastore.bookmarks.forEach(it => {
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

  /**
   * 获取按照工作区间分组的书签列表
   * @returns
   */
  private _getBookmarksGroupedByWorkspace() {
    if (!this._datastore || !this._datastore.bookmarks.length) {
      return;
    }

    const grouped: GroupedByWorkspaceType[] = [];
    this._datastore.bookmarks.forEach(it => {
      const existed = grouped.find(
        item => item.workspace.name === it.workspaceFolder?.name,
      );
      if (!existed) {
        grouped.push({
          workspace: it.workspaceFolder!,
          bookmarks: [it],
        });
        return;
      }
      existed.bookmarks.push(it);
    });
    return grouped;
  }

  changeSortType(sortType: TreeViewSortedByType): void {
    this.sortedType = sortType;
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
          hoverMessage: createHoverMessage(bookmark, true, true),
        },
        workspaceFolder: workspace.getWorkspaceFolder(store.fileUri),
      }));
      newArr.push(...bookmarks);
    });
    return newArr;
  }

  add(bookmark: Partial<Omit<BookmarkMeta, 'id'>>) {
    // @ts-ignore
    this._datastore.bookmarks.push({
      ...bookmark,
      workspaceFolder: workspace.getWorkspaceFolder(bookmark.fileUri!),
      id: generateUUID(),
    });
    this.save();
  }

  remove(id: string) {
    const bookmarkIdx = this._datastore.bookmarks.findIndex(it => it.id === id);
    if (bookmarkIdx === -1) {
      return;
    }
    this._datastore.bookmarks.splice(bookmarkIdx, 1);
    this.save();
  }

  update(id: string, bookmarkDto: Partial<Omit<BookmarkMeta, 'id'>>) {
    let idx = this._datastore.bookmarks.findIndex(it => it.id === id);
    if (idx === -1) {
      return;
    }
    const existed = this._datastore.bookmarks[idx];
    const {rangesOrOptions, ...rest} = bookmarkDto;
    this._datastore.bookmarks[idx] = {
      ...existed,
      ...rest,
      rangesOrOptions: {
        ...(existed.rangesOrOptions || {}),
        ...rangesOrOptions,
      },
    } as BookmarkMeta;
    this.save();
  }

  updateGroupColorName(
    colorName: string,
    bookmarkDto: Partial<Omit<BookmarkMeta, 'id'>>,
  ) {
    let sameColorBookmarks = this._datastore.bookmarks.filter(
      it => it.color === colorName,
    );
    const {rangesOrOptions, ...rest} = bookmarkDto;
    for (const bookmark of sameColorBookmarks) {
      Object.assign(bookmark, {
        ...rest,
        rangesOrOptions: {
          ...(bookmark.rangesOrOptions || {}),
          ...rangesOrOptions,
        },
      });
    }
    this.save();
  }

  getBookmarkStoreByFileUri(fileUri: Uri): BookmarkMeta[] {
    if (!this._datastore) {
      return [];
    }
    return this._datastore.bookmarks.filter(it => it.fileId === fileUri.fsPath);
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
    if (!this._datastore.bookmarks.length) {
      return;
    }
    const groupedList: GroupedByFileType[] = [];
    this._datastore.bookmarks.forEach(it => {
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
    if (!this._datastore.bookmarks.length) {
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
    if (!this._datastore.bookmarks.length) {
      return;
    }
    this._datastore.bookmarks = this._datastore.bookmarks.filter(
      it => it.fileId !== fileUri.fsPath,
    );
    this.save();
  }

  save(store?: BookmarkStoreRootType) {
    if (store) {
      this._datastore = store;
    }

    if (this._configuration.createJsonFile) {
      this._saveToDisk();
    } else {
      this.workspaceState.update(EXTENSION_ID, store || this._datastore);
    }
    this._changeView();
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
    this._fire();
  }

  changeGroupView(groupType: TreeGroupView) {
    this.groupView = groupType;
    this._configService.updateGlobalValue('code.groupView', groupType);
    this._changeView();
    this._fire();
  }

  /**
   * 将数据写入到`.vscode/bookmark.json`中
   * @returns
   */
  private async _saveToDisk() {
    if (env.appHost === 'desktop') {
      const workspaceFolders = workspace.workspaceFolders || [];
      if (!workspaceFolders.length) {
        return;
      }
      let ws: WorkspaceFolder;
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
          './.vscode/bookmark-manager.json',
        );
        if (!fs.existsSync(bookmarkFile)) {
          fs.writeFileSync(bookmarkFile, '');
        }
        fs.writeFileSync(bookmarkFile, this._buildBookmarksContent(ws));

        this._showCreateStoreWarning(ws);

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
      content: this._datastore.bookmarks.filter(
        it => it.workspaceFolder?.uri.fsPath === workspace.uri.fsPath,
      ),
    };
    return JSON.stringify(content);
  }

  /**
   * 当创建`bookmark-manager.json` 文件时, 根据`alwasIgnore`选项是否要将`bookmark-manger.json`的追加到`.gitignore` 文件中,同时弹出提示
   * @param ws
   * @returns
   */
  private _showCreateStoreWarning(ws: WorkspaceFolder) {
    const ignoreFilePath = path.resolve(ws.uri.fsPath, '.gitignore');
    const {alwaysIgnore} = this._configuration;

    if (!fs.existsSync(ignoreFilePath)) {
      return;
    }

    const ignoreContent = fs.readFileSync(ignoreFilePath, 'utf-8');
    const needWarning = this._needWarning && this.datastore?.bookmarks.length;

    if (
      !alwaysIgnore &&
      !ignoreContent.includes(EXTENSION_STORE_FILE_NAME) &&
      needWarning
    ) {
      window.showInformationMessage(
        l10n.t(
          '`bookmark-manager.json` will be tracked by the version tool. Please try to avoid submitting this file to the source code repository. You can manually add it to `.gitignore` or automatically complete this step by turning on the `alwaysIgnore` option .',
        ),
      );

      this._configService.updateGlobalValue('needWarning', false);
      this._needWarning = false;

      return;
    }

    if (!this._needWarning && this.datastore?.bookmarks.length) {
      this._configService.updateGlobalValue('needWarning', true);
      this._needWarning = true;
    }

    if (!ignoreContent.includes(EXTENSION_STORE_FILE_NAME) && alwaysIgnore) {
      fs.writeFileSync(
        ignoreFilePath,
        `${ignoreContent}\n${EXTENSION_STORE_FILE_NAME}`,
      );
    }
  }
  dispose(): void {
    this._disposables.filter(it => it).forEach(it => it.dispose());
  }

  private _fire() {
    if (!this._datastore) {
      return;
    }
    this._onDidChangeEvent.fire();
  }
}
