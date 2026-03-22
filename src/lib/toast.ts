import { Capacitor } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";
import { Toast } from "@capacitor/toast";

type ToastDuration = "short" | "long";
type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
    text: string;
    type?: ToastType;
    duration?: ToastDuration;
    haptic?: boolean;
}

function getHapticType(type: ToastType): NotificationType {
    switch (type) {
        case "success":
            return NotificationType.Success;
        case "error":
            return NotificationType.Error;
        case "warning":
            return NotificationType.Warning;
        default:
            return NotificationType.Success;
    }
}

export async function showToast(
    textOrOptions: string | ToastOptions,
    duration: ToastDuration = "short"
): Promise<void> {
    const options: ToastOptions =
        typeof textOrOptions === "string"
            ? { text: textOrOptions, duration, type: "info" }
            : { duration: "short", type: "info", haptic: true, ...textOrOptions };

    if (Capacitor.isNativePlatform()) {
        if (options.haptic !== false) {
            try {
                await Haptics.notification({ type: getHapticType(options.type || "info") });
            } catch {
                // Ignore haptic failures and continue toast display.
            }
        }

        await Toast.show({
            text: options.text,
            duration: options.duration || "short",
            position: "bottom",
        });
        return;
    }

    if (typeof window === "undefined" || typeof document === "undefined") return;

    const el = document.createElement("div");
    el.textContent = options.text;
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "max(24px, calc(var(--safe-bottom, 0px) + 12px))";
    el.style.transform = "translateX(-50%)";
    el.style.background =
        options.type === "success"
            ? "rgba(5,150,105,0.95)"
            : options.type === "error"
              ? "rgba(185,28,28,0.95)"
              : options.type === "warning"
                ? "rgba(161,98,7,0.95)"
                : "rgba(24,24,27,0.95)";
    el.style.color = "#fff";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "10px";
    el.style.fontSize = "13px";
    el.style.fontWeight = "600";
    el.style.zIndex = "9999";
    el.style.maxWidth = "90vw";
    el.style.textAlign = "center";
    el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
    el.style.pointerEvents = "none";

    document.body.appendChild(el);

    const timeout = options.duration === "long" ? 3500 : 2000;
    window.setTimeout(() => {
        el.remove();
    }, timeout);
}
