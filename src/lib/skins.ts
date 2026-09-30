// Store catalog — mirrors generateRowSkin/generateRowColors/generateRowAnimations
// pricing exactly (skins +200, colors +100, animations +500, first item free).

export type SkinCategory = "shape" | "color" | "animation";

export interface SkinProduct {
  id: string;
  price: number;
  category: SkinCategory;
}

export const SHAPES: SkinProduct[] = [
  "circle",
  "triangleUp",
  "triangleDown",
  "star-six",
  "x-shape",
  "heart",
  "infinity",
  "pacman",
].map((id, i) => ({ id, price: i * 200, category: "shape" }));

export const COLORS: SkinProduct[] = [
  "#A8D8EA",
  "#76C4D4",
  "#4A89DC",
  "#88C9A1",
  "#6DBCB3",
  "#F5C3C2",
  "#D4B8D9",
  "#E8D5B5",
  "#D9BF77",
  "#E0E0E0",
].map((id, i) => ({ id, price: i * 100, category: "color" }));

export const ANIMATIONS: SkinProduct[] = ["none", "rotateRightShape", "rotateLeftShape"].map(
  (id, i) => ({ id, price: i * 500, category: "animation" }),
);

export function chunkPairs<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export function priceClass(price: number): string {
  return `p${price}`;
}

export function isUnlocked(storePoints: number, price: number): boolean {
  return storePoints >= price;
}
