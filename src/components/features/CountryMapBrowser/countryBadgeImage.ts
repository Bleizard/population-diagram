import type { Theme } from '../../../hooks';

/**
 * Country badge (flag pill + name pill) rasterised to an image for a MapLibre symbol layer.
 *
 * Visually mirrors the DOM markers it replaces; the backdrop blur is dropped
 * (pills are ~85% opaque, the blur was barely visible but cost a compositing layer per marker).
 */

export const BADGE_FONT_FAMILY = '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const NAME_FONT = `700 11px ${BADGE_FONT_FAMILY}`;
const FLAG_FONT = `14px ${BADGE_FONT_FAMILY}`;

const SHADOW_MARGIN = 12;
const FLAG_HEIGHT = 24;
const FLAG_MIN_WIDTH = 24;
const FLAG_PADDING_X = 6;
const NAME_TOP_FROM_FLAG_CENTER = 18;
const NAME_HEIGHT = 21;
const NAME_PADDING_X = 8;
const NAME_MAX_WIDTH = 144;

const PALETTE: Record<Theme, {
  flagFill: string;
  flagStroke: string;
  flagShadow: string;
  nameFill: string;
  nameStroke: string;
  nameText: string;
  nameShadow: string;
}> = {
  light: {
    flagFill: 'rgba(15, 23, 42, 0.78)',
    flagStroke: 'rgba(255, 255, 255, 0.35)',
    flagShadow: 'rgba(15, 23, 42, 0.28)',
    nameFill: 'rgba(255, 255, 255, 0.9)',
    nameStroke: 'rgba(255, 255, 255, 0.38)',
    nameText: '#172554',
    nameShadow: 'rgba(15, 23, 42, 0.18)',
  },
  dark: {
    flagFill: 'rgba(15, 23, 42, 0.84)',
    flagStroke: 'rgba(255, 255, 255, 0.35)',
    flagShadow: 'rgba(15, 23, 42, 0.28)',
    nameFill: 'rgba(15, 23, 42, 0.84)',
    nameStroke: 'rgba(148, 163, 184, 0.22)',
    nameText: '#e2e8f0',
    nameShadow: 'rgba(2, 6, 23, 0.36)',
  },
};

/** Vertical distance from the image top to the flag centre (the geographic anchor), CSS px. */
export const BADGE_ANCHOR_Y = SHADOW_MARGIN + FLAG_HEIGHT / 2;

/** Negative icon padding: collisions use the pills themselves (+2px gap), not the transparent shadow margin. */
export const BADGE_COLLISION_PADDING = -(SHADOW_MARGIN - 2);

export interface CountryBadge {
  flag: string;
  name: string;
  theme: Theme;
}

let sharedContext: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D {
  if (!sharedContext) {
    // CPU-backed canvas: every badge is read back with getImageData.
    sharedContext = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!sharedContext) throw new Error('2D canvas is not available');
  }
  return sharedContext;
}

function truncateToWidth(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && context.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated.trimEnd()}…`;
}

function drawPill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  shadow: { color: string; blur: number; offsetY: number }
) {
  const radius = height / 2;

  context.save();
  context.beginPath();
  context.roundRect(x + 0.5, y + 0.5, width - 1, height - 1, radius);
  context.shadowColor = shadow.color;
  context.shadowBlur = shadow.blur;
  context.shadowOffsetY = shadow.offsetY;
  context.fillStyle = fill;
  context.fill();
  context.restore();

  context.lineWidth = 1;
  context.strokeStyle = stroke;
  context.stroke();
}

export function drawCountryBadge({ flag, name, theme }: CountryBadge, pixelRatio: number): ImageData {
  const context = getContext();
  const palette = PALETTE[theme];

  context.font = NAME_FONT;
  const label = truncateToWidth(context, name, NAME_MAX_WIDTH - NAME_PADDING_X * 2 - 2);
  const nameWidth = Math.ceil(context.measureText(label).width) + NAME_PADDING_X * 2 + 2;

  context.font = FLAG_FONT;
  const flagWidth = Math.max(FLAG_MIN_WIDTH, Math.ceil(context.measureText(flag).width) + FLAG_PADDING_X * 2);

  const contentWidth = Math.max(flagWidth, nameWidth);
  const width = contentWidth + SHADOW_MARGIN * 2;
  const nameTop = BADGE_ANCHOR_Y + NAME_TOP_FROM_FLAG_CENTER;
  const height = nameTop + NAME_HEIGHT + SHADOW_MARGIN;
  const centerX = width / 2;

  const canvas = context.canvas;
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  drawPill(context, centerX - nameWidth / 2, nameTop, nameWidth, NAME_HEIGHT, palette.nameFill, palette.nameStroke, {
    color: palette.nameShadow,
    blur: 10,
    offsetY: 4,
  });
  context.font = NAME_FONT;
  context.fillStyle = palette.nameText;
  context.fillText(label, centerX, nameTop + NAME_HEIGHT / 2 + 0.5);

  drawPill(context, centerX - flagWidth / 2, SHADOW_MARGIN, flagWidth, FLAG_HEIGHT, palette.flagFill, palette.flagStroke, {
    color: palette.flagShadow,
    blur: 10,
    offsetY: 4,
  });
  context.font = FLAG_FONT;
  context.fillText(flag, centerX, BADGE_ANCHOR_Y + 1);

  return context.getImageData(0, 0, canvas.width, canvas.height);
}
