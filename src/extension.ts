import {EXTENSION_ID} from './constants';
import {disposeAllDiscorations} from './decorations';
import {disablAllEvents} from './events';
import logger from './utils/logger';
import {ExtensionContext} from 'vscode';
import bootstrap from './bootstrap';

/**
 * 插件上下文
 */
let _context: ExtensionContext;

/**
 * 获取插件的上下文
 * @returns context
 */
export const resolveExtensionCtx = (): ExtensionContext => _context;

export async function activate(context: ExtensionContext) {
  _context = context;
  logger.log(`${EXTENSION_ID} is now active!`);
  bootstrap(context);
}

/**
 * 销毁所以的事件监听以及文本装饰器
 */
function disposeAll() {
  disablAllEvents();
  disposeAllDiscorations();
  logger.log(`${EXTENSION_ID} is now deactive!`);
}

export function deactivate() {
  disposeAll();
}
