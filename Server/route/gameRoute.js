import express from "express";
import { createRoom, joinRoom } from "../Controller/gameController.js";

const router = express.Router();

router.post('/create', createRoom);
router.post('/join', joinRoom);

export default router;