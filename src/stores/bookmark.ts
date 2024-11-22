import {Instance, SnapshotIn, types} from 'mobx-state-tree';
import {default_bookmark_color, default_bookmark_icon} from '../constants';
import {Selection, Uri, WorkspaceFolder, workspace} from 'vscode';
import {createHoverMessage, escapeColor} from '../utils';
import {BookmarksGroupedByFileType, BookmarkTypeEnum} from '../types';
import {
  MyUriType,
  MyWorkspaceFolderType,
  DecorationOptionsType,
  TagType,
  TSortedInfo,
} from './custom';
import {
  DEFAULT_BOOKMARK_GROUP_ID,
  default_bookmark_svg_icon,
} from '../constants/bookmark';
import {ServiceManager} from '../services';
import {resolveBookmarkController} from '../bootstrap';

export type BookmarksGroupedByColorType = {
  color: string;
  bookmarks: IBookmark[];
};

export type BookmarksGroupedByWorkspaceType = {
  workspace: Partial<WorkspaceFolder>;
  files: BookmarksGroupedByFileType[];
};

export type BookmarksGroupedByIconType = {
  icon: string;
  label: string;
  bookmarks: IBookmark[];
};
export const SortedInfoType = types
  .model('SortedInfoType', {
    color: types.number,
    custom: types.number,
    default: types.number,
    file: types.number,
    workspace: types.number,
    icon: types.number,
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
    /**
     * @zh 书签的自定义标签
     */
    label: types.optional(types.string, ''),
    /**
     * @zh 书签的自定义描述
     */
    description: types.optional(types.string, ''),
    /**
     * @zh 书签颜色键名(key), 不是配置的具体的颜色值
     */
    color: types.optional(types.string, default_bookmark_color),
    /**
     * @zh 数千所在的文件URI
     */
    fileUri: MyUriType,
    /**
     * @zh 书签的类型
     */
    type: types.optional(
      types.enumeration([BookmarkTypeEnum.LINE, BookmarkTypeEnum.SELECTION]),
      BookmarkTypeEnum.LINE,
    ),
    /**
     * @zh 选择的内容数据
     */
    selectionContent: types.optional(types.string, ''),
    /**
     * @zh 书签所在的文件的语言ID
     */
    languageId: types.optional(types.string, 'javascript'),
    /**
     * @zh 书签的工作区间
     */
    workspaceFolder: MyWorkspaceFolderType,
    /**
     * @zh 记录书签的选择区域信息
     */
    rangesOrOptions: DecorationOptionsType,
    /**
     * @zh 代表书签的创建日期
     */
    createdAt: types.optional(types.Date, () => new Date()),

    /**
     * @zh 代表书签Tag 信息, 暂时未用到
     */
    tag: types.optional(TagType, {
      name: 'default',
      sortedIndex: -1,
    }),
    /**
     * @zh 代表书签的分组ID
     */
    groupId: types.optional(types.string, DEFAULT_BOOKMARK_GROUP_ID),
    /**
     * @zh 用于存储在各个分组情况下的分组中的排序索引
     */
    sortedInfo: types.optional(SortedInfoType, {
      color: -1,
      custom: -1,
      default: -1,
      file: -1,
      workspace: -1,
      icon: -1,
    }),

    /**
     * @zh 书签的图标引用
     */
    icon: types.optional(types.string, default_bookmark_icon),
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
       *@zh 当label, range 以及description发生改变时, 调用此计算属性, 获取最新的hoverMessage
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

      get plainColor() {
        const {store, configure} = ServiceManager.instance;
        return (
          store.colors.find(it => it.label === self.color)?.value ||
          configure.configure.defaultBookmarkIconColor
        );
      },

      get escapedColor() {
        const {store, configure} = ServiceManager.instance;
        const color =
          store.colors.find(it => it.label === self.color)?.value ||
          configure.configure.defaultBookmarkIconColor;
        return color.startsWith('#') ? escapeColor(color) : color;
      },

      /**
       *@zh 获取书签的装饰器图标
       */
      get iconPath() {
        const {icons, configure} = ServiceManager.instance;
        const {defaultLabeledBookmarkIcon, defaultBookmarkIcon} =
          configure.configure;
        let iconId = self.icon
          ? self.icon
          : self.label.length || self.description.length
            ? defaultLabeledBookmarkIcon
            : defaultBookmarkIcon;

        let icon = icons.find(it => it.id === iconId);
        if (!icon) {
          icon =
            self.label.length || self.description.length
              ? icons.find(it => it.id === defaultLabeledBookmarkIcon)
              : icons.find(it => it.id === defaultBookmarkIcon);
        }

        const color = (self as any).escapedColor;

        if (icon) {
          return Uri.parse(
            `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24">${
              icon.body.includes('stroke')
                ? icon.body.replace(
                    /stroke\s*=\s*"(.*?)"/gi,
                    `stroke="${color}"`,
                  )
                : icon.body.replace(/fill\s*=\s*"(.*?)"/gi, `fill="${color}"`)
            }</svg>`,
          );
        }
        // 这样写只是为了消除ts报警错误,误删
        const body = default_bookmark_svg_icon.replace(
          /fill="currentColor"/gi,
          `fill="${(self as Instance<typeof Bookmark>).escapedColor}"`,
        );
        return Uri.parse(
          `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24">${body}</svg>`,
        );
      },

      get group() {
        const controller = resolveBookmarkController();
        return controller.store.groups.find(it => it.id === self.groupId);
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

    function updateTextDecoration() {
      ServiceManager.instance.decorationService.updateTextDecoration(
        self as Instance<typeof Bookmark>,
      );
    }

    function update(dto: Partial<Omit<IBookmark, 'id'>>) {
      Object.keys(dto).forEach(key => {
        // @ts-ignore
        setProp(key, dto[key]);
      });
    }

    function updateLabel(label: string) {
      self.label = label;
      updateTextDecoration();
    }

    function updateDescription(desc: string) {
      self.description = desc;
      updateTextDecoration();
    }

    function updateColor(newColor: string) {
      self.color =
        ServiceManager.instance.store.colors.find(it => it.label === newColor)
          ?.label || 'default';
      updateTextDecoration();
    }

    function updateFileUri(uri: Uri) {
      self.fileUri = {
        fsPath: uri.fsPath,
      };
      updateTextDecoration();
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

    function updateIcon(label: string) {
      self.icon = label;
    }

    function afterCreate() {}
    /**
     * @zh 当书签创建时调用 渲染装饰器
     */
    function afterAttach() {}

    return {
      afterCreate,
      afterAttach,
      changeGroupId,
      update,
      updateLabel,
      updateDescription,
      updateFileUri,
      updateColor,
      updateIcon,
      updateSortedInfo,
      updateColorSortedIndex,
      updateWorkspaceSortedIndex,
      updateFileSortedIndex,
      updateTextDecoration,
      removeTextDecoration() {
        ServiceManager.instance.decorationService.removeTextDecoration(
          self as Instance<typeof Bookmark>,
        );
      },
      setProp,
    };
  });

export type IBookmark = Instance<typeof Bookmark>;
