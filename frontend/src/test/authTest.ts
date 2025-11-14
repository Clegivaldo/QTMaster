// Teste de autenticação para verificar se o login está funcionando
export const testAuth = async () => {
  try {
    console.log('Testando autenticação...');
    
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@sistema.com',
        password: 'admin123'
      }),
      credentials: 'include'
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
    
    if (response.ok) {
      console.log('✅ Autenticação bem-sucedida!');
      return data;
    } else {
      console.log('❌ Erro na autenticação:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error);
    return null;
  }
};

// Executar o teste
if (typeof window !== 'undefined') {
  console.log('Auth test module carregado. Execute testAuth() para testar.');
}