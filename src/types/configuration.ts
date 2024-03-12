import {StringIndexType} from './common';

export interface CreateDecorationOptions {
  /**
   * 是否在行号出现时指示图标
   */
  showGutterIcon: boolean;
  /**
   * 是否在游标卡尺显示  gutter 图标所在位置, 默认颜色跟随书签选择的样式
   */
  showGutterInOverviewRuler: boolean;
  /**
   * 是否显示书签样式
   */
  showTextDecoration?: boolean;
  /**
   * 是否使用默认样式
   */
  alwaysUseDefaultColor?: boolean;
  /**
   * 书签装饰器的字体样式
   */
  fontWeight: 'normal' | 'bold' | 'bolder' | 'unset';
  /**
   * 是否选择整行, 否则仅为存在文本字段的区域选择
   */
  wholeLine: boolean;

  /**
   * 书签装饰器下划线的样式
   */
  textDecorationLine: string;
  /**
   * 书签装饰器样式
   */
  textDecorationStyle: string;
  /**
   * 书签装饰器的`tickness`样式
   */
  textDecorationThickness: string;
  /**
   * 高亮背景行
   */
  highlightBackground: boolean;
  /**
   * 是否显示书签装饰器的外边框
   */
  showBorder: boolean;
  /**
   * 书签装饰器的外边框样式
   */
  border: string;
  /**
   * 是否显示书签装饰器的轮廓
   */
  showOutline: boolean;
  /**
   * 书签装饰器的轮廓样式
   */
  outline: string;
}

export type BookmarkManagerConfigure = CreateDecorationOptions & {
  /**
   * 配置书签的颜色
   */
  colors: StringIndexType<string>;
  /**
   * 是否开启lineBlame 功能
   */
  lineBlame: boolean;
  /**
   * 是否在树视图中显示相对路径
   */
  relativePath: boolean;
  /**
   * 允许单击书签跳转到书签所在位置
   */
  enableClick: boolean;
  /**
   * 设置默认书签颜色
   */
  defaultBookmarkIconColor?: string;
  /**
   * 是否在`.vscode`文件中创建`bookmark-manager.json`
   * 建议将`bookmark-manager.json`添加到.gitignore,避免提交到代码仓库中,引起不必要的麻烦
   */
  createJsonFile: boolean;
  /**
   * 使用内置的颜色
   */
  useBuiltInColors: boolean;
  /**
   * 是否将`bookmark-manager.json`文件追加到`.gitIgnore` 文件中
   */
  alwaysIgnore: boolean;
  /**
   * 自动将单行书签切换为多行书签
   */
  autoSwitchSingleToMultiWhenLineWrapping: boolean;
};
