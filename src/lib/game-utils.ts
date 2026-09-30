/** Random playfield position — same clamp logic as old randomPosition(). */
export function randomPosition(): { randX: number; randY: number } {
  let randX = Math.floor(Math.random() * 100);
  let randY = Math.floor(Math.random() * 100);
  if (randX < 12) randX += 14;
  if (randY < 12) randY += 14;
  return { randX, randY };
}
