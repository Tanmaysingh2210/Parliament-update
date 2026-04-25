import bcrypt from 'bcrypt';
import User from '../models/user.js';

export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const passHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passHash, isGuest: false });

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // include guest flag in session for accurate client-side checks
    req.session.user = { id: user._id, username: user.username, isGuest: user.isGuest };
    user.sessionToken = req.session.user.id;
    await user.save();

    return res.status(201).json({ success: true, user: { id: user._id, email: user.email, username: user.username, isGuest: user.isGuest } });
  } catch (err) {
    console.error('Signup error', err);
    return res.status(500).json({ success: false, message: 'Server error during signup', error: err.message });
  }
};

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !user.passHash) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passHash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // preserve isGuest flag in session
    req.session.user = { id: user._id, username: user.username, isGuest: user.isGuest };
    user.sessionToken = req.session.user.id;
    user.lastActive = Date.now();
    await user.save();

    return res.json({ success: true, user: { id: user._id, email: user.email, username: user.username, isGuest: user.isGuest } });
  } catch (err) {
    console.error('Signin error', err);
    return res.status(500).json({ success: false, message: 'Server error during signin', error: err.message });
  }
};

export const setUsername = async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const { username } = req.body;
    if (!username || username.length < 3) return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });

    // prevent duplicate usernames
    const existing = await User.findOne({ username });
    if (existing && existing._id.toString() !== req.session.user.id.toString()) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.username = username;
    if (user.isGuest) {
      user.isGuest = false; // converting guest -> registered username (if applicable)
      req.session.user.isGuest = false; // update session flag as well
    }
    await user.save();

    // keep session in sync
    req.session.user.username = user.username;

    return res.json({ success: true, user: { id: user._id, email: user.email, username: user.username, isGuest: user.isGuest } });
  } catch (err) {
    console.error('Set username error', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

export const signout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to destroy session' });
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
};
