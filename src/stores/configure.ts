import {Instance, getRoot, types} from 'mobx-state-tree';
import {workspace} from 'vscode';
import {
  DEFAULT_BOOKMARK_COLOR,
  default_bookmark_icon,
  default_bookmark_tag,
  EXTENSION_ID,
} from '../constants';
import {defaultColors} from '../constants/colors';
import {CreateDecorationOptions} from './decoration';
import {GlobalStore} from './global';

export type StringIndexType<T> = {[key: string]: T};

/**
 * @zh 插件在 vscode 的自定义配置
 */
export const BookmarkManagerConfigure = types
  .model('BookmarkManagerConfigure', {
    /**
     * @zh 配置书签的颜色
     */
    colors: types.map(types.string),

    /**
     * @zh 配置用户自定义的图标列表 如: 名称-iconfiy资源名称
     */
    icons: types.map(types.string),

    /**
     * @zh 是否开启lineBlame 功能
     */
    lineBlame: types.optional(types.boolean, false),
    /**
     * @zh 是否在树视图中显示相对路径
     */
    relativePath: types.optional(types.boolean, false),
    /**
     * @zh 允许单击书签跳转到书签所在位置
     */
    enableClick: types.optional(types.boolean, false),

    /**
     * @zh 设置默认书签颜色
     */
    defaultBookmarkIconColor: types.optional(
      types.string,
      DEFAULT_BOOKMARK_COLOR,
    ),

    /**
     * @zh 是否在`.vscode`文件中创建`bookmark-manager.json`,建议将`bookmark-manager.json`添加到.gitignore,避免提交到代码仓库中,引起不必要的麻烦
     *
     */
    createJsonFile: types.optional(types.boolean, false),

    /**
     * @zh 使用内置的颜色列表来进行选择书签的颜色
     */
    useBuiltInColors: types.optional(types.boolean, false),

    /**
     * @zh 是否将`bookmark-manager.json`文件追加到`.gitIgnore` 文件中
     */
    alwaysIgnore: types.optional(types.boolean, false),

    /**
     * @zh 自动将单行书签切换为多行书签
     */
    autoSwitchSingleToMultiWhenLineWrap: types.optional(types.boolean, false),

    /**
     * @zh 默认书签图标 (mdi:bookmark)
     */
    defaultBookmarkIcon: types.optional(types.string, default_bookmark_icon),

    /**
     * @zh 默认带有标签的书签图标 (mdi:tag)
     */
    defaultLabeledBookmarkIcon: types.optional(
      types.string,
      default_bookmark_tag,
    ),
  })
  .views(self => {
    const configuration = workspace.getConfiguration(EXTENSION_ID);
    return {
      get customColors() {
        const _customColors: StringIndexType<string> = {};
        Object.entries(configuration.get('colors') as object).filter(
          ([key, value]) => {
            if (typeof value === 'string') {
              _customColors[key] = value;
            }
          },
        );
        return _customColors;
      },
    };
  })
  .actions(self => {
    function refreshColors() {
      const configuration = workspace.getConfiguration(EXTENSION_ID);
      const _colors = {} as any;
      Object.entries(configuration.get('colors') as object).forEach(
        ([key, value]) => {
          if (typeof value === 'string') {
            _colors[key] = value;
          }
        },
      );

      if (self.useBuiltInColors) {
        Object.entries(defaultColors).forEach(([key, color]) => {
          if (!_colors[key]) {
            _colors[key] = color;
          }
        });
      }

      _colors['default'] =
        configuration.get('defaultBookmarkIconColor') || DEFAULT_BOOKMARK_COLOR;
      if ((self as IBookmarkManagerConfigure).updateColors) {
        (self as IBookmarkManagerConfigure).updateColors(_colors);
      }

      // 填充到根节点的colors节点上
      Object.entries(_colors).forEach((v, i) => {
        getRoot<Instance<typeof GlobalStore>>(self).addNewColor(
          v[0],
          v[1] as string,
        );
      });
    }
    function resolveConfiguration() {
      const configuration = workspace.getConfiguration(EXTENSION_ID);

      Object.keys(self).forEach(k => {
        // @ts-ignore
        if (typeof self[k] !== 'function') {
          if (k === 'colors') {
            return;
          }
          const v = configuration.get(k);
          if (v !== undefined || v !== null) {
            // @ts-ignore
            self[k] = v;
          }
        }
      });

      refreshColors();
    }

    function refreshIcons() {
      const configuration = workspace.getConfiguration(EXTENSION_ID);
      self.icons.clear();
      Object.entries(configuration.get('icons') as object).forEach(
        ([key, value]) => {
          if (typeof value === 'string') {
            self.icons.set(key, value);
          }
        },
      );
    }
    return {
      updateColors(colors: StringIndexType<string>) {
        self.colors.clear();
        Object.keys(colors).forEach(it => {
          self.colors.set(it, colors[it]);
        });
      },
      afterCreate() {
        resolveConfiguration();
      },
      resolveConfiguration,
      refreshColors() {},
      refreshIcons,
    };
  });

export const RootConfigure = types
  .model('RootConfigure', {
    decoration: CreateDecorationOptions,
    configure: BookmarkManagerConfigure,
  })
  .actions(self => {
    return {
      afterCreate() {},
      refresh() {
        self.decoration?.resolveDecorationOptions();
        self.configure?.resolveConfiguration();
      },
      refreshIcons() {
        self.configure.refreshIcons();
      },
      refreshColors() {
        self.configure.refreshColors();
      },
    };
  });

export type IBookmarkManagerConfigure = Instance<
  typeof BookmarkManagerConfigure
>;

export type IRootConfigureModel = Instance<typeof RootConfigure>;
