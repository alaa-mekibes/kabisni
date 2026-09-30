import { KEYS, MAX_NICKNAME_LENGTH } from "./constants";
import { readStore, writeStore } from "./storage";

export function cleanNickname(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NICKNAME_LENGTH);
}

export function currentNickname(): string {
  const saved = readStore<string>(KEYS.nickname, "");
  return typeof saved === "string" ? saved : "";
}

export function saveNickname(raw: unknown): string | null {
  const nickname = cleanNickname(raw);
  if (nickname.length < 2) return null;
  writeStore(KEYS.nickname, nickname);
  return nickname;
}

export function isNicknameValid(raw: unknown): boolean {
  return cleanNickname(raw).length >= 2;
}
