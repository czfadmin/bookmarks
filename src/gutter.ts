import { Uri } from 'vscode';

export interface Gutter {
  [key: string]: Uri | string;
}
let gutters: Gutter = {};

let tagGutters: Gutter = {};

export function getTagGutters(): Gutter {
  return tagGutters;
}

export default gutters;
