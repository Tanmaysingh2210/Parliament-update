import React from 'react'
import './Board.css'
import './chatSystem.css';
import { useState, useEffect, useRef } from 'react'
import logo from "../assets/parliamentlogo.png";
import wallMaria from "../assets/wallMaria.png";
import wallSena from "../assets/wallSena.png";
import wallRose from "../assets/wallRose.png";
import emergency from "../assets/emergency.png";
import diceAudio from "../assets/diceAudio.mp3";
import whitePawn from "../assets/whitePawn.png";
import blackPawn from "../assets/blackPawn.png";
import yellowPawn from "../assets/yellowPawn.png";
import redPawn from "../assets/redPawn.png";
import greenPawn from "../assets/greenPawn.png";
import bluePawn from "../assets/bluePawn.png";
import mineIcon from "../assets/icons/mine.png";
import missileIcon from "../assets/icons/missile.png";
import radiationIcon from "../assets/icons/radiation.png";
import grenadeIcon from "../assets/icons/grenade.png";
import hammerIcon from "../assets/icons/hammer.png";
import mysteryIcon from "../assets/icons/mystery.png";
import scientistIcon from "../assets/icons/scientist.png";
import tankIcon from "../assets/icons/tank.png";
import laserIcon from "../assets/icons/lasergun.png";
import shockwaveIcon from "../assets/icons/shock.png";
import agentIcon from "../assets/icons/agent.png";
import engineerIcon from "../assets/icons/engineer.png";
import startIcon from "../assets/icons/flag.png";
import terroristIcon from "../assets/icons/terrorist.png";
import airStrikeIcon from "../assets/icons/air.png";
import nuclearAttackIcon from "../assets/icons/nuclear.png";
import canonIcon from "../assets/icons/canon.png";
import shotgunIcon from "../assets/icons/shotgun.png";
import revolverIcon from "../assets/icons/revolver.png";
import machineGunIcon from "../assets/icons/machinegun.png";
import tsunamiIcon from "../assets/icons/tsunami.png";
import timeBombIcon from "../assets/icons/time-bomb.png";
import torpedoIcon from "../assets/icons/torpedo.png";
import safeZoneIcon from "../assets/icons/safe-zone.png";
import brahmosIcon from "../assets/icons/brahmos.png";
import pawnMoveSound from "../assets/pawn.mp3";
import { useCardModal } from '../context/CardModalContext';
import { cardMap } from "../context/CardModalContext";
import CardModal from "../Component/CardModal";
import GameChatContainer from "../Component/gameChatSocket.jsx";
import { getSocket } from "../Component/socket";
import { useLocation, useNavigate } from "react-router-dom";
import emergencydefenceImg from "../assets/emergencydefence.png";
import moneyImg from "../assets/money.png"; // add if needed
import taxImg from "../assets/tax.png";
import foreignImg from "../assets/foreign.png";
import supportersImg from "../assets/supporters.png";
import donationImg from "../assets/donation.png";
import curruptionImg from "../assets/curruption.png";
import cyberattackImg from "../assets/cyberattack.png";
import warmoneyImg from "../assets/warmoney.png";
import bribeworkImg from "../assets/bribework.png";
import bribecaughtImg from "../assets/bribecaught.png";
import strikeImg from "../assets/strike.png";
import droneImg from "../assets/drone.png";
import { createPortal } from "react-dom";
import ConfirmModal from './ConfirmModal.jsx';
import MysticPurpleStorm from './MysticBackground.jsx';
import GameGuide from "./GameGuide.jsx";
import { enableWakeLock, disableWakeLock } from '../utils/wakeLock';
import { useVisibilityReconnect } from "./useVisibilityReconnect";


const Board = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const roomId = new URLSearchParams(location.search).get("room");
  const game = location.state?.game || null;

  const [showGuide, setShowGuide] = useState(true);
  const [guideManual, setGuideManual] = useState(false);
  const socket = useRef(null);
  const audioRef = useRef(null);
  const stepAudio = useRef(null);
  const myUserIdRef = useRef(null);
  const currentTurnRef = useRef(game?.currentTurn || null);
  const optimisticPlayersRef = useRef([]);
  const hasEmittedPlayTurn = useRef(false);
  const bidTimerRef = useRef(null);

  const [myUserId, setMyUserId] = useState(null);
  const [players, setPlayers] = useState(game?.players || []);
  const [optimisticPlayers, setOptimisticPlayers] = useState(game?.players || []);
  const [currentTurn, setCurrentTurn] = useState(game?.currentTurn || null);
  const [turnNo, setTurnNo] = useState(game?.turnNo || 1);
  const [sharedRolling, setSharedRolling] = useState(false);
  const [sharedDiceValue, setSharedDiceValue] = useState(1);
  const [mysteryCase, setMysteryCase] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  // const [agentActivatedPlayer, setAgentActivatedPlayer] = useState(null);
  const [hitEffect, setHitEffect] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // Buy modal — only the landing player sees this
  const [actionModal, setActionModal] = useState(null);
  // { card: { id, name, price }, playerCash }

  // Bid modal — ALL players see this
  const [bidModal, setBidModal] = useState(null);
  // { card: { id, name, price }, minBid, duration }
  const [bidAmount, setBidAmount] = useState("");
  const [bidTimeLeft, setBidTimeLeft] = useState(0);
  const [myBidSubmitted, setMyBidSubmitted] = useState(false);
  const [explodingTiles, setExplodingTiles] = useState([]);

  const [bidResult, setBidResult] = useState(null);
  // { winnerName, amount, cardName }
  const [activeMystery, setActiveMystery] = useState(null);
  const [tileSize, setTileSize] = useState({ w: 90, h: 70 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const showConfirm = (options) => setConfirm(options);
  const closeConfirm = () => setConfirm(null);

  const isRollingRef = useRef(false)
  const { openCard } = useCardModal();
  const [damageToast, setDamageToast] = useState(null);
  const pawnImg = { redPawn, blackPawn, greenPawn, bluePawn, yellowPawn, whitePawn };

  const size = 9;
  const maxHP = 1500;
  const maxShield = 750;

  const border = [];
  for (let i = size - 1; i >= 0; i--) border.push({ r: size - 1, c: i });
  for (let i = size - 2; i >= 0; i--) border.push({ r: i, c: 0 });
  for (let i = 1; i < size; i++)      border.push({ r: 0, c: i });
  for (let i = 1; i < size - 1; i++) border.push({ r: i, c: size - 1 });

  const tileData = [
    "Start", "Mine", "Mystery", "Radiation Zone", "Scientist",
    "Dragon Cannon", "Engineer", "Ballistic Missile", "Terrorist Attack",
    "Agent", "Tsunami Attack", "Mystery", "Revolver", "Engineer",
    "Time Bomb", "Air Strike", "safe-zone",
    "Hammer", "Double Barrel", "Mystery", "Scientist",
    "Torpedo Attack", "Brahmos", "Laser", "Shock Wave",
    "Agent", "Tank", "Machine Gun", "Mystery",
    "Engineer", "Grenade", "Nuclear Attack",
  ];

  const tileIcons = {
    "terrorist-attack": terroristIcon, "air-strike": airStrikeIcon,
    "nuclear-attack": nuclearAttackIcon, "mine": mineIcon,
    "ballistic-missile": missileIcon, "dragon-cannon": canonIcon,
    "radiation-zone": radiationIcon, "grenade": grenadeIcon,
    "hammer": hammerIcon, "mystery": mysteryIcon,
    "scientist": scientistIcon, "tank": tankIcon,
    "laser": laserIcon, "shock-wave": shockwaveIcon,
    "agent": agentIcon, "revolver": revolverIcon,
    "engineer": engineerIcon, "start": startIcon,
    "double-barrel": shotgunIcon, "tsunami-attack": tsunamiIcon,
    "machine-gun": machineGunIcon, "time-bomb": timeBombIcon,
    "torpedo-attack": torpedoIcon, "brahmos": brahmosIcon, "safe-zone": safeZoneIcon,
  };

  const ls = tileSize.w / 90; // layout scale ratio
  const tileLayouts = {
    1: [{ x: 0, y: 0, scale: 1 }],
    2: [{ x: -18 * ls, y: 0, scale: 0.85 }, { x: 18 * ls, y: 0, scale: 0.85 }],
    3: [{ x: 0, y: -18 * ls, scale: 0.8 }, { x: -18 * ls, y: 18 * ls, scale: 0.8 }, { x: 18 * ls, y: 18 * ls, scale: 0.8 }],
    4: [{ x: -18 * ls, y: -18 * ls, scale: 0.75 }, { x: 18 * ls, y: -18 * ls, scale: 0.75 }, { x: -18 * ls, y: 18 * ls, scale: 0.75 }, { x: 18 * ls, y: 18 * ls, scale: 0.75 }],
    5: [{ x: 0, y: -22 * ls, scale: 0.7 }, { x: -20 * ls, y: -5 * ls, scale: 0.7 }, { x: 20 * ls, y: -5 * ls, scale: 0.7 }, { x: -12 * ls, y: 18 * ls, scale: 0.7 }, { x: 12 * ls, y: 18 * ls, scale: 0.7 }],
    6: [{ x: -18 * ls, y: -18 * ls, scale: 0.65 }, { x: 18 * ls, y: -18 * ls, scale: 0.65 }, { x: -18 * ls, y: 0, scale: 0.65 }, { x: 18 * ls, y: 0, scale: 0.65 }, { x: -18 * ls, y: 18 * ls, scale: 0.65 }, { x: 18 * ls, y: 18 * ls, scale: 0.65 }],
  };


  const updateOptimisticPlayers = (val) => {
    optimisticPlayersRef.current = val;
    setOptimisticPlayers(val);
  };

  const getMysteryVisual = (statement) => {
    return mysteryVisuals[statement] || {
      image: mysteryIcon,
      color: "cyan",
    };
  };

  const mysteryVisuals = {
    "Emergency defence spending": {
      image: emergencydefenceImg,
      color: "red",
    },
    "Black Money Raid": {
      image: moneyImg,
      color: "gold",
    },
    "Cyber attack repair cost": {
      image: cyberattackImg,
      color: "purple",
    },
    "Tax from citizens": {
      image: taxImg,
      color: "gold",
    },
    "Foreign investment deal approved": {
      image: foreignImg,
      color: "purple",
    },
    "Received emergency funding from supporters": {
      image: supportersImg,
      color: "purple",
    },
    "Public rally success donation": {
      image: donationImg,
      color: "gold",
    },
    "Corruption investigation fine": {
      image: curruptionImg,
      color: "red",
    },
    "Printed War money": {
      image: warmoneyImg,
      color: "red",
    },
    "Bribe attempt works": {
      image: bribeworkImg,
      color: "green",
    },
    "Successful strike, looted enemy resources": {
      image: strikeImg,
      color: "purple",
    },
    "Defence Drone deployed": {
      image: droneImg,
      color: "red",
    },
    "Bribe attempt caught": {
      image: bribecaughtImg,
      color: "red",
    },
  };

  const sharedRollingRef = useRef(false);
  useEffect(() => {
    sharedRollingRef.current = sharedRolling;
  }, [sharedRolling]);


  useEffect(() => {
    if (game && players.length > 0) {
      setTimeout(() => {
        setIsLoading(false);
      }, 500); // smooth delay (important)
    }
  }, [game, players]);


  useEffect(() => {
    if (!currentTurn || !myUserId) return;

    if (sharedRolling) {
      if (autoRollTimerRef.current) clearInterval(autoRollTimerRef.current);
      setTurnTimeLeft(0);
      return;
    }

    if (autoRollTimerRef.current) clearInterval(autoRollTimerRef.current);
    setTurnTimeLeft(30);

    autoRollTimerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(autoRollTimerRef.current);

          // Only the current player emits — others just see 0
          // if (
          //   currentTurnRef.current?.toString() === myUserIdRef.current?.toString() &&
          //   !sharedRollingRef.current &&
          //   !actionModal &&   // these are fine here — this effect re-runs when they change
          //   !bidModal
          // ) {
          //   if (audioRef.current) {
          //     audioRef.current.currentTime = 0;
          //     audioRef.current.play().catch(() => { });
          //   }
          //   setSharedRolling(true);
          //   socket.current?.emit("rollDice", { gameCode: roomId, skippedChance: true });
          // }
          triggerAutoRoll();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (autoRollTimerRef.current) clearInterval(autoRollTimerRef.current);
    };

  }, [currentTurn, myUserId, sharedRolling]); // ← re-runs on turn change OR roll

  const animateMove = (steps, movingIndex) =>
    new Promise((resolve) => {
      let step = 0;
      const interval = setInterval(() => {
        if (stepAudio.current) {
          stepAudio.current.currentTime = 0;
          stepAudio.current.play().catch(() => { });
        }
        updateOptimisticPlayers(
          optimisticPlayersRef.current.map((p, idx) =>
            idx === movingIndex ? { ...p, position: (p.position + 1) % border.length } : p
          )
        );
        step++;
        if (step >= steps) { clearInterval(interval); resolve(); }
      }, 320);
    });

  const clearBidState = () => {
    setBidModal(null);
    setMyBidSubmitted(false);
    setBidAmount("");
    if (bidTimerRef.current) clearInterval(bidTimerRef.current);
  };



  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };


  const autoRollTimerRef = useRef(null);


  // const triggerAutoRoll = () => {
  //   // Guard: only fire if it's still my turn and not already rolling
  //   if (currentTurnRef.current?.toString() !== myUserIdRef.current?.toString()) return;


  //   if (sharedRolling || actionModal || bidModal) return;

  //   if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => { }); }
  //   setSharedRolling(true);
  //   socket.current.emit("rollDice", { gameCode: roomId, skippedChance: true }); // ← flag
  // };
  const triggerAutoRoll = () => {
    if (currentTurnRef.current?.toString() !== myUserIdRef.current?.toString()) return;

    if (
      sharedRollingRef.current ||
      actionModal ||
      bidModal ||
      isRollingRef.current
    ) return;

    isRollingRef.current = true;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => { });
    }

    setSharedRolling(true);

    socket.current.emit("rollDice", {
      gameCode: roomId,
      skippedChance: true
    });
  };


  // Add this function near your other handlers
  const handleQuit = () => {
    showConfirm({
      title: "Quit Game?",
      message: "You'll be marked inactive and returned to the dashboard.",
      variant: "danger",
      confirmText: "Quit",
      onConfirm: () => {
        // Disable wake lock when quitting
        disableWakeLock();
        socket.current?.emit("quitGame", { gameCode: roomId });
        navigate("/dashboard");
      },
    });
  };


  const actionTimerRef = useRef(null);
  const [actionTimeLeft, setActionTimeLeft] = useState(0);

  const clearActionTimer = () => {
    if (actionTimerRef.current) clearInterval(actionTimerRef.current);
    setActionTimeLeft(0);
  };

  const startActionTimer = (canBuy) => {
    clearActionTimer();
    if (!canBuy) return; // if they can't afford it, bid starts automatically anyway
    setActionTimeLeft(15);
    actionTimerRef.current = setInterval(() => {
      setActionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(actionTimerRef.current);
          handleStartBid();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  //hata dunga yadi kaam nhi kiya
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      if (vw < 480) setTileSize({ w: 36, h: 28 });
      else if (vw < 640) setTileSize({ w: 46, h: 36 });
      else if (vw < 900) setTileSize({ w: 58, h: 45 });
      else if (vw < 1200) setTileSize({ w: 72, h: 56 });
      else setTileSize({ w: 90, h: 70 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!game) return;

    socket.current = getSocket();
    if (!socket.current) return;

    audioRef.current = new Audio(diceAudio);
    audioRef.current.volume = 1.0;
    stepAudio.current = new Audio(pawnMoveSound);
    stepAudio.current.volume = 0.4;

    updateOptimisticPlayers(game.players);

    // Enable wake lock to keep screen awake during gameplay
    enableWakeLock();

    // identity
    socket.current.off("identity");
    socket.current.on("identity", ({ myUserId }) => {
      myUserIdRef.current = myUserId;
      setMyUserId(myUserId);

    });

    // Re-join room — also triggers identity emit from server
    socket.current.emit("joinLobby", { gameCode: roomId });


    socket.current.off("system");
    socket.current.on("system", ({ message, type }) => {
      showToast(message, type);
    });



    socket.current.off("error");
    socket.current.on("error", ({ message }) => {
      showToast(message, "error");
    });
    socket.current.off("diceResult");
    socket.current.on("diceResult", async ({ diceValue, rolledBy, players: updated }) => {
      // isRollingRef.current = false;
      setSharedDiceValue(diceValue);
      setSharedRolling(false);
      updateOptimisticPlayers(updated);

      const movingIndex = optimisticPlayersRef.current.findIndex(
        p => p.userId._id.toString() === rolledBy.toString()
      );
      if (movingIndex === -1) return;

      await animateMove(diceValue, movingIndex);

      if (rolledBy.toString() === myUserIdRef.current?.toString()) {
        if (hasEmittedPlayTurn.current) return;
        hasEmittedPlayTurn.current = true;
        socket.current.emit("playTurn", { gameCode: roomId });
      }
    });

    socket.current.off("diceRolling");
    socket.current.on("diceRolling", ({ rolledBy }) => {
      setSharedRolling(true);
    });

    socket.current.off("turnResult");
    socket.current.on("turnResult", ({ players: updated, currentTurn: nextTurn, turnNo: newTurnNo, mysteryCase: mc }) => {
      clearActionTimer();
      hasEmittedPlayTurn.current = false;
      isRollingRef.current = false;
      setPlayers(updated);
      updateOptimisticPlayers(updated);
      setCurrentTurn(nextTurn);
      currentTurnRef.current = nextTurn;
      setTurnNo(newTurnNo);
      if (mc) {
        setActiveMystery(mc);

        setTimeout(() => {
          setActiveMystery(null);
        }, 2000); // duration of animation
      }
      setTimeout(() => setMysteryCase(null), 3500);
      setActionModal(null);
      clearBidState();

      const activeAgent = updated.find(p => p.agent === true);

      // if (activeAgent) {
      //   // ✅ force new value every time
      //   setAgentActivatedPlayer(Date.now());

      //   // remove after 2 sec
      //   setTimeout(() => {
      //     setAgentActivatedPlayer(null);
      //   }, 2000);
      // }
      const prevPlayers = optimisticPlayersRef.current;

      updated.forEach((p) => {
        const prev = prevPlayers.find(x => x.userId._id === p.userId._id);

        if (!prev) return;

        // 🔥 detect HP drop
        if (p.remainingParliamentHp < prev.remainingParliamentHp) {
          setHitEffect(true);

          setTimeout(() => setHitEffect(false), 800);
        }
      });

    });

    socket.current.off("damageTaken");
    socket.current.on("damageTaken", ({ amount, cardName, shieldAbsorbed, attacker, victim }) => {
      setDamageToast({ amount, cardName, shieldAbsorbed, attacker, victim });
      setTimeout(() => {
        setDamageToast(null);
      }, 3500);
    })

    // boardUpdate — pawn moved but turn paused (buy/bid decision pending)
    socket.current.off("boardUpdate");
    socket.current.on("boardUpdate", ({ players: updated }) => {
      setPlayers(updated);
      updateOptimisticPlayers(updated);
    });

    socket.current.off("newPositions");
    socket.current.on("newPositions", ({ players: updated }) => {
      setPlayers(updated);
      updateOptimisticPlayers(updated);
    });

    socket.current.off("actionRequired");
    socket.current.on("actionRequired", ({ card, playerCash }) => {
      setActionModal({ card, playerCash });
      startActionTimer(playerCash >= card.price);
    });

    socket.current.off("bidStarted");
    socket.current.on("bidStarted", ({ card, minBid, duration }) => {
      setActionModal(null); // close buy modal for the landing player
      setMyBidSubmitted(false);
      setBidAmount(String(minBid));
      setBidModal({ card, minBid, duration });
      setBidTimeLeft(duration);

      if (bidTimerRef.current) clearInterval(bidTimerRef.current);
      bidTimerRef.current = setInterval(() => {
        setBidTimeLeft(prev => {
          if (prev <= 1) { clearInterval(bidTimerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    });

    // bidResult — server tells everyone who won
    socket.current.off("bidResult");
    socket.current.on("bidResult", ({ winnerName, amount, cardName, players: updated }) => {
      clearBidState();
      if (updated) { setPlayers(updated); updateOptimisticPlayers(updated); }
      setBidResult({ winnerName, amount, cardName });
      setTimeout(() => setBidResult(null), 3500);
    });

    socket.current.off("gameOver");
    socket.current.on("gameOver", ({ winner, players: final }) => {
      setPlayers(final);
      updateOptimisticPlayers(final);
      setGameOver({ winner });
      // Disable wake lock when game ends
      disableWakeLock();
    });

    socket.current.off("timebombExploded");
    socket.current.on("timebombExploded", ({ position, casualties, nextBlastInTurns }) => {
      runTimeBombAnimation(position);
    });

    // Handle tab visibility changes — re-enable wake lock when tab becomes visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        console.log("Tab visible — re-enabling wake lock");
        await enableWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socket.current.off("identity");
      socket.current.off("error");
      socket.current.off("diceResult");
      socket.current.off("turnResult");
      socket.current.off("boardUpdate");
      socket.current.off("actionRequired");
      socket.current.off("bidStarted");
      socket.current.off("bidResult");
      socket.current.off("system");
      socket.current.off("diceRolling");
      socket.current.off("gameOver");
      socket.current.off("timebombExploded");
      socket.current.off("newPositions");
      socket.current.off("damageTaken");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Disable wake lock when leaving the board
      disableWakeLock();
      if (autoRollTimerRef.current) {
        clearInterval(autoRollTimerRef.current);
        autoRollTimerRef.current = null;
      }
      if (bidTimerRef.current) clearInterval(bidTimerRef.current);
      if (actionTimerRef.current) clearInterval(actionTimerRef.current);
    };
  }, []);

  useVisibilityReconnect({
    socket,        // your existing socket ref
    roomId,        // your existing roomId
    onResynced: () => {
      // Reset local guards that may be stuck
      hasEmittedPlayTurn.current = false;
      isRollingRef.current = false;
      setSharedRolling(false);
      clearBidState();
      clearActionTimer();
    },
  });


  useEffect(() => {
    Object.values(cardMap).forEach((src) => {
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  }, []);

  const TOTAL_TILES = 32;

  const runTimeBombAnimation = async (center) => {
    const delays = [300, 400, 550, 700]; // increasing delay
    // Step 1 → center blast
    setExplodingTiles([center]);
    await new Promise(res => setTimeout(res, delays[0]));

    // Step 2 → pairs
    for (let step = 1; step <= 3; step++) {
      const pos1 = (center + step + TOTAL_TILES) % TOTAL_TILES;
      const pos2 = (center - step + TOTAL_TILES) % TOTAL_TILES;

      // BOTH explode together
      setExplodingTiles([pos1, pos2]);

      await new Promise(res => setTimeout(res, delays[step]));
    }

    // Clear after animation
    setTimeout(() => setExplodingTiles([]), 800);
  };


  const rollDice = () => {
    if (currentTurnRef.current?.toString() !== myUserIdRef.current?.toString()) return;
    if (sharedRolling || actionModal || bidModal || isRollingRef.current) return;

    isRollingRef.current = true;
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => { }); }
    setSharedRolling(true);
    socket.current.emit("rollDice", { gameCode: roomId, skippedChance: false });
  };

  // Direct buy — full price, no auction
  const handleBuy = () => {
    clearActionTimer();
    socket.current.emit("playerAction", { gameCode: roomId, action: "buy" });
    setActionModal(null);
    hasEmittedPlayTurn.current = false;
  };

  // Start bid — triggers bidStarted for all players
  const handleStartBid = () => {
    clearActionTimer();
    socket.current.emit("playerAction", { gameCode: roomId, action: "bid" });
    setActionModal(null);
    // bidStarted will open bid modal for everyone
  };

  // Submit bid amount during active auction
  const handleSubmitBid = () => {
    const amount = parseInt(bidAmount);
    if (!amount || amount < bidModal.minBid) return;
    const myPlayer = optimisticPlayers.find(p => p.userId._id?.toString() === myUserIdRef.current?.toString());
    if (!myPlayer || myPlayer.cashRemaining < amount) return;
    socket.current.emit("submitBid", { gameCode: roomId, amount });
    setMyBidSubmitted(true);
  };

  const isMyTurn = currentTurn?.toString() === myUserId?.toString();
  const myPlayer = optimisticPlayers.find(p => p.userId._id?.toString() === myUserId?.toString());
  const isDiceDisabled =
    !isMyTurn ||
    sharedRolling ||
    actionModal ||
    bidModal ||
    isRollingRef.current;

  const getPawnColor = (pawn) => {
    const map = {
      redPawn: "red",
      bluePawn: "pink",
      greenPawn: "green",
      yellowPawn: "yellow",
      blackPawn: "orange",
      whitePawn: "white",
    };
    return map[pawn] || "#888";
  };
  const getDirectionClass = (i) => {
    const total = 32;

    if (i >= 0 && i < 8) return "top";      // bottom row
    if (i >= 8 && i < 16) return "left";       // left side
    if (i >= 16 && i < 24) return "top";       // top row
    return "right";                            // right side
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loader">
          <div className="spinner"></div>
          <p>Entering Battlefield...</p>
        </div>
      </div>
    );
  }

  return (

    <>
      {showGuide && (
        <GameGuide
          manualOpen={guideManual}
          onDone={() => { setShowGuide(false); setGuideManual(false); }}
        />
      )}

      {!showGuide && isLoading && (
        <div className="loading-screen">
          <div className="loader">
            <div className="spinner"></div>
            <p>Entering Battlefield...</p>
          </div>
        </div>
      )}

      <div style={{ visibility: showGuide || isLoading ? "hidden" : "visible" }}>

        {/* {damageToast && (
        <div className="attack-toast">
          ⚔️ <b>{damageToast.attacker}</b> attacked <b>{damageToast.victim}</b> using{" "}
          <span className="weapon">{damageToast.cardName}</span>
          <br />
          💥 Damage: {damageToast.amount}
          {damageToast.shieldAbsorbed && " (shield absorbed)"}
        </div>
      )} */}


        <div className="hero2 min-h-screen bg-gradient-to-br from-indigo-950 to-black p-6">
          <MysticPurpleStorm />


          {/* ── Quit Button ── */}
          <div className="quit-guide-combine">
            <div className="seperator">
              <button className="quit-btn" onClick={handleQuit}>
                <span className="quit-icon">✕</span>
                <span className="quit-text">Quit</span>
              </button>
              <button className="guide-open-btn" onClick={() => { setGuideManual(true); setShowGuide(true); }} title="Game Guide">
                📖
              </button>
            </div>
            {/* ── Turn Indicator ── */}
            <div className="turn-indicator">
              {/* Countdown ring */}
              {turnTimeLeft > 0 && (
                <div className={`turn-ring ${turnTimeLeft <= 10 ? "urgent" : isMyTurn ? "active" : "idle"}`}>
                  <span>{turnTimeLeft}s</span>
                </div>
              )}

              <div className="turn-divider" />

              <div className="turn-section">
                <span className="turn-label">STATUS</span>
                <span className={`turn-value ${isMyTurn ? "my-turn" : "waiting"}`}>
                  {isMyTurn ? "Your Turn" : "Waiting..."}
                </span>
              </div>

              <div className="turn-divider" />

              <div className="turn-section" style={{ alignItems: "flex-end" }}>
                <span className="turn-label">TURN</span>
                <span className="turn-value">#{turnNo}</span>
              </div>
            </div>
          </div>

          <CardModal showConfirm={showConfirm} socket={socket.current} roomId={roomId} myUserIdRef={myUserIdRef} currentTurnRef={currentTurnRef.current} />
          {/* <GameChatContainer players={players} /> */}

          <ConfirmModal
            isOpen={!!confirm}
            title={confirm?.title}
            message={confirm?.message}
            variant={confirm?.variant || "danger"}
            confirmText={confirm?.confirmText || "Confirm"}
            onConfirm={() => { confirm?.onConfirm?.(); closeConfirm(); }}
            onCancel={closeConfirm}
          />


          {/* {activeMystery && createPortal(
          <div className="mystery-overlay">
            <div className="mystery-card">
              <img
                src={getMysteryVisual(activeMystery.statement).image}
                className="mystery-img"
              />

              <h2 className="mystery-title">
                {activeMystery.statement}
              </h2>

              <p className="mystery-amount">
                {activeMystery.amount > 0 ? "+" : ""}
                {activeMystery.amount}
              </p>
            </div>
          </div>,
          document.body
        )} */}



          {/* {gameOver && createPortal(
            <div className="gameover-overlay">
              <div className="gameover-modal">
                <h2>Game Over</h2>

                <p>
                  Winner:{" "}
                  {
                    optimisticPlayers.find(
                      p => p.userId._id?.toString() === gameOver.winner?.toString()
                    )?.userId?.username || "Unknown"
                  }
                </p>

                <button onClick={() => navigate("/dashboard")}>
                  Back to Home
                </button>
              </div>
            </div>,
            document.getElementById("modal-root") // 🔥 SAME ROOT
          )} */}
          {gameOver && createPortal(
            <div className="gameover-overlay">
              <div className="gameover-modal">
                <span className="gameover-crown">👑</span>
                <p className="gameover-sublabel">Victory Declared</p>
                <h2>Game Over</h2>
                <div className="gameover-divider" />

                <div className="gameover-winner-box">
                  <p className="gameover-winner-label">Winner</p>
                  <p className="gameover-winner-name">
                    {optimisticPlayers.find(
                      p => p.userId._id?.toString() === gameOver.winner?.toString()
                    )?.userId?.username || "Unknown"}
                  </p>
                </div>

                <div className="gameover-stats">
                  {(() => {
                    const winner = optimisticPlayers.find(
                      p => p.userId._id?.toString() === gameOver.winner?.toString()
                    );
                    return (<>
                      <div className="gameover-stat">
                        <div className="gameover-stat-val green">{winner?.remainingParliamentHp ?? "—"}</div>
                        <div className="gameover-stat-label">Final HP</div>
                      </div>
                      <div className="gameover-stat">
                        <div className="gameover-stat-val blue">{turnNo}</div>
                        <div className="gameover-stat-label">Turns</div>
                      </div>
                      <div className="gameover-stat">
                        <div className="gameover-stat-val gold">₹{winner?.cashRemaining ?? "—"}</div>
                        <div className="gameover-stat-label">Cash Left</div>
                      </div>
                    </>);
                  })()}
                </div>

                <div className="gameover-actions">
                  <button className="gameover-btn-main" onClick={() => navigate("/dashboard")}>
                    🏠 Back to Home
                  </button>
                </div>

                <div className="gameover-elim-section">
                  <p className="gameover-elim-title">Eliminated Players</p>
                  {optimisticPlayers
                    .filter(p => p.userId._id?.toString() !== gameOver.winner?.toString())
                    .map((p, i) => (
                      <div key={i} className="gameover-elim-row">
                        <span>
                          <span className="gameover-rank">{i + 2}</span>
                          <span className="gameover-elim-dot" style={{ background: getPawnColor(p.pawn) }} />
                          {p.userId.username}
                        </span>
                        <span style={{ color: "rgba(248,113,113,0.55)", fontSize: 12 }}>0 HP</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>,
            document.getElementById("modal-root")
          )}

          {actionModal && actionModal.card && isMyTurn && (
            <div className="modal-overlay">
              <div className="buy-modal-premium">
                <div className="modal-glow"></div>

                <div className="modal-card-preview">
                  <img
                    src={cardMap[actionModal.card.name.toLowerCase().replace(/\s+/g, "-")]}
                    className="modal-card-img"
                    alt={actionModal.card.name}
                  />
                  <div className="modal-card-info">
                    <h3 className="modal-title">{actionModal.card.name}</h3>
                    <p className="modal-subtext">Unowned Weapon</p>
                    <div className="modal-stat">
                      <span className="stat-label">💰 Price</span>
                      <span className="stat-value price">₹{actionModal.card.price}</span>
                    </div>
                    {actionModal.card.weaponDamage > 0 && (
                      <div className="modal-stat">
                        <span className="stat-label">💥 Damage</span>
                        <span className="stat-value damage">{actionModal.card.weaponDamage} HP</span>
                      </div>
                    )}
                    <div className="modal-stat">
                      <span className="stat-label">🪙 Your Cash</span>
                      <span className="stat-value cash">₹{actionModal.playerCash}</span>
                    </div>
                  </div>
                </div>

                {actionTimeLeft > 0 && (
                  <div className="action-timer">
                    <div className="action-timer-bar" style={{ width: `${(actionTimeLeft / 15) * 100}%` }} />
                    <span className={`action-timer-text ${actionTimeLeft <= 5 ? "urgent" : ""}`}>
                      Auto-auction in {actionTimeLeft}s
                    </span>
                  </div>
                )}

                <div className="modal-actions">
                  {actionModal.playerCash >= actionModal.card.price && (
                    <button className="buy-btn" onClick={handleBuy}>Buy Now</button>
                  )}
                  <button className="bid-btn" onClick={handleStartBid}>🔨 Auction</button>
                </div>
              </div>
            </div>
          )}


          {damageToast && (
            <div className="damage-toast">
              <div className="damage-toast-icon">💥</div>
              <div className="damage-toast-body">
                <span className="damage-toast-card">
                  ⚔️ <b>{damageToast.attacker || "System"}</b> attacked{" "}
                  <b>{damageToast.victim || "Player"}</b> using{" "}
                  <span className="weapon">{damageToast.cardName}</span>
                </span>
                <span className="damage-toast-amount">−{damageToast.amount} HP</span>
                <span className="damage-toast-sub">
                  {damageToast.shieldAbsorbed ? "Shield absorbed damage" : "Parliament HP reduced"}
                </span>
              </div>
            </div>
          )}

          {toast && (
            <div className={`wall-toast ${toast.type}`}>
              <span className="toast-icon">
                {toast.type === "success" ? "✅" : "❌"}
              </span>
              <span className="toast-message">{toast.message}</span>
            </div>
          )}


          {bidModal && bidModal.card && myPlayer?.isActive && (
            <div className="bid-overlay">
              <div className="bid-modal-premium">

                {/* Header */}
                <div className="bid-header">
                  <h3 className="bid-title"> {bidModal.card.name}</h3>
                  <span className={`bid-timer ${bidTimeLeft <= 5 ? "danger" : ""}`}>
                    {bidTimeLeft}s
                  </span>
                </div>

                {/* Info */}
                <p className="bid-info">
                  Min bid: <span className="highlight">₹{bidModal.minBid}</span>
                  {" · "}
                  Your cash: <span className="cash">₹{myPlayer?.cashRemaining ?? 0}</span>
                </p>

                {/* Card preview — add this right after the bid-header div */}
                <div className="bid-card-preview">
                  <img
                    src={cardMap[bidModal.card.name.toLowerCase().replace(/\s+/g, "-")]}
                    className="bid-card-img"
                    alt={bidModal.card.name}
                  />
                  <div className="bid-card-stats">
                    <div className="bid-stat">
                      <span>💰 Price</span>
                      <span className="highlight">₹{bidModal.card.price}</span>
                    </div>
                    {bidModal.card.weaponDamage > 0 && (
                      <div className="bid-stat">
                        <span>💥 Damage</span>
                        <span style={{ color: "#f87171", fontWeight: "bold" }}>{bidModal.card.weaponDamage} HP</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input */}
                {!myBidSubmitted ? (
                  <>
                    <input
                      type="number"
                      min={bidModal.minBid}
                      max={myPlayer?.cashRemaining ?? 0}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      className="bid-input"
                      placeholder={`Min ₹${bidModal.minBid}`}
                    />

                    <div className="bid-actions">
                      <button
                        className="bid-btn-main"
                        disabled={
                          !bidAmount ||
                          Number(bidAmount) < bidModal.minBid ||
                          Number(bidAmount) > (myPlayer?.cashRemaining ?? 0)
                        }
                        onClick={handleSubmitBid}
                      >
                        Place Bid
                      </button>

                      <button
                        className="pass-btn"
                        onClick={() => setMyBidSubmitted(true)}
                      >
                        Pass
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="waiting-text">✅ Waiting for others...</p>
                )}

                {/* Players */}
                <div className="bid-players">
                  <p className="players-title">Players:</p>

                  {optimisticPlayers.filter(p => p.isActive).map((p, i) => (
                    <div key={i} className="bid-player">
                      <span className="cash">{p.userId.username}</span>
                      <span className="cash">₹{p.cashRemaining}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {bidResult && (
            <div className="bid-result-toast">

              <div className="result-glow"></div>

              <p className="result-title">
                🏆 {bidResult.winnerName} won {bidResult.cardName}
              </p>

              <p className="result-amount">
                ₹{bidResult.amount}
              </p>

            </div>
          )}





          {/* ── Board ── */}
          <div className="board-wrapper">
            <div className="bg-transparent p-6 rounded-3xl shadow-2xl">
              <div className="nice grid gap-2 bg-transparent p-4 rounded-2xl"
                // style={{ gridTemplateColumns: `repeat(${size}, 90px)`, gridTemplateRows: `repeat(${size}, 70px)` }}
                style={{ gridTemplateColumns: `repeat(${size}, ${tileSize.w}px)`, gridTemplateRows: `repeat(${size}, ${tileSize.h}px)` }}
              >
                {border.map((cell, i) => {
                  const tilePlayers = optimisticPlayers.filter(p => p.position === i);
                  const layout = tileLayouts[Math.min(tilePlayers.length, 6)] || tileLayouts[6];
                  const key = tileData[i].toLowerCase().replace(/\s+/g, "-");
                  return (
                    <div key={i}
                      className={`border-cell weapon-tile ${tileData[i].toLowerCase().replace(/\s+/g, '-')}  ${explodingTiles.includes(i) ? 'bomb-exploding' : ''}`}
                      style={{ gridRow: cell.r + 1, gridColumn: cell.c + 1 }}
                      onClick={() => openCard(cardMap[key], false, key)}
                    >
                      <div className="ownership-container">
                        {optimisticPlayers.flatMap((player) =>
                          player.cards.map((cardObj, idx) => {
                            const card = cardObj.cardId;
                            if (!card) return null;

                            if (card.position === i) {
                              return (
                                <div
                                  key={player.userId._id + idx}
                                  className={`flag ${getDirectionClass(i)}`}
                                >
                                  <div className="flag-pole"></div>
                                  <div
                                    className="flag-cloth"
                                    style={{ backgroundColor: getPawnColor(player.pawn) }}
                                  ></div>
                                </div>
                              );
                            }

                            return null;
                          })
                        )}
                      </div>
                      {tileIcons[key] && <img className="tile-icon" src={tileIcons[key]} alt={tileData[i]} />}
                      <div className="tile-label">{tileData[i]}</div>
                      {tilePlayers.map((player, idx) => {
                        const slot = layout[idx];
                        if (player.isActive) {
                          return (
                            <img key={player._id} src={pawnImg[player.pawn]} className="player-token"
                              style={{ transform: `translate(${slot.x}px, ${slot.y}px) scale(${slot.scale})` }}
                            />
                          );
                        }
                      })}
                    </div>
                  );
                })}

                {/* Center */}
                <div className="bg-transparent center-area backdrop-blur-sm rounded-2xl"
                  style={{ gridRow: "2 / span 7", gridColumn: "2 / span 7" }}
                >

                  {activeMystery && (
                    <div className="mystery-inline-overlay">
                      <div className="mystery-inline-card">
                        <img
                          src={getMysteryVisual(activeMystery.statement).image}
                          className="mystery-inline-img"
                          alt=""
                        />
                        <p className="mystery-inline-title">{activeMystery.statement}</p>
                        <p className="mystery-inline-amount">
                          {activeMystery.amount > 0 ? "+" : ""}{activeMystery.amount}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className={`center-grid players-${optimisticPlayers.length}`}>
                    {optimisticPlayers.map((player, i) => {
                      const hp = player.remainingParliamentHp;
                      const shield = player.remainingShieldHp;
                      const hpPct = (hp / maxHP) * 100;
                      const shPct = (shield / maxShield) * 100;
                      const isThisTurn = currentTurn?.toString() === player.userId._id?.toString();
                      return (
                        <div key={i} className={`player-cell ${hp <= 300 ? "low" : ""} ${isThisTurn ? "active-turn" : ""}`}>
                          <div className={`image-parent ${hitEffect ? "parliament-hit" : ""}`}>

                            <div className="name">
                              <span className={player.pawn}>{player.userId.username}</span>
                              {isThisTurn && <span className="text-xs text-green-400 ml-1">▶</span>}
                            </div>
                            <img src={logo} className="parl" alt={player.userId.username} />
                            <div className={`hp-bar ${hpPct <= 30 ? "low" : ""}`}>
                              <div className="hp-fill" style={{ width: `${hpPct}%` }} />
                              <span className="hp-text">{hp} / {maxHP}</span>
                            </div>
                            <div className="shield-bar">
                              <div className="shield-fill" style={{ width: `${shPct}%` }} />
                              <span className="shield-text">{shield} / {maxShield}</span>
                            </div>
                            <div className="skip-dots">
                              {[2, 1, 0].map((i) => (
                                <span
                                  key={i}
                                  className={`dot ${i < (player.skippedChances || 0) ? "used" : "available"}`}
                                />
                              ))}
                            </div>
                            <div className="money-scientist">
                              <div className="text-xs text-yellow-400 mt-1 money-tag cash-tag">₹{player.cashRemaining}</div>
                              <div className="money-tag sceintist-tag">scientist-card:{player.scientist}</div>
                            </div>
                            <div className="flex gap-1 mt-1 justify-center flex-wrap">
                              {player.agent && <span className="text-xs bg-blue-800 text-blue-200 px-1 rounded">Agent</span>}
                              {player.scientist > 0 && <span className="text-xs bg-purple-800 text-purple-200 px-1 rounded">Sci ×{player.scientist}</span>}
                              {!player.isActive && <span className="text-xs bg-red-900 text-red-300 px-1 rounded">Eliminated</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="right-container">
            <div className="right-grid">
              {[
                { key: "emergency-meeting", img: emergency },
                { key: "wall-sena", img: wallSena },
                { key: "wall-maria", img: wallMaria },
                { key: "wall-rose", img: wallRose },
              ].map((item, i) => (
                <div key={i} className="right-cell" onClick={() => openCard(cardMap[item.key], true, item.key)}>
                  <img src={item.img} alt={item.key} />
                </div>
              ))}
            </div>

            <div
              className={`dice-container ${sharedRolling ? "rolling" : "pop"} ${!isMyTurn || actionModal || bidModal ? "opacity-40 pointer-events-none" : ""}`}
              onClick={!isDiceDisabled ? rollDice : null}
            >
              <div className="dice-display">
                <div className={`dice-face face-${sharedDiceValue}`}>
                  {[...Array(9)].map((_, i) => <span key={i} className="pip" />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Drawer */}
        <div className={`chat-drawer ${isChatOpen ? 'open' : ''} ${bidModal ? 'bid-active' : ''}`}>
          <GameChatContainer players={players} />
        </div>
        <button
          className="chat-toggle-btn"
          onClick={() => setIsChatOpen(p => !p)}
        >
          {isChatOpen ? '✕' : '💬'}
        </button>
      </div>

    </>


  );
};

export default Board;