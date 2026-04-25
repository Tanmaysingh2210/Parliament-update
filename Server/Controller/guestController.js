import User from "../models/user.js";
import generateGuestUsername from "../utils/generateUsername.js";

export const createGuest = async (req, res) => {
    try {
        const username = generateGuestUsername();

        const user = await User.create({
            username,
            isGuest: true,
        });

        await new Promise((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });

        // store full user info in session (including guest flag)
        req.session.user = {
            id: user._id,
            username: user.username,
            isGuest: true
        };

        // ensure session is persisted before returning
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        user.sessionToken = req.session.user.id;
        await user.save();

        // respond with same shape as other auth endpoints
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                isGuest: true
            }
        });

    } catch (err) {
        console.error("Error creating guest:", err);
        res.status(500).json({
            success: false,
            message: "Error creating GuestUser",
            error: err.message
        });
    }
};
