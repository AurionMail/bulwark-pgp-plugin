import { clearAllMessageCache, clearDangerousStorage, deleteAllKeyRecords } from '../storage.ts'

export async function onAfterLogout(args: {accountId:string}) {
  await clearDangerousStorage(args.accountId);
  await deleteAllKeyRecords(args.accountId);
  await clearAllMessageCache(args.accountId);
}