import { ExtensionContext, window } from 'vscode';
import { registerCommand } from './utils';
import {
  CMD_TOGGLE_LINE_BOOKMARK,
  CMD_TOGGLE_BOOKMARK_WITH_LABEL,
  CMD_CLEAR_ALL,
  CMD_DELETE_BOOKMARK,
  CMD_EDIT_LABEL,
  CMD_GO_TO_SOURCE_LOCATION,
  CMD_TOGGLE_BOOKMARK_WITH_SECTIONS,
  CMD_BOOKMARK_ADD_MORE_MEMO,
  CMD_JUMP_TO_BOOKMARK,
  CMD_CHANGE_BOOKMARK_COLOR,
} from './constants';
import { updateActiveEditorAllDecorations } from './decorations';
import { LineBookmarkContext } from './types';
import { BookmarksController } from './controllers/BookmarksController';
import {
  chooseBookmarkColor,
  deleteLineBookmark,
  editBookmarkDescription,
  gotoSourceLocation,
  quicklyJumpToBookmark,
  toggleBookmarksWithSelections,
  toggleLineBookmark,
} from './utils/bookmark';
import { BookmarksTreeItem } from './providers/BookmarksTreeProvider';

/**
 * 注册所需要的命令
 * @param context
 */
export function registerCommands(context: ExtensionContext) {
  registerCommand(
    context,
    CMD_TOGGLE_LINE_BOOKMARK,
    async (args: LineBookmarkContext) => {
      toggleLineBookmark(args);
    }
  );
  registerCommand(
    context,
    CMD_TOGGLE_BOOKMARK_WITH_LABEL,
    async (context: LineBookmarkContext) => {
      const input = await window.showInputBox({
        placeHolder: 'Type a label for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      });
      if (!input) {
        return;
      }
      toggleLineBookmark(context, input);
    }
  );

  registerCommand(context, CMD_CLEAR_ALL, (args) => {
    updateActiveEditorAllDecorations(true);
    let fileUri;
    if (args && args.meta) {
      fileUri = args.meta.fileUri;
      BookmarksController.instance.clearAllBookmarkInFile(fileUri);
      return;
    }
    BookmarksController.instance.clearAll();
  });

  registerCommand(
    context,
    CMD_DELETE_BOOKMARK,
    (context: LineBookmarkContext | BookmarksTreeItem) => {
      if (!context) {
        return;
      }
      updateActiveEditorAllDecorations(true);
      // 从treeView中执行此命令
      if ('meta' in context && 'color' in context.meta) {
        BookmarksController.instance.remove(context.meta);
        updateActiveEditorAllDecorations();
        return;
      }
      // 从`decoration`或者`command palette`那边删除调用此命令
      if (!('bookmarks' in context)) {
        deleteLineBookmark(context as LineBookmarkContext);
      }
      updateActiveEditorAllDecorations();
    }
  );

  registerCommand(context, CMD_EDIT_LABEL, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type a label for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((input) => {
        if (!input) {
          return;
        }
        if (args.contextValue === 'item') {
          BookmarksController.instance.editLabel(args.meta, input);
        }
      });
  });

  registerCommand(context, CMD_GO_TO_SOURCE_LOCATION, (args) => {
    gotoSourceLocation(args.meta);
  });

  registerCommand(context, CMD_TOGGLE_BOOKMARK_WITH_SECTIONS, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type a label for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((input) => {
        if (!input) {
          return;
        }

        toggleBookmarksWithSelections(input);
      });
  });

  registerCommand(context, CMD_BOOKMARK_ADD_MORE_MEMO, (args) => {
    window
      .showInputBox({
        placeHolder: 'Type more info for your bookmarks',
        title:
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
      })
      .then((input) => {
        if (!input) {
          return;
        }

        editBookmarkDescription(args.meta, input);
      });
  });

  registerCommand(context, CMD_JUMP_TO_BOOKMARK, (args) => {
    quicklyJumpToBookmark();
  });

  registerCommand(context, CMD_CHANGE_BOOKMARK_COLOR, async (args) => {
    if (!args || !args.meta) {
      window.showInformationMessage('请选择书签后再更改颜色.', {});
      return;
    }
    const { meta } = args;
    if ('color' in meta) {
      const newColor = await chooseBookmarkColor();
      if (!newColor) {
        return;
      }
      BookmarksController.instance.update(meta, {
        color: newColor,
      });
      updateActiveEditorAllDecorations();
    }
  });
}
