import {getRoot, Instance, SnapshotOut, types} from 'mobx-state-tree';
import {escapeColor} from '../utils';
import {Uri} from 'vscode';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';

export const Icon = types
  .model('icon', {
    /**
     * @zh 图标ID格式: prefix:name
     */
    id: types.string,
    /**
     * @zh iconfiy 中的所在集合的prefix
     */
    prefix: types.string,

    /**
     * @zh iconfiy的图标名称
     */
    name: types.string,

    /**
     * @zh path body
     */
    body: types.string,

    /**
     * @zh 用户配置在设置中的自定义图标名称
     */
    customName: types.optional(types.string, ''),
  })
  .views(self => {
    return {
      get iconPath() {
        const {configure} = getRoot<any>(self);
        let color =
          configure.configure.defaultBookmarkIconColor ||
          DEFAULT_BOOKMARK_COLOR;
        color = color.startsWith('#') ? escapeColor(color) : configure.color;
        let body = self.body;
        if (!self.body.includes('stroke')) {
          body = self.body.replace(/fill="(\w.*?)"/gi, `fill="${color}"`);
        } else {
          body = self.body.replace(/stroke="(\w.*?)"/gi, `stroke="${color}"`);
        }
        return Uri.parse(
          `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24">${body}</svg>`,
        );
      },
    };
  })
  .actions(self => {
    return {
      afterCreate() {},
      changePrefix(prefix: string) {
        self.prefix = prefix;
      },
      changeName(newName: string) {
        self.name = newName;
      },
      changeBody(body: string) {
        self.body = body;
      },
    };
  });

export type IconType = Instance<typeof Icon>;
export type IconSnapshotOutType = SnapshotOut<Instance<typeof Icon>>;
