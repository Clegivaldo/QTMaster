import fs from 'fs';
import path from 'path';

const galleryDir = path.join(process.cwd(), 'public', 'images', 'gallery');

// Criar diretório se não existir
if (!fs.existsSync(galleryDir)) {
  fs.mkdirSync(galleryDir, { recursive: true });
}

// Criar imagens SVG de exemplo para a galeria
const svgImages = {
  'logo-empresa.svg': `
<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="100" fill="#2563eb" rx="10"/>
  <text x="100" y="35" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">EMPRESA</text>
  <text x="100" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="12">Qualificação Térmica</text>
  <text x="100" y="75" text-anchor="middle" fill="white" font-family="Arial" font-size="10">Certificada ISO 17025</text>
</svg>`,

  'logo-certificacao.svg': `
<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
  <circle cx="75" cy="75" r="70" fill="#16a34a" stroke="#15803d" stroke-width="3"/>
  <text x="75" y="65" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold">ISO</text>
  <text x="75" y="85" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">17025</text>
  <path d="M45 75 L65 90 L105 50" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  'fundo-relatorio.svg': `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#bg)"/>
  <g opacity="0.1">
    <circle cx="100" cy="100" r="50" fill="#2563eb"/>
    <circle cx="700" cy="500" r="80" fill="#16a34a"/>
    <rect x="600" y="50" width="100" height="100" fill="#ea580c" rx="10"/>
  </g>
</svg>`,

  'selo-aprovado.svg': `
<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <circle cx="60" cy="60" r="55" fill="#16a34a" stroke="#15803d" stroke-width="3"/>
  <text x="60" y="45" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">APROVADO</text>
  <text x="60" y="65" text-anchor="middle" fill="white" font-family="Arial" font-size="8">QUALIFICAÇÃO</text>
  <text x="60" y="80" text-anchor="middle" fill="white" font-family="Arial" font-size="8">TÉRMICA</text>
  <path d="M35 60 L50 70 L85 40" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  'marca-dagua.svg': `
<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <text x="150" y="100" text-anchor="middle" fill="#e2e8f0" font-family="Arial" font-size="24" font-weight="bold" opacity="0.3" transform="rotate(-45 150 100)">CONFIDENCIAL</text>
</svg>`,

  'termometro-icon.svg': `
<svg width="80" height="120" xmlns="http://www.w3.org/2000/svg">
  <rect x="35" y="10" width="10" height="80" fill="#e5e7eb" rx="5"/>
  <circle cx="40" cy="100" r="15" fill="#ef4444"/>
  <rect x="37" y="20" width="6" height="70" fill="#ef4444" rx="3"/>
  <text x="60" y="30" font-family="Arial" font-size="8" fill="#374151">°C</text>
</svg>`
};

// Criar arquivos SVG
Object.entries(svgImages).forEach(([filename, content]) => {
  const filepath = path.join(galleryDir, filename);
  fs.writeFileSync(filepath, content.trim());
  console.log(`✅ Criado: ${filename}`);
});

console.log(`🎨 Galeria de imagens inicializada com ${Object.keys(svgImages).length} itens!`);
console.log(`📁 Localização: ${galleryDir}`);

// Criar arquivo de índice da galeria
const galleryIndex = {
  images: Object.keys(svgImages).map(filename => ({
    name: filename.replace('.svg', '').replace('-', ' ').toUpperCase(),
    filename: filename,
    type: 'svg',
    category: filename.includes('logo') ? 'logos' : 
              filename.includes('fundo') ? 'backgrounds' :
              filename.includes('selo') ? 'seals' :
              filename.includes('marca') ? 'watermarks' : 'icons',
    url: `/public/images/gallery/${filename}`
  })),
  categories: ['logos', 'backgrounds', 'seals', 'watermarks', 'icons'],
  total: Object.keys(svgImages).length,
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync(
  path.join(galleryDir, 'index.json'), 
  JSON.stringify(galleryIndex, null, 2)
);

console.log('📋 Índice da galeria criado: index.json');