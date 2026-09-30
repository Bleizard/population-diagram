const CURSOR_OFFSET = 16;
const EDGE_MARGIN = 12;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Moves the hover card next to the cursor, inside the map frame, by writing `transform`
 * directly: pointer moves do not go through React, only a change of the hovered country
 * re-renders the card.
 */
export function placeHoverCard(card: HTMLElement, frame: HTMLElement, event: MouseEvent) {
  const rect = frame.getBoundingClientRect();
  const x = clamp(event.clientX - rect.left + CURSOR_OFFSET, EDGE_MARGIN, rect.width - card.offsetWidth - EDGE_MARGIN);
  const y = clamp(
    event.clientY - rect.top - card.offsetHeight / 2,
    EDGE_MARGIN,
    rect.height - card.offsetHeight - EDGE_MARGIN
  );
  card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
