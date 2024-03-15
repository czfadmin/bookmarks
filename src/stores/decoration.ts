import {workspace} from 'vscode';
import {Instance, types} from 'mobx-state-tree';
import {EXTENSION_ID} from '../constants';

export const CreateDecorationOptionsModel = types
  .model('CreateDecorationOptionsModel', {
    /**
     * 是否在行号出现时指示图标
     */
    showGutterIcon: types.optional(types.boolean, true),
    /**
     * 是否在游标卡尺显示  gutter 图标所在位置, 默认颜色跟随书签选择的样式
     */
    showGutterInOverviewRuler: types.optional(types.boolean, false),
    /**
     * 是否显示书签样式
     */
    showTextDecoration: types.optional(types.boolean, false),
    /**
     * 是否使用默认样式
     */
    alwaysUseDefaultColor: types.optional(types.boolean, false),
    /**
     * 书签装饰器的字体样式
     */
    fontWeight: types.optional(
      types.enumeration(['normal', 'bold', 'bolder', 'unset']),
      'bold',
    ),
    /**
     * 是否选择整行, 否则仅为存在文本字段的区域选择
     */
    wholeLine: types.optional(types.boolean, true),
    /**
     * 书签装饰器下划线的样式
     */
    textDecorationLine: types.optional(types.string, ''),
    /**
     * 书签装饰器样式
     */
    textDecorationStyle: types.optional(types.string, ''),
    /**
     * 书签装饰器的`tickness`样式
     */
    textDecorationThickness: types.optional(types.string, ''),
    /**
     * 高亮背景行
     */
    highlightBackground: types.optional(types.boolean, false),
    /**
     * 是否显示书签装饰器的外边框
     */
    showBorder: types.optional(types.boolean, false),
    /**
     * 书签装饰器的外边框样式
     */
    border: types.optional(types.string, ''),
    /**
     * 是否显示书签装饰器的轮廓
     */
    showOutline: types.optional(types.boolean, false),
    /**
     * 书签装饰器的轮廓样式
     */
    outline: types.optional(types.string, ''),
  })
  .views(self => {
    return {};
  })
  .actions(self => {
    function resolveDecorationOptions() {
      const configuration = workspace.getConfiguration(EXTENSION_ID);
      self.showGutterIcon = configuration.get('showGutterIcon') || false;
      self.showGutterInOverviewRuler =
        configuration.get('showGutterInOverviewRuler') || false;
      self.alwaysUseDefaultColor =
        configuration.get('alwaysUseDefaultColor') || false;
      self.showTextDecoration = configuration.get('showTextDecoration') || true;
      self.fontWeight = configuration.get('fontWeight') || 'bold';
      self.wholeLine = configuration.get('wholeLine') || false;
      self.textDecorationLine =
        configuration.get('textDecorationLine') || 'underline';
      self.textDecorationStyle =
        configuration.get('textDecorationStyle') || 'wavy';
      self.textDecorationThickness =
        configuration.get('textDecorationThickness') || 'auto';
      self.highlightBackground =
        configuration.get('highlightBackground') || false;
      self.showBorder = configuration.get('showBorder') || false;
      self.border = configuration.get('border') || '1px solid';
      self.showOutline = configuration.get('showOutline') || false;
      self.outline = configuration.get('outline') || '1px solid';
    }

    function afterCreate() {
      resolveDecorationOptions();
    }
    return {afterCreate, resolveDecorationOptions};
  });

export type ICreateDecorationOptions = Instance<
  typeof CreateDecorationOptionsModel
>;
