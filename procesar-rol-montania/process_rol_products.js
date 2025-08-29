import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeo de propiedades para el archivo ROL
const propertyMapping = {
    'nombre': 'name',
    'sku': 'upc', // Se mantiene igual
    'precio': 'price',
    'imagen': 'sourceImageUrl',
    'url': 'sourceUrl'
};

// Función para corregir y convertir precio a number
function convertPriceToNumber(priceString) {
    // Si ya es un número, devolverlo
    if (typeof priceString === 'number') {
        return parseFloat(priceString.toFixed(2));
    }
    
    // Si es string, limpiar y convertir
    if (typeof priceString === 'string') {
        // Remover símbolos de moneda y espacios
        let cleanPrice = priceString.replace(/[S\/\s$€£¥]/g, '');
        
        // Manejar formato con múltiples puntos decimales si los hay
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
    
    console.warn(`⚠️  No se pudo convertir el precio: "${priceString}" - se asignará 0`);
    return 0;
}

// Función para transformar propiedades de un producto
function transformProduct(product) {
    const transformed = {};
    
    for (const [oldKey, value] of Object.entries(product)) {
        const newKey = propertyMapping[oldKey] || oldKey;
        
        // Si es el precio, convertir a number
        if (oldKey === 'precio') {
            transformed[newKey] = convertPriceToNumber(value);
        } else {
            transformed[newKey] = value;
        }
    }
    
    return transformed;
}

// Función principal
function processRolProducts(inputFile, outputFile) {
    try {
        console.log('📖 Leyendo archivo ROL:', inputFile);
        const data = fs.readFileSync(inputFile, 'utf8');
        const products = JSON.parse(data);
        
        console.log(`🔄 Procesando ${products.length} productos de ROL...`);
        console.log('\n🏷️  Transformaciones a realizar:');
        console.log('=================================');
        console.log('1. Corregir precios: "S/ 145.00" -> 145');
        console.log('2. Convertir precios a números');
        console.log('3. Renombrar propiedades a inglés:');
        Object.entries(propertyMapping).forEach(([oldName, newName]) => {
            console.log(`   ${oldName} -> ${newName}`);
        });
        console.log('');
        
        let priceErrorCount = 0;
        let transformedProducts = products.map((product, index) => {
            const originalPrice = product.precio;
            const transformed = transformProduct(product);
            
            // Mostrar algunos ejemplos
            if (index < 5) {
                console.log(`📦 Producto ${index + 1}: ${transformed.name}`);
                console.log(`   Precio: "${originalPrice}" -> ${transformed.price} (${typeof transformed.price})`);
                console.log(`   SKU: ${transformed.sku}`);
                console.log('');
            }
            
            if (transformed.price === 0 && originalPrice !== "0" && originalPrice !== 0) {
                priceErrorCount++;
            }
            
            return transformed;
        });
        
        console.log(`✅ Transformación completada`);
        console.log(`📊 Resumen:`);
        console.log(`   • Total productos: ${transformedProducts.length}`);
        console.log(`   • Errores en precios: ${priceErrorCount}`);
        
        // Guardar archivo transformado
        fs.writeFileSync(outputFile, JSON.stringify(transformedProducts, null, 2));
        console.log(`\n💾 Archivo guardado como: ${outputFile}`);
        
        // Mostrar ejemplos finales
        console.log('\n🎯 Ejemplos de productos transformados:');
        console.log('======================================');
        transformedProducts.slice(0, 5).forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   Price: ${product.price} (${typeof product.price})`);
            console.log(`   SKU: ${product.sku}`);
            console.log(`   Source URL: ${product.sourceUrl}`);
            console.log('');
        });
        
        // Verificar estructura final
        const sampleProduct = transformedProducts[0];
        const expectedKeys = Object.values(propertyMapping);
        
        console.log('🔍 Verificación de estructura:');
        console.log('=============================');
        expectedKeys.forEach(key => {
            const exists = Object.keys(sampleProduct).includes(key);
            console.log(`   ${key}: ${exists ? '✅' : '❌'}`);
        });
        
        // Estadísticas de precios
        const validPrices = transformedProducts
            .map(p => p.price)
            .filter(p => p > 0);
            
        if (validPrices.length > 0) {
            const minPrice = Math.min(...validPrices);
            const maxPrice = Math.max(...validPrices);
            const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
            
            console.log('\n📈 Estadísticas de precios:');
            console.log('===========================');
            console.log(`   • Precio mínimo: S/ ${minPrice}`);
            console.log(`   • Precio máximo: S/ ${maxPrice}`);
            console.log(`   • Precio promedio: S/ ${avgPrice.toFixed(2)}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Configuración de archivos
const inputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_rol.json');
const outputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_rol_final.json');

// Ejecutar el script
console.log('🚀 Iniciando procesamiento del archivo ROL...\n');
processRolProducts(inputFile, outputFile);
console.log('\n✅ Proceso completado!');
