import {types} from 'mobx-state-tree';

export const LockerItem = types.model('LockerItem', {
  bookmarks: types.array(types.string),
  fileId: types.string,
});

export const Locker = types
  .model('locker', {
    didCreate: types.array(LockerItem),
  })
  .actions(self => {
    return {
      updateDidCreate(fileId: string, bookmarks: string[]) {
        const existing = self.didCreate.find(it => it.fileId === fileId);
        if (!existing) {
          self.didCreate.push({
            fileId,
            bookmarks,
          });
        } else {
          bookmarks.forEach(it => {
            if (!existing.bookmarks.find(item => item === it)) {
              existing.bookmarks.push(it);
            }
          });
        }
      },
      removeDidCreateByFileId(fileId: string) {
        const existing = self.didCreate.find(it => it.fileId === fileId);
        if (!existing) {
          return;
        }
        self.didCreate.remove(existing);
      },
    };
  });
