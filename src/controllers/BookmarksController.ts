import {
  Event,
  EventEmitter,
  ExtensionContext,
  FileSystemWatcher,
  Memento,
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

import {IDisposable, log} from '../utils';
import {createHoverMessage, sortBookmarksByLineNumber} from '../utils/bookmark';
import {
  BookmarkColor,
  BookmarkManagerConfigure,
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
import {ServiceManager} from '../services/ServiceManager';
import {BookmarksStore, IBookmark, IBookmarksStore} from '../stores/bookmark';

export type GroupedByFileType = BookmarkStoreType & {
  sortedIndex?: number;
};

export type GroupedByColorType = {
  color: BookmarkColor;
  bookmarks: IBookmark[];
  sortedIndex?: number;
};

export type GroupedByWorkspaceType = {
  workspace: WorkspaceFolder;
  bookmarks: IBookmark[];
  sortedIndex?: number;
};

export default class BookmarksController implements IController {
  private _context: ExtensionContext;

  private _onDidChangeEvent = new EventEmitter<void>();

  private _store!: IBookmarksStore;

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

  public get store(): IBookmarksStore | undefined {
    return this._store;
  }

  /**
   * 返回书签的总个数
   */
  public get totalCount(): number {
    if (!this._store) {
      return 0;
    }
    return this._store.totalCount;
  }

  /**
   * 获取带有标签的书签
   */
  public get labeledCount(): number {
    if (!this._store) {
      return 0;
    }
    return this._store.labeledCount;
  }

  constructor(context: ExtensionContext, serviceManager: ServiceManager) {
    this._context = context;
    this._serviceManager = serviceManager;
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
      this._initStore();
      if (!this._configuration.createJsonFile) {
        this._watcher?.dispose();
      }
    });

    registerExtensionCustomContextByKey(
      'code.viewAsTree',
      this.viewType === 'tree',
    );

    registerExtensionCustomContextByKey('code.view.groupView', this.groupView);

    this._initStore();

    this._initialWatcher();
  }

  private async _initStore() {
    this._store = BookmarksStore.create();
    let store;
    this._resolveDatastoreFromStoreFile();
    // 当从 `bookmark-manager.json`文件中读取, 直接刷新返回
    if (this._configuration.createJsonFile) {
      this.refresh();
    } else {
      // 从state中读取数据
      store = this.workspaceState.get<any>(EXTENSION_ID);
      if (!store) {
        store = this._store;
        this.save();
      } else if (store.bookmarks && store.bookmarks.length) {
        for (let bookmark of store.bookmarks) {
          const _bookmark = this._store.createBookmark(bookmark);
          this._store.add(_bookmark);
        }
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
        this._store.clearAll();
        this.save();
      });
      this._watcher.onDidChange(uri => {
        this._resolveDatastoreFromStoreFile();
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
          this._store.addBookmarks(_bookmarks);
        }
      }
    }
    // return _datastore;
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
            it.bookmarks = sortBookmarksByLineNumber(it.bookmarks);
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
    if (!this._store || !this._store.bookmarks.length) {
      return;
    }
    const groupedList: GroupedByColorType[] = [];
    this._store.bookmarks.forEach(it => {
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
    if (!this._store || !this._store.bookmarks.length) {
      return;
    }

    const grouped: GroupedByWorkspaceType[] = [];
    this._store.bookmarks.forEach(it => {
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

  add(bookmark: Partial<Omit<IBookmark, 'id'>>) {
    // @ts-ignore
    // this._store.bookmarks.push({
    //   ...bookmark,
    //   workspaceFolder: workspace.getWorkspaceFolder(bookmark.fileUri!),
    // });

    const newBookmark = this._store.createBookmark(bookmark);
    this._store.add(newBookmark);
    this.save();
  }

  remove(id: string) {
    if (this._store.delete(id)) {
      this.save();
    }
  }

  update(id: string, bookmarkDto: Partial<Omit<IBookmark, 'id'>>) {
    let existed = this._store.bookmarks.find(it => it.id === id);
    if (!existed) {
      return;
    }

    const {rangesOrOptions, ...rest} = bookmarkDto;
    existed.update({
      ...existed,
      ...rest,
      rangesOrOptions: {
        ...existed.rangesOrOptions,
        ...rangesOrOptions,
      },
    });
    this.save();
  }

  updateGroupColorName(
    colorName: string,
    bookmarkDto: Partial<Omit<IBookmark, 'id'>>,
  ) {
    let sameColorBookmarks = this._store.bookmarks.filter(
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

  getBookmarkStoreByFileUri(fileUri: Uri): IBookmark[] {
    if (!this._store) {
      return [];
    }
    return this._store.groupedByFile(fileUri);
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
    if (!this._store.bookmarks.length) {
      return;
    }
    const groupedList: GroupedByFileType[] = [];
    this._store.bookmarks.forEach(it => {
      const existed = groupedList.find(item => item.fileId === it.fileId);
      if (existed) {
        existed.bookmarks.push(it);
      } else {
        const {fileId, fileName} = it;

        groupedList.push({
          fileId: it.fileId,
          // @ts-ignore
          fileName: it.fileName || it['filename'],
          fileUri: it.fileUri,
          bookmarks: [it],
        });
      }
    });

    return groupedList.map(it => ({
      ...it,
      bookmarks: sortBookmarksByLineNumber(it.bookmarks),
    }));
  }

  restore() {
    this._store.clearAll();
    this.save();
  }

  /**
   *
   * 清除所有标签
   */
  clearAll() {
    if (!this._store.bookmarks.length) {
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
    if (!this._store.bookmarks.length) {
      return;
    }
    this._store.clearBookmarksByFile(fileUri.fsPath);
    this.save();
  }

  save(store?: IBookmarksStore) {
    if (store) {
      this._store = store;
    }

    if (this._configuration.createJsonFile) {
      this._saveToDisk();
    } else {
      this.workspaceState.update(EXTENSION_ID, store || this._store);
    }
    this._changeView();
    this._fire();
  }

  /**
   *
   * @param bookmark
   * @param label
   */
  editLabel(bookmark: IBookmark, label: string) {
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

        console.log(
          !this._store.bookmarks.every(
            it => it.workspaceFolder?.uri.fsPath === ws.uri.fsPath,
          ),
        );

        // 判断在对应的workspace文件夹中是否存在书签, 如果不存在, 不自动创建`bookmark-manager.json`文件
        if (
          !this._store.bookmarks.every(
            it => it.workspaceFolder?.uri.fsPath === ws.uri.fsPath,
          )
        ) {
          continue;
        }

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
      content: this._store.bookmarks.filter(
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
    const needWarning = this._needWarning && this.store?.bookmarks.length;

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

    if (!this._needWarning && this.store?.bookmarks.length) {
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
    if (!this._store) {
      return;
    }
    this._onDidChangeEvent.fire();
  }
}
