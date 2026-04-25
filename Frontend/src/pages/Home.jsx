import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import "./home.css";

export default function Home() {
    return (
        <>
            <Helmet>
                <title>Parliament Battle - Play Online Strategy Game</title>

                {/* ✅ Description (SEO BOOST) */}
                <meta
                    name="description"
                    content="Play Parliament Battle online - multiplayer strategy board game with real-time battles, weapons, and tactical gameplay. Play with friends now!"
                />

                {/* ✅ Keywords (SEO HELP) */}
                <meta
                    name="keywords"
                    content="online board game, multiplayer game, strategy game, play with friends, browser game india , parliament , PARLIAMENT , battlegroundboard game , multiplayer board game , CrazyGames , Poki , MSN ,online game free , free online game ,pubg ,king , bgmi , epic games "
                />

                <meta property="og:title" content="Parliament Battle Game" />
                <meta property="og:description" content="Play multiplayer strategy game online with friends." />
            </Helmet>

            <div className="home-container">
                <h1 className="title">Parliament Battle</h1>

                <p className="subtitle">
                    Play real-time strategy battles with friends. Use smart moves,
                    weapons, and tactics to defeat opponents.
                </p>

                <div className="buttons">
                    <Link to="/entry" className="btn primary">
                        Start Playing
                    </Link>

                    <Link to="/how-to-play" className="btn secondary">
                        How to Play
                    </Link>
                </div>

                <p className="cta-text">
                  No signup required. Play instantly with friends.
                </p>
            </div>
        </>
    );
}
