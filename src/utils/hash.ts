import { createHash as _createHash } from 'crypto';

export function createHash(data: any) {
  const hash = _createHash('sha256');
  if (data) {
    hash.update(data);
  }
  return hash.digest('hex');
}
