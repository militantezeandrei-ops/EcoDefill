import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export const Native = {
    init: async () => {
        if (!Capacitor.isNativePlatform()) return;

        try {
            await StatusBar.setOverlaysWebView({ overlay: true });
            await StatusBar.setStyle({ style: Style.Dark });
        } catch (error) {
            console.warn("Native init failed", error);
        }
    },
};
