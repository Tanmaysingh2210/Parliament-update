// import "./Dashboard.css";
// import { useState, useEffect } from 'react';
// import { useNavigate } from "react-router-dom";
// import { useAuth } from '../context/AuthContext.jsx';
// import api from '../api/api.js';
// import { connectSocket } from "../Component/socket.js";
// import ParliamentBackground from "../Component/ParliamentBackground.jsx";


// const DashBoard = () => {
//     const { user, signout, setUsername } = useAuth();
//     const [showFriendOption, setShowFriendOption] = useState(false);
//     const [showCreateModal, setShowCreateModal] = useState(false);
//     const [playerCount, setPlayerCount] = useState(2);

//     //join states
//     const [showJoinModal, setShowJoinModal] = useState(false);
//     const [joinCode, setJoinCode] = useState("");
//     const [joinError, setJoinError] = useState("");
//     const [joining, setJoining] = useState(false);
//     const [logout, setLogout] = useState(false)
//     const [creating, setCreating] = useState(false)
//     const navigate = useNavigate();

//     const generateRoomCode = () => {
//         return Math.random().toString(36).substring(2, 8).toUpperCase();
//     };

//     // CREATE ROOM
//     const handleCreateRoom = async () => {
//         try {
//             setCreating(true);
//             const roomCode = generateRoomCode();

//             const res = await api.post("/friends/create", {
//                 maxPlayer: playerCount,
//                 gameCode: roomCode
//             });

//             console.log("Create room response:", res);
//             if (!res.data.success) {
//                 alert("Room creation failed: " + (res.data.message || "Unknown error"));
//                 return;
//             }

//             // Connect socket and wait for connection
//             const socket = connectSocket(user);
//             console.log("Socket connected:", socket?.connected);

//             setShowCreateModal(false);
//             setShowFriendOption(false);

//             // Add small delay to ensure socket is connected before navigating
//             setTimeout(() => {
//                 navigate(`/lobby?room=${roomCode}`);
//             }, 500);

//         } catch (err) {
//             console.error("Room creation error:", err);
//             alert("Something went wrong while creating room: " + (err.response?.data?.message || err.message));
//         } finally {
//             setCreating(false);
//         }
//     };

//     // JOIN ROOM (user will later enter code)
//     const handleJoinRoom = async () => {
//         if (!joinCode.trim()) {
//             setJoinError("Enter room code");
//             return;
//         }

//         try {
//             setJoining(true);
//             setJoinError("");

//             const res = await api.post("/friends/join", {
//                 gameCode: joinCode.trim().toUpperCase()
//             });

//             console.log("Join room response:", res);
//             if (!res.data.success) {
//                 setJoinError("Failed to join room: " + (res.data.message || "Unknown error"));
//                 return;
//             }

//             // Connect socket and wait for connection
//             const socket = connectSocket();
//             console.log("Socket connected:", socket?.connected);

//             setShowJoinModal(false);
//             setShowFriendOption(false);

//             // Add small delay to ensure socket is connected before navigating
//             setTimeout(() => {
//                 navigate(`/lobby?room=${joinCode.trim().toUpperCase()}`);
//             }, 500);

//         } catch (err) {
//             console.error("Join room error:", err);
//             if (err.response?.data?.error) {
//                 setJoinError(err.response.data.error);
//             } else {
//                 setJoinError("Something went wrong: " + (err.message || "Unknown error"));
//             }
//         } finally {
//             setJoining(false);
//         }
//     };

//     const [showUsernameModal, setShowUsernameModal] = useState(false);
//     const [newUsername, setNewUsername] = useState('');
//     const [usernameError, setUsernameError] = useState('');
//     const [settingUsername, setSettingUsername] = useState(false);

//     useEffect(() => {
//         const handleKeyDown = (e) => {
//             if (e.key !== 'Enter') return;

//             if (showJoinModal && !joining) {
//                 handleJoinRoom();
//                 return;
//             }
//             if (showCreateModal && !creating) {
//                 setCreating(true);
//                 new Promise(res => setTimeout(res, 50)).then(() => handleCreateRoom());
//                 return;
//             }
//             if (showUsernameModal && !settingUsername) {
//                 handleSetUsername();
//                 return;
//             }
//             if (showFriendOption) {
//                 // Enter on friend option modal does nothing (two buttons, ambiguous)
//                 return;
//             }
//         };

//         window.addEventListener('keydown', handleKeyDown);
//         return () => window.removeEventListener('keydown', handleKeyDown);
//     }, [
//         showJoinModal, joining, joinCode,
//         showCreateModal, creating, playerCount,
//         showUsernameModal, settingUsername, newUsername,
//         showFriendOption,
//     ]);

//     const handleSetUsername = async () => {
//         setUsernameError('');
//         if (!newUsername.trim()) {
//             setUsernameError('Enter a username');
//             return;
//         }
//         setSettingUsername(true);
//         const res = await setUsername(newUsername.trim());
//         setSettingUsername(false);
//         if (!res.success) {
//             setUsernameError(res.error || 'Failed to set username');
//             return;
//         }
//         setShowUsernameModal(false);
//     };

//     return (
//         <>

//             {creating && (
//                 <div className="entry-logout">
//                     <div className="entry-spinner"></div>
//                     <p>Creating Room...</p>
//                 </div>
//             )}

//             {logout && (
//                 <div className="entry-logout">
//                     <div className="entry-spinner"></div>
//                     <p>Logging-out...</p>
//                 </div>
//             )}
//             <div className='hero dashboard-page'>
//                 <ParliamentBackground />  {/* ← add this as first child */}

//                 <div className="corner tl" /><div className="corner tr" />
//                 <div className="corner bl" /><div className="corner br" />
//                 <div className='kuch'>
//                     <h1 className="logo-name">PARLIAMENT  BATTLEGROUND</h1>
//                     <h2 className="quote">Control The Flow Of Nation</h2>
//                 </div>
//                 <div className="top-user">
//                     <div className="user-line">👤 <strong>{user?.username || 'Guest'}</strong></div>
//                     <div className="user-actions">
//                         {user && !user?.isGuest ? (
//                             <button className="action-btn" onClick={() => setShowUsernameModal(true)}>
//                                 {user?.username ? 'Edit name' : 'Add username'}
//                             </button>
//                         ) : (
//                             <button className="action-btn" onClick={() => navigate('/signup')}>Create account to set name</button>
//                         )}
//                         <button className="action-btn" disabled={logout}
//                             onClick={async () => {
//                                 setLogout(true);

//                                 // 🔥 allow UI to update
//                                 await new Promise(res => setTimeout(res, 50));

//                                 await signout();
//                             }} >{logout ? "logging-out..." : "logout"}
//                         </button>
//                     </div>
//                 </div>

//                 <div className="glass-panel">
//                     <h2 className="panel-title ">GAME MODE</h2>

//                     {/* <button className="glass-btn sharp-btn">🎮 Player VS Computer</button>
//                 <button className="glass-btn sharp-btn">🌐 Online Multiplayer</button> */}
//                     <button className="glass-btn sharp-btn" onClick={() => setShowFriendOption(true)}>👥 Play with Friends</button>
//                 </div>

//                 {/* {showFriendOption && (
//                 <div className="friend-options">
//                     <button onClick={() => setShowFriendOption(false)}>X</button>
//                     <button onClick={() => { setShowCreateModal(true), setShowFriendOption(false) }}>Create Room</button>
//                     <button onClick={() => {
//                         setShowJoinModal(true);
//                         setShowFriendOption(false);
//                     }}>
//                         Join Room
//                     </button>


//                 </div>
//             )} */}

//                 {showFriendOption && (
//                     <div
//                         className="modal-overlay"
//                         onClick={() => setShowFriendOption(false)}
//                     >
//                         <div
//                             className="modal-box friend-modal"
//                             onClick={(e) => e.stopPropagation()}
//                         >
//                             <h3>Play With Friends</h3>
//                             <div className="friend-modal-buttons">
//                                 <button
//                                     className="modal-btn create"
//                                     onClick={() => {
//                                         setShowFriendOption(false);
//                                         setShowCreateModal(true);
//                                     }}
//                                 >
//                                     🎯 Create Room
//                                 </button>
//                                 <button
//                                     className="modal-btn join"
//                                     onClick={() => {
//                                         setShowFriendOption(false);
//                                         setShowJoinModal(true);
//                                     }}
//                                 >
//                                     🔗 Join Room
//                                 </button>
//                             </div>
//                             <button
//                                 className="close-btn"
//                                 onClick={() => setShowFriendOption(false)}
//                             >
//                                 X
//                             </button>
//                         </div>
//                     </div>
//                 )}


//                 {showCreateModal && (
//                     <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
//                         <div className="modal-box" onClick={(e) => e.stopPropagation()}>
//                             <h3>Create Room</h3>

//                             <label>No. of Players</label>
//                             <select
//                                 value={playerCount}
//                                 onChange={(e) => setPlayerCount(Number(e.target.value))}
//                             >
//                                 {[2, 3, 4, 5, 6].map(num => (
//                                     <option key={num} value={num}>{num}</option>
//                                 ))}
//                             </select>

//                             <div className="modal-actions">
//                                 <button onClick={() => setShowCreateModal(false)}>Cancel</button>
//                                 <button disabled={creating}
//                                     onClick={async () => {
//                                         setCreating(true);

//                                         // 🔥 allow UI to update
//                                         await new Promise(res => setTimeout(res, 50));

//                                         await handleCreateRoom();
//                                     }}>{creating ? 'Creating...' : 'Create'}</button>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {showJoinModal && (
//                     <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
//                         <div className="modal-box" onClick={(e) => e.stopPropagation()}>
//                             <h3>Join Room</h3>

//                             <label>Enter Room Code</label>
//                             <input
//                                 type="text"
//                                 value={joinCode.trim().toUpperCase()}
//                                 onChange={(e) => setJoinCode(e.target.value.trim().toUpperCase())}
//                                 placeholder="Enter room code"
//                             />

//                             {joinError && <p className="error-text">{joinError}</p>}

//                             <div className="modal-actions">
//                                 <button onClick={() => setShowJoinModal(false)}>Cancel</button>
//                                 <button onClick={handleJoinRoom} disabled={joining}>
//                                     {joining ? "Joining..." : "Join"}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {showUsernameModal && (
//                     <div className="modal-overlay" onClick={() => setShowUsernameModal(false)}>
//                         <div className="modal-box" onClick={(e) => e.stopPropagation()}>
//                             <h3>{user?.username ? 'Edit username' : 'Add username'}</h3>

//                             <label>Username</label>
//                             <input
//                                 type="text"
//                                 value={newUsername}
//                                 onChange={(e) => setNewUsername(e.target.value)}
//                                 placeholder="Enter username"
//                             />

//                             {usernameError && <p className="error-text">{usernameError}</p>}

//                             <div className="modal-actions">
//                                 <button onClick={() => setShowUsernameModal(false)}>Cancel</button>
//                                 <button onClick={handleSetUsername} disabled={settingUsername}>
//                                     {settingUsername ? 'Saving...' : 'Save'}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 <div className="bottom-bar">
//                     <button className="nav-btn">⚙️<span>Settings</span></button>
//                     <button className="nav-btn">📩<span>Inbox</span></button>
//                     <button className="nav-btn">👥<span>Friends</span></button>
//                 </div>




//                 {/* <div className="glass-panel2">
//                 <h2 className="panel-title">Lobby</h2>
//                 <hr></hr>
//                 <div className="friend" >

//                     <p> <button>+</button> Nihal <span>online</span>      </p>
//                     <p> <button>+</button> Shlok  <span>online</span>     </p>
//                     <p> <button>+</button> Tanmay  <span>online</span>    </p>
//                     <p> <button>+</button> Dhangar <span>offline</span>    </p>
//                 </div>

//             </div> */}

//             </div>
//         </>
//     );
// }

// export default DashBoard;


// ─────────────────────────────────────────────────────────────
// DASHBOARD CHANGES
// ─────────────────────────────────────────────────────────────
// 1. Add className="dashboard-page" to the outer hero div so
//    Board.css desktop rules don't affect dashboard modals.
//
// 2. Add useEffect for Enter key per open modal.
//
// Paste this full Dashboard.jsx:
// ─────────────────────────────────────────────────────────────

import "./Dashboard.css";
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/api.js';
import { connectSocket } from "../Component/socket.js";
import ParliamentBackground from "../Component/ParliamentBackground.jsx";

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
            if (showFriendOption) {
                // Enter on friend option modal does nothing (two buttons, ambiguous)
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
    ]);

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
                    <button className="glass-btn sharp-btn" onClick={() => setShowFriendOption(true)}>👥 Play with Friends</button>
                </div>

                {showFriendOption && (
                    <div className="modal-overlay" onClick={() => setShowFriendOption(false)}>
                        <div className="modal-box friend-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>Play With Friends</h3>
                            <div className="friend-modal-buttons">
                                <button className="modal-btn create" onClick={() => { setShowFriendOption(false); setShowCreateModal(true); }}>
                                    🎯 Create Room
                                </button>
                                <button className="modal-btn join" onClick={() => { setShowFriendOption(false); setShowJoinModal(true); }}>
                                    🔗 Join Room
                                </button>
                            </div>
                            <button className="close-btn" onClick={() => setShowFriendOption(false)}>X</button>
                        </div>
                    </div>
                )}

                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                            <h3>Create Room</h3>
                            <label>No. of Players</label>
                            <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}>
                                {[2, 3, 4, 5, 6].map(num => <option key={num} value={num}>{num}</option>)}
                            </select>
                            <div className="modal-actions">
                                <button onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button disabled={creating} onClick={async () => {
                                    setCreating(true);
                                    await new Promise(res => setTimeout(res, 50));
                                    await handleCreateRoom();
                                }}>
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                            <p className="enter-hint">Press Enter to create</p>
                        </div>
                    </div>
                )}

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
                                <button onClick={() => setShowJoinModal(false)}>Cancel</button>
                                <button onClick={handleJoinRoom} disabled={joining}>
                                    {joining ? "Joining..." : "Join"}
                                </button>
                            </div>
                            <p className="enter-hint">Press Enter to join</p>
                        </div>
                    </div>
                )}

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

                <div className="bottom-bar">
                    <button className="nav-btn">⚙️<span>Settings</span></button>
                    <button className="nav-btn">📩<span>Inbox</span></button>
                    <button className="nav-btn">👥<span>Friends</span></button>
                </div>
            </div>
        </>
    );
};

export default DashBoard;