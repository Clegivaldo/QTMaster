import { useState, useEffect } from 'react';

interface AppVersion {
  version: string;
  buildDate: string;
}

export const useAppVersion = (): AppVersion => {
  const [version, setVersion] = useState('1.0.0');
  // Data de build fixa para esta versão - em produção viria de variável de ambiente
  const [buildDate] = useState('05/11/2025');

  useEffect(() => {
    // Em uma aplicação real, isso viria do package.json via processo de build
    // ou de uma variável de ambiente VITE_APP_VERSION
    const packageVersion = '1.0.0';
    setVersion(packageVersion);
  }, []);

  return {
    version,
    buildDate
  };
};