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
}
