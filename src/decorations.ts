import { Range, TextEdit, TextEditor } from 'vscode';
import { IBookmarkDecoration } from './types';

export type BookmarkDecorationKey = 'low' | 'normal' | 'high';

export const decorations = {} as Record<
  BookmarkDecorationKey,
  IBookmarkDecoration
>;

export function updateDecorations(editor: TextEditor, range: Range[]) {}

/**
 * Dispose all decorations
 */
export function disposeAllDiscorations() {
  for (let decoration of Object.values(decorations)) {
    decoration?.dispose();
  }
}
