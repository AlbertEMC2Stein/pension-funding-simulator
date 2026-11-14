/** Browser-local choice to suppress the first-visit introduction. */
export const WELCOME_DISMISSED_KEY =
  "pension-funding-simulator:welcome-dismissed:v1";

/** Minimal storage interface for the introduction preference. */
export interface WelcomeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Show the introduction unless the user explicitly asked not to see it again. */
export function shouldShowWelcome(storage: WelcomeStorage): boolean {
  return storage.getItem(WELCOME_DISMISSED_KEY) !== "true";
}

/** Persist the explicit opt-out independently of setup and display preferences. */
export function dismissWelcomePermanently(storage: WelcomeStorage): void {
  storage.setItem(WELCOME_DISMISSED_KEY, "true");
}
