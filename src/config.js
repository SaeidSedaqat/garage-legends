// The canvas renders at device resolution (capped at 2x) so art and text stay sharp.
export const DPR = Math.min(window.devicePixelRatio || 1, 2);
export const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif';
