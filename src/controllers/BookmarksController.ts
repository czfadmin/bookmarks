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

import {
  IDisposer,
  applySnapshot,
  destroy,
  getSnapshot,
  onSnapshot,
} from 'mobx-state-tree';
import {fileURLToPath} from 'node:url';

import {IDisposable} from '../utils';
import {
  DEFAULT_BOOKMARK_COLOR,
  DEFAULT_BOOKMARK_GROUP_ID,
  EXTENSION_ID,
  EXTENSION_STORE_FILE_NAME,
  EXTENSION_STORE_PATH,
} from '../constants';

import {ServiceManager} from '../services/ServiceManager';
import {
  BookmarksGroupedByColorType,
  BookmarksGroupedByWorkspaceType,
  IBookmark,
  IBookmarkGroup,
  IBookmarksStore,
} from '../stores';

import {IBookmarkManagerConfigure} from '../stores/configure';
import {
  TreeViewStyleEnum,
  TreeViewSortedEnum,
  IBookmarkStoreInfo,
  BookmarksGroupedByCustomType,
  TreeViewGroupEnum,
  BookmarksGroupedByFileType,
} from '../types';
import IController from './IController';
import {isProxy} from 'node:util/types';
import {LoggerService} from '../services';

export default class BookmarksController implements IController {
  private _context: ExtensionContext;

  private _onDidChangeEvent = new EventEmitter<void>();

  private _store!: IBookmarksStore;
  private _disposables: IDisposable[] = [];

  private _watcher: FileSystemWatcher | undefined;

  private _configuration: IBookmarkManagerConfigure;
  private _sm: ServiceManager;

  private _logger: LoggerService;

  /**
   * 表示第一次创建存储文件
   */
  private _needWarning: boolean = true;

  private _storeDisposer: IDisposer | undefined;

  public onDidChangeEvent: Event<void> = this._onDidChangeEvent.event;

  public get workspaceState(): Memento {
    return this._context.workspaceState;
  }

  public get store(): IBookmarksStore {
    return this._store!;
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

  public get viewType(): TreeViewStyleEnum {
    return this._store.viewType as TreeViewStyleEnum;
  }

  public get groupView(): TreeViewGroupEnum {
    return this._store.groupView as TreeViewGroupEnum;
  }

  public get sortedType(): TreeViewSortedEnum {
    return this._store.sortedType as TreeViewSortedEnum;
  }

  public get groupedBookmarks():
    | BookmarksGroupedByFileType[]
    | BookmarksGroupedByCustomType[]
    | BookmarksGroupedByColorType[]
    | BookmarksGroupedByWorkspaceType[] {
    switch (this._store.groupView) {
      case TreeViewGroupEnum.FILE:
      case TreeViewGroupEnum.DEFAULT:
        return this._store.bookmarksGroupedByFile;
      case TreeViewGroupEnum.COLOR:
        return this._store.bookmarksGroupedByColor;
      case TreeViewGroupEnum.WORKSPACE:
        return this._store.bookmarksGroupedByWorkspace;
      case TreeViewGroupEnum.CUSTOM:
        return this._store.bookmarksGroupedByCustom;
      default:
        return [];
    }
  }

  public get configService() {
    return this._sm.configService;
  }
  constructor(context: ExtensionContext, serviceManager: ServiceManager) {
    this._context = context;
    this._sm = serviceManager;
    this._configuration = this.configService.configuration;
    this._logger = new LoggerService(BookmarksController.name);
    this._initial();
  }

  private async _initial() {
    this._needWarning = this.configService.getGlobalValue('_needWarning', true);

    this.configService.onExtensionConfigChange(configuration => {
      this._configuration = configuration;
    });

    this.configService.onDidChangeConfiguration(ev => {
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
    let store;
    this._store = this._sm.store.bookmarksStore;

    if (
      (!workspace.workspaceFolders || workspace.workspaceFolders!.length < 2) &&
      this.groupView === TreeViewGroupEnum.WORKSPACE
    ) {
      this._store.updateGroupView(TreeViewGroupEnum.DEFAULT);
    }

    this._resolveDataFromStoreFile();
    // 当从 `bookmark-manager.json`文件中读取, 直接刷新返回
    if (!this._configuration.createJsonFile) {
      // 从state中读取数据
      try {
        store = this.workspaceState.get<any>(EXTENSION_ID);
        if (!store) {
          store = this._store;
        }

        applySnapshot(this._store, isProxy(store) ? getSnapshot(store) : store);

        if (!this._store.groups.length) {
          this._store.addGroups([]);
        }

        this._logger.debug(getSnapshot(this._store));
      } catch (error) {
        this._logger.error(error);
      }

      // 删除 存储文件
      this._deleteStoreFiles();
    } else {
      store = this.workspaceState.get<any>(EXTENSION_ID);
      // 从state中读取数据, 并移除state中的数据
      if (store) {
        this.workspaceState.update(EXTENSION_ID, null);
      }
    }

    this.save();

    // 监听mst的store的快照, 当快照发生变化时, 将数据保存到存储文件中
    this._storeDisposer = onSnapshot(this._store, snapshot => {
      this.save();
      this._logger.debug(getSnapshot(this._store));
    });
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
      it => it.color.label === colorName,
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
    this._store.clearBookmarksByFile(fileUri);
  }

  /**
   * 根据颜色清除颜色中所有存在标签
   * @param color
   * @returns
   */
  clearAllBookmarksInColor(color: string) {
    this._store.clearBookmarksByColor(color);
  }

  save() {
    if (this._configuration.createJsonFile) {
      this._saveToDisk();
    } else {
      this.workspaceState.update(EXTENSION_ID, this._store);
    }
    this.refresh();
  }

  refresh() {
    this._fire();
  }

  changeSortType(sortType: TreeViewSortedEnum): void {
    this._store.updateSortedType(sortType);
    this.refresh();
  }

  changeViewType(viewType: TreeViewStyleEnum) {
    this._store.udpateViewType(viewType);
    this.refresh();
  }

  changeGroupView(groupType: TreeViewGroupEnum) {
    this._store.updateGroupView(groupType);
    this.refresh();
  }

  addBookmarkGroup(
    groupName: string,
    color: string = DEFAULT_BOOKMARK_COLOR,
    workspaceFolder?: WorkspaceFolder,
  ) {
    this._store.addGroup(groupName, color, workspaceFolder);
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
   * 更新指定书签的排序索引
   * @param bookmark
   * @param idx
   */
  updateBookmarkSortedInfo(bookmark: IBookmark, idx: number) {
    let group:
      | BookmarksGroupedByCustomType
      | BookmarksGroupedByColorType
      | BookmarksGroupedByFileType
      | undefined;
    switch (this._store.groupView) {
      case TreeViewGroupEnum.CUSTOM:
        group = (this.groupedBookmarks as BookmarksGroupedByCustomType[]).find(
          it => it.id === bookmark.groupId,
        );

        break;

      case TreeViewGroupEnum.COLOR:
        group = (this.groupedBookmarks as BookmarksGroupedByColorType[]).find(
          it => it.color === bookmark.color.label,
        );
        break;
      case TreeViewGroupEnum.FILE:
      case TreeViewGroupEnum.DEFAULT:
        group = (this.groupedBookmarks as BookmarksGroupedByFileType[]).find(
          it => it.fileUri.fsPath === bookmark.fileUri.fsPath,
        );
        break;
      case TreeViewGroupEnum.WORKSPACE:
        const ws = (
          this.groupedBookmarks as BookmarksGroupedByWorkspaceType[]
        ).find(it => it.workspace.name === bookmark.workspaceFolder.name);

        group = ws?.files?.find(
          it => it.fileUri.fsPath === bookmark.fileUri.fsPath,
        );
        break;
      default:
        break;
    }

    if (
      !group ||
      this.groupView === TreeViewGroupEnum.FILE ||
      this.groupView === TreeViewGroupEnum.DEFAULT ||
      this.groupView === TreeViewGroupEnum.WORKSPACE
    ) {
      return;
    }

    this._updateBookmarkSortedInfo(bookmark, group.bookmarks, idx);
  }

  private _updateBookmarkSortedInfo(
    bookmark: IBookmark,
    bookmarks: IBookmark[],
    targetIdx: number,
  ) {
    const currentIdx = bookmark.sortedInfo[this.groupView];
    if (currentIdx < targetIdx) {
      for (let i = targetIdx; i > currentIdx; i--) {
        const current = bookmarks[i];
        current.updateSortedInfo(this.groupView, i - 1);
      }
    } else {
      for (let i = targetIdx; i < currentIdx; i++) {
        const current = bookmarks[i];
        current.updateSortedInfo(this.groupView, i + 1);
      }
    }

    // 3. 更新当前书签
    bookmark.updateSortedInfo(this.groupView, targetIdx);
    this._logger.warn(bookmarks.map(it => it.sortedInfo[this.groupView]));
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
    const saveBookmarks = this._store.bookmarks.filter(
      it => it.wsFolder?.uri.fsPath === workspace.uri.fsPath,
    );
    // 可能使用了在其他工作区间船创建的分组
    const _usedGroupdIds = saveBookmarks.map(it => it.groupId);

    // 默认都要带上默认的分组, 避免首次切换到自定义分组的时候失败
    if (!_usedGroupdIds.includes(DEFAULT_BOOKMARK_GROUP_ID)) {
      _usedGroupdIds.push(DEFAULT_BOOKMARK_GROUP_ID);
    }

    const groups = this._store.groups.filter(
      it =>
        !it.workspace ||
        it.workspace === workspace.name ||
        _usedGroupdIds.includes(it.id),
    );
    const updatedDate = new Date();
    const storeInfo: IBookmarkStoreInfo = {
      version: process.env.version!,
      workspace: workspace.name,
      updatedDate: updatedDate.toLocaleString(),
      updatedDateTimespan: updatedDate.getTime(),
      viewType: this._store.viewType,
      groupView: this._store.groupView,
      sortedType: this._store.sortedType,
      bookmarks: saveBookmarks,
      groups,
      groupInfo: this._store.groupInfo,
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

      this.configService.updateGlobalValue('needWarning', false);
      this._needWarning = false;

      return;
    }

    if (!this._needWarning && this.store?.bookmarks.length) {
      this.configService.updateGlobalValue('needWarning', true);
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
   * 从文件中读取书签数据
   * @returns []
   */
  private _resolveDataFromStoreFile() {
    let ws;
    const wsFolders = workspace.workspaceFolders || [];
    let firstInit = true;
    for (ws of wsFolders) {
      const storeFilePath = path.join(
        ws.uri.fsPath,
        `./${EXTENSION_STORE_PATH}`,
      );
      if (fs.existsSync(storeFilePath)) {
        let content = fs.readFileSync(storeFilePath, 'utf-8');

        if (!content) {
          content = JSON.stringify({
            content: [],
            bookmarks: [],
            groups: [],
            viewType: TreeViewStyleEnum.TREE,
            groupView: TreeViewGroupEnum.DEFAULT,
            sortedType: TreeViewSortedEnum.LINENUMBER,
            groupInfo: [],
          });
        }

        const storeContent = JSON.parse(content) as IBookmarkStoreInfo;

        applySnapshot(this._store, {
          ...storeContent,
          bookmarks: storeContent.bookmarks || [],
          groups: storeContent.groups || [],
          groupInfo: storeContent.groupInfo || [],
        } as any);

        // 这时候要添加每个工作区间的文件夹中的书签和分组信息
        if (firstInit) {
          this._store.initStore(storeContent);
          firstInit = false;
        }
      }
    }
    this._needWarning = true;
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
        if (!uri) {
          return;
        }
        const wsFolder = workspace.getWorkspaceFolder(uri);
        /**
         * 清除指定的工作区间的书签
         */
        this._store.clearAll(wsFolder);
      });
      this._disposables.push(this._watcher);
    }
  }

  private _deleteStoreFiles() {
    const workspaces = workspace.workspaceFolders || [];
    for (let ws of workspaces) {
      const file = path.join(ws.uri.fsPath, './.vscode/bookmark-manager.json');
      if (fs.existsSync(file)) {
        fs.rmSync(file);
      }
    }
  }

  /**
   * @zh 清理所有书签装饰器
   */
  disposeAllBookmarkTextDecorations() {
    this._store.bookmarks.forEach(it => it.disposeTextDecoration());
  }

  dispose(): void {
    this._disposables.filter(it => it).forEach(it => it.dispose());
    this._storeDisposer?.();
    this.disposeAllBookmarkTextDecorations();
    destroy(this._store);
  }

  private _fire() {
    if (!this._store) {
      return;
    }
    this._onDidChangeEvent.fire();
  }
}
