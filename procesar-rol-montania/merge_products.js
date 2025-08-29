import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para agregar metadatos de origen a los productos
function addSourceMetadata(products, source) {
    return products.map(product => ({
        ...product,
        source: source, // Agregar campo de origen
        id: `${source}_${product.upc || 'unknown'}` // Crear ID único combinando source + upc
    }));
}

// Función para validar la estructura de un producto
function validateProduct(product, source, index) {
    const requiredFields = ['sourceUrl'];
    const missingFields = requiredFields.filter(field => !product[field]);
    
    if (missingFields.length > 0) {
        console.warn(`⚠️  Producto ${index + 1} de ${source} tiene campos faltantes: ${missingFields.join(', ')}`);
        return false;
    }
    
    return true;
}

// Función para limpiar y estandarizar productos
function cleanProduct(product, source) {
    const cleanedProduct = {
        id: `${source}_${product.upc || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: product.name || 'Producto sin nombre',
        brand: product.brand || null,
        upc: product.upc || null,
        price: typeof product.price === 'number' ? product.price : 0,
        sourceImageUrl: product.sourceImageUrl || null,
        sourceUrl: product.sourceUrl || '',
        source: source
    };
    
    return cleanedProduct;
}

// Función principal para unir los archivos JSON
function mergeJsonFiles(montaniaFile, rolFile, outputFile) {
    try {
        console.log('🚀 Iniciando proceso de unión de archivos JSON...\n');
        
        // Leer archivo de Montaña
        console.log('📖 Leyendo archivo de Montaña:', montaniaFile);
        let montaniaData = [];
        try {
            const montaniaContent = fs.readFileSync(montaniaFile, 'utf8');
            montaniaData = JSON.parse(montaniaContent);
        } catch (error) {
            console.warn(`⚠️  No se pudo leer archivo de Montaña: ${error.message}`);
        }
        
        // Leer archivo de ROL
        console.log('📖 Leyendo archivo de ROL:', rolFile);
        let rolData = [];
        try {
            const rolContent = fs.readFileSync(rolFile, 'utf8');
            rolData = JSON.parse(rolContent);
        } catch (error) {
            console.warn(`⚠️  No se pudo leer archivo de ROL: ${error.message}`);
        }
        
        console.log(`\n📊 Productos encontrados:`);
        console.log(`   • Montaña: ${montaniaData.length} productos`);
        console.log(`   • ROL: ${rolData.length} productos`);
        
        // Limpiar y procesar productos de Montaña
        console.log('\n🧹 Procesando productos de Montaña...');
        const montaniaProducts = montaniaData
            .filter((product, index) => validateProduct(product, 'montania', index))
            .map(product => cleanProduct(product, 'montania'));
        
        // Limpiar y procesar productos de ROL
        console.log('🧹 Procesando productos de ROL...');
        const rolProducts = rolData
            .filter((product, index) => validateProduct(product, 'rol', index))
            .map(product => cleanProduct(product, 'rol'));
        
        // Unir todos los productos
        const allProducts = [...montaniaProducts, ...rolProducts];
        
        console.log(`\n✅ Productos procesados:`);
        console.log(`   • Montaña válidos: ${montaniaProducts.length}`);
        console.log(`   • ROL válidos: ${rolProducts.length}`);
        console.log(`   • Total unidos: ${allProducts.length}`);
        
        // Estadísticas adicionales
        const withImages = allProducts.filter(p => p.sourceImageUrl !== null).length;
        const withPrice = allProducts.filter(p => p.price > 0).length;
        const withBrand = allProducts.filter(p => p.brand !== null).length;
        const withUpc = allProducts.filter(p => p.upc !== null).length;
        
        console.log(`\n📈 Estadísticas del archivo unificado:`);
        console.log(`   • Productos con imagen: ${withImages} (${((withImages/allProducts.length)*100).toFixed(1)}%)`);
        console.log(`   • Productos con precio: ${withPrice} (${((withPrice/allProducts.length)*100).toFixed(1)}%)`);
        console.log(`   • Productos con marca: ${withBrand} (${((withBrand/allProducts.length)*100).toFixed(1)}%)`);
        console.log(`   • Productos con UPC: ${withUpc} (${((withUpc/allProducts.length)*100).toFixed(1)}%)`);
        
        // Guardar archivo unificado
        fs.writeFileSync(outputFile, JSON.stringify(allProducts, null, 2));
        console.log(`\n💾 Archivo unificado guardado como: ${outputFile}`);
        
        // Mostrar ejemplos de cada fuente
        console.log('\n🎯 Ejemplos de productos unificados:');
        console.log('=====================================');
        
        const montaniaExample = allProducts.find(p => p.source === 'montania');
        if (montaniaExample) {
            console.log('\n📦 Ejemplo de Montaña:');
            console.log(`   ID: ${montaniaExample.id}`);
            console.log(`   Nombre: ${montaniaExample.name}`);
            console.log(`   Marca: ${montaniaExample.brand || 'N/A'}`);
            console.log(`   Precio: ${montaniaExample.price}`);
            console.log(`   UPC: ${montaniaExample.upc || 'N/A'}`);
            console.log(`   Fuente: ${montaniaExample.source}`);
        }
        
        const rolExample = allProducts.find(p => p.source === 'rol');
        if (rolExample) {
            console.log('\n📦 Ejemplo de ROL:');
            console.log(`   ID: ${rolExample.id}`);
            console.log(`   Nombre: ${rolExample.name}`);
            console.log(`   Marca: ${rolExample.brand || 'N/A'}`);
            console.log(`   Precio: ${rolExample.price}`);
            console.log(`   UPC: ${rolExample.upc || 'N/A'}`);
            console.log(`   Fuente: ${rolExample.source}`);
        }
        
        // Información final del archivo
        const fileSize = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
        console.log(`\n📁 Información del archivo final:`);
        console.log(`   • Tamaño: ${fileSize} MB`);
        console.log(`   • Estructura: Estandarizada con campo 'source'`);
        console.log(`   • IDs únicos: Generados automáticamente`);
        
    } catch (error) {
        console.error('❌ Error al unir archivos:', error.message);
    }
}

// Configuración de archivos
const montaniaFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_montania_final.json');
const rolFile = path.join(__dirname, 'web-scrapping-products-28-08', 'detalles_rol_final.json');
const outputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'productos_unificados.json');

// Ejecutar el script
mergeJsonFiles(montaniaFile, rolFile, outputFile);
console.log('\n✅ Proceso de unión completado!');
