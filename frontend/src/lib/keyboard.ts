/** True when the user is typing into a field (shortcuts must stay out of the way). */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}

/** A dialog, menu or popover owns the keyboard while it is open. */
export function overlayOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]',
  );
}
