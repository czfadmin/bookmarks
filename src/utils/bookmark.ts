import { TextEditor, Uri, Range } from 'vscode';
import { BookmarksController } from '../controllers/BookmarksController';
import { updateDecorationsByEditor } from '../decorations';

/**
 * 检查当前行是否存在标签
 */
export function checkIfBookmarkExistInSelection(
  editor: TextEditor | undefined,
  range: Range
) {
  if (!editor) {
    return;
  }
  const bookmarkStore = BookmarksController.instance.getBookmarkStoreByFileUri(
    editor.document.uri
  );
  if (bookmarkStore) {
    const existedBookmaks = bookmarkStore.bookmarks;
    let item;
    try {
      for (item of existedBookmaks) {
        if (range.isEqual(item.selection)) {
          throw new Error(item.id);
        }
      }
    } catch (error) {
      const _bookmark = existedBookmaks.find(
        (it) => it.id === (error as any).message
      );
      if (_bookmark) {
        BookmarksController.instance.remove(_bookmark);
        updateDecorationsByEditor(editor);
        return true;
      }
    }
  }
  return false;
}
