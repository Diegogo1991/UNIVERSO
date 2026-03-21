/**
 * Script Node.js para generar la estructura del universo como JSON
 * Ejecutar: node generate-universe.js
 */

const fs = require('fs');
const path = require('path');

function scanDirectory(dirPath, basePath = null) {
  if (!basePath) basePath = dirPath;
  
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const result = {
    name: path.basename(dirPath),
    path: path.relative(basePath, dirPath) || '.',
    folders: [],
    files: []
  };

  items.forEach(item => {
    const fullPath = path.join(dirPath, item.name);
    const relativePath = path.relative(basePath, fullPath);
    
    if (item.isDirectory()) {
      // Escanear carpetas recursivamente
      result.folders.push(scanDirectory(fullPath, basePath));
    } else {
      // Agregar archivos
      const ext = path.extname(item.name).toLowerCase();
      const type = getFileType(ext);
      result.files.push({
        name: item.name,
        path: relativePath,
        ext: ext,
        type: type
      });
    }
  });

  return result;
}

function getFileType(ext) {
  const audioExts = ['.mp3', '.wav', '.mpeg', '.aac', '.flac', '.ogg'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const videoExts = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
  const modelExts = ['.glb', '.gltf', '.obj', '.fbx'];
  
  if (audioExts.includes(ext)) return 'audio';
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (modelExts.includes(ext)) return 'model';
  return 'file';
}

const assetsPath = path.join(__dirname, 'Assets');

if (!fs.existsSync(assetsPath)) {
  console.error('❌ No se encontró la carpeta Assets');
  process.exit(1);
}

const universe = scanDirectory(assetsPath);
const output = path.join(__dirname, 'universe-data.json');

fs.writeFileSync(output, JSON.stringify(universe, null, 2));
console.log('✅ Universo generado:', output);
console.log('📁 Estructura:', JSON.stringify(universe, null, 2).substring(0, 500) + '...');
