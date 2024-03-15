import {Instance, types} from 'mobx-state-tree';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {Selection, Uri, WorkspaceFolder, workspace} from 'vscode';
import {
  createHoverMessage,
  generateUUID,
  sortBookmarksByLineNumber,
} from '../utils';
import {
  BookmarkColor,
  BookmarksGroupedByFileType,
  TreeViewGroupType,
  TreeViewSortedType,
  TreeViewType,
} from '../types';
import {
  SortedType,
  MyColorType,
  MyUriType,
  MyWorkspaceFolderType,
  DecorationOptionsType,
  TagType,
  IDecorationOptionsType,
  IMyColorType,
} from './custom';
import resolveServiceManager from '../services/ServiceManager';
import {registerExtensionCustomContextByKey} from '../context';

export type BookmarksGroupedByFileWithSortType = BookmarksGroupedByFileType &
  SortedType;

export type BookmarksGroupedByColorType = {
  color: BookmarkColor;
  bookmarks: IBookmark[];
  sortedIndex?: number;
};

export type BookmarksGroupedByWorkspaceType = {
  workspace: Partial<WorkspaceFolder> & SortedType;
  files: BookmarksGroupedByFileType[];
};

export const Bookmark = types
  .model('Boomkmark', {
    id: types.string,
    label: types.optional(types.string, ''),
    description: types.optional(types.string, ''),
    customColor: types.optional(MyColorType, {
      name: DEFAULT_BOOKMARK_COLOR,
      sortedIndex: -1,
      bookmarkSortedIndex: -1,
    }),
    fileUri: MyUriType,
    type: types.optional(types.enumeration(['line', 'selection']), 'line'),
    selectionContent: types.optional(types.string, ''),
    languageId: types.optional(types.string, 'javascript'),
    workspaceFolder: MyWorkspaceFolderType,
    rangesOrOptions: DecorationOptionsType,
    createdAt: types.optional(types.Date, () => new Date()),
    tag: types.optional(TagType, {
      name: 'default',
      sortedIndex: -1,
      bookmarkSortedIndex: -1,
    }),
  })
  .views(self => {
    return {
      get fileId() {
        const ws = workspace.workspaceFolders?.find(
          it => it.name === self.workspaceFolder.name,
        );
        if (!ws) {
          return self.fileUri.fsPath;
        }

        return Uri.joinPath(ws.uri, self.fileUri.fsPath).fsPath;
      },
      get fileName() {
        const arr = self.fileUri.fsPath.split('/');
        return arr[arr.length - 1];
      },
      get color() {
        return self.customColor.name;
      },
      get wsFolder() {
        return workspace.workspaceFolders?.find(
          it => it.name === self.workspaceFolder.name,
        );
      },
      get selection() {
        const {start, end} = self.rangesOrOptions.range;
        return new Selection(
          start.line,
          start.character,
          end.line,
          end.character,
        );
      },
    };
  })
  .actions(self => {
    function update(bookmarkDto: Partial<Omit<IBookmark, 'id'>>) {
      Object.keys(bookmarkDto).forEach(it => {
        // @ts-ignore
        if (bookmarkDto[it]) {
          // @ts-ignore
          self[it] = bookmarkDto[it];
        }
      });
    }
    function updateRangesOrOptionsHoverMessage() {
      const rangesOrOptions = {...self.rangesOrOptions};
      rangesOrOptions.hoverMessage = createHoverMessage(
        self as IBookmark,
        true,
        true,
      );
      self.rangesOrOptions = rangesOrOptions;
    }
    function updateLabel(label: string) {
      self.label = label;
      updateRangesOrOptionsHoverMessage();
    }
    function updateDescription(desc: string) {
      self.description = desc;
      updateRangesOrOptionsHoverMessage();
    }

    function updateRangesOrOptions(rangesOrOptions: IDecorationOptionsType) {
      self.rangesOrOptions = rangesOrOptions;
      updateRangesOrOptionsHoverMessage();
    }

    function updateColor(newColor: IMyColorType) {
      self.customColor = newColor;
    }

    function updateSelectionContent(content: string) {
      self.selectionContent = content;
    }

    function updateFileUri(uri: Uri) {
      self.fileUri = {
        fsPath: uri.fsPath,
        sortedIndex: self.fileUri.sortedIndex,
        bookmarkSortedIndex: self.fileUri.bookmarkSortedIndex,
      };
    }

    return {
      update,
      updateLabel,
      updateDescription,
      updateRangesOrOptions,
      updateRangesOrOptionsHoverMessage,
      updateSelectionContent,
      updateFileUri,
      updateColor,
    };
  });

export const BookmarksStore = types
  .model('BookmarksStore', {
    bookmarks: types.optional(types.array(Bookmark), []),
    viewType: types.optional(types.enumeration(['tree', 'list']), 'tree'),
    groupView: types.optional(
      types.enumeration(['file', 'color', 'default', 'workspace']),
      'file',
    ),
    sortedType: types.optional(
      types.enumeration(['linenumber', 'custom', 'createdTime', 'updatedTime']),
      'linenumber',
    ),
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
      get bookmakrsGroupedByWorkspace() {
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
        let _bookmark;
        for (let bookmark of bookmarks) {
          _bookmark = createBookmark(bookmark);
          add(_bookmark);
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

export type IBookmark = Instance<typeof Bookmark>;

export type IBookmarksStore = Instance<typeof BookmarksStore>;
