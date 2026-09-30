// Imperative handle to the `.player` DOM node.
//
// The game moves the shape via direct style writes at up to 10Hz (old
// `randomly()` loop). Routing that through React state would re-render the
// tree every 100ms and drift from the original timing, so — like the old
// `document.querySelector(".player")` calls — the engine writes styles
// directly. Unlike string queries, this holder cannot select the wrong node
// and never touches `document` during render.
let node: HTMLDivElement | null = null;

export function setPlayerNode(next: HTMLDivElement | null): void {
  node = next;
}

export function getPlayerNode(): HTMLDivElement | null {
  return node;
}
