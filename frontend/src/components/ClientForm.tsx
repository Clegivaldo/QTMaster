import React from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { Client, ClientFormData } from '@/types/client';
import { Search } from 'lucide-react';

interface ClientFormProps {
  client?: Client;
  onSubmit: (data: ClientFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({
  client,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  setValue,
  getValues,
  } = useForm<ClientFormData>({
    defaultValues: {
      name: client?.name || '',
      cnpj: client?.cnpj || '',
      // legacy fields kept in type but not shown
      email: client?.email || '',
      phone: client?.phone || '',
      address: client?.address || '',
      street: client?.street || '',
      neighborhood: client?.neighborhood || '',
      city: client?.city || '',
      state: client?.state || '',
      complement: client?.complement || '',
    },
  });

  const [cnpjLoading, setCnpjLoading] = React.useState(false);
  const [cnpjError, setCnpjError] = React.useState<string | null>(null);

  // Format and validation helpers for CNPJ
  const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');

  const formatCNPJ = (value: string) => {
    const digits = onlyDigits(value).slice(0, 14);
    if (!digits) return '';
    // Mask: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const isValidCNPJ = (value?: string) => {
    const cnpj = onlyDigits(value || '');
    if (cnpj.length !== 14) return false;

    // CNPJ validation algorithm (verify digits)
    const t = cnpj.length - 2;
    const numbers = cnpj.substring(0, t);
    const digits = cnpj.substring(t);
    const calc = (x: string) => {
      let sum = 0;
      let pos = x.length - 7;
      for (let i = x.length; i >= 1; i--) {
        sum += Number(x.charAt(x.length - i)) * pos--;
        if (pos < 2) pos = 9;
      }
      const res = sum % 11 < 2 ? 0 : 11 - (sum % 11);
      return res;
    };
    const n1 = calc(numbers);
    const n2 = calc(numbers + n1);
    return `${n1}${n2}` === digits;
  };

  const fetchCNPJ = async (rawCnpj?: string) => {
    const current = rawCnpj || getValues('cnpj') || '';
    const cnpjDigits = onlyDigits(current);
    if (!isValidCNPJ(cnpjDigits)) {
      setCnpjError('CNPJ inválido');
      return;
    }

    setCnpjLoading(true);
    setCnpjError(null);

    try {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);
      if (!res.ok) throw new Error(`Erro na consulta: ${res.status}`);
      const data = await res.json();

      // Preencher campos relevantes
      // Nome/razao social
      if (data.razao_social || data.nome_fantasia) {
        setValue('name', data.razao_social || data.nome_fantasia || getValues('name'));
      }
      // Endereço: a API retorna endereco, bairro, cidade, uf, complemento
      if (data.estabelecimento) {
        const est = data.estabelecimento;
        if (est.logradouro) setValue('street', est.logradouro);
        if (est.numero) setValue('complement', `${est.numero}${est.complemento ? ' - ' + est.complemento : ''}`);
        if (est.bairro) setValue('neighborhood', est.bairro);
        if (est.municipio) setValue('city', est.municipio);
        if (est.uf) setValue('state', est.uf);
      } else {
        // Some endpoints return direct fields
        if (data.logradouro) setValue('street', data.logradouro);
        if (data.complemento) setValue('complement', data.complemento);
        if (data.bairro) setValue('neighborhood', data.bairro);
        if (data.municipio) setValue('city', data.municipio);
        if (data.uf) setValue('state', data.uf);
      }

      // fill cnpj cleaned/formatted
      const formatted = formatCNPJ(data.cnpj || current);
      setValue('cnpj', formatted);
    } catch (err: any) {
      console.error('Erro ao buscar CNPJ', err);
      setCnpjError('Não foi possível buscar dados para este CNPJ');
    } finally {
      setCnpjLoading(false);
    }
  };

  // Format input on typing
  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setValue('cnpj', formatted);
    // clear error while typing
    if (cnpjError) setCnpjError(null);
  };

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onCancel}
      title={client ? 'Editar Cliente' : 'Novo Cliente'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4 sm:p-6">

          <div className="space-y-4">
            {/* CNPJ (primeiro) com botão de busca */}
            <div>
              <label htmlFor="cnpj" className="mobile-form-label">
                CNPJ
              </label>
              <div className="flex items-center space-x-2">
                <input
                  {...register('cnpj', { onChange: handleCNPJChange })}
                  type="text"
                  className="mobile-form-input flex-1"
                  placeholder="00.000.000/0000-00"
                />
                <button
                  type="button"
                  onClick={() => fetchCNPJ()}
                  disabled={cnpjLoading}
                  className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center hover:bg-primary-700 disabled:opacity-50"
                  title="Buscar CNPJ"
                >
                  <Search className="h-4 w-4 text-white" />
                </button>
              </div>
              {cnpjError && (
                <p className="mt-1 text-sm text-red-600">{cnpjError}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="mobile-form-label">
                Nome *
              </label>
              <input
                {...register('name', {
                  required: 'Nome é obrigatório',
                  maxLength: {
                    value: 255,
                    message: 'Nome muito longo',
                  },
                })}
                type="text"
                className="mobile-form-input"
                placeholder="Nome do cliente"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Endereço separado: Rua */}
            <div>
              <label htmlFor="street" className="mobile-form-label">Rua</label>
              <input
                {...register('street')}
                type="text"
                className="mobile-form-input"
                placeholder="Rua"
              />
            </div>

            {/* Bairro */}
            <div>
              <label htmlFor="neighborhood" className="mobile-form-label">Bairro</label>
              <input
                {...register('neighborhood')}
                type="text"
                className="mobile-form-input"
                placeholder="Bairro"
              />
            </div>

            {/* Cidade / Estado (side-by-side on larger screens) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="city" className="mobile-form-label">Cidade</label>
                <input
                  {...register('city')}
                  type="text"
                  className="mobile-form-input"
                  placeholder="Cidade"
                />
              </div>
              <div>
                <label htmlFor="state" className="mobile-form-label">Estado (UF)</label>
                <input
                  {...register('state')}
                  type="text"
                  className="mobile-form-input"
                  placeholder="UF"
                />
              </div>
            </div>

            {/* Complemento */}
            <div>
              <label htmlFor="complement" className="mobile-form-label">Complemento</label>
              <input
                {...register('complement')}
                type="text"
                className="mobile-form-input"
                placeholder="Apto / Casa / Bloco"
              />
            </div>

            {/* removed legacy 'address' textarea - using separated fields (street, neighborhood, city, state, complement) */}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="btn-mobile-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus-mobile disabled-mobile sm:text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-mobile-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus-mobile disabled-mobile sm:text-sm"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </div>
            ) : (
              client ? 'Atualizar' : 'Criar'
            )}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default ClientForm;