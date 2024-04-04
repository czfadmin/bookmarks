import {ExtensionContext} from 'vscode';

export interface IBookmarkCommandArgs {}

export interface IBookmarkCommandContext {
  command: IBookmarkCommand;
  context: ExtensionContext;
}

export interface IBookmarkCommand {
  name: string;
  docs?: string;
  callback: (ctx: IBookmarkCommandContext, args: any) => Promise<void>;
}
