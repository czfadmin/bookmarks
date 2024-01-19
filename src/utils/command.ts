import {commands} from 'vscode';
import {EXTENSION_ID} from '../constants';
import {resolveExtensionCtx} from '../extension';

export function registerCommand(
  commandName: string,
  callback?: (args: any) => any,
) {
  const context = resolveExtensionCtx();
  return context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_ID}.${commandName}`, (args: any) => {
      if (callback) {
        callback(args);
      }
    }),
  );
}
