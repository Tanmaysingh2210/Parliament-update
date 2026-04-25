// useVisibilityReconnect.js
// Drop this hook into Board.jsx — handles tab-switch socket death on mobile

import { useEffect } from "react";

/**
 * When the tab becomes visible again after being hidden:
 * 1. Checks if the socket is still connected
 * 2. If disconnected — reconnects and re-joins the lobby
 * 3. Re-emits joinLobby so server re-sends identity + lobbyUpdate
 *    which re-syncs currentTurn, players, everything
 */
export function useVisibilityReconnect({ socket, roomId, onResynced }) {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!socket.current) return;

      const s = socket.current;

      if (!s.connected) {
        // Socket is dead — reconnect
        s.connect();

        // Wait for reconnect then re-join
        s.once("connect", () => {
          s.emit("joinLobby", { gameCode: roomId });
          onResynced?.();
        });
      } else {
        // Socket is alive but state may be stale — re-join anyway
        // Server will re-emit identity + lobbyUpdate
        s.emit("joinLobby", { gameCode: roomId });
        onResynced?.();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [roomId]);
}