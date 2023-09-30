import { workspace } from 'vscode';
import { DEFAULT_BOOKMARK_COLOR, EXTENSION_ID } from './constants';
import { StringIndexType } from './types';

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
  const config = workspace.getConfiguration(`${EXTENSION_ID}`);
  Object.entries(config.get('colors') as object).filter(([key, value]) => {
    if (typeof value === 'string') {
      $colors[key] = value;
    }
  });
  $colors['default'] =
    config.get('defaultBookmarkIconColor') || DEFAULT_BOOKMARK_COLOR;
  return $colors;
}
