import {Instance, types} from 'mobx-state-tree';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {Selection, Uri, WorkspaceFolder, workspace} from 'vscode';
import {createHoverMessage} from '../utils';
import {BookmarkColor, BookmarksGroupedByFileType} from '../types';
import {
  SortedType,
  MyColorType,
  MyUriType,
  MyWorkspaceFolderType,
  DecorationOptionsType,
  TagType,
  IDecorationOptionsType,
  IMyColorType,
} from './custom';
import {DEFAULT_BOOKMARK_GROUP_ID} from '../constants/bookmark';

export type BookmarksGroupedByFileWithSortType = BookmarksGroupedByFileType &
  SortedType;

export type BookmarksGroupedByColorType = {
  color: BookmarkColor;
  bookmarks: IBookmark[];
  sortedIndex?: number;
};

export type BookmarksGroupedByWorkspaceType = {
  workspace: Partial<WorkspaceFolder> & SortedType;
  files: BookmarksGroupedByFileType[];
};

export const Bookmark = types
  .model('Boomkmark', {
    id: types.string,
    label: types.optional(types.string, ''),
    description: types.optional(types.string, ''),
    customColor: types.optional(MyColorType, {
      name: DEFAULT_BOOKMARK_COLOR,
      sortedIndex: -1,
      bookmarkSortedIndex: -1,
    }),
    fileUri: MyUriType,
    type: types.optional(types.enumeration(['line', 'selection']), 'line'),
    selectionContent: types.optional(types.string, ''),
    languageId: types.optional(types.string, 'javascript'),
    workspaceFolder: MyWorkspaceFolderType,
    rangesOrOptions: DecorationOptionsType,
    createdAt: types.optional(types.Date, () => new Date()),
    tag: types.optional(TagType, {
      name: 'default',
      sortedIndex: -1,
      bookmarkSortedIndex: -1,
    }),
    groupId: types.optional(types.string, DEFAULT_BOOKMARK_GROUP_ID),
  })
  .views(self => {
    return {
      get fileId() {
        const ws = workspace.workspaceFolders?.find(
          it => it.name === self.workspaceFolder.name,
        );
        if (!ws) {
          return self.fileUri.fsPath;
        }

        return Uri.joinPath(ws.uri, self.fileUri.fsPath).fsPath;
      },
      get fileName() {
        const arr = self.fileUri.fsPath.split('/');
        return arr[arr.length - 1];
      },
      get color() {
        return self.customColor.name;
      },
      get wsFolder() {
        return workspace.workspaceFolders?.find(
          it => it.name === self.workspaceFolder.name,
        );
      },
      get selection() {
        const {start, end} = self.rangesOrOptions.range;
        return new Selection(
          start.line,
          start.character,
          end.line,
          end.character,
        );
      },
    };
  })
  .actions(self => {
    function update(bookmarkDto: Partial<Omit<IBookmark, 'id'>>) {
      Object.keys(bookmarkDto).forEach(it => {
        // @ts-ignore
        if (bookmarkDto[it]) {
          // @ts-ignore
          self[it] = bookmarkDto[it];
        }
      });
    }
    function updateRangesOrOptionsHoverMessage() {
      const rangesOrOptions = {...self.rangesOrOptions};
      rangesOrOptions.hoverMessage = createHoverMessage(
        self as IBookmark,
        true,
        true,
      );
      self.rangesOrOptions = rangesOrOptions;
    }
    function updateLabel(label: string) {
      self.label = label;
      updateRangesOrOptionsHoverMessage();
    }
    function updateDescription(desc: string) {
      self.description = desc;
      updateRangesOrOptionsHoverMessage();
    }

    function updateRangesOrOptions(rangesOrOptions: IDecorationOptionsType) {
      self.rangesOrOptions = rangesOrOptions;
      updateRangesOrOptionsHoverMessage();
    }

    function updateColor(newColor: IMyColorType) {
      self.customColor = newColor;
    }

    function updateSelectionContent(content: string) {
      self.selectionContent = content;
    }

    function updateFileUri(uri: Uri) {
      self.fileUri = {
        fsPath: uri.fsPath,
        sortedIndex: self.fileUri.sortedIndex,
        bookmarkSortedIndex: self.fileUri.bookmarkSortedIndex,
      };
    }

    function changeGroupId(id: string) {
      self.groupId = id;
    }

    return {
      update,
      updateLabel,
      updateDescription,
      updateRangesOrOptions,
      updateRangesOrOptionsHoverMessage,
      updateSelectionContent,
      updateFileUri,
      updateColor,
      changeGroupId,
    };
  });

export type IBookmark = Instance<typeof Bookmark>;
