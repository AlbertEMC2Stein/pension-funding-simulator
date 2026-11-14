/** Explain a resource-loading failure without treating browser connectivity as proof of its cause. */
export function resourceLoadError(
  message: string,
  offline = typeof navigator !== "undefined" && navigator.onLine === false,
): string {
  const guidance = offline
    ? "Your browser reports that it is offline. Reconnect and try again."
    : "Check your internet connection and try again. If the problem continues, reload the page.";

  return `${message} ${guidance}`;
}
