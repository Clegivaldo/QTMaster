import React, { useState } from 'react';
import { Palette, Type, Maximize2, Save, RotateCcw } from 'lucide-react';

export interface GlobalStylesEditorProps {
    initialStyles?: GlobalStyles;
    onSave?: (styles: GlobalStyles) => void;
    onCancel?: () => void;
}

export interface GlobalStyles {
    // Colors
    primaryColor?: string;
    secondaryColor?: string;
    successColor?: string;
    warningColor?: string;
    errorColor?: string;
    textColor?: string;
    backgroundColor?: string;

    // Typography
    fontFamily?: string;
    headingFont?: string;
    bodyFont?: string;
    captionFont?: string;

    // Font sizes
    h1Size?: number;
    h2Size?: number;
    h3Size?: number;
    bodySize?: number;
    captionSize?: number;

    // Spacing
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;

    // Line height
    lineHeight?: number;
}

const DEFAULT_STYLES: GlobalStyles = {
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    successColor: '#10b981',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',

    fontFamily: 'Inter, Arial, sans-serif',
    headingFont: 'Inter, Arial, sans-serif',
    bodyFont: 'Inter, Arial, sans-serif',
    captionFont: 'Inter, Arial, sans-serif',

    h1Size: 24,
    h2Size: 20,
    h3Size: 16,
    bodySize: 12,
    captionSize: 10,

    marginTop: 20,
    marginRight: 20,
    marginBottom: 20,
    marginLeft: 20,
    paddingTop: 10,
    paddingRight: 10,
    paddingBottom: 10,
    paddingLeft: 10,

    lineHeight: 1.6,
};

const PRESET_THEMES = {
    professional: {
        name: 'Profissional',
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6',
        successColor: '#059669',
        warningColor: '#d97706',
        errorColor: '#dc2626',
    },
    modern: {
        name: 'Moderno',
        primaryColor: '#7c3aed',
        secondaryColor: '#a78bfa',
        successColor: '#10b981',
        warningColor: '#f59e0b',
        errorColor: '#f43f5e',
    },
    minimalist: {
        name: 'Minimalista',
        primaryColor: '#374151',
        secondaryColor: '#6b7280',
        successColor: '#059669',
        warningColor: '#d97706',
        errorColor: '#dc2626',
    },
};

export const GlobalStylesEditor: React.FC<GlobalStylesEditorProps> = ({
    initialStyles = DEFAULT_STYLES,
    onSave,
    onCancel,
}) => {
    const [styles, setStyles] = useState<GlobalStyles>(initialStyles);
    const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing'>('colors');

    const handleStyleChange = (key: keyof GlobalStyles, value: any) => {
        setStyles((prev) => ({ ...prev, [key]: value }));
    };

    const handleApplyTheme = (themeKey: keyof typeof PRESET_THEMES) => {
        const theme = PRESET_THEMES[themeKey];
        setStyles((prev) => ({
            ...prev,
            primaryColor: theme.primaryColor,
            secondaryColor: theme.secondaryColor,
            successColor: theme.successColor,
            warningColor: theme.warningColor,
            errorColor: theme.errorColor,
        }));
    };

    const handleReset = () => {
        setStyles(DEFAULT_STYLES);
    };

    const handleSave = () => {
        onSave?.(styles);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg">
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Estilos Globais
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Defina cores, tipografia e espaçamentos para todo o template
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex -mb-px px-6">
                    <button
                        onClick={() => setActiveTab('colors')}
                        className={`py-4 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'colors'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Palette className="h-4 w-4 inline mr-2" />
                        Cores
                    </button>
                    <button
                        onClick={() => setActiveTab('typography')}
                        className={`py-4 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'typography'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Type className="h-4 w-4 inline mr-2" />
                        Tipografia
                    </button>
                    <button
                        onClick={() => setActiveTab('spacing')}
                        className={`py-4 px-4 border-b-2 font-medium text-sm transition-colors ${activeTab === 'spacing'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Maximize2 className="h-4 w-4 inline mr-2" />
                        Espaçamentos
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="px-6 py-6 max-h-[600px] overflow-y-auto">
                {/* Colors Tab */}
                {activeTab === 'colors' && (
                    <div className="space-y-6">
                        {/* Preset Themes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Temas Pré-definidos
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {Object.entries(PRESET_THEMES).map(([key, theme]) => (
                                    <button
                                        key={key}
                                        onClick={() => handleApplyTheme(key as keyof typeof PRESET_THEMES)}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                                    >
                                        <div className="text-sm font-medium text-gray-900 mb-2">{theme.name}</div>
                                        <div className="flex gap-1">
                                            <div
                                                className="w-6 h-6 rounded"
                                                style={{ backgroundColor: theme.primaryColor }}
                                            />
                                            <div
                                                className="w-6 h-6 rounded"
                                                style={{ backgroundColor: theme.secondaryColor }}
                                            />
                                            <div
                                                className="w-6 h-6 rounded"
                                                style={{ backgroundColor: theme.successColor }}
                                            />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Pickers */}
                        <div className="grid grid-cols-2 gap-4">
                            <ColorInput
                                label="Cor Primária"
                                value={styles.primaryColor || ''}
                                onChange={(value) => handleStyleChange('primaryColor', value)}
                            />
                            <ColorInput
                                label="Cor Secundária"
                                value={styles.secondaryColor || ''}
                                onChange={(value) => handleStyleChange('secondaryColor', value)}
                            />
                            <ColorInput
                                label="Cor de Sucesso"
                                value={styles.successColor || ''}
                                onChange={(value) => handleStyleChange('successColor', value)}
                            />
                            <ColorInput
                                label="Cor de Aviso"
                                value={styles.warningColor || ''}
                                onChange={(value) => handleStyleChange('warningColor', value)}
                            />
                            <ColorInput
                                label="Cor de Erro"
                                value={styles.errorColor || ''}
                                onChange={(value) => handleStyleChange('errorColor', value)}
                            />
                            <ColorInput
                                label="Cor do Texto"
                                value={styles.textColor || ''}
                                onChange={(value) => handleStyleChange('textColor', value)}
                            />
                            <ColorInput
                                label="Cor de Fundo"
                                value={styles.backgroundColor || ''}
                                onChange={(value) => handleStyleChange('backgroundColor', value)}
                            />
                        </div>
                    </div>
                )}

                {/* Typography Tab */}
                {activeTab === 'typography' && (
                    <div className="space-y-6">
                        {/* Font Families */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-900">Fontes</h3>
                            <TextInput
                                label="Fonte Principal"
                                value={styles.fontFamily || ''}
                                onChange={(value) => handleStyleChange('fontFamily', value)}
                                placeholder="Inter, Arial, sans-serif"
                            />
                            <TextInput
                                label="Fonte dos Títulos"
                                value={styles.headingFont || ''}
                                onChange={(value) => handleStyleChange('headingFont', value)}
                                placeholder="Inter, Arial, sans-serif"
                            />
                        </div>

                        {/* Font Sizes */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-900">Tamanhos de Fonte</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <NumberInput
                                    label="Título H1"
                                    value={styles.h1Size || 24}
                                    onChange={(value) => handleStyleChange('h1Size', value)}
                                    min={12}
                                    max={48}
                                    suffix="px"
                                />
                                <NumberInput
                                    label="Título H2"
                                    value={styles.h2Size || 20}
                                    onChange={(value) => handleStyleChange('h2Size', value)}
                                    min={10}
                                    max={36}
                                    suffix="px"
                                />
                                <NumberInput
                                    label="Título H3"
                                    value={styles.h3Size || 16}
                                    onChange={(value) => handleStyleChange('h3Size', value)}
                                    min={10}
                                    max={24}
                                    suffix="px"
                                />
                                <NumberInput
                                    label="Corpo do Texto"
                                    value={styles.bodySize || 12}
                                    onChange={(value) => handleStyleChange('bodySize', value)}
                                    min={8}
                                    max={18}
                                    suffix="px"
                                />
                                <NumberInput
                                    label="Legendas"
                                    value={styles.captionSize || 10}
                                    onChange={(value) => handleStyleChange('captionSize', value)}
                                    min={6}
                                    max={14}
                                    suffix="px"
                                />
                            </div>
                        </div>

                        {/* Line Height */}
                        <NumberInput
                            label="Altura da Linha"
                            value={styles.lineHeight || 1.6}
                            onChange={(value) => handleStyleChange('lineHeight', value)}
                            min={1}
                            max={3}
                            step={0.1}
                        />
                    </div>
                )}

                {/* Spacing Tab */}
                {activeTab === 'spacing' && (
                    <div className="space-y-6">
                        {/* Margins */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-900">Margens Padrão</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <NumberInput
                                    label="Superior"
                                    value={styles.marginTop || 20}
                                    onChange={(value) => handleStyleChange('marginTop', value)}
                                    min={0}
                                    max={100}
                                    suffix="mm"
                                />
                                <NumberInput
                                    label="Direita"
                                    value={styles.marginRight || 20}
                                    onChange={(value) => handleStyleChange('marginRight', value)}
                                    min={0}
                                    max={100}
                                    suffix="mm"
                                />
                                <NumberInput
                                    label="Inferior"
                                    value={styles.marginBottom || 20}
                                    onChange={(value) => handleStyleChange('marginBottom', value)}
                                    min={0}
                                    max={100}
                                    suffix="mm"
                                />
                                <NumberInput
                                    label="Esquerda"
                                    value={styles.marginLeft || 20}
                                    onChange={(value) => handleStyleChange('marginLeft', value)}
                                    min={0}
                                    max={100}
                                    suffix="mm"
                                />
                            </div>
                        </div>

                        {/* Padding */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-900">Espaçamento Interno Padrão</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <NumberInput
                                    label="Superior"
                                    value={styles.paddingTop || 10}
                                    onChange={(value) => handleStyleChange('paddingTop', value)}
                                    min={0}
                                    max={50}
                                    suffix="mm"
                                />
                                <NumberInput
                                    label="Direita"
                                    value={styles.paddingRight || 10}
                                    onChange={(value) => handleStyleChange('paddingRight', value)}
                                    min={0}
                                    max={50}
                                    suffix="mm"
                                />
                                <NumberInput
                                    label="Inferior"
                                    value={styles.paddingBottom || 10}
                                    onChange={(value) => handleStyleChange('paddingBottom', value)}
                                    min={0}
                                    max={50}
                                    suffix="mm"
                                />
                                <NumberInput
                                    label="Esquerda"
                                    value={styles.paddingLeft || 10}
                                    onChange={(value) => handleStyleChange('paddingLeft', value)}
                                    min={0}
                                    max={50}
                                    suffix="mm"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-between">
                <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar Padrão
                </button>
                <div className="flex gap-3">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                        <Save className="h-4 w-4" />
                        Salvar Estilos
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper Components

interface ColorInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="flex gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#000000"
                />
            </div>
        </div>
    );
};

interface TextInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, value, onChange, placeholder }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
    );
};

interface NumberInputProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    suffix,
}) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {suffix && <span className="text-gray-500 ml-1">({suffix})</span>}
            </label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                min={min}
                max={max}
                step={step}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
    );
};
