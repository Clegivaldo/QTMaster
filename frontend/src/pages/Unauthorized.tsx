import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';

const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
          <ShieldX className="h-8 w-8 text-red-600" />
        </div>
        
        <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
          Acesso Negado
        </h1>
        
        <p className="mt-4 text-lg text-gray-600">
          Você não tem permissão para acessar esta página.
        </p>
        
        <p className="mt-2 text-sm text-gray-500">
          Entre em contato com o administrador se você acredita que deveria ter acesso.
        </p>
        
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;