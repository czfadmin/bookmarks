import {commands} from 'vscode';
import {EXTENSION_ID} from '../constants';
import {resolveExtensionCtx} from '../extension';
import {LoggerService} from '../services';

const logger = new LoggerService('RegisterCommandUtils');

export function registerCommand(
  commandName: string,
  callback?: (args: any) => any,
) {
  const context = resolveExtensionCtx();
  return context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.${commandName}`, (args: any) => {
      if (callback) {
        // 捕获异常失败?
        try {
          callback(args);
        } catch (error) {
          logger.error(error as any);
        }
      }
    }),
  );
}
