import { GameProvider } from "@/stores/game-store";
import { GameBoard } from "@/components/game/GameBoard";

export default function Home() {
  return (
    <GameProvider>
      <GameBoard />
    </GameProvider>
  );
}
