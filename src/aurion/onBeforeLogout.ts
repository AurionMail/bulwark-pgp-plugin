import host from "@plugin-host";
import { config } from "../../src/shared.ts";
export async function onBeforeLogout(args: any): Promise<boolean> {
  console.log("onBeforeLogout: removing sensitive data and logging out");
  host.ui.openExternalUrl(await config("HydraURL") + "/oauth2/sessions/logout");
  //host.user.logout();
  // we return false to prevent default logout behavior, because an event 
  // will be send to the plugin host to log out the user after the logout
  // request is sent to the hydra server
  return false;
}