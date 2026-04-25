import { createGuest } from "../Controller/guestController.js";
import express from "express";
import { signup, signin, setUsername, signout } from "../Controller/authController.js";

const router = express.Router();

router.get('/guest', createGuest);

router.post('/signup', signup);

router.post('/signin', signin);

router.post('/username', setUsername);

router.post('/signout', signout);

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false });
  }

  // return whatever is stored in session including isGuest flag
  res.json({
    success: true,
    user: req.session.user
  });
});

export default router;