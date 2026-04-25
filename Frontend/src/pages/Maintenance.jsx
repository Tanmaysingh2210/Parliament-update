import React from "react";

export default function Maintenance() {
  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes glow {
            0% { box-shadow: 0 0 10px #00f2ff; }
            50% { box-shadow: 0 0 25px #00f2ff; }
            100% { box-shadow: 0 0 10px #00f2ff; }
          }
        `}
      </style>

      <div style={styles.card}>
        <h1 style={styles.title}>🚧 Under Maintenance</h1>

        <p style={styles.text}>
          We're upgrading the battleground for a better experience ⚔️
          <br />
          Please come back soon.
        </p>

        <div style={styles.loader}></div>

        <p style={styles.footer}>
          Parliament Battleground
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    color: "white",
  },
  card: {
    textAlign: "center",
    padding: "40px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(12px)",
    animation: "glow 2s infinite",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "10px",
  },
  text: {
    opacity: 0.85,
    marginBottom: "20px",
  },
  footer: {
    marginTop: "20px",
    opacity: 0.6,
  },
  loader: {
    margin: "20px auto",
    width: "45px",
    height: "45px",
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid #00f2ff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};