import { useState, useEffect } from 'react';

interface AppVersion {
  version: string;
  buildDate: string;
}

export const useAppVersion = (): AppVersion => {
  const [version, setVersion] = useState('1.0.0');
  const [buildDate] = useState(new Date().toLocaleDateString('pt-BR'));

  useEffect(() => {
    // In a real app, you might fetch this from an API or environment variable
    // For now, we'll use the package.json version
    const packageVersion = '1.0.0'; // This would come from package.json in a real build
    setVersion(packageVersion);
  }, []);

  return {
    version,
    buildDate
  };
};