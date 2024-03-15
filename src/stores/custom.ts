import {Instance, types} from 'mobx-state-tree';
import {Uri, Range, DecorationOptions, Selection} from 'vscode';

export type SortedType = {
  /**
   * 表示文件/工作区间的排序索引
   */
  sortedIndex?: number;
  /**
   * 当按照文件/工作区分组的时, 书签的顺序索引
   */
  bookmarkSortedIndex?: number;
};

export type MyUri = {
  /**
   * 文件的相对路径
   */
  fsPath: string;
} & SortedType;

export type MyWorkspaceFolder = {
  /**
   * 公共文件夹名称
   */
  name: string;

  /**
   * workspace index
   */
  index: number;
} & SortedType;

export type MyColor = {
  name: string;
} & SortedType;

export type MyTag = SortedType & {
  name: string;
};
export const TagType = types.custom<MyTag, MyTag>({
  name: 'MyTag',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value: MyTag) {
    return value;
  },
  isTargetType(value: MyTag | any): boolean {
    return true;
  },
  getValidationMessage(value: MyTag): string {
    return '';
  },
});

export const MyUriType = types.custom<MyUri, MyUri>({
  name: 'MyUri',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value: Uri) {
    return value;
  },
  isTargetType(value: Uri | any): boolean {
    return true;
  },
  getValidationMessage(value: Uri): string {
    return '';
  },
});

export type IMyUriType = Instance<typeof MyUriType>;

export const MyWorkspaceFolderType = types.custom<
  MyWorkspaceFolder,
  MyWorkspaceFolder
>({
  name: 'MyWorkspaceFolder',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMyWorkspaceFolderType = Instance<typeof MyWorkspaceFolderType>;

export const RangType = types.custom<Range, Range>({
  name: 'RangeType',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    if (!snapshot) {
      return 'Invalid rangesOrOptions';
    }
    return '';
  },
});

export type IRangeType = Instance<typeof RangType>;

export const DecorationOptionsType = types.custom<
  DecorationOptions,
  DecorationOptions
>({
  name: 'DecorationOptions',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});
export type IDecorationOptionsType = Instance<typeof DecorationOptionsType>;

export const MyColorType = types.custom<MyColor, MyColor>({
  name: 'MyColor',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMyColorType = Instance<typeof MyColorType>;

export const MySelectionType = types.custom<Selection, Selection>({
  name: 'Selection',
  fromSnapshot(snapshot, env) {
    return snapshot;
  },
  toSnapshot(value) {
    return value;
  },
  isTargetType(value) {
    return true;
  },
  getValidationMessage(snapshot) {
    return '';
  },
});

export type IMySelectionType = Instance<typeof MySelectionType>;
