import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeo de propiedades: español -> inglés
const propertyMapping = {
    'nombre': 'name',
    'marca': 'brand',
    'precio': 'price',
    'codigo_barras': 'upc',
    'imagen': 'sourceImageUrl',
    'url': 'sourceUrl'
};

// Función para transformar las propiedades de un producto
function transformProductProperties(product) {
    const transformedProduct = {};
    
    // Iterar sobre cada propiedad del producto original
    for (const [oldKey, value] of Object.entries(product)) {
        // Si existe un mapeo para esta propiedad, usar la nueva clave
        const newKey = propertyMapping[oldKey] || oldKey;
        transformedProduct[newKey] = value;
    }
    
    return transformedProduct;
}

// Función principal
function renameProperties(inputFile, outputFile) {
    try {
        console.log('📖 Leyendo archivo:', inputFile);
        const data = fs.readFileSync(inputFile, 'utf8');
        const products = JSON.parse(data);
        
        console.log(`🔄 Procesando ${products.length} productos...`);
        console.log('\n🏷️  Mapeo de propiedades:');
        console.log('========================');
        Object.entries(propertyMapping).forEach(([oldName, newName]) => {
            console.log(`   ${oldName} -> ${newName}`);
        });
        console.log('');
        
        // Transformar todos los productos
        const transformedProducts = products.map((product, index) => {
            const transformed = transformProductProperties(product);
            
            // Mostrar algunos ejemplos de la transformación
            if (index < 3) {
                console.log(`📦 Producto ${index + 1}: ${transformed.name}`);
                console.log(`   Antes: {nombre, marca, precio, codigo_barras, imagen, url}`);
                console.log(`   Después: {name, brand, price, upc, sourceImageUrl, sourceUrl}`);
                console.log('');
            }
            
            return transformed;
        });
        
        console.log(`✅ Transformación completada para ${transformedProducts.length} productos`);
        
        // Guardar archivo con propiedades renombradas
        fs.writeFileSync(outputFile, JSON.stringify(transformedProducts, null, 2));
        console.log(`\n💾 Archivo guardado como: ${outputFile}`);
        
        // Mostrar ejemplos del resultado final
        console.log('\n🎯 Ejemplos de productos transformados:');
        console.log('======================================');
        transformedProducts.slice(0, 5).forEach((product, index) => {
            console.log(`${index + 1}. ${product.name}`);
            console.log(`   Brand: ${product.brand}`);
            console.log(`   Price: ${product.price} (${typeof product.price})`);
            console.log(`   UPC: ${product.upc}`);
            console.log(`   Source URL: ${product.sourceUrl}`);
            console.log('');
        });
        
        // Verificar que todas las propiedades fueron transformadas correctamente
        const sampleProduct = transformedProducts[0];
        const expectedKeys = Object.values(propertyMapping);
        const actualKeys = Object.keys(sampleProduct);
        
        console.log('🔍 Verificación de estructura:');
        console.log('=============================');
        expectedKeys.forEach(key => {
            const exists = actualKeys.includes(key);
            console.log(`   ${key}: ${exists ? '✅' : '❌'}`);
        });
        
        // Mostrar estadísticas finales
        console.log('\n📊 Estadísticas finales:');
        console.log('========================');
        console.log(`   • Total productos transformados: ${transformedProducts.length}`);
        console.log(`   • Propiedades renombradas: ${Object.keys(propertyMapping).length}`);
        console.log(`   • Tamaño del archivo: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)} MB`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Configuración de archivos
const inputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania_numeric.json');
const outputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania_final.json');

// Ejecutar el script
console.log('🚀 Iniciando renombrado de propiedades...\n');
renameProperties(inputFile, outputFile);
console.log('\n✅ Proceso completado!');
