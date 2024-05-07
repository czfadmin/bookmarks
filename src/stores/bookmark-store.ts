import {Instance, types} from 'mobx-state-tree';
import {l10n, Uri, window, workspace, WorkspaceFolder} from 'vscode';
import {
  createHoverMessage,
  generateUUID,
  sortBookmarksByLineNumber,
} from '../utils';
import {
  BookmarksGroupedByCustomType,
  BookmarksGroupedByFileType,
  TreeViewGroupEnum,
  TreeViewSortedTypeEnum,
  TreeViewStyleEnum,
} from '../types';
import {registerExtensionCustomContextByKey} from '../context';
import {
  Bookmark,
  BookmarksGroupedByColorType,
  BookmarksGroupedByWorkspaceType,
  IBookmark,
} from './bookmark';
import {BookmarkGroup, IBookmarkGroup} from './bookmark-group';
import {DEFAULT_BOOKMARK_GROUP_ID} from '../constants/bookmark';
const BookmarkColorGroupModel = types.model('BookmarkColorModel', {
  id: types.identifier,
  task: types.string,
});

const BookmarkFileGroupModel = types.model('BookmarkFileGroupModel', {});

const BookmarkWorkspaceGroupModel = types.model(
  'BookmarkWorkspaceGroupModel',
  {},
);
const BookmarkCustomGroupModel = types.model('BookmarkCustomGroupModel', {});

export const BookmarksStore = types
  .model('BookmarksStore', {
    bookmarks: types.optional(types.array(Bookmark), []),
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
        TreeViewSortedTypeEnum.LINENUMBER,
        TreeViewSortedTypeEnum.CUSTOM,
        TreeViewSortedTypeEnum.CREATED_TIME,
        TreeViewSortedTypeEnum.UPDATED_TIME,
      ]),
      TreeViewSortedTypeEnum.LINENUMBER,
    ),
    /**
     * 代表所有的group类型,暂时不考虑其他分组视图中再次以group分组的情况(后续可能会支持), 用户自定义的分组类型, 如果在工作区间
     */
    groups: types.optional(types.array(BookmarkGroup), []),
    /**
     * 按颜色分组的分组信息
     */
    colorsGroupInfo: types.map(BookmarkColorGroupModel),
    /**
     * 按工作区间分组的分组信息
     */
    workspaceGroupInfo: types.map(BookmarkWorkspaceGroupModel),
    /**
     * 按文件分组的分组信息
     */
    fileGroupInfo: types.map(BookmarkFileGroupModel),
    /**
     * 按自定义分组的分组信息
     */
    customGroupInfo: types.map(BookmarkCustomGroupModel),
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
          bookmarks: sortBookmarksByLineNumber(it.bookmarks),
        }));
      },
      get bookmarksGroupedByColor() {
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
          bookmarks: sortBookmarksByLineNumber(it.bookmarks),
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
      get bookmarksGroupedByWorkspace() {
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
              bookmarks: sortBookmarksByLineNumber(file.bookmarks),
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
              bookmarks: self.bookmarks.filter(it => it.groupId === group.id),
            });
          } else {
            _group.bookmarks.push(
              ...self.bookmarks.filter(it => it.groupId === group.id),
            );
          }
        }

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
        return self.bookmarks.map(it => it.color || it.customColor.name);
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
    function createBookmark(bookmark: any) {
      let _bookmark;
      const {
        id,
        label,
        description,
        type,
        selectionContent,
        languageId,
        workspaceFolder,
        rangesOrOptions,
        createdAt,
        fileUri,
      } = bookmark;

      const customColor = bookmark.customColor
        ? bookmark.customColor
        : {
            name: bookmark.color || 'default',
            sortedIndex: -1,
            bookmarkSortedIndex: -1,
          };
      rangesOrOptions.hoverMessage = createHoverMessage(bookmark, true, true);
      _bookmark = Bookmark.create({
        id: id || generateUUID(),
        label,
        description,
        customColor,
        fileUri: {
          fsPath: workspace.asRelativePath(fileUri.fsPath, false),
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
        groupId: bookmark.groupId || DEFAULT_BOOKMARK_GROUP_ID,
      });
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
        if (_bookmarks.find(it => it.id === bookmark.id)) {
          continue;
        }
        _bookmarks.push(createBookmark(bookmark));
      }

      self.bookmarks.push(..._bookmarks);
    }

    function initStore(data: any) {
      const {sortedType, viewType, groupView} = data;
      self.groupView = groupView;
      self.sortedType = sortedType;
      self.viewType = viewType;

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

    function updateSortedType(sortedType: TreeViewSortedTypeEnum) {
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
      const bookmarks = self.bookmarks.filter(
        it => it.customColor.name === color,
      );
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
        self.groups.replace(
          self.groups.filter(it => it.id === DEFAULT_BOOKMARK_GROUP_ID),
        );
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
    }

    /**
     * 根据分组类型对拖拽的内容进行更新索引
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
        case TreeViewGroupEnum.CUSTOM:
          bookmarks = (source as BookmarksGroupedByColorType).bookmarks;
          break;
        case TreeViewGroupEnum.WORKSPACE:
          // TODO: 工作区间排序
          return;
        default:
          return;
      }
      if (!bookmarks) {
        return;
      }
    }

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
    };
  });

export type IBookmarksStore = Instance<typeof BookmarksStore>;
