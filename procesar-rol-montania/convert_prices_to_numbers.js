import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para convertir precio string a number
function convertPriceToNumber(priceString) {
    // Si ya es un número, devolverlo tal como está
    if (typeof priceString === 'number') {
        return parseFloat(priceString.toFixed(2));
    }
    
    // Si es string, convertir a número
    if (typeof priceString === 'string') {
        // Remover cualquier símbolo de moneda y espacios
        let cleanPrice = priceString.replace(/[S\/\s$€£¥]/g, '');
        
        // Manejar formato con doble punto decimal (ej: "8.50.50")
        const parts = cleanPrice.split('.');
        if (parts.length > 2) {
            cleanPrice = `${parts[0]}.${parts[1]}`;
        }
        
        const numericPrice = parseFloat(cleanPrice);
        
        // Verificar que es un número válido
        if (!isNaN(numericPrice) && isFinite(numericPrice)) {
            return parseFloat(numericPrice.toFixed(2));
        }
    }
    
    // Si no se puede convertir, devolver 0
    console.warn(`⚠️  No se pudo convertir el precio: "${priceString}" - se asignará 0`);
    return 0;
}

// Función principal
function convertPricesToNumbers(inputFile, outputFile) {
    try {
        console.log('📖 Leyendo archivo:', inputFile);
        const data = fs.readFileSync(inputFile, 'utf8');
        const products = JSON.parse(data);
        
        console.log(`🔄 Procesando ${products.length} productos...`);
        
        let convertedCount = 0;
        let errorCount = 0;
        const convertedProducts = products.map((product, index) => {
            const originalPrice = product.precio;
            const numericPrice = convertPriceToNumber(originalPrice);
            
            if (typeof originalPrice === 'string' && typeof numericPrice === 'number') {
                convertedCount++;
                
                // Mostrar algunos ejemplos de conversión
                if (convertedCount <= 10) {
                    console.log(`✅ Producto ${index + 1}: "${originalPrice}" -> ${numericPrice}`);
                }
            }
            
            if (numericPrice === 0 && originalPrice !== "0" && originalPrice !== 0) {
                errorCount++;
            }
            
            return {
                ...product,
                precio: numericPrice
            };
        });
        
        console.log(`\n📊 Resumen de conversión:`);
        console.log(`   • Precios convertidos: ${convertedCount}`);
        console.log(`   • Errores en conversión: ${errorCount}`);
        console.log(`   • Total de productos: ${products.length}`);
        
        // Guardar archivo con precios numéricos
        fs.writeFileSync(outputFile, JSON.stringify(convertedProducts, null, 2));
        console.log(`\n💾 Archivo guardado como: ${outputFile}`);
        
        // Mostrar ejemplos de los precios convertidos
        console.log('\n🎯 Ejemplos de productos con precios numéricos:');
        console.log('================================================');
        convertedProducts.slice(0, 8).forEach((product, index) => {
            const priceType = typeof product.precio;
            console.log(`${index + 1}. ${product.nombre}`);
            console.log(`   Precio: ${product.precio} (${priceType})`);
            console.log('');
        });
        
        // Mostrar estadísticas de precios
        const prices = convertedProducts.map(p => p.precio).filter(p => p > 0);
        if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            
            console.log('📈 Estadísticas de precios:');
            console.log(`   • Precio mínimo: ${minPrice}`);
            console.log(`   • Precio máximo: ${maxPrice}`);
            console.log(`   • Precio promedio: ${avgPrice.toFixed(2)}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Configuración de archivos
const inputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania_fixed.json');
const outputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania_numeric.json');

// Ejecutar el script
console.log('🚀 Iniciando conversión de precios a números...\n');
convertPricesToNumbers(inputFile, outputFile);
console.log('\n✅ Proceso completado!');
