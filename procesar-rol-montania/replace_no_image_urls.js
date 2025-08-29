import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// URL de imagen por defecto que queremos reemplazar por null
const NO_IMAGE_URL = "https://montania.innovacionfac.com/assets/uploads/no_image.png?v=1";

// Función para procesar las imágenes
function processImageUrls(product) {
    // Crear una copia del producto
    const processedProduct = { ...product };
    
    // Si la imagen es la URL por defecto "no_image.png", reemplazarla por null
    if (processedProduct.sourceImageUrl === NO_IMAGE_URL) {
        processedProduct.sourceImageUrl = null;
    }
    
    return processedProduct;
}

// Función principal
function replaceNoImageUrls(inputFile, outputFile) {
    try {
        console.log('📖 Leyendo archivo:', inputFile);
        const data = fs.readFileSync(inputFile, 'utf8');
        const products = JSON.parse(data);
        
        console.log(`🔄 Procesando ${products.length} productos...`);
        console.log(`🎯 URL a reemplazar: "${NO_IMAGE_URL}"`);
        console.log('📄 Reemplazando por: null\n');
        
        let replacedCount = 0;
        let validImageCount = 0;
        let nullImageCount = 0;
        
        // Procesar todos los productos
        const processedProducts = products.map((product, index) => {
            const originalImageUrl = product.sourceImageUrl;
            const processedProduct = processImageUrls(product);
            
            // Contar estadísticas
            if (originalImageUrl === NO_IMAGE_URL) {
                replacedCount++;
                
                // Mostrar algunos ejemplos
                if (replacedCount <= 10) {
                    console.log(`✅ Producto ${index + 1}: "${product.name}"`);
                    console.log(`   Imagen: "${originalImageUrl}" -> null`);
                    console.log('');
                }
            } else if (originalImageUrl && originalImageUrl !== NO_IMAGE_URL) {
                validImageCount++;
            }
            
            if (processedProduct.sourceImageUrl === null) {
                nullImageCount++;
            }
            
            return processedProduct;
        });
        
        console.log(`📊 Estadísticas de procesamiento:`);
        console.log(`   • URLs "no_image.png" reemplazadas: ${replacedCount}`);
        console.log(`   • Productos con imágenes válidas: ${validImageCount}`);
        console.log(`   • Productos con imagen null: ${nullImageCount}`);
        console.log(`   • Total de productos: ${products.length}`);
        
        // Guardar archivo procesado
        fs.writeFileSync(outputFile, JSON.stringify(processedProducts, null, 2));
        console.log(`\n💾 Archivo guardado como: ${outputFile}`);
        
        // Mostrar ejemplos del resultado
        console.log('\n🎯 Ejemplos de productos procesados:');
        console.log('====================================');
        
        // Mostrar productos con imagen null
        const productsWithNullImage = processedProducts.filter(p => p.sourceImageUrl === null);
        console.log(`\n📷 Productos con imagen null (${productsWithNullImage.length}):`);
        productsWithNullImage.slice(0, 3).forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   Imagen: ${product.sourceImageUrl}`);
            console.log('');
        });
        
        // Mostrar productos con imagen válida
        const productsWithValidImage = processedProducts.filter(p => p.sourceImageUrl !== null);
        console.log(`📷 Productos con imagen válida (${productsWithValidImage.length}):`);
        productsWithValidImage.slice(0, 3).forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   Imagen: ${product.sourceImageUrl}`);
            console.log('');
        });
        
        // Verificar la estructura del archivo
        const sampleProduct = processedProducts[0];
        console.log('🔍 Estructura verificada:');
        console.log('=========================');
        Object.keys(sampleProduct).forEach(key => {
            const value = sampleProduct[key];
            const type = value === null ? 'null' : typeof value;
            console.log(`   ${key}: ${type}`);
        });
        
        // Mostrar estadísticas finales
        console.log('\n📈 Estadísticas finales:');
        console.log('========================');
        console.log(`   • Total productos procesados: ${processedProducts.length}`);
        console.log(`   • Imágenes reemplazadas por null: ${replacedCount}`);
        console.log(`   • Porcentaje sin imagen: ${((nullImageCount / processedProducts.length) * 100).toFixed(1)}%`);
        console.log(`   • Tamaño del archivo: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Configuración de archivos
const inputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania.json');
const outputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania_clean.json');

// Ejecutar el script
console.log('🚀 Iniciando reemplazo de URLs de imagen por null...\n');
replaceNoImageUrls(inputFile, outputFile);
console.log('\n✅ Proceso completado!');
