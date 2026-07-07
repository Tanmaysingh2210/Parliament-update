import express from "express";

import {
  joinQueue,
  cancelQueue,
  getQueueStatus
} from "../Controller/matchmakingController.js";

const router = express.Router();


// JOIN QUEUE
router.post("/join", joinQueue);


// CANCEL QUEUE
router.post("/cancel", cancelQueue);


// GET STATUS
router.get("/status", getQueueStatus);


export default router;