import { workspace } from 'vscode';
import { EXTENSION_ID } from './constants';
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
  const colors = workspace.getConfiguration(`${EXTENSION_ID}.colors`);
  Object.entries(colors).filter(([key, value]) => {
    if (typeof value === 'string') {
      $colors[key] = value;
    }
  });
  return $colors;
}
