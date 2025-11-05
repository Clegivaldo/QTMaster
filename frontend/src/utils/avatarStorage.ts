// Simulação de armazenamento permanente de avatar
// Em produção, isso seria uma API no servidor

const AVATAR_STORAGE_KEY = 'app_user_avatars';

interface AvatarData {
  [email: string]: string; // email -> base64 image
}

// Simula um "banco de dados" global de avatares
const getAvatarStorage = (): AvatarData => {
  try {
    const stored = localStorage.getItem(AVATAR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveAvatarStorage = (data: AvatarData): void => {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save avatar storage:', error);
  }
};

export const saveUserAvatar = (email: string, imageData: string): void => {
  const storage = getAvatarStorage();
  storage[email] = imageData;
  saveAvatarStorage(storage);
};

export const getUserAvatar = (email: string): string | null => {
  const storage = getAvatarStorage();
  return storage[email] || null;
};

export const removeUserAvatar = (email: string): void => {
  const storage = getAvatarStorage();
  delete storage[email];
  saveAvatarStorage(storage);
};