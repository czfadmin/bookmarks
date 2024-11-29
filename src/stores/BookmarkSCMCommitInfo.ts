import {Instance, types} from 'mobx-state-tree';
/**
 * @zh 书签源代码控制提交信息
 */
export const BookmarkSCMCommitInfo = types
  .model('BookmarkSCMCommitInfo', {
    /**
     * @zh 创建书签时的提交的HASH
     */
    commitHash: types.string,

    /**
     * @zh 创建书签时的分支
     */
    branch: types.string,

    /**
     * @zh 书签快照, 跟随`commitHash`
     */
    snapshot: types.string,
  })
  .views(self => {
    return {};
  })
  .actions(self => {
    return {};
  });

export type BookmarkSCMCommitInfoType = Instance<typeof BookmarkSCMCommitInfo>;
