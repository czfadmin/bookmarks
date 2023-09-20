import * as vscode from 'vscode';
import { EXTENSION_ID } from '../constants';

export function registerCommand(
  context: vscode.ExtensionContext,
  commandName: string,
  callback?: (args: any) => any
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_ID}.${commandName}`,
      (args: any) => {
        if (callback) {
          callback(args);
        }
      }
    )
  );
}
