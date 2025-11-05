import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Left side - Copyright */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>© {currentYear} Sistema de Laudos de Qualificação Térmica.</span>
              <span className="hidden sm:inline">Todos os direitos reservados.</span>
            </div>

            {/* Center - Developer credit */}
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <span>Desenvolvido por</span>
              <a
                href="https://wa.me/5593992089384"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Clegivaldo Cruz
              </a>
            </div>


          </div>


        </div>
      </div>
    </footer>
  );
};

export default Footer;