import mongoose from "mongoose";

const cardsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number },
    category: { type: String, required: true },
    weaponDamage: { type: Number }, // for weapons
    weaponCooldown: Number,
    ShieldHp: Number,
    position: { type: Number },
    isPurchasable: Boolean,
});



export default mongoose.model('cards', cardsSchema);
