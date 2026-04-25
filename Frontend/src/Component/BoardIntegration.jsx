// 1. Add import at top of Board.jsx
import GameGuide from "./GameGuide.jsx";

// 2. Add state (near your other useState declarations)
const [showGuide, setShowGuide] = useState(true);

// 3. In your return, add GameGuide BEFORE the loading screen check:
//    (so it shows while images preload)

// Replace your existing return with this pattern:

return (
  <>
    {/* ── Game Guide (shows for 5s on first load, images preload behind it) ── */}
    {showGuide && <GameGuide onDone={() => setShowGuide(false)} />}

    {/* ── Loading spinner (only shows if guide is done but board not ready) ── */}
    {!showGuide && isLoading && (
      <div className="loading-screen">
        <div className="loader">
          <div className="spinner"></div>
          <p>Entering Battlefield...</p>
        </div>
      </div>
    )}

    {/* ── Main board (rendered in background even during guide so images load) ── */}
    <div style={{ visibility: showGuide || isLoading ? "hidden" : "visible" }}>
      {/* ... your entire existing board JSX here ... */}
    </div>
  </>
);

// NOTE: The board renders (hidden) behind the guide so all
// images, CSS, assets finish loading during the 5-second window.
// Once guide closes + isLoading becomes false, it becomes visible instantly.