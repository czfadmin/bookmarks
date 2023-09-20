// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BookmarksTreeView } from './providers/BookmarksTreeProvider';
import logger from './utils/logger';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  logger.log('Congratulations, your extension "bookmarks" is now active!');
  new BookmarksTreeView(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
