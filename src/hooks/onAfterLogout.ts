import { clearAllMessageCache, clearDangerousStorage, deleteAllKeyRecords } from '../storage.ts'

export async function onAfterLogout(args:any) {
  await clearDangerousStorage();
  await deleteAllKeyRecords();
  await clearAllMessageCache();
}