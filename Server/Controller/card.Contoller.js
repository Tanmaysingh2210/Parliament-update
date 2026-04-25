import Cards from "../models/cards.js";
import express from "express";
const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const {
            name,
            price,
            category,
            weaponDamage,
            weaponCooldown,
            ShieldHp,
            position,
            isPurchasable,
        } = req.body;

        if (!name || !category ) return res.status(400).json({ message: "Fill all fields properly", success: false });

        const existed = await Cards.findOne({ name, category, isPurchasable , position });
        if (existed) return res.status(400).json({ message: "Already existed", success: false });
        await Cards.create({
            name,
            price,
            category,
            weaponDamage,
            weaponCooldown,
            ShieldHp,
            position,
            isPurchasable
        });

        res.status(200).json({ message: "Added sucessfully", success: true });

    } catch (err) {
        res.status(500).json({ message: "Error creating card", success: false, error: err.message });
        console.error(err);
    }
}
)

export default router;


