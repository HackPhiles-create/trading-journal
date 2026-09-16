import { Capacitor } from "@capacitor/core";

// The one seam every hook branches on: true inside the bundled Android app
// (talk to on-device SQLite), false in any browser — including the Railway
// web deploy — where hooks keep calling the existing /api/* routes.
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}
