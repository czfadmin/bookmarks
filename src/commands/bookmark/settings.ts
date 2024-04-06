import {commands} from 'vscode';
import {AUTHOR, EXTENSION_ID} from '../../constants';

/**
 * 跳转到插件设置页
 * @param args
 */
export function changeSetting(args: any) {
  commands.executeCommand(
    'workbench.action.openSettings',
    `@ext:${AUTHOR}.${EXTENSION_ID}`,
  );
}
