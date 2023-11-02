import * as vscode from 'vscode';
export const EXTENSION_ID = 'bookmark-manager';

export const VIRTUAL_SCHEMA = 'bookmarkmanager';
export const EXTENSION_VIEW_ID = 'bookmark-manager';

export const DEFAULT_BOOKMARK_COLOR = '#0e69d8';

/** Commands */
export const CMD_TOGGLE_BOOKMARK_WITH_LABEL = 'toggleLineBookmarkWithLabel';
export const CMD_TOGGLE_LINE_BOOKMARK = 'toggleLineBookmark';
export const CMD_CLEAR_ALL = 'clearAllBookmarks';
export const CMD_DELETE_BOOKMARK = 'deleteBookmark';
export const CMD_EDIT_LABEL = 'editLabel';
export const CMD_GO_TO_SOURCE_LOCATION = 'gotoSourceLocation';
export const CMD_TOGGLE_BOOKMARK_WITH_SECTIONS = 'toggleBookmarkWithSelection';
export const CMD_BOOKMARK_ADD_MORE_MEMO = 'bookmarkEditDescription';

export const CMD_JUMP_TO_BOOKMARK = 'quickJumpTo';

export const CMD_CHANGE_BOOKMARK_COLOR = 'changeBookmarkColor';

// ENV
export const APP_ROOT = vscode.env.appRoot;
export const APP_NAME = vscode.env.appName;
