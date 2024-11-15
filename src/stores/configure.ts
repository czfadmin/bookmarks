import {Instance, applySnapshot, cast, types} from 'mobx-state-tree';
import {WorkspaceConfiguration, workspace} from 'vscode';
import {DEFAULT_BOOKMARK_COLOR, EXTENSION_ID} from '../constants';
import {defaultColors} from '../constants/colors';
import {CreateDecorationOptions} from './decoration';

export type StringIndexType<T> = {[key: string]: T};

export const BookmarkManagerConfigureModel = types
  .model('BookmarkManagerConfigureModel', {
    /**
     * 配置书签的颜色
     */
    colors: types.map(types.string),
    /**
     * 是否开启lineBlame 功能
     */
    lineBlame: types.optional(types.boolean, false),
    /**
     * 是否在树视图中显示相对路径
     */
    relativePath: types.optional(types.boolean, false),
    /**
     * 允许单击书签跳转到书签所在位置
     */
    enableClick: types.optional(types.boolean, false),
    /**
     * 设置默认书签颜色
     */
    defaultBookmarkIconColor: types.optional(
      types.string,
      DEFAULT_BOOKMARK_COLOR,
    ),
    /**
     * 是否在`.vscode`文件中创建`bookmark-manager.json`
     * 建议将`bookmark-manager.json`添加到.gitignore,避免提交到代码仓库中,引起不必要的麻烦
     */
    createJsonFile: types.optional(types.boolean, false),
    /**
     * 使用内置的颜色列表来进行选择书签的颜色
     */
    useBuiltInColors: types.optional(types.boolean, false),
    /**
     * 是否将`bookmark-manager.json`文件追加到`.gitIgnore` 文件中
     */
    alwaysIgnore: types.optional(types.boolean, false),
    /**
     * 自动将单行书签切换为多行书签
     */
    autoSwitchSingleToMultiWhenLineWrap: types.optional(types.boolean, false),
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
    function resolveColors(configuration: WorkspaceConfiguration) {
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

      resolveColors(configuration);
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
      afterAttach() {},
      resolveConfiguration,
    };
  });

export const RootConfigureModel = types
  .model('RootConfigureMode', {
    decoration: types.maybeNull(CreateDecorationOptions),
    configure: types.maybeNull(BookmarkManagerConfigureModel),
  })
  .actions(self => {
    return {
      afterCreate() {
        self.decoration = CreateDecorationOptions.create();
        self.configure = BookmarkManagerConfigureModel.create({
          colors: {},
        });
      },
      refresh() {
        self.decoration?.resolveDecorationOptions();
        self.configure?.resolveConfiguration();
      },
    };
  });

export type IBookmarkManagerConfigure = Instance<
  typeof BookmarkManagerConfigureModel
>;

export type IRootConfigureModel = Instance<typeof RootConfigureModel>;
