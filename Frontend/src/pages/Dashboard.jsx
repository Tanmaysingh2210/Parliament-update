import "./Dashboard.css";
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/api.js';
import { connectSocket, getSocket } from "../Component/socket.js";
import ParliamentBackground from "../Component/ParliamentBackground.jsx";
import {playClick} from "../utils/reusable.js";

const DashBoard = () => {
    const { user, signout, setUsername } = useAuth();
    const [showFriendOption, setShowFriendOption] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [playerCount, setPlayerCount] = useState(2);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [joinError, setJoinError] = useState("");
    const [joining, setJoining] = useState(false);
    const [logout, setLogout] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [settingUsername, setSettingUsername] = useState(false);

    // ── Matchmaking state ──────────────────────────────────
    const [showMatchmakingModal, setShowMatchmakingModal] = useState(false);
    const [matchPlayerCount, setMatchPlayerCount] = useState(2);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [queueInfo, setQueueInfo] = useState({
        positionInQueue: 0,
        playersInQueue: 0,
        playersNeeded: 0
    });
    const [searchElapsed, setSearchElapsed] = useState(0);
    const searchTimerRef = useRef(null);

    const navigate = useNavigate();

    // ── Enter key handler — fires the primary action of whichever modal is open
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key !== 'Enter') return;

            if (showJoinModal && !joining) {
                handleJoinRoom();
                return;
            }
            if (showCreateModal && !creating) {
                setCreating(true);
                new Promise(res => setTimeout(res, 50)).then(() => handleCreateRoom());
                return;
            }
            if (showUsernameModal && !settingUsername) {
                handleSetUsername();
                return;
            }
            if (showMatchmakingModal && !isSearching) {
                handleFindMatch();
                return;
            }
            if (showFriendOption) {
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        showJoinModal, joining, joinCode,
        showCreateModal, creating, playerCount,
        showUsernameModal, settingUsername, newUsername,
        showFriendOption,
        showMatchmakingModal, isSearching, matchPlayerCount,
    ]);

    // ── Matchmaking socket listeners ────────────────────────
    useEffect(() => {
        if (!isSearching) return;

        const socket = getSocket() || connectSocket(user);
        if (!socket) return;

        const handleMatchFound = ({ gameCode, gameId, playerCount }) => {
            console.log("[matchmaking] Match found!", gameCode);
            cleanupSearch();
            // Navigate to existing lobby — same as the friend code join flow
            setTimeout(() => navigate(`/lobby?room=${gameCode}`), 300);
        };

        const handleQueueUpdate = (data) => {
            setQueueInfo({
                positionInQueue: data.positionInQueue,
                playersInQueue: data.playersInQueue,
                playersNeeded: data.playersNeeded
            });
        };

        const handleMatchTimeout = ({ message }) => {
            console.log("[matchmaking] Timeout:", message);
            setSearchError(message || "Search timed out");
            cleanupSearch();
        };

        socket.on("match:found", handleMatchFound);
        socket.on("queue:update", handleQueueUpdate);
        socket.on("match:timeout", handleMatchTimeout);

        return () => {
            socket.off("match:found", handleMatchFound);
            socket.off("queue:update", handleQueueUpdate);
            socket.off("match:timeout", handleMatchTimeout);
        };
    }, [isSearching, user, navigate]);

    // ── Search elapsed timer ─────────────────────────────────
    useEffect(() => {
        if (isSearching) {
            setSearchElapsed(0);
            searchTimerRef.current = setInterval(() => {
                setSearchElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (searchTimerRef.current) {
                clearInterval(searchTimerRef.current);
                searchTimerRef.current = null;
            }
        };
    }, [isSearching]);

    function cleanupSearch() {
        setIsSearching(false);
        if (searchTimerRef.current) {
            clearInterval(searchTimerRef.current);
            searchTimerRef.current = null;
        }
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

    const handleCreateRoom = async () => {
        try {
            setCreating(true);
            const roomCode = generateRoomCode();
            const res = await api.post("/friends/create", {
                maxPlayer: playerCount,
                gameCode: roomCode
            });
            if (!res.data.success) {
                alert("Room creation failed: " + (res.data.message || "Unknown error"));
                return;
            }
            const socket = connectSocket(user);
            setShowCreateModal(false);
            setShowFriendOption(false);
            setTimeout(() => navigate(`/lobby?room=${roomCode}`), 500);
        } catch (err) {
            alert("Something went wrong: " + (err.response?.data?.message || err.message));
        } finally {
            setCreating(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!joinCode.trim()) { setJoinError("Enter room code"); return; }
        try {
            setJoining(true);
            setJoinError("");
            const res = await api.post("/friends/join", {
                gameCode: joinCode.trim().toUpperCase()
            });
            if (!res.data.success) {
                setJoinError("Failed to join: " + (res.data.message || "Unknown error"));
                return;
            }
            connectSocket();
            setShowJoinModal(false);
            setShowFriendOption(false);
            setTimeout(() => navigate(`/lobby?room=${joinCode.trim().toUpperCase()}`), 500);
        } catch (err) {
            setJoinError(err.response?.data?.error || "Something went wrong: " + err.message);
        } finally {
            setJoining(false);
        }
    };

    const handleSetUsername = async () => {
        setUsernameError('');
        if (!newUsername.trim()) { setUsernameError('Enter a username'); return; }
        setSettingUsername(true);
        const res = await setUsername(newUsername.trim());
        setSettingUsername(false);
        if (!res.success) { setUsernameError(res.error || 'Failed to set username'); return; }
        setShowUsernameModal(false);
    };

    // ── Matchmaking handlers ─────────────────────────────────
    const handleFindMatch = async () => {
        try {
            setSearchError("");
            setIsSearching(true);

            // Ensure socket is connected before joining queue
            const socket = connectSocket(user);

            const res = await api.post("/matchmaking/join", {
                preferredPlayerCount: matchPlayerCount
            });

            if (!res.data.success && res.data.message !== "Already matched") {
                setSearchError(res.data.message || "Failed to join queue");
                setIsSearching(false);
                return;
            }

            // If already matched, navigate directly if active game code exists
            if (res.data.status === "matched") {
                const roomCode = res.data.gameCode;
                if (roomCode) {
                    cleanupSearch();
                    setShowMatchmakingModal(false);
                    setTimeout(() => navigate(`/lobby?room=${roomCode}`), 300);
                    return;
                }
            }

            setQueueInfo({
                positionInQueue: res.data.positionInQueue || 1,
                playersInQueue: res.data.playersInQueue || 1,
                playersNeeded: res.data.playersNeeded || matchPlayerCount
            });

            setShowMatchmakingModal(false);

        } catch (err) {
            console.error("Find match error:", err);
            setSearchError(err.response?.data?.message || "Failed to search");
            setIsSearching(false);
        }
    };

    const handleCancelSearch = async () => {
        try {
            await api.post("/matchmaking/cancel");
        } catch (err) {
            console.error("Cancel search error:", err);
        } finally {
            cleanupSearch();
            setSearchError("");
        }
    };

    return (
        <>
            {creating && (
                <div className="entry-logout">
                    <div className="entry-spinner"></div>
                    <p>Creating Room...</p>
                </div>
            )}
            {logout && (
                <div className="entry-logout">
                    <div className="entry-spinner"></div>
                    <p>Logging-out...</p>
                </div>
            )}

            {/* ← dashboard-page class scopes modal styles */}
            <div className='hero dashboard-page'>
                <ParliamentBackground />
                <div className="corner tl" /><div className="corner tr" />
                <div className="corner bl" /><div className="corner br" />

                <div className='kuch'>
                    <h1 className="logo-name">PARLIAMENT  BATTLEGROUND</h1>
                    <h2 className="quote">Control The Flow Of Nation</h2>
                </div>

                <div className="top-user">
                    <div className="user-line">👤 <strong>{user?.username || 'Guest'}</strong></div>
                    <div className="user-actions">
                        {user && !user?.isGuest ? (
                            <button className="action-btn" onClick={() => setShowUsernameModal(true)}>
                                {user?.username ? 'Edit name' : 'Add username'}
                            </button>
                        ) : (
                            <button className="action-btn" onClick={() => navigate('/signup')}>Create account to set name</button>
                        )}
                        <button className="action-btn" disabled={logout}
                            onClick={async () => {
                                setLogout(true);
                                await new Promise(res => setTimeout(res, 50));
                                await signout();
                            }}>
                            {logout ? "logging-out..." : "logout"}
                        </button>
                    </div>
                </div>

                <div className="glass-panel">
                    <h2 className="panel-title">GAME MODE</h2>
                    <button className="glass-btn sharp-btn" onClick={() => {setShowFriendOption(true); playClick()}}>👥 Play with Friends</button>
                    <button className="glass-btn sharp-btn matchmaking-btn" onClick={() => {setShowMatchmakingModal(true);playClick()}}>🌐 Find Global Match</button>
                </div>

                {/* ── Friend option modal (existing) ── */}
                {showFriendOption && (
                    <div className="modal-overlay" onClick={() => setShowFriendOption(false)}>
                        <div className="modal-box friend-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>Play With Friends</h3>
                            <div className="friend-modal-buttons">
                                <button className="modal-btn create" onClick={() => { setShowFriendOption(false); setShowCreateModal(true);playClick() }}>
                                    🎯 Create Room
                                </button>
                                <button className="modal-btn join" onClick={() => { setShowFriendOption(false); setShowJoinModal(true); playClick()}}>
                                    🔗 Join Room
                                </button>
                            </div>
                            <button className="close-btn" onClick={() => {setShowFriendOption(false);playClick()}}>X</button>
                        </div>
                    </div>
                )}

                {/* ── Create room modal (existing) ── */}
                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                            <h3>Create Room</h3>
                            <label>No. of Players</label>
                            <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}>
                                {[2, 3, 4, 5, 6].map(num => <option key={num} value={num}>{num}</option>)}
                            </select>
                            <div className="modal-actions">
                                <button onClick={() =>{
                                    setShowCreateModal(false);playClick()}}>Cancel</button>
                                <button disabled={creating} onClick={async () => {
                                    setCreating(true);
                                    await new Promise(res => setTimeout(res, 50));
                                    await handleCreateRoom();
                                    playClick()
                                }}>
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                            <p className="enter-hint">Press Enter to create</p>
                        </div>
                    </div>
                )}

                {/* ── Join room modal (existing) ── */}
                {showJoinModal && (
                    <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
                        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                            <h3>Join Room</h3>
                            <label>Enter Room Code</label>
                            <input
                                type="text"
                                autoFocus
                                value={joinCode.trim().toUpperCase()}
                                onChange={(e) => setJoinCode(e.target.value.trim().toUpperCase())}
                                placeholder="Enter room code"
                                onKeyDown={(e) => { if (e.key === 'Enter' && !joining) handleJoinRoom(); }}
                            />
                            {joinError && <p className="error-text">{joinError}</p>}
                            <div className="modal-actions">
                                <button onClick={() =>{
                                    setShowJoinModal(false);playClick()}}>Cancel</button>
                                <button onClick={handleJoinRoom} disabled={joining}>
                                    {joining ? "Joining..." : "Join"}
                                </button>
                            </div>
                            <p className="enter-hint">Press Enter to join</p>
                        </div>
                    </div>
                )}

                {/* ── Username modal (existing) ── */}
                {showUsernameModal && (
                    <div className="modal-overlay" onClick={() => setShowUsernameModal(false)}>
                        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                            <h3>{user?.username ? 'Edit username' : 'Add username'}</h3>
                            <label>Username</label>
                            <input
                                type="text"
                                autoFocus
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter username"
                                onKeyDown={(e) => { if (e.key === 'Enter' && !settingUsername) handleSetUsername(); }}
                            />
                            {usernameError && <p className="error-text">{usernameError}</p>}
                            <div className="modal-actions">
                                <button onClick={() => setShowUsernameModal(false)}>Cancel</button>
                                <button onClick={handleSetUsername} disabled={settingUsername}>
                                    {settingUsername ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                            <p className="enter-hint">Press Enter to save</p>
                        </div>
                    </div>
                )}

                {/* ── Matchmaking: Player count selector modal (NEW) ── */}
                {showMatchmakingModal && !isSearching && (
                    <div className="modal-overlay" onClick={() => setShowMatchmakingModal(false)}>
                        <div className="modal-box" onClick={(e) => {e.stopPropagation();playClick()}}>
                            <h3>🌐 Find Global Match</h3>
                            <label>Number of Players</label>
                            <div className="matchmaking-player-select">
                                {[2, 3, 4, 5, 6].map(num => (
                                    <button
                                        key={num}
                                        className={`player-count-btn ${matchPlayerCount === num ? 'active' : ''}`}
                                        onClick={() => setMatchPlayerCount(num)}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                            {searchError && <p className="error-text">{searchError}</p>}
                            <div className="modal-actions">
                                <button onClick={() => { setShowMatchmakingModal(false); setSearchError("");playClick() }}>Cancel</button>
                                <button onClick={handleFindMatch}>
                                    Find Match
                                </button>
                            </div>
                            <p className="enter-hint">Press Enter to search</p>
                        </div>
                    </div>
                )}

                {/* ── Matchmaking: Waiting/searching overlay (NEW) ── */}
                {isSearching && (
                    <div className="matchmaking-waiting">
                        <div className="matchmaking-waiting-content">
                            <div className="matchmaking-pulse-ring">
                                <div className="matchmaking-pulse-dot"></div>
                            </div>

                            <h2 className="matchmaking-title">Searching for Players</h2>
                            <p className="matchmaking-subtitle">
                                Looking for a <strong>{matchPlayerCount}-player</strong> match
                            </p>

                            <div className="matchmaking-stats">
                                <div className="matchmaking-stat">
                                    <span className="stat-label">Queue Position</span>
                                    <span className="stat-value">{queueInfo.positionInQueue || '—'}</span>
                                </div>
                                <div className="matchmaking-stat">
                                    <span className="stat-label">Players Found</span>
                                    <span className="stat-value">
                                        {queueInfo.playersInQueue || 1} / {queueInfo.playersNeeded || matchPlayerCount}
                                    </span>
                                </div>
                                <div className="matchmaking-stat">
                                    <span className="stat-label">Time Elapsed</span>
                                    <span className="stat-value">{formatTime(searchElapsed)}</span>
                                </div>
                            </div>

                            {searchError && <p className="matchmaking-error">{searchError}</p>}

                            <button className="matchmaking-cancel-btn" onClick={handleCancelSearch}>
                                Cancel Search
                            </button>
                        </div>
                    </div>
                )}

                <div className="bottom-bar">
                    <button className="nav-btn" onClick={() => {navigate('/leaderboard');playClick()}}>🏆<span>Leaderboard</span></button>
                    {/* <button className="nav-btn">⚙️<span>Settings</span></button>
                    <button className="nav-btn">📩<span>Inbox</span></button>
                    <button className="nav-btn">👥<span>Friends</span></button> */}
                </div>
            </div>
        </>
    );
};

export default DashBoard;