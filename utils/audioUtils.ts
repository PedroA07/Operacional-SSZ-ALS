
export const audioUtils = {
  playNotification: () => {
    try {
      // Som Padrão: "Ping" suave e estável
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.preload = 'auto';
      audio.volume = 0.45;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.warn("Audio: Bloqueado pelo navegador. Interação necessária.");
        });
      }
    } catch (e) {}
  },
  playDriverUpdate: () => {
    try {
      // Som Prioritário: "Ding-ding" agudo para motoristas
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.preload = 'auto';
      audio.volume = 0.55;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch (e) {}
  },
  playAlert: () => {
    try {
      // Alerta crítico
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3');
      audio.preload = 'auto';
      audio.volume = 0.4;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch (e) {}
  }
};
