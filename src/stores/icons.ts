import {Instance, SnapshotOut, types} from 'mobx-state-tree';

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
  })
  .views(self => {
    return {};
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
