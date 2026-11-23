import { requestCustomSecret } from "../../pgp/session-broadcast.ts";
import { getCurrentAccountId } from "../../util.ts";

export async function fetchCryptDriveSecret(): Promise<string | null> {
  const {secret} = await requestCustomSecret('cryptpad-plugin', await getCurrentAccountId() || '')
  return secret;
}

export async function fetchCryptDriveTreeSecret(): Promise<string | null> {
  const {secret} = await requestCustomSecret('cryptpad-tree', await getCurrentAccountId() || '')
  return secret;
}