import { createContext, useContext, useState } from "react";


import agentCard from "../assets/weapons/agent.png";
import airStrikeCard from "../assets/weapons/air-strike.png";
import ballisticMissileCard from "../assets/weapons/ballistic-removedbg.png";
import brahmosCard from "../assets/weapons/brahmos.png";
import doubleBarrelCard from "../assets/weapons/double-barrel.png";
import dragonCanonCard from "../assets/weapons/dragonCannon-removedbg.png";
import emergencyMeetingCard from "../assets/weapons/emergency-meeting.png";
import engineerCard from "../assets/weapons/engineer.png";
import grenadeCard from "../assets/weapons/grenade.png";
import hammerCard from "../assets/weapons/hammer-removedbg.png";
import laserCard from "../assets/weapons/laser.png";
import machineGunCard from "../assets/weapons/machineGun.png";
import mineCard from "../assets/weapons/mine-removedbg.png";
import mysteryCard from "../assets/weapons/mystery-removedbg.png";
import nuclearWeaponCard from "../assets/weapons/nuclear-weapon.png";
import radiationZoneCard from "../assets/weapons/radiation-removedbg.png";
import revolverCard from "../assets/weapons/revolver.png";
import scientistCard from "../assets/weapons/scientist.png";
import shockWaveCard from "../assets/weapons/shock-wave.png";
import tankCard from "../assets/weapons/tank.png";
import terrorAttackCard from "../assets/weapons/terror-attack.png";
import timeBombCard from "../assets/weapons/timeBomb.png";
import torpedoCard from "../assets/weapons/torpedo-removedbg.png";
import tsunamiCard from "../assets/weapons/tsunami.png";
import safe from "../assets/weapons/safe.png";
import startCard from "../assets/weapons/start.png";
import emergencyMeeting from "../assets/weapons/emergency-meeting.png";
import wallSena from "../assets/weapons/wall-sina.png";
import wallMaria from "../assets/weapons/wall-maria.png";
import wallRose from "../assets/weapons/wall-rose.png";


export const cardMap = {
  "start": startCard,
  "double-barrel": doubleBarrelCard,

  "air-strike": airStrikeCard,
  "ballistic-missile": ballisticMissileCard,
  brahmos: brahmosCard,

  "dragon-cannon": dragonCanonCard,
  engineer: engineerCard,

  grenade: grenadeCard,
  hammer: hammerCard,
  laser: laserCard,
  "machine-gun": machineGunCard,
  "agent": agentCard,
  mine: mineCard,
  mystery: mysteryCard,

  "safe-zone": safe,

  "nuclear-attack": nuclearWeaponCard,
  "radiation-zone": radiationZoneCard,

  revolver: revolverCard,
  scientist: scientistCard,
  "shock-wave": shockWaveCard,

  tank: tankCard,
  "terrorist-attack": terrorAttackCard,
  "time-bomb": timeBombCard,


  "torpedo-attack": torpedoCard,
  "tsunami-attack": tsunamiCard,


  "emergency-meeting": emergencyMeeting,
  "wall-sena": wallSena,
  "wall-rose": wallRose,
  "wall-maria": wallMaria

};


const CardModalContext = createContext();

export const CardModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [card, setCard] = useState(null);
  const [purchasable, setPurchasable] = useState(false);
  const [cardName, setCardName]= useState("");

  const openCard = (cardImg, purchase, name) => {
    setCard(cardImg);
    setIsOpen(true);
    setPurchasable(purchase);
    setCardName(name);
  };

  const closeCard = () => {
    setIsOpen(false);
    setCard(null);
    setPurchasable(false);
    setCardName("");
  };

  return (
    <CardModalContext.Provider value={{ isOpen, card, openCard, closeCard, purchasable, cardName }}>
      {children}
    </CardModalContext.Provider>
  );
};

export const useCardModal = () => useContext(CardModalContext);
