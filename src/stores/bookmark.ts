import {BookmarkGroup} from './bookmark-group';
import {
  getParent,
  Instance,
  ISnapshotProcessor,
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
  IMyColorType,
  TSortedInfo,
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

export const SortedInfoType = types
  .model('SortedInfoType', {
    color: types.number,
    custom: types.number,
    default: types.number,
    file: types.number,
    workspace: types.number,
  })
  .actions(self => {
    function setProp<
      K extends keyof SnapshotIn<typeof self>,
      V extends SnapshotIn<typeof self>[K],
    >(key: K, value: V) {
      self[key] = value;
    }
    return {
      update: setProp,
    };
  });

export type ISortedInfoType = Instance<typeof SortedInfoType>;

export const Bookmark = types
  .model('Boomkmark', {
    id: types.string,
    label: types.optional(types.string, ''),
    description: types.optional(types.string, ''),
    /**
     * 书签颜色键名(key), 不是配置的颜色值
     */
    color: types.optional(types.string, DEFAULT_BOOKMARK_COLOR),
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

    group: types.maybeNull(
      types.reference(BookmarkGroup, {
        get(identifier, parent: any) {
          return (
            (getParent(parent, 2) as any).groups.find(
              (it: any) => it.id === identifier,
            ) || null
          );
        },
        set(value, parent) {
          return value.id;
        },
      }),
    ),

    /**
     * @zh 书签的gutter图像名称 - 和gutter模型中的name相对应
     */
    gutterName: types.optional(types.string, ''),
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
      /**
       * 当label, range 以及description发生改变时, 调用此计算属性, 获取最新的hoverMessage
       */
      get prettierRangesOrOptions() {
        const rangesOrOptions = {...self.rangesOrOptions};
        rangesOrOptions.hoverMessage = createHoverMessage(
          self as IBookmark,
          true,
          true,
        );
        return rangesOrOptions;
      },

      /**
       * 获取书签的装饰器图标
       */
      get iconPath() {
        return '';
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
    }

    function updateLabel(label: string) {
      self.label = label;
    }
    function updateDescription(desc: string) {
      self.description = desc;
    }

    function updateColor(newColor: string) {
      self.color = newColor;
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
        self.sortedInfo.update(key, value);
      }
    }

    /**
     *  更新gutter信息
     * @param name
     */
    function updateGutter(name: string) {
      self.gutterName = name;
    }

    function afterCreate() {}

    return {
      afterCreate,
      setProp,
      update,
      updateLabel,
      updateDescription,
      updateFileUri,
      updateColor,
      changeGroupId,
      updateSortedInfo,
      updateColorSortedIndex,
      updateWorkspaceSortedIndex,
      updateFileSortedIndex,
      updateGutter,
    };
  });

/**
 * 增加hooks, 将bookmark数据转换, PS: 暂时未使用到此hooks
 */
export const BookmarkProcessorModel: ISnapshotProcessor<
  typeof Bookmark,
  SnapshotIn<typeof Bookmark>,
  SnapshotOut<typeof Bookmark>
> = types.snapshotProcessor(Bookmark, {
  preProcessor(snapshot: SnapshotIn<IBookmark>): SnapshotOut<IBookmark> {
    return snapshot as SnapshotOut<IBookmark>;
  },
  postProcessor(snapshot: SnapshotOut<IBookmark>, node) {
    return snapshot;
  },
});

export type IBookmarkProcessorModel = Instance<typeof BookmarkProcessorModel>;

export type IBookmark = Instance<typeof Bookmark>;
