import path from 'node:path';
import fs from 'node:fs';
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
import {IDisposer, destroy, onSnapshot} from 'mobx-state-tree';
import {fileURLToPath} from 'node:url';

import {IDisposable} from '../utils';
import {
  DEFAULT_BOOKMARK_COLOR,
  EXTENSION_ID,
  EXTENSION_STORE_FILE_NAME,
  EXTENSION_STORE_PATH,
} from '../constants';

import ConfigService from '../services/ConfigService';
import {ServiceManager} from '../services/ServiceManager';
import {
  BookmarksGroupedByColorType,
  BookmarksGroupedByFileWithSortType,
  BookmarksGroupedByWorkspaceType,
  IBookmark,
  IBookmarkGroup,
  IBookmarksStore,
} from '../stores';
import {BookmarksStore} from '../stores/bookmark-store';

import {IBookmarkManagerConfigure} from '../stores/configure';
import {
  TreeViewType,
  TreeViewGroupType,
  TreeViewSortedType,
  IBookmarkStoreInfo,
  BookmarksGroupedByCustomType,
} from '../types';
import IController from './IController';

export default class BookmarksController implements IController {
  private _context: ExtensionContext;

  private _onDidChangeEvent = new EventEmitter<void>();

  private _store!: IBookmarksStore;

  private _groupedByFile: BookmarksGroupedByFileWithSortType[] = [];

  private _groupedByColor: BookmarksGroupedByColorType[] = [];

  private _groupedByWorkspaceFolders: BookmarksGroupedByWorkspaceType[] = [];

  public viewType: TreeViewType = 'tree';

  public groupView: TreeViewGroupType = 'default';

  public sortedType: TreeViewSortedType = 'linenumber';

  private _disposables: IDisposable[] = [];

  private _watcher: FileSystemWatcher | undefined;

  private _configuration: IBookmarkManagerConfigure;

  private _configService: ConfigService;

  private _serviceManager: ServiceManager;

  /**
   * 表示第一次创建存储文件
   */
  private _needWarning: boolean = true;

  /**
   * 表示该插件第一次初始化状态
   */
  private _needWatchFiles: boolean = false;

  private _storeDisposer: IDisposer | undefined;

  public onDidChangeEvent: Event<void> = this._onDidChangeEvent.event;

  public get groupedByFileBookmarks(): BookmarksGroupedByFileWithSortType[] {
    return this._groupedByFile;
  }

  public get groupedByColorBookmarks(): BookmarksGroupedByColorType[] {
    return this._groupedByColor;
  }

  public get groupedByWorkspaceFolders(): BookmarksGroupedByWorkspaceType[] {
    return this._groupedByWorkspaceFolders;
  }

  public get groupedByCustomBookmarks(): BookmarksGroupedByCustomType[] {
    if (!this.store) {
      return [];
    }
    return this.store.getBookmarksGroupedByCustom;
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

  public get groups(): IBookmarkGroup[] {
    return this._store?.groups || [];
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

    this._initStore();

    this._initialWatcher();
  }

  private async _initStore() {
    this._store = BookmarksStore.create();

    this.viewType = this._store.viewType as TreeViewType;
    this.groupView = this._store.groupView as TreeViewGroupType;
    this.sortedType = this._store.sortedType as TreeViewSortedType;

    if (
      (!workspace.workspaceFolders || workspace.workspaceFolders!.length < 2) &&
      this.groupView !== 'default'
    ) {
      this._store.updateGroupView('default');
    }

    let store;
    this._resolveDatastoreFromStoreFile();
    // 当从 `bookmark-manager.json`文件中读取, 直接刷新返回
    if (!this._configuration.createJsonFile) {
      // 从state中读取数据
      store = this.workspaceState.get<any>(EXTENSION_ID);
      if (!store) {
        store = this._store;
      } else if (store.bookmarks && store.bookmarks.length) {
        for (let bookmark of store.bookmarks) {
          const _bookmark = this._store.createBookmark(bookmark);
          this._store.add(_bookmark);
        }
      }
    }

    this._storeDisposer = onSnapshot(this._store, snapshot => {
      // 更新对应的配置数据
      this.viewType = this._store.viewType as TreeViewType;
      this.groupView = this._store.groupView as TreeViewGroupType;
      this.sortedType = this._store.sortedType as TreeViewSortedType;
      this.save();
    });
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
      });
      this._watcher.onDidChange(uri => {
        // if (this._needWatchFiles) {
        //   this._resolveDatastoreFromStoreFile();
        //   this._changeView();
        //   this.refresh();
        // }
        // this._needWatchFiles = true;
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
    this._needWatchFiles = false;
    for (ws of wsFolders) {
      const storeFilePath = path.join(
        ws.uri.fsPath,
        `./${EXTENSION_STORE_PATH}`,
      );
      if (fs.existsSync(storeFilePath)) {
        let content = fs.readFileSync(storeFilePath, 'utf-8');
        if (!content || !content.length) {
          content = JSON.stringify({
            content: [],
            bookmarks: [],
            groups: [],
          });
        }
        const storeContent = JSON.parse(content) as IBookmarkStoreInfo;

        const _bookmarks = storeContent.content || storeContent.bookmarks || [];

        this._store.addGroups(storeContent.groups || []);

        if (_bookmarks && _bookmarks.length) {
          this._store.addBookmarks(_bookmarks);
        }
      }
    }
    this._needWarning = true;
  }

  /**
   * 当viewType改变的时候, 转换成对应的格式
   */
  private _changeView() {
    if (this.viewType === 'tree') {
      if (this.groupView === 'color') {
        this._groupedByColor = this._getBookmarksGroupedByColor();
      }
      if (this.groupView === 'default') {
        this._groupedByFile = this._getBookmarksGroupedByFile();
      }
      if (this.groupView === 'workspace') {
        this._groupedByWorkspaceFolders =
          this._getBookmarksGroupedByWorkspace();
      }
    }
  }

  /**
   * 获取按照书签颜色设置的书签列表
   * @returns
   */
  private _getBookmarksGroupedByColor() {
    if (!this._store) {
      return [];
    }
    return this._store.bookmarksGroupedByColor;
  }

  /**
   * 获取按照工作区间分组的书签列表
   * @returns
   */
  private _getBookmarksGroupedByWorkspace() {
    if (!this._store) {
      return [];
    }

    return this._store.bookmarksGroupedByWorkspace;
  }

  add(bookmark: Partial<Omit<IBookmark, 'id'>>) {
    const activedGroup = this._store.activedGroup;

    const newBookmark = this._store.createBookmark({
      ...bookmark,
      groupId: activedGroup?.id,
    });

    this._store.add(newBookmark);
  }

  remove(id: string) {
    this._store.delete(id);
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
  }

  getBookmarkStoreByFileUri(fileUri: Uri): IBookmark[] {
    if (!this._store) {
      return [];
    }
    return this._store.getBookmarksByFileUri(fileUri);
  }

  restore() {
    this._store.clearAll();
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
    this._store.clearBookmarksByFile(fileUri);
  }

  /**
   * 根据颜色清除颜色中所有存在标签
   * @param color
   * @returns
   */
  clearAllBookmarksInColor(color: string) {
    if (!this._store.bookmarks.length) {
      return;
    }
    this._store.clearBookmarksByColor(color);
  }

  save() {
    if (this._configuration.createJsonFile) {
      this._saveToDisk();
    } else {
      this.workspaceState.update(EXTENSION_ID, this._store);
    }
    this._changeView();
    this._fire();
  }

  refresh() {
    this._fire();
  }

  changeSortType(sortType: TreeViewSortedType): void {
    this._store.updateSortedType(sortType);
  }

  changeViewType(viewType: TreeViewType) {
    this._store.udpateViewType(viewType);
    this._changeView();
    this._fire();
  }

  changeGroupView(groupType: TreeViewGroupType) {
    this._store.updateGroupView(groupType);
    this._changeView();
    this._fire();
  }

  addBookmarkGroup(groupName: string, color: string = DEFAULT_BOOKMARK_COLOR) {
    this._store.addGroup(groupName, color);
  }

  deleteGroup(groupId: string) {
    this._store.deleteGroup(groupId);
  }

  /**
   * 清除指定组中的所有的书签
   * @param groupId
   */
  clearAllBookmarksInGroup(groupId: string) {
    this._store.clearAllBookmarksInGroup(groupId);
  }

  /**
   * 设置分组的激活状态
   * @param meta 待激活的分组
   */
  setAsDefaultActivedGroup(meta: IBookmarkGroup) {
    const prevActivedGroup = this._store.activedGroup;
    if (prevActivedGroup && prevActivedGroup.id === meta.id) {
      return;
    }

    prevActivedGroup?.setActiveStatus(false);

    meta.setActiveStatus(true);
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
    const storeInfo: IBookmarkStoreInfo = {
      version: process.env.version!,
      workspace: workspace.name,
      updatedDate: new Date().toLocaleDateString(),
      bookmarks: this._store.bookmarks.filter(
        it => it.wsFolder?.uri.fsPath === workspace.uri.fsPath,
      ),
      groups: this._store.groups,
    };
    return JSON.stringify(storeInfo);
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
    if (!this._store) {
      return [];
    }
    return this._store.bookmarksGroupedByFile;
  }

  dispose(): void {
    this._disposables.filter(it => it).forEach(it => it.dispose());
    this._storeDisposer?.();
    destroy(this._store);
  }

  private _fire() {
    if (!this._store) {
      return;
    }
    this._onDidChangeEvent.fire();
  }
}
