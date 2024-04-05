import {Instance, types} from 'mobx-state-tree';
import {l10n, Uri, window, workspace} from 'vscode';
import {
  createHoverMessage,
  generateUUID,
  sortBookmarksByLineNumber,
} from '../utils';
import {
  BookmarksGroupedByCustomType,
  TreeViewGroupType,
  TreeViewSortedType,
  TreeViewType,
} from '../types';
import resolveServiceManager from '../services/ServiceManager';
import {registerExtensionCustomContextByKey} from '../context';
import {
  Bookmark,
  BookmarksGroupedByFileWithSortType,
  BookmarksGroupedByColorType,
  BookmarksGroupedByWorkspaceType,
  IBookmark,
} from './bookmark';
import {BookmarkGroup, IBookmarkGroup} from './bookmark-group';
import {DEFAULT_BOOKMARK_GROUP_ID} from '../constants/bookmark';

export const BookmarksStore = types
  .model('BookmarksStore', {
    bookmarks: types.optional(types.array(Bookmark), []),
    viewType: types.optional(types.enumeration(['tree', 'list']), 'tree'),
    /**
     * 分组视图
     * - file 按照文件分组
     * - color: 按照颜色分组
     * - default: 按照文件分组
     * - workspace: 按照工作区间分组
     * - custom: 按照自定义的分组方式, 参考 @field group.
     */
    groupView: types.optional(
      types.enumeration(['file', 'color', 'default', 'workspace', 'custom']),
      'file',
    ),
    sortedType: types.optional(
      types.enumeration(['linenumber', 'custom', 'createdTime', 'updatedTime']),
      'linenumber',
    ),
    /**
     * 代表所有的group类型,暂时不考虑其他分组视图中再次以group分组的情况(后续可能会支持), 用户自定义的分组类型, 如果在工作区间
     */
    groups: types.optional(types.array(BookmarkGroup), []),
  })
  .views(self => {
    return {
      getBookmarksByFileUri(fileUri: Uri) {
        return self.bookmarks.filter(it => it.fileId === fileUri.fsPath);
      },
      get bookmarksGroupedByFile() {
        if (!self.bookmarks.length) {
          return [];
        }
        const grouped: BookmarksGroupedByFileWithSortType[] = [];
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
      get getBookmarksGroupedByCustom(): BookmarksGroupedByCustomType[] {
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
          sortedIndex: fileUri.sortedIndex || -1,
          bookmarkSortedIndex: fileUri.bookmarkSortedIndex || -1,
          fsPath: workspace.asRelativePath(fileUri.fsPath, false),
        },
        type,
        selectionContent,
        languageId,
        workspaceFolder: {
          sortedIndex: workspaceFolder.sortedIndex || -1,
          bookmarkSortedIndex: workspaceFolder.bookmarkSortedIndex || -1,
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
    return {
      afterCreate() {
        const sm = resolveServiceManager();
        self.viewType = sm.configService.getGlobalValue(
          'code.viewType',
          'tree',
        );
        self.groupView = sm.configService.getGlobalValue(
          'code.groupView',
          'file',
        );
        self.sortedType = sm.configService.getGlobalValue(
          'code.sortedType',
          'createdTime',
        );

        // 注册对应的上下文
        registerExtensionCustomContextByKey(
          'code.viewAsTree',
          self.viewType === 'tree',
        );

        registerExtensionCustomContextByKey(
          'code.view.groupView',
          self.groupView,
        );

        registerExtensionCustomContextByKey(
          'code.view.sortedType',
          self.sortedType,
        );
      },

      add,
      addBookmarks(bookmarks: any[]) {
        let _bookmarks: IBookmark[] = [];
        for (let bookmark of bookmarks) {
          if (_bookmarks.find(it => it.id === bookmark.id)) {
            continue;
          }
          _bookmarks.push(createBookmark(bookmark));
        }

        self.bookmarks.push(..._bookmarks);
      },

      addGroup(label: string, color: string) {
        if (self.groups.find(it => it.label === label)) {
          window.showInformationMessage(l10n.t('Group name already exists'));
          return;
        }
        self.groups.push(
          BookmarkGroup.create({
            id: generateUUID(),
            label,
            sortedIndex: self.groups.length,
            color,
          }),
        );
      },

      addGroups(
        groups: Pick<IBookmarkGroup, 'id' | 'label' | 'sortedIndex'>[],
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
            }),
          );
        }
      },
      deleteGroup(groupId: string) {
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
      },

      clearAllBookmarksInGroup(groupId: string) {
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
      },
      createBookmark,
      delete(id: string) {
        const idx = self.bookmarks.findIndex(it => it.id === id);
        if (idx === -1) {
          return false;
        }
        self.bookmarks.splice(idx, 1);
        return true;
      },
      update(id: string, dto: Partial<IBookmark>) {
        const bookmark = self.bookmarks.find(it => it.id === id);
        if (!bookmark) {
          return;
        }
        Object.keys(dto).forEach(key => {
          // @ts-ignore
          if (dto[key]) {
            // @ts-ignore
            bookmark[key] = dto[key];
          }
        });
      },
      udpateViewType(viewType: TreeViewType) {
        if (self.viewType === viewType) {
          return;
        }
        const sm = resolveServiceManager();
        sm.configService.updateGlobalValue('code.viewType', viewType);
        registerExtensionCustomContextByKey(
          'code.viewAsTree',
          viewType === 'tree',
        );
        self.viewType = viewType;
      },
      updateGroupView(groupView: TreeViewGroupType) {
        if (self.groupView === groupView) {
          return;
        }
        const sm = resolveServiceManager();
        sm.configService.updateGlobalValue('code.groupView', groupView);
        registerExtensionCustomContextByKey('code.view.groupView', groupView);
        self.groupView = groupView;
      },
      updateSortedType(sortedType: TreeViewSortedType) {
        if (self.sortedType === sortedType) {
          return;
        }
        const sm = resolveServiceManager();
        sm.configService.updateGlobalValue('code.sortedType', sortedType);
        registerExtensionCustomContextByKey('code.view.sortedType', sortedType);
        self.sortedType = sortedType;
      },
      clearBookmarksByFile(fileUri: Uri) {
        const deleteItems = self.bookmarks.filter(
          it => it.fileId === fileUri.fsPath,
        );
        for (let item of deleteItems) {
          self.bookmarks.remove(item);
        }
      },
      clearByColor(color: string) {},
      clearAll() {
        self.bookmarks.clear();
      },
    };
  });

export type IBookmarksStore = Instance<typeof BookmarksStore>;
