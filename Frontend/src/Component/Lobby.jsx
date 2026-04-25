import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSocket, connectSocket } from "./socket";
import { useAuth } from "../context/AuthContext";
import "./lobby.css";

export default function Lobby() {
    const navigate = useNavigate();
    const location = useLocation();

    const roomCode = new URLSearchParams(location.search).get("room");

    const [players, setPlayers] = useState([]);
    const [maxPlayers, setMaxPlayers] = useState(0);
    const [status, setStatus] = useState("waiting");
    const [connectionError, setConnectionError] = useState("");
    const {user} = useAuth()
    useEffect(() => {
        const socket = connectSocket(user);
        if (!socket) {
            console.error("Failed to get socket instance");
            setConnectionError("Connection failed");
            return;
        }

        if (!roomCode) {
            console.error("Room code not found in URL");
            setConnectionError("Room code missing");
            return;
        }

        const joinLobby = () => {
            console.log("Joining lobby:", roomCode);
            socket.emit("joinLobby", { gameCode: roomCode }, (response) => {
                if (response?.error) {
                    console.error("Lobby join failed:", response.error);
                    setConnectionError(response.error);
                }
            });
        };

        // Add error listeners
        const handleError = (error) => {
            console.error("Socket error:", error);
            setConnectionError("Connection error occurred");
        };

        const handleDisconnect = (reason) => {
            console.log("Socket disconnected:", reason);
            if (reason === 'io server disconnect') {
                setConnectionError("Disconnected by server");
            }
        };

        socket.on("connect_error", handleError);
        socket.on("disconnect", handleDisconnect);

        if (socket.connected) {
            joinLobby();
        } else {
            socket.once("connect", joinLobby);
        }

        socket.on("lobbyUpdate", (data) => {
            console.log("Lobby Update Received:", data);
            setPlayers(data.players);
            setMaxPlayers(data.maxPlayer);
            setStatus(data.status);
            setConnectionError(""); // Clear error on successful update

            // ✅ navigate if game already started (catches cases where gameStart was missed)
            if (data.status === "active") {
                navigate(`/game?room=${roomCode}`, {
                    state: { game: data.game }
                });
            }
        });

        socket.on("gameStart", ({ gameId, game }) => {
            navigate(`/game?room=${roomCode}`, {
                state: { game }
            });
        });

        socket.on("lobbyError", (data) => {
            console.error("Lobby error:", data);
            setConnectionError(data.message || "Lobby error occurred");
        });

        return () => {
            socket.off("lobbyUpdate");
            socket.off("gameStart");
            socket.off("lobbyError");
            socket.off("connect_error", handleError);
            socket.off("disconnect", handleDisconnect);
        };

    }, [roomCode]);

    const [copied, setCopied] = useState(false);
    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 5000);

        } catch (err) {
            console.error("Copy failed:", err);
        }
    };


    return (
        <div className="lobby-container">

            <h2>Lobby</h2>

            {connectionError && (
                <div style={{
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    padding: '10px',
                    borderRadius: '5px',
                    marginBottom: '15px',
                    textAlign: 'center'
                }}>
                    Connection Error: {connectionError}
                </div>
            )}

            <div className="room-box">
                <p><strong>Room Code:</strong> {roomCode}</p>
                <button
                    onClick={copyCode}
                    className={`copy-btn ${copied ? "copied" : ""}`}
                >
                    {copied ? "Copied ✓" : "Copy Invite Code"}
                </button>

            </div>

            <div className="player-list">
                <h3>Players ({players.length}/{maxPlayers})</h3>
                {players.map((p, index) => (
                    <div key={index} className="player-item">
                        {p.userId?.username || "Player"}
                    </div>
                ))}
            </div>

            {status === "waiting" && (
                <p className="waiting-text">Waiting for players...</p>
            )}

        </div>
    );
}
