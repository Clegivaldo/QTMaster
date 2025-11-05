import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Shield, Calendar, Save, Camera } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() => {
    // Recupera o avatar do localStorage ao inicializar
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`avatar_${user?.id || 'default'}`) || null;
    }
    return null;
  });
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    department: '',
    bio: ''
  });

  const handleSave = async () => {
    try {
      // TODO: Implement API call to update profile
      console.log('Saving profile:', formData);
      
      addNotification({
        type: 'success',
        title: 'Perfil atualizado',
        message: 'Suas informações foram salvas com sucesso.'
      });
      
      setIsEditing(false);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erro ao salvar',
        message: 'Não foi possível atualizar o perfil. Tente novamente.'
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
              <p className="mt-1 text-sm text-gray-500">
                Gerencie suas informações pessoais e configurações de conta
              </p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {isEditing ? 'Cancelar' : 'Editar Perfil'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Foto do Perfil</h3>
              
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div 
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    className="h-32 w-32 rounded-full flex items-center justify-center overflow-hidden cursor-pointer relative"
                    style={{
                      backgroundImage: avatarPreview ? `url(${avatarPreview})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: avatarPreview ? 'transparent' : '#2563eb'
                    }}
                  >
                    {!avatarPreview && (
                      <span className="text-4xl font-medium text-white">
                        {user?.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    className="absolute bottom-0 right-0 h-10 w-10 bg-white rounded-full shadow-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 hover:shadow-xl transition-all duration-200"
                  >
                    <Camera className="h-5 w-5 text-gray-600" />
                  </button>
                  
                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Validate file size (max 5MB)
                        if (file.size > 5 * 1024 * 1024) {
                          addNotification({
                            type: 'error',
                            title: 'Arquivo muito grande',
                            message: 'O arquivo deve ter no máximo 5MB'
                          });
                          return;
                        }
                        
                        // Validate file type
                        if (!file.type.startsWith('image/')) {
                          addNotification({
                            type: 'error',
                            title: 'Tipo de arquivo inválido',
                            message: 'Apenas imagens são permitidas'
                          });
                          return;
                        }
                        
                        // Create preview
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          setAvatarPreview(result);
                          
                          // Salva no localStorage para persistir
                          localStorage.setItem(`avatar_${user?.id || 'default'}`, result);
                          
                          // TODO: Implement actual upload to server
                          console.log('File ready for upload:', file);
                          
                          addNotification({
                            type: 'success',
                            title: 'Avatar atualizado',
                            message: `Imagem ${file.name} carregada com sucesso`
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <h4 className="text-lg font-medium text-gray-900">{user?.name}</h4>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mt-2">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Conta</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Membro desde</p>
                    <p className="text-sm text-gray-500">Janeiro 2024</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Nível de acesso</p>
                    <p className="text-sm text-gray-500">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Informações Pessoais</h3>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nome completo
                    </label>
                    <div className="mt-1 relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={!isEditing}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="mt-1 relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={!isEditing}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                      Departamento
                    </label>
                    <input
                      type="text"
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="Ex: Qualidade"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Biografia
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;