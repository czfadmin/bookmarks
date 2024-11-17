import {types} from 'mobx-state-tree';
import {Uri} from 'vscode';
import {escapeColor} from '../utils';

export const Icon = types
  .model('icon', {
    id: types.identifier,
    /**
     * @zh iconfiy 中的prefix
     */
    prefix: types.string,

    /**
     * @zh gutter 名称
     */
    name: types.string,

    /**
     * @zh 颜色值
     */
    color: types.string,

    /**
     * @zh path body
     */
    body: types.string,
  })
  .views(self => {
    return {
      get uri() {
        const body = self.body.replace(
          /fill=/gi,
          `fill="${self.color.startsWith('#') ? escapeColor(self.color) : self.color}"`,
        );

        return Uri.parse(
          `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24">${body}</svg>`,
        );
      },

      get svg() {
        const body = self.body.replace(
          /fill=/gi,
          `fill="${self.color.startsWith('#') ? escapeColor(self.color) : self.color}"`,
        );

        return `<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24">${body}</svg>`;
      },

      get escapedColor() {
        return self.color.startsWith('#')
          ? escapeColor(self.color)
          : self.color;
      },
    };
  })
  .actions(self => {
    return {
      changePrefix(prefix: string) {
        self.prefix = prefix;
      },
      changeColor(newColor: string) {
        self.color = newColor;
      },
      changeName(newName: string) {
        self.name = newName;
      },
      changeBody(body: string) {
        self.body = body;
      },
    };
  });

