import {
  IModelType,
  Instance,
  ISnapshotProcessor,
  IType,
  SnapshotIn,
  SnapshotOut,
  types,
} from 'mobx-state-tree';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {Selection, Uri, WorkspaceFolder, workspace} from 'vscode';
import {createHoverMessage} from '../utils';
import {
  BookmarkColor,
  BookmarksGroupedByFileType,
  BookmarkTypeEnum,
} from '../types';
import {
  MyColorType,
  MyUriType,
  MyWorkspaceFolderType,
  DecorationOptionsType,
  TagType,
  IDecorationOptionsType,
  IMyColorType,
  TSortedInfo,
  SortedInfoType,
} from './custom';
import {DEFAULT_BOOKMARK_GROUP_ID} from '../constants/bookmark';

export type BookmarksGroupedByColorType = {
  color: BookmarkColor;
  bookmarks: IBookmark[];
};

export type BookmarksGroupedByWorkspaceType = {
  workspace: Partial<WorkspaceFolder>;
  files: BookmarksGroupedByFileType[];
};

export const Bookmark = types
  .model('Boomkmark', {
    id: types.string,
    label: types.optional(types.string, ''),
    description: types.optional(types.string, ''),
    customColor: types.optional(MyColorType, {
      name: DEFAULT_BOOKMARK_COLOR,
    }),
    fileUri: MyUriType,
    type: types.optional(
      types.enumeration([BookmarkTypeEnum.LINE, BookmarkTypeEnum.SELECTION]),
      BookmarkTypeEnum.LINE,
    ),
    selectionContent: types.optional(types.string, ''),
    languageId: types.optional(types.string, 'javascript'),
    workspaceFolder: MyWorkspaceFolderType,
    rangesOrOptions: DecorationOptionsType,
    createdAt: types.optional(types.Date, () => new Date()),
    tag: types.optional(TagType, {
      name: 'default',
      sortedIndex: -1,
    }),
    groupId: types.optional(types.string, DEFAULT_BOOKMARK_GROUP_ID),
    /**
     * 用于存储在各个分组情况下的分组中的排序索引
     */
    sortedInfo: types.optional(SortedInfoType, {
      color: -1,
      custom: -1,
      default: -1,
      file: -1,
      workspace: -1,
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
    function setProp<
      K extends keyof SnapshotIn<typeof self>,
      V extends SnapshotIn<typeof self>[K],
    >(key: K, value: V) {
      self[key] = value;
    }
    function update(dto: Partial<Omit<IBookmark, 'id'>>) {
      Object.keys(dto).forEach(key => {
        // @ts-ignore
        setProp(key, dto[key]);
      });

      updateRangesOrOptionsHoverMessage();
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
      };
    }

    function changeGroupId(id: string) {
      self.groupId = id;
    }

    /**
     * 书签的按颜色分组情况下组的排序索引
     * @param idx
     */
    function updateColorSortedIndex(idx: number) {
      self.sortedInfo.color = idx;
    }

    /**
     * 书签的按工作区间分组情况下组的排序索引
     * @param idx
     */
    function updateWorkspaceSortedIndex(idx: number) {
      self.sortedInfo.workspace = idx;
    }

    /**
     * 书签的按文件分组情况下组的排序索引
     * @param idx
     */
    function updateFileSortedIndex(idx: number) {
      self.sortedInfo.file = idx;
      self.sortedInfo.default = idx;
    }

    /**
     * 对指定的key类型进行排序, 作用时更新在特定组中的书签顺序
     * @param key
     * @param value
     */
    function updateSortedInfo(key: keyof TSortedInfo, value: number) {
      if (self.sortedInfo) {
        self.sortedInfo[key] = value;
        // 更新同组中数据排序索引
      }
    }

    function afterCreate() {}

    return {
      afterCreate,
      setProp,
      update,
      updateLabel,
      updateDescription,
      updateRangesOrOptions,
      updateRangesOrOptionsHoverMessage,
      updateSelectionContent,
      updateFileUri,
      updateColor,
      changeGroupId,
      updateSortedInfo,
      updateColorSortedIndex,
      updateWorkspaceSortedIndex,
      updateFileSortedIndex,
    };
  });

/**
 * 增加hooks, 将bookmark数据转换
 */
export const BookmarkProcessorModel: ISnapshotProcessor<
  typeof Bookmark,
  SnapshotIn<typeof Bookmark>,
  SnapshotOut<typeof Bookmark>
> = types.snapshotProcessor(Bookmark, {
  preProcessor(snapshot: SnapshotIn<IBookmark>) {
    console.log(snapshot);
    return {
      ...snapshot,
      rangesOrOptions: {
        ...snapshot.rangesOrOptions,
        hoverMessage: createHoverMessage(snapshot as IBookmark, true, true),
      },
    } as unknown as SnapshotOut<typeof Bookmark>;
  },
  postProcessor(snapshot: SnapshotOut<IBookmark>, node) {
    return snapshot;
  },
});

export type IBookmarkProcessorModel = Instance<typeof BookmarkProcessorModel>;

export type IBookmark = Instance<typeof Bookmark>;
