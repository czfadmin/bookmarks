import {StringIndexType} from './common';

export interface CreateDecorationOptions {
  showGutterIcon: boolean;
  showGutterInOverviewRuler: boolean;
  showTextDecoration?: boolean;
  alwaysUseDefaultColor?: boolean;
  fontWeight: 'normal' | 'bold' | 'bolder' | 'unset';
  wholeLine: boolean;
  textDecorationLine: string;
  textDecorationStyle: string;
  textDecorationThickness: string;
  highlightBackground: boolean;
  showBorder: boolean;
  border: string;
  showOutline: boolean;
  outline: string;
}

export type BookmarkManagerConfigure = CreateDecorationOptions & {
  colors: StringIndexType<string>;
  lineBlame: boolean;
  relativePath: boolean;
  enableClick: boolean;
  defaultBookmarkIconColor?: string;
  createJsonFile: boolean;
  useBuiltInColors: boolean;
};
