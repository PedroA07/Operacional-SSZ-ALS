
export const audioUtils = {
  playNotification: () => {
    try {
      // Som de "Ping" suave e profissional
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.warn("Interação necessária para som"));
    } catch (e) {}
  },
  playAlert: () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(e => console.warn("Interação necessária para som"));
    } catch (e) {}
  }
};
