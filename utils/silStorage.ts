
export const silStorage = {
  saveSession: (username: string, password: string) => {
    const data = {
      username,
      password,
      connectedAt: new Date().toISOString(),
      isActive: true
    };
    localStorage.setItem('als_sil_session', JSON.stringify(data));
  },
  
  getSession: () => {
    const session = localStorage.getItem('als_sil_session');
    if (!session) return null;
    return JSON.parse(session);
  },
  
  clearSession: () => {
    localStorage.removeItem('als_sil_session');
  }
};
