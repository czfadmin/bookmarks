import {workspace} from 'vscode';
import {DEFAULT_BOOKMARK_COLOR, EXTENSION_ID} from './constants';
import {
  BookmarkManagerConfigure,
  CreateDecorationOptions,
  StringIndexType,
} from './types';
import {resolveExtensionCtx} from './extension';

let $colors = {} as StringIndexType<string>;

/**
 * 获取书签配置
 * @returns
 */
export function getConfiguration() {
  return workspace.getConfiguration(EXTENSION_ID);
}

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

export const configUtils = {
  getValue<T>(key: string, defaultValue: T) {
    const context = resolveExtensionCtx();
    return (
      context.globalState.get<T>(
        `bookmark-manager.global.configuration.${key}`,
      ) || defaultValue
    );
  },

  updateValue(key: string, value: any) {
    const context = resolveExtensionCtx();
    context.globalState.update(
      `bookmark-manager.global.configuration.${key}`,
      value,
    );
  },
};
