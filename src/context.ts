import {commands} from 'vscode';
import {BookmarkManagerConfigure} from './types';
import {EXTENSION_ID} from './constants';

/**
 * 注册插件自定义上下文
 * @param configuration {BookmarkManagerConfigure}
 */
export function registerExtensionCustomContext(
  configuration: BookmarkManagerConfigure,
) {
  Object.entries(configuration).forEach(([key, value]) => {
    if (typeof value !== 'boolean') return;
    commands.executeCommand('setContext', `${EXTENSION_ID}.${key}`, value);
  });
  registerExtensionCustomContextByKey('toggleBookmarkWithSelection', false);
}

/**
 * 通过键值对进行注册自定义上下文,在`contributes` 中的`when` 表达式,通过 `bookmark-manager.[注册的key]`取值
 * @param key 待注册的键名
 * @param value 所注册的值
 */
export function registerExtensionCustomContextByKey(key: string, value: any) {
  commands.executeCommand('setContext', `${EXTENSION_ID}.${key}`, value);
}
