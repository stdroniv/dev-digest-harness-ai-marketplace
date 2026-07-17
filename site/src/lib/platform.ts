/** Whether to say ⌘K or Ctrl+K, and which modifier opens the palette. navigator.platform
 *  is deprecated but is still the only signal every browser agrees on here; a wrong guess
 *  costs a label, not a feature — both modifiers are accepted. */
export const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
