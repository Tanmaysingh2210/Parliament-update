import buttonSound from "../assets/button.mp3";

const audio = new Audio(buttonSound);

export const playClick = () => {
    audio.currentTime = 0;
    audio.volume = 0.6;
    audio.play().catch(err => console.log(err));
};