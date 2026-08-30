/**
 * Image `sizes` hints, kept beside each other so the numbers in them stay in
 * step with the CSS that lays the images out. Each mirrors a breakpoint and a
 * width from a stylesheet; getting one wrong costs a download, not a layout,
 * which is exactly the kind of drift that goes unnoticed.
 */

/** Listing thumbnails: full width stacked, `--content-thumb-size` beside text. */
export const CONTENT_THUMB_SIZES = "(max-width: 40rem) 100vw, 12rem"

/** Detail-page covers: full width up to the prose measure. */
export const COVER_SIZES = "(max-width: 48rem) 100vw, 48rem"

/** Candidates rendered for a detail-page cover. */
export const COVER_WIDTHS = [640, 960, 1280]

/** Twice the largest CSS box for the profile portrait (11rem), for 2x screens. */
export const PROFILE_AVATAR_WIDTH = 352

/** Twice the byline avatar's CSS box (1.25rem), rounded up to a sane candidate. */
export const AUTHOR_AVATAR_WIDTH = 64
