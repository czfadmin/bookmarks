import * as vscode from 'vscode';
import { EXTENSION_ID } from '../constants';
import logger from './logger';

export function registerCommand(
  context: vscode.ExtensionContext,
  commandName: string,
  callback?: (args: any) => any
) {
  return context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.${commandName}`,
      (args: any) => {
        logger.info(`call ${commandName}....`);
        if (callback) {
          callback(args);
        }
      }
    )
  );
}
