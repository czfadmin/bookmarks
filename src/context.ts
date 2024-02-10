import {commands} from 'vscode';
import {EXTENSION_ID} from './constants';

/**
 * 通过键值对进行注册自定义上下文,在`contributes` 中的`when` 表达式,通过 `bookmark-manager.[注册的key]`取值
 * @param key 待注册的键名
 * @param value 所注册的值
 */
export function registerExtensionCustomContextByKey(key: string, value: any) {
  commands.executeCommand('setContext', `${EXTENSION_ID}.${key}`, value);
}
