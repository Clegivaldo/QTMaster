import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from './AuthContext';

interface AvatarContextType {
  avatarUrl: string | null;
  updateAvatar: (newAvatarUrl: string) => void;
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

interface AvatarProviderProps {
  children: ReactNode;
}

export const AvatarProvider: React.FC<AvatarProviderProps> = ({ children }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { user } = useAuth();

  const refreshAvatar = async () => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }

    try {
      const response = await apiService.api.get('/users/profile');
      
      if (response.data.success && response.data.data.user.avatarUrl) {
        // Usar a URL que já vem pronta do backend
        const avatarUrl = response.data.data.user.avatarUrl;
        const fullAvatarUrl = `${apiService.baseURL}/${avatarUrl}`;
        setAvatarUrl(fullAvatarUrl);
      } else {
        setAvatarUrl(null);
      }
    } catch (error) {
      console.error('Erro ao carregar avatar:', error);
      setAvatarUrl(null);
    }
  };

  const updateAvatar = (newAvatarUrl: string) => {
    setAvatarUrl(newAvatarUrl);
  };

  // Carrega o avatar quando o usuário muda
  useEffect(() => {
    refreshAvatar();
  }, [user]);

  const value: AvatarContextType = {
    avatarUrl,
    updateAvatar,
    refreshAvatar,
  };

  return (
    <AvatarContext.Provider value={value}>
      {children}
    </AvatarContext.Provider>
  );
};

export const useAvatar = (): AvatarContextType => {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error('useAvatar must be used within an AvatarProvider');
  }
  return context;
};