import {
  ExtensionContext,
  Range,
  TextEditor,
  TextEditorDecorationType,
  window,
} from 'vscode';

import { getGutters } from './gutter';

export type BookmarkDecorationKey = 'low' | 'normal' | 'high';

export const decorations = {} as Record<
  BookmarkDecorationKey,
  TextEditorDecorationType
>;
export function initDecorations(context: ExtensionContext) {
  const gutter = getGutters(context);
  decorations.normal = window.createTextEditorDecorationType({
    gutterIconPath: gutter.normal,
  });
  decorations.low = window.createTextEditorDecorationType({
    gutterIconPath: gutter.low,
  });
  decorations.high = window.createTextEditorDecorationType({
    gutterIconPath: gutter.high,
  });
}

export function updateDecorations(editor?: TextEditor, range?: Range[]) {
  let _editor = editor;
  if (!editor) {
    _editor = window.activeTextEditor;
  }
  _editor?.setDecorations(decorations.normal, range || []);
}

/**
 * Dispose all decorations
 */
export function disposeAllDiscorations() {
  for (let decoration of Object.values(decorations)) {
    decoration?.dispose();
  }
}
