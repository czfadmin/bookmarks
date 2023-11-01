import {workspace} from 'vscode';
import {DEFAULT_BOOKMARK_COLOR, EXTENSION_ID} from './constants';
import {CreateDecorationOptions, StringIndexType} from './types';

let $colors = {} as StringIndexType<string>;

/**
 * 获取用户配置的所有的颜色
 * @returns 用户配置的颜色值
 */
export function getAllColors(isRestore: boolean = false) {
  if (!isRestore && Object.keys($colors).length) {
    return $colors;
  }
  $colors = {} as StringIndexType<string>;
  const config = getConfiguration();
  Object.entries(config.get('colors') as object).filter(([key, value]) => {
    if (typeof value === 'string') {
      $colors[key] = value;
    }
  });
  $colors['default'] =
    config.get('defaultBookmarkIconColor') || DEFAULT_BOOKMARK_COLOR;
  return $colors;
}

/**
 * 获取书签配置
 * @returns
 */
export function getConfiguration() {
  return workspace.getConfiguration(EXTENSION_ID);
}

/**
 * 获取用户自定义的书签装饰器配置
 * @returns 返回一个书签装饰的配置
 */
export function getCreateDecorationOptions(): CreateDecorationOptions {
  const configuration = getConfiguration();
  return {
    showGutterIcon: configuration.get('showGutterIcon') || false,
    showGutterInOverviewRuler:
      configuration.get('showGutterInOverviewRuler') || false,
    alwaysUseDefaultColor: configuration.get('alwaysUseDefaultColor') || false,
    showTextDecoration: configuration.get('showTextDecoration'),
    fontWeight: configuration.get('fontWeight') || 'bold',
    wholeLine: configuration.get('wholeLine') || false,
    textDecorationLine: configuration.get('textDecorationLine') || 'underline',
    textDecorationStyle: configuration.get('textDecorationStyle') || 'wavy',
    textDecorationThickness:
      configuration.get('textDecorationThickness') || 'auto',
    highlightBackground: configuration.get('highlightBackground') || false,
    showBorder: configuration.get('showBorder') || false,
    border: configuration.get('border') || '1px solid',
    showOutline: configuration.get('showOutline') || false,
    outline: configuration.get('outline') || '1px solid',
  } as CreateDecorationOptions;
}

export function getAllPrettierConfiguration() {
  const configuration = getConfiguration();
  const createDecoration = getCreateDecorationOptions();
  const colors = getAllColors();
  return {
    ...createDecoration,
    colors,
    lineBlame: configuration.get('lineBlame') || false,
    relativePath: configuration.get('relativePath') || false,
    defaultBookmarkIconColor: configuration.get('defaultBookmarkIconColor'),
  };
}
