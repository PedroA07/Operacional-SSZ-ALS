
export const audioUtils = {
  playNotification: () => {
    try {
      // Som Suave: "Crystal Ping"
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.preload = 'auto';
      audio.volume = 0.3;
      const playPromise = audio.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    } catch (e) {}
  },
  playDriverUpdate: () => {
    try {
      // Som Discreto: "Pop soft"
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
      audio.preload = 'auto';
      audio.volume = 0.35;
      const playPromise = audio.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    } catch (e) {}
  },
  playAlert: () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3');
      audio.preload = 'auto';
      audio.volume = 0.25;
      const playPromise = audio.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    } catch (e) {}
  }
};
