import { useCallback } from "react";
import { useSettings } from "@/hooks/use-settings";
import { playSuccessSound, playErrorSound, playNotificationSound, playClickSound } from "@/lib/sounds";

export function useSound() {
  const { data: settings } = useSettings();
  const enabled = settings?.soundEnabled ?? true;
  const clickEnabled = enabled && (settings?.soundOnClick ?? true);

  return {
    playSuccess: useCallback(() => enabled && playSuccessSound(), [enabled]),
    playError: useCallback(() => enabled && playErrorSound(), [enabled]),
    playNotification: useCallback(() => enabled && playNotificationSound(), [enabled]),
    playClick: useCallback(() => clickEnabled && playClickSound(), [clickEnabled]),
  };
}
