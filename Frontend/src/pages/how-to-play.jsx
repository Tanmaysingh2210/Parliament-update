import { Helmet } from "react-helmet";
import "./howtoplay.css";

export default function HowToPlay() {
    return (
        <>
            <Helmet>
                <title>How to Play Parliament Game</title>
                <meta
                    name="description"
                    content="Learn how to play Parliament Game. A multiplayer strategy board game with weapons, bidding system, and tactical gameplay."
                />
            </Helmet>

            <div className="guide-container">
                <h1>How to Play Parliament Game</h1>

                <p>
                    Parliament Game is a multiplayer strategy board game for up to 6 players.
                    Players compete using smart moves, weapon bidding, and tactical planning
                    to reduce opponents' HP and survive till the end.
                </p>

                <h2>🎯 Objective of the Game</h2>
                <p>
                    The goal is to survive and defeat other players by reducing their
                    Parliament HP using weapons and strategic gameplay.
                </p>

                <h2>👥 Players</h2>
                <ul>
                    <li>Minimum players: 2</li>
                    <li>Maximum players: 6</li>
                </ul>

                <h2>🎮 Game Start</h2>
                <ul>
                    <li>All players start from the same starting position</li>
                    <li>The game begins when all players join</li>
                </ul>

                <h2>🎲 Gameplay</h2>
                <ul>
                    <li>Players take turns rolling the dice</li>
                    <li>Move forward based on dice value</li>
                    <li>Landing on tiles may trigger special actions</li>
                </ul>

                <h2>⚔️ Weapons & Bidding</h2>
                <ul>
                    <li>Some tiles contain weapons</li>
                    <li>Players can buy or bid to acquire weapons</li>
                    <li>Weapons help in attacking opponents</li>
                </ul>

                <h2>💥 Attacking Players</h2>
                <ul>
                    <li>If a player lands on another player</li>
                    <li>The opponent's Parliament HP is reduced</li>
                    <li>Weapons increase attack power</li>
                </ul>

                <h2>🃏 Special Cards</h2>
                <p>
                    The game includes 4 special emergency cards that can change the flow of
                    the game and provide strategic advantages.
                </p>
               
                <p>
                    The game includes powerful special cards that provide strategic advantages
                    during gameplay.
                </p>

                <ul>
                    <li>
                        <strong>Scientist Card:</strong> Increases weapon damage by 3%, making your
                        attacks more powerful.
                    </li>

                    <li>
                        <strong>Engineer Card:</strong> Increases the Parliament HP, helping you
                        survive longer in the game.
                    </li>

                    <li>
                        <strong>Agent Card:</strong> Reduces incoming damage by 50% on your next turn
                        if you land on an enemy tile.
                    </li>

                    <li>
                        <strong>Emergency Cards:</strong> Special game-changing cards that shuffle the player on board 
                        
                    </li>
                </ul>

                <h2>🛡️ Walls System</h2>
                <ul>
                    <li>Wall Maria</li>
                    <li>Wall Rose</li>
                    <li>Wall Sina</li>
                </ul>
                <p>
                    These walls act as defensive layers and add depth to the gameplay strategy.
                </p>

                <h2>💬 Chat Feature</h2>
                <p>
                    Players can communicate using the in-game chat to share strategies,
                    form plans, or interact during the match.
                </p>

                <h2>🏆 Winning the Game</h2>
                <p>
                    The last player remaining with Parliament HP wins the game.
                </p>

                <h2>💡 Strategy Tips</h2>
                <ul>
                    <li>Use weapons wisely</li>
                    <li>Plan your movement based on opponent positions</li>
                    <li>Use emergency cards at the right time</li>
                    <li>Coordinate using chat for better strategy</li>
                </ul>
            </div>
        </>
    );
}
