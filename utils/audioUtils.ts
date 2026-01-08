
export const audioUtils = {
  playNotification: () => {
    try {
      // Som Padrão: "Ping" suave
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  },
  playDriverUpdate: () => {
    try {
      // Som Prioritário: "Ding-ding" mais agudo para motoristas
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}
  },
  playAlert: () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }
};
