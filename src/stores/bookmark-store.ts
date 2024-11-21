import {getEnv, getRoot, Instance, types} from 'mobx-state-tree';
import {l10n, Uri, window, workspace, WorkspaceFolder} from 'vscode';
import {createHoverMessage, generateUUID, sortBookmarks} from '../utils';
import {
  BookmarksGroupedByCustomType,
  BookmarksGroupedByFileType,
  TreeViewGroupEnum,
  TreeViewSortedEnum,
  TreeViewStyleEnum,
} from '../types';
import {registerExtensionCustomContextByKey} from '../context';
import {
  BookmarksGroupedByColorType,
  BookmarksGroupedByWorkspaceType,
  IBookmark,
  Bookmark,
} from './bookmark';
import {BookmarkGroup, IBookmarkGroup} from './bookmark-group';
import {DEFAULT_BOOKMARK_GROUP_ID} from '../constants/bookmark';
import {isProxy} from 'util/types';
import {LoggerService, ServiceManager} from '../services';

const BookmarkGroupDataModel = types.model('BookmarkGroupDataModel', {
  id: types.string,
  sortedIndex: types.optional(types.number, -1),
});

const BookmarkGroupInfoModel = types.model('BookmarkGroupInfoModel', {
  name: types.enumeration([
    TreeViewGroupEnum.FILE,
    TreeViewGroupEnum.DEFAULT,
    TreeViewGroupEnum.COLOR,
    TreeViewGroupEnum.WORKSPACE,
    TreeViewGroupEnum.FILE,
  ]),
  data: types.array(BookmarkGroupDataModel),
});

const logger = new LoggerService('BookmarkStore');

export type BookmarkGroupDataModelType = Instance<
  typeof BookmarkGroupDataModel
>;
export type BookmarkGroupInfoModelType = Instance<
  typeof BookmarkGroupInfoModel
>;

export const BookmarksStore = types
  .model('BookmarksStore', {
    bookmarks: types.array(Bookmark),
    viewType: types.optional(
      types.enumeration([TreeViewStyleEnum.TREE, TreeViewStyleEnum.LIST]),
      TreeViewStyleEnum.TREE,
    ),
    /**
     * 分组视图
     * - file 按照文件分组
     * - color: 按照颜色分组
     * - default: 按照文件分组
     * - workspace: 按照工作区间分组
     * - custom: 按照自定义的分组方式, 参考 @field group.
     */
    groupView: types.optional(
      types.enumeration([
        TreeViewGroupEnum.FILE,
        TreeViewGroupEnum.COLOR,
        TreeViewGroupEnum.DEFAULT,
        TreeViewGroupEnum.WORKSPACE,
        TreeViewGroupEnum.CUSTOM,
      ]),
      TreeViewGroupEnum.FILE,
    ),
    sortedType: types.optional(
      types.enumeration([
        TreeViewSortedEnum.LINENUMBER,
        TreeViewSortedEnum.CUSTOM,
        TreeViewSortedEnum.CREATED_TIME,
        TreeViewSortedEnum.UPDATED_TIME,
      ]),
      TreeViewSortedEnum.LINENUMBER,
    ),
    /**
     * 代表所有的group类型,暂时不考虑其他分组视图中再次以group分组的情况(后续可能会支持), 用户自定义的分组类型, 如果在工作区间
     */
    groups: types.array(BookmarkGroup),

    groupInfo: types.array(BookmarkGroupInfoModel),
  })
  .views(self => {
    return {
      getBookmarksByFileUri(fileUri: Uri) {
        return self.bookmarks.filter(it => it.fileId === fileUri.fsPath);
      },
      get bookmarksGroupedByFile(): BookmarksGroupedByFileType[] {
        if (!self.bookmarks.length) {
          return [];
        }
        const grouped: BookmarksGroupedByFileType[] = [];
        self.bookmarks.forEach(it => {
          const existed = grouped.find(item => item.fileId === it.fileId);
          if (existed) {
            existed.bookmarks.push(it);
          } else {
            grouped.push({
              fileId: it.fileId,
              // @ts-ignore
              fileName: it.fileName || it['filename'],
              fileUri: it.fileUri,
              bookmarks: [it],
            });
          }
        });
        return grouped.map(it => ({
          ...it,
          bookmarks: sortBookmarks(
            it.bookmarks,
            self.sortedType,
            self.groupView,
          ),
        }));
      },
      get bookmarksGroupedByColor(): BookmarksGroupedByColorType[] {
        const grouped: BookmarksGroupedByColorType[] = [];
        self.bookmarks.forEach(it => {
          const existed = grouped.find(item => item.color === it.color);
          if (!existed) {
            grouped.push({
              color: it.color,
              bookmarks: [it],
            });
            return;
          }
          existed.bookmarks.push(it);
        });
        return grouped.map(it => ({
          ...it,
          bookmarks: sortBookmarks(
            it.bookmarks,
            self.sortedType,
            self.groupView,
          ),
        }));
      },

      /**
       * {
       *  workspace: MyWorkspaceFolder
       *  files:[
       *    {
       *        fileId: string,
       *        bookmarks: [
       *
       *        ]
       *    }
       *  ]
       *
       * }
       */
      get bookmarksGroupedByWorkspace(): BookmarksGroupedByWorkspaceType[] {
        const grouped: BookmarksGroupedByWorkspaceType[] = [];
        self.bookmarks.forEach(it => {
          const existed = grouped.find(
            item => item.workspace.name === it.workspaceFolder?.name,
          );

          if (!existed) {
            grouped.push({
              workspace: {...it.workspaceFolder, ...it.wsFolder},
              files: [
                {
                  bookmarks: [it],
                  fileId: it.fileId,
                  fileName: it.fileName,
                  fileUri: it.fileUri,
                },
              ],
            });
            return;
          }
          const existedFile = existed.files.find(
            file => file.fileId === it.fileId,
          );
          if (!existedFile) {
            existed.files.push({
              fileId: it.fileId,
              fileName: it.fileName,
              fileUri: it.fileUri,
              bookmarks: [it],
            });
            return;
          }
          existedFile.bookmarks.push(it);
        });
        return grouped.map(it => {
          it.files = it.files.map(file => {
            return {
              ...file,
              bookmarks: sortBookmarks(
                file.bookmarks,
                self.sortedType,
                self.groupView,
              ),
            };
          });
          return it;
        });
      },

      /**
       * 获取按照自定义的分组方式进行书签分组, 此时groupView 必须为`custom`的情况下
       * @return { BookmarksGroupedByCustomType[]}
       */
      get bookmarksGroupedByCustom(): BookmarksGroupedByCustomType[] {
        const grouped: BookmarksGroupedByCustomType[] = [];
        for (let group of self.groups) {
          const _group = grouped.find(it => it.id == group.id);
          if (!_group) {
            grouped.push({
              id: group.id,
              label: group.label,
              group,
              bookmarks: sortBookmarks(
                self.bookmarks.filter(it => it.groupId === group.id),
                self.sortedType,
                self.groupView,
              ),
            });
          } else {
            _group.bookmarks.push(
              ...sortBookmarks(
                self.bookmarks.filter(it => it.groupId === group.id),
                self.sortedType,
                self.groupView,
              ),
            );
          }
        }

        logger.warn(
          'get bookmarksGroupedByCustom',
          grouped.sort((a, b) => a.group.sortedIndex - b.group.sortedIndex),
        );

        return grouped.sort(
          (a, b) => a.group.sortedIndex - b.group.sortedIndex,
        );
      },
      get totalCount() {
        return self.bookmarks.length;
      },
      get labeledCount() {
        return self.bookmarks.filter(it => it.label.length).length;
      },
      get colors() {
        return self.bookmarks.map(it => it.color);
      },
      get activedGroup() {
        return (
          self.groups.find(it => it.activeStatus === true) ||
          self.groups.find(it => it.id === DEFAULT_BOOKMARK_GROUP_ID)
        );
      },
    };
  })
  .actions(self => {
    function addGroupInfoHelper(
      groupType: TreeViewGroupEnum,
      item: BookmarkGroupDataModelType,
    ) {
      const existed = self.groupInfo.find(it => it.name === groupType);

      if (!existed) {
        self.groupInfo.push({
          name: groupType,
          data: [item],
        });
        return;
      }

      existed.data.push(item);
    }

    function createBookmark(bookmark: any) {
      const sm = ServiceManager.instance;
      let _bookmark: Instance<typeof Bookmark>;
      const {
        id,
        label,
        description,
        type,
        color,
        selectionContent,
        languageId,
        workspaceFolder,
        rangesOrOptions,
        createdAt,
        fileUri,
      } = bookmark;

      let _color = color;
      if (!color && bookmark.customColor) {
        _color = bookmark.customColor.name;
      }
      const fsPath = workspace.asRelativePath(fileUri.fsPath, false);

      const idxInColorGroup =
        self.bookmarksGroupedByColor.find(it => it.color === bookmark.color)
          ?.bookmarks.length || 0;

      const idxInFileGroup =
        self.bookmarksGroupedByFile.find(it => it.fileUri.fsPath === fsPath)
          ?.bookmarks.length || 0;

      const idxInCustomGroup =
        self.bookmarksGroupedByCustom.find(it => it.id === bookmark.groupId)
          ?.bookmarks.length || 0;

      let idxInWorkspaceGroup = 0;
      const workspaceGroup = self.bookmarksGroupedByWorkspace.find(it =>
        it.files.find(f => f.fileUri.fsPath === fsPath),
      );
      if (!workspaceGroup) {
        idxInWorkspaceGroup = 0;
      } else {
        idxInWorkspaceGroup =
          workspaceGroup.files.find(it => it.fileUri.fsPath === fsPath)
            ?.bookmarks.length || 0;
      }

      const groupId = bookmark.groupId || DEFAULT_BOOKMARK_GROUP_ID;

      const {defaultBookmarkIcon, defaultLabeledBookmarkIcon} =
        sm.store.configure.configure;
      _bookmark = Bookmark.create({
        id: id || generateUUID(),
        label,
        description,
        color: _color || 'default',
        fileUri: {
          fsPath,
        },
        type,
        selectionContent,
        languageId,
        workspaceFolder: {
          name: workspaceFolder.name,
          index: workspaceFolder.index,
        },
        rangesOrOptions: rangesOrOptions,
        createdAt,
        groupId,
        sortedInfo: {
          color: idxInColorGroup,
          custom: idxInCustomGroup,
          default: idxInFileGroup,
          file: idxInFileGroup,
          workspace: idxInWorkspaceGroup,
        },
        icon:
          label.length || description.length
            ? defaultLabeledBookmarkIcon
            : defaultBookmarkIcon,
      });

      const colorGroupInfo = self.groupInfo.find(
        it => it.name === TreeViewGroupEnum.COLOR,
      );

      // 表示当前颜色组信息中不存在, 或则颜色组信息不存在此颜色, 需要追加到颜色组信息
      if (
        !colorGroupInfo ||
        !colorGroupInfo.data.find(it => it.id === _bookmark.color)
      ) {
        addColorsGroupInfo({
          id: _bookmark.color,
          sortedIndex: colorGroupInfo ? colorGroupInfo.data.length : 0,
        });
      }

      const fileGroupInfo = self.groupInfo.find(
        it => it.name === TreeViewGroupEnum.FILE,
      );

      if (!fileGroupInfo || !fileGroupInfo.data.find(it => it.id === fsPath)) {
        addFileGroupInfo({
          id: fsPath,
          sortedIndex: fileGroupInfo ? fileGroupInfo.data.length : 0,
        });
      }

      const wsGroupInfo = self.groupInfo.find(
        it => it.name === TreeViewGroupEnum.WORKSPACE,
      );

      if (
        !wsGroupInfo ||
        !wsGroupInfo.data.find(it => it.id === _bookmark.workspaceFolder.name)
      ) {
        addWorkspaceGroupInfo({
          id: _bookmark.workspaceFolder.name,
          sortedIndex: wsGroupInfo ? wsGroupInfo.data.length : 0,
        });
      }

      logger.debug('add bookmark', _bookmark);

      self.bookmarks.push(_bookmark);
      return _bookmark;
    }

    function add(bookmark: IBookmark) {
      if (self.bookmarks.find(it => it.id === bookmark.id)) {
        return;
      }
      self.bookmarks.push(bookmark);
    }

    function addGroups(
      groups: Pick<
        IBookmarkGroup,
        'id' | 'label' | 'sortedIndex' | 'workspace'
      >[],
    ) {
      for (const group of groups) {
        if (self.groups.find(it => it.id === group.id)) {
          continue;
        }
        self.groups.push(BookmarkGroup.create(group));
      }

      if (!self.groups.find(it => it.id === DEFAULT_BOOKMARK_GROUP_ID)) {
        self.groups.push(
          BookmarkGroup.create({
            id: DEFAULT_BOOKMARK_GROUP_ID,
            label: l10n.t('Default Group'),
            sortedIndex: 0,
            activeStatus: true,
            workspace: '',
          }),
        );
      }
    }

    function addBookmarks(bookmarks: any[]) {
      let _bookmarks: IBookmark[] = [];
      for (let bookmark of bookmarks) {
        if (self.bookmarks.find(it => it.id === bookmark.id)) {
          continue;
        }

        if (isProxy(bookmark)) {
          _bookmarks.push(bookmark);
        } else {
          _bookmarks.push(createBookmark(bookmark));
        }
      }

      self.bookmarks.push(..._bookmarks);
    }

    function initStore(data: any) {
      // 注册对应的上下文
      registerExtensionCustomContextByKey(
        'code.viewAsTree',
        self.viewType === TreeViewStyleEnum.TREE,
      );

      registerExtensionCustomContextByKey(
        'code.view.groupView',
        self.groupView,
      );

      registerExtensionCustomContextByKey(
        'code.view.sortedType',
        self.sortedType,
      );
    }

    function addGroup(
      label: string,
      color: string,
      workspaceFolder?: WorkspaceFolder,
    ) {
      if (self.groups.find(it => it.label === label)) {
        window.showInformationMessage(l10n.t('Group name already exists'));
        return;
      }

      const maxIdx = self.groups.reduce(
        (a, b) => (b.sortedIndex > a ? b.sortedIndex : a),
        0,
      );
      self.groups.push(
        BookmarkGroup.create({
          id: generateUUID(),
          label,
          sortedIndex: maxIdx + 1,
          color,
          activeStatus: false,
          workspace: workspaceFolder?.name || '',
        }),
      );
    }

    function deleteGroup(groupId: string) {
      if (!groupId || groupId.length === 0) {
        return;
      }
      const idx = self.groups.findIndex(it => it.id === groupId);
      if (idx === -1) {
        return;
      }
      const bookmarks = self.bookmarks.filter(it => it.groupId === groupId);

      for (let bookmark of bookmarks) {
        self.bookmarks.remove(bookmark);
      }

      self.groups.splice(idx, 1);
    }

    function clearAllBookmarksInGroup(groupId: string) {
      if (!groupId || groupId.length === 0) {
        return;
      }
      const idx = self.groups.findIndex(it => it.id === groupId);
      if (idx === -1) {
        return;
      }
      const bookmarks = self.bookmarks.filter(it => it.groupId === groupId);
      if (!bookmarks.length) {
        return;
      }

      for (let bookmark of bookmarks) {
        self.bookmarks.remove(bookmark);
      }
    }

    function deleteBookmark(id: string) {
      const idx = self.bookmarks.findIndex(it => it.id === id);
      if (idx === -1) {
        return false;
      }
      self.bookmarks.splice(idx, 1);
      return true;
    }

    function udpateViewType(viewType: TreeViewStyleEnum) {
      if (self.viewType === viewType) {
        return;
      }
      registerExtensionCustomContextByKey(
        'code.viewAsTree',
        viewType === TreeViewStyleEnum.TREE,
      );
      self.viewType = viewType;
    }

    function updateGroupView(groupView: TreeViewGroupEnum) {
      if (self.groupView === groupView) {
        return;
      }
      registerExtensionCustomContextByKey('code.view.groupView', groupView);
      self.groupView = groupView;
    }

    function updateSortedType(sortedType: TreeViewSortedEnum) {
      if (self.sortedType === sortedType) {
        return;
      }
      registerExtensionCustomContextByKey('code.view.sortedType', sortedType);
      self.sortedType = sortedType;
    }

    function clearBookmarksByFile(fileUri: Uri) {
      const deleteItems = self.bookmarks.filter(
        it => it.fileId === fileUri.fsPath,
      );
      for (let item of deleteItems) {
        self.bookmarks.remove(item);
      }
    }

    function clearBookmarksByColor(color: string) {
      const bookmarks = self.bookmarks.filter(it => it.color === color);
      for (let bookmark of bookmarks) {
        self.bookmarks.remove(bookmark);
      }
    }

    function clearAll(wsFolder?: WorkspaceFolder) {
      if (wsFolder) {
        const wsName = wsFolder.name;

        const delBookmarks = self.bookmarks.filter(
          it => it.workspaceFolder.name === wsName,
        );
        const delGroups = self.groups.filter(it => it.workspace === wsName);

        for (let bookmark of delBookmarks) {
          self.bookmarks.remove(bookmark);
        }

        for (let group of delGroups) {
          self.groups.remove(group);
        }
      } else {
        self.bookmarks.clear();
      }
      if (self.groups.find(it => it.id !== DEFAULT_BOOKMARK_GROUP_ID)) {
        self.groups.push(
          BookmarkGroup.create({
            id: DEFAULT_BOOKMARK_GROUP_ID,
            label: l10n.t('Default Group'),
            sortedIndex: 0,
            activeStatus: true,
            workspace: '',
          }),
        );
      }
      self.groupInfo.clear();
    }

    /**
     * TODO:根据分组类型对拖拽的内容进行更新索引
     * @param type
     * @param source
     * @param newIdx
     */
    function updateGroupSortedIndex(
      type: TreeViewGroupEnum,
      source:
        | BookmarksGroupedByColorType
        | BookmarksGroupedByCustomType
        | BookmarksGroupedByFileType
        | BookmarksGroupedByWorkspaceType,
      newIdx: number,
    ) {
      let bookmarks: IBookmark[];
      switch (type) {
        case TreeViewGroupEnum.COLOR:
        case TreeViewGroupEnum.DEFAULT:
        case TreeViewGroupEnum.FILE:
          // bookmarks = (source as BookmarksGroupedByColorType).bookmarks;
          break;
        case TreeViewGroupEnum.WORKSPACE:
          // TODO: 工作区间排序
          break;
        case TreeViewGroupEnum.CUSTOM:
        default:
          return;
      }
    }

    function addGroupInfo(
      groupType: TreeViewGroupEnum,
      data: BookmarkGroupDataModelType[],
    ) {
      self.groupInfo.push({
        name: groupType,
        data,
      });
    }

    function addColorsGroupInfo(info: BookmarkGroupDataModelType) {
      addGroupInfoHelper(TreeViewGroupEnum.COLOR, info);
    }

    function addWorkspaceGroupInfo(info: BookmarkGroupDataModelType) {
      addGroupInfoHelper(TreeViewGroupEnum.WORKSPACE, info);
    }

    function addFileGroupInfo(info: BookmarkGroupDataModelType) {
      addGroupInfoHelper(TreeViewGroupEnum.FILE, info);
    }

    /**
     * 已经通过之前groups字段实现
     */
    function addCustomroupInfo(info: BookmarkGroupDataModelType) {}

    function afterCreate() {}

    return {
      add,
      addBookmarks,
      addGroup,
      addGroups,
      afterCreate,
      deleteGroup,
      clearAllBookmarksInGroup,
      createBookmark,
      delete: deleteBookmark,
      udpateViewType,
      updateGroupView,
      updateSortedType,
      clearBookmarksByFile,
      clearBookmarksByColor,
      clearAll,
      initStore,
      updateGroupSortedIndex,
      addGroupInfo,
      addColorsGroupInfo,
      addWorkspaceGroupInfo,
      addFileGroupInfo,
      addCustomroupInfo,
    };
  });

export type IBookmarksStore = Instance<typeof BookmarksStore>;
