/** Only web links are shown or opened as sources. A `tel:`, `mailto:` or other scheme is treated as missing. */
export const isWebUrl = (u: string): boolean => /^https?:\/\//i.test(u);
