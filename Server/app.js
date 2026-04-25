import express from "express";
import "dotenv/config";
import connectDB from "./config/db.js";
import cors from "cors";
import authRoute from "./route/authRoute.js";
import session from "express-session";
import gameRoute from "./route/gameRoute.js";
import cardController from "./Controller/card.Contoller.js";
import MongoStore from "connect-mongo";
import cron from "node-cron";

connectDB();
const app = express();
app.set('trust proxy', 1);
app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173',
  'https://parliamentbattle.aalsicoders.in',
  'https://parliamentbattle.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true
}));

const sessionMiddleWare = session({
  secret: process.env.Secret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.ATLAS_URI,
    collectionName: "sessions"
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production'? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});

app.get("/ping", (req, res) => {
  res.send("Server is alive")
})

cron.schedule("*/5 * * * *", async () => {
  try {
    await fetch("https://parliamentbackend.onrender.com/ping");
    console.log("self ping succesful");

  } catch (error) {
    console.log("ping failed", error.message);

  }
})


app.use(sessionMiddleWare);
app.use('/cards', cardController);

app.use('/auth', authRoute);
app.use('/friends', gameRoute);

export { sessionMiddleWare, app };