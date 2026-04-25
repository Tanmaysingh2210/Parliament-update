import { useCardModal } from "../context/CardModalContext";
import './CardModal.css'
const CardModal = ({ showConfirm, socket, roomId, myUserIdRef, currentTurnRef }) => {
  const { isOpen, card, closeCard, purchasable, cardName } = useCardModal();
  const handleCardClick = (e) => {
    e.preventDefault();
    if (!purchasable) return;
    if (currentTurnRef?.toString() !== myUserIdRef.current?.toString()) return;

    showConfirm({
      title: "Confirm Purchase",
      message: `Buy ${cardName.replace(/-/g, " ")}?`,
      variant: "success",
      confirmText: "Buy",
      onConfirm: () => {
        if (cardName === "emergency-meeting") {
          socket.emit("emergency-meeting", { gameCode: roomId });
        } else if (["wall-maria", "wall-rose", "wall-sena"].includes(cardName)) {
          socket.emit("wall-purchase", { gameCode: roomId, cardName });
        }
        closeCard();
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="card-overlay" onClick={closeCard}>

      <div className="card-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* ❌ Close Button */}
        <button
          className="close-btn"
          onClick={(e) => {
            e.stopPropagation();
            closeCard();
          }}
        >
          ✖
        </button>

        <img
          className="card-image"
          src={card}
          alt="card"
        />
        <button onClick={handleCardClick} className={purchasable ? 'show' : 'not-show'}>
          Buy
        </button>


      </div>
    </div>
  );
};

export default CardModal;
