import { Uri } from 'vscode';

export interface Gutter {
  [key: string]: Uri | string;
}
let gutters: Gutter = {};

export default gutters;
