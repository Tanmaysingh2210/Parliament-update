import "./EntryPage.css";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";


export default function EntryPage() {
    
    const [loading, setLoading] = useState(false);

    const { handleGuest } = useAuth();
    const navigate = useNavigate();


    return (
        <>

            {loading && (
                <div className="entry-loading">
                    <div className="entry-spinner"></div>
                    <p>Entering Battlefield...</p>
                </div>
            )}
            <div className="entry-container">
                <div className="entry-card">
                    <h1 className="entry-title">PARLIAMENT BATTLEGROUND</h1>
                    <p className="entry-subtitle">Choose how you want to enter</p>

                    <button className="entry-btn guest"
                        disabled={loading}
                        onClick={async () => {
                            setLoading(true);

                            // 🔥 allow UI to update
                            await new Promise(res => setTimeout(res, 50));

                            await handleGuest();
                        }}>{loading ? "Entering..." : "Continue as Guest"}</button>
                    <button className="entry-btn login" onClick={() => navigate("/login")}>
                        Login
                    </button>
                    <button className="entry-btn signup" onClick={() => navigate("/signup")}>
                        Sign Up
                    </button>
                </div>
            </div>
        </>
    )
}