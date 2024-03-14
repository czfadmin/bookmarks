import {Instance, destroy, onSnapshot, types} from 'mobx-state-tree';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {
  DecorationOptions,
  Range,
  Selection,
  Uri,
  WorkspaceFolder,
} from 'vscode';
import {createHoverMessage, generateUUID} from '../utils';
import {resolveBookmarkController} from '../bootstrap';

type SortedType = {
  /**
   * 表示文件/工作区间的排序索引
   */
  sortedIndex?: number;
  /**
   * 当按照文件/工作区分组的时, 书签的顺序索引
   */
  bookmarkSortedIndex?: number;
};

type MyUri = Uri & SortedType;

type MyWorkspaceFolder = WorkspaceFolder & SortedType;

type MyColor = {
  name: string;
} & SortedType;

type MyTag = SortedType & {
  name: string;
};

const TagType = types.custom<MyTag, MyTag>({
  name: 'MyTag',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value: MyTag) {
    return value;
  },
  isTargetType(value: MyTag | any): boolean {
    return true;
  },
  getValidationMessage(value: MyTag): string {
    return '';
  },
});

const MyUriType = types.custom<MyUri, MyUri>({
  name: 'MyUri',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value: Uri) {
    return value;
  },
  isTargetType(value: Uri | any): boolean {
    return true;
  },
  getValidationMessage(value: Uri): string {
    return '';
  },
});

export type IMyUriType = Instance<typeof MyUriType>;

const MyWorkspaceFolderType = types.custom<
  MyWorkspaceFolder,
  MyWorkspaceFolder
>({
  name: 'MyWorkspaceFolder',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMyWorkspaceFolderType = Instance<typeof MyWorkspaceFolderType>;

const RangType = types.custom<Range, Range>({
  name: 'RangeType',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    if (!snapshot) {return 'Invalid rangesOrOptions';}
    return '';
  },
});

export type IRangeType = Instance<typeof RangType>;

const DecorationOptionsType = types.custom<
  DecorationOptions,
  DecorationOptions
>({
  name: 'DecorationOptions',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});
export type IDecorationOptionsType = Instance<typeof DecorationOptionsType>;

const MyColorType = types.custom<MyColor, MyColor>({
  name: 'MyColor',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMyColorType = Instance<typeof MyColorType>;

const MySelectionType = types.custom<Selection, Selection>({
  name: 'Selection',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMySelectionType = Instance<typeof MySelectionType>;

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
    workspaceFolder: types.maybeNull(MyWorkspaceFolderType),
    rangesOrOptions: DecorationOptionsType,
    createdAt: types.optional(types.Date, () => new Date()),
    tag: types.optional(TagType, {
      name: 'defaul',
      sortedIndex: -1,
      bookmarkSortedIndex: -1,
    }),
  })
  .views(self => {
    return {
      get fileId() {
        return self.fileUri.fsPath;
      },
      get fileName() {
        return self.fileUri.fsPath;
      },
      get color() {
        return self.customColor.name;
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
    function updateLabel(label: string) {
      self.label = label;
    }
    function updateDescription(desc: string) {
      self.description = desc;
    }

    function updateRangesOrOptions(rangesOrOptions: IDecorationOptionsType) {
      self.rangesOrOptions = rangesOrOptions;
    }

    function updateColor(newColor: IMyColorType) {
      self.customColor = newColor;
    }
    return {
      update,
      updateLabel,
      updateDescription,
      updateRangesOrOptions,
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
      types.enumeration(['linenumber', 'custom', 'time']),
      'linenumber',
    ),
  })
  .views(self => {
    return {
      groupedByFile(fileUri: Uri) {
        const arr = [];
        return self.bookmarks.filter(
          it => it.fileUri.fsPath === fileUri.fsPath,
        );
      },
      groupedByColor(color: IMyColorType) {
        return self.bookmarks.filter(it => it.color === color.name);
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
        ? MyColorType.create({...bookmark.customColor})
        : MyColorType.create({
            name: bookmark.color,
            sortedIndex: -1,
            bookmarkSortedIndex: -1,
          });
      rangesOrOptions.hoverMessage = createHoverMessage(bookmark, true, true);
      _bookmark = Bookmark.create({
        id: id || generateUUID(),
        label,
        description,
        customColor,
        fileUri: MyUriType.create(fileUri),
        type,
        selectionContent,
        languageId,
        workspaceFolder: MyWorkspaceFolderType.create({...workspaceFolder}),
        rangesOrOptions: DecorationOptionsType.create({
          ...rangesOrOptions,
        }),

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
        if (idx === -1) {return false;}
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
      clearBookmarksByFile(fileName: string) {
        const deleteItems = self.bookmarks.filter(
          it => it.fileUri.fsPath === fileName,
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
