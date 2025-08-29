import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para deduplicar productos según los criterios especificados
function deduplicateProducts(products) {
    const upcMap = new Map();
    const deduplicatedProducts = [];
    let duplicatesProcessed = 0;
    let duplicatesRemoved = 0;
    
    // Agrupar productos por UPC
    products.forEach(product => {
        const upc = product.upc;
        
        if (!upc || upc === 'null' || upc === '') {
            // Productos sin UPC válido se mantienen como están
            deduplicatedProducts.push(product);
            return;
        }
        
        if (!upcMap.has(upc)) {
            upcMap.set(upc, []);
        }
        
        upcMap.get(upc).push(product);
    });
    
    // Procesar cada grupo de productos con el mismo UPC
    upcMap.forEach((productList, upc) => {
        if (productList.length === 1) {
            // No hay duplicados, mantener el producto tal como está
            deduplicatedProducts.push(productList[0]);
        } else {
            // Hay duplicados, aplicar criterios de deduplicación
            duplicatesProcessed++;
            duplicatesRemoved += productList.length - 1;
            
            const mergedProduct = mergeProducts(productList, upc);
            deduplicatedProducts.push(mergedProduct);
        }
    });
    
    return {
        products: deduplicatedProducts,
        stats: {
            duplicatesProcessed,
            duplicatesRemoved,
            originalCount: products.length,
            finalCount: deduplicatedProducts.length
        }
    };
}

// Función para fusionar productos duplicados según los criterios
function mergeProducts(productList, upc) {
    console.log(`\n🔄 Procesando UPC: ${upc} (${productList.length} productos)`);
    
    // Separar productos por fuente
    const montaniaProducts = productList.filter(p => p.source === 'montania');
    const rolProducts = productList.filter(p => p.source === 'rol');
    
    // Criterio 1: Nombre y marca de Montaña (preferencia)
    let selectedName, selectedBrand;
    if (montaniaProducts.length > 0) {
        selectedName = montaniaProducts[0].name;
        selectedBrand = montaniaProducts[0].brand;
        console.log(`   📝 Nombre de Montaña: "${selectedName}"`);
        console.log(`   🏷️  Marca de Montaña: "${selectedBrand}"`);
    } else {
        selectedName = rolProducts[0].name;
        selectedBrand = rolProducts[0].brand;
        console.log(`   📝 Nombre de ROL: "${selectedName}"`);
        console.log(`   🏷️  Marca de ROL: "${selectedBrand}"`);
    }
    
    // Criterio 2: Imagen de ROL (preferencia)
    let selectedImage = null;
    let selectedImageSource = '';
    
    if (rolProducts.length > 0 && rolProducts[0].sourceImageUrl) {
        selectedImage = rolProducts[0].sourceImageUrl;
        selectedImageSource = 'ROL';
    } else if (montaniaProducts.length > 0 && montaniaProducts[0].sourceImageUrl) {
        selectedImage = montaniaProducts[0].sourceImageUrl;
        selectedImageSource = 'Montaña';
    }
    
    console.log(`   🖼️  Imagen de ${selectedImageSource}: ${selectedImage ? 'Disponible' : 'No disponible'}`);
    
    // Criterio 3: Precio más económico
    const allPrices = productList.map(p => ({ price: p.price, source: p.source }));
    const minPrice = Math.min(...productList.map(p => p.price));
    const cheapestProduct = productList.find(p => p.price === minPrice);
    
    console.log(`   💰 Precios disponibles:`);
    allPrices.forEach(p => {
        console.log(`      - ${p.source.toUpperCase()}: S/ ${p.price}${p.price === minPrice ? ' ← MÁS ECONÓMICO' : ''}`);
    });
    
    // Seleccionar URLs (preferir Montaña para sourceUrl)
    let selectedSourceUrl = '';
    if (montaniaProducts.length > 0) {
        selectedSourceUrl = montaniaProducts[0].sourceUrl;
    } else {
        selectedSourceUrl = rolProducts[0].sourceUrl;
    }
    
    // Crear producto fusionado
    const mergedProduct = {
        id: `merged_${upc}_${Date.now()}`,
        name: selectedName,
        brand: selectedBrand,
        upc: upc,
        price: minPrice,
        sourceImageUrl: selectedImage,
        sourceUrl: selectedSourceUrl,
        source: 'merged', // Indicar que es un producto fusionado
        originalSources: productList.map(p => p.source),
        mergedFrom: productList.length,
        mergedCriteria: {
            nameFrom: montaniaProducts.length > 0 ? 'montania' : 'rol',
            brandFrom: montaniaProducts.length > 0 ? 'montania' : 'rol',
            imageFrom: selectedImageSource.toLowerCase(),
            priceFrom: cheapestProduct.source,
            urlFrom: montaniaProducts.length > 0 ? 'montania' : 'rol'
        }
    };
    
    console.log(`   ✅ Producto fusionado creado`);
    
    return mergedProduct;
}

// Función principal
function createDeduplicatedFile(inputFile, outputFile) {
    try {
        console.log('🚀 Iniciando proceso de deduplicación...\n');
        
        // Leer archivo unificado
        console.log('📖 Leyendo archivo:', inputFile);
        const data = fs.readFileSync(inputFile, 'utf8');
        const products = JSON.parse(data);
        
        console.log(`📊 Productos originales: ${products.length}`);
        
        // Ejecutar deduplicación
        console.log('\n🔄 Aplicando criterios de deduplicación...');
        console.log('📋 Criterios:');
        console.log('   • Nombre y marca: De Montaña (preferencia)');
        console.log('   • Imagen: De ROL (preferencia)');
        console.log('   • Precio: El más económico');
        console.log('   • URL: De Montaña (preferencia)');
        
        const result = deduplicateProducts(products);
        
        console.log(`\n📈 Resultados de la deduplicación:`);
        console.log(`   • Grupos de duplicados procesados: ${result.stats.duplicatesProcessed}`);
        console.log(`   • Productos eliminados: ${result.stats.duplicatesRemoved}`);
        console.log(`   • Productos originales: ${result.stats.originalCount}`);
        console.log(`   • Productos finales: ${result.stats.finalCount}`);
        console.log(`   • Reducción: ${((result.stats.duplicatesRemoved / result.stats.originalCount) * 100).toFixed(1)}%`);
        
        // Estadísticas por fuente en el resultado final
        const finalStats = {
            merged: result.products.filter(p => p.source === 'merged').length,
            montania: result.products.filter(p => p.source === 'montania').length,
            rol: result.products.filter(p => p.source === 'rol').length
        };
        
        console.log(`\n📊 Composición del archivo final:`);
        console.log(`   • Productos fusionados: ${finalStats.merged}`);
        console.log(`   • Productos únicos de Montaña: ${finalStats.montania}`);
        console.log(`   • Productos únicos de ROL: ${finalStats.rol}`);
        
        // Guardar archivo deduplicado
        fs.writeFileSync(outputFile, JSON.stringify(result.products, null, 2));
        console.log(`\n💾 Archivo deduplicado guardado como: ${outputFile}`);
        
        // Mostrar ejemplos de productos fusionados
        const mergedProducts = result.products.filter(p => p.source === 'merged');
        
        if (mergedProducts.length > 0) {
            console.log('\n🎯 Ejemplos de productos fusionados:');
            console.log('====================================');
            
            mergedProducts.slice(0, 5).forEach((product, index) => {
                console.log(`\n${index + 1}. ${product.name}`);
                console.log(`   UPC: ${product.upc}`);
                console.log(`   Marca: ${product.brand || 'N/A'}`);
                console.log(`   Precio: S/ ${product.price} (de ${product.mergedCriteria.priceFrom})`);
                console.log(`   Imagen: ${product.mergedCriteria.imageFrom}`);
                console.log(`   Fusionado de: ${product.originalSources.join(', ')}`);
            });
        }
        
        // Crear resumen del proceso
        const summary = {
            timestamp: new Date().toISOString(),
            criteria: {
                name: 'Montaña (preferencia)',
                brand: 'Montaña (preferencia)', 
                image: 'ROL (preferencia)',
                price: 'Más económico',
                url: 'Montaña (preferencia)'
            },
            statistics: result.stats,
            composition: finalStats
        };
        
        const summaryFile = outputFile.replace('.json', '_summary.json');
        fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
        
        console.log(`\n📋 Resumen guardado como: ${summaryFile}`);
        
        // Información final
        const fileSize = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
        console.log(`\n📁 Archivo final:`);
        console.log(`   • Tamaño: ${fileSize} MB`);
        console.log(`   • Productos únicos: ${result.stats.finalCount}`);
        console.log(`   • Reducción de duplicados: ${result.stats.duplicatesRemoved} productos`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Configuración de archivos
const inputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'productos_unificados.json');
const outputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'productos_deduplicados.json');

// Ejecutar el script
createDeduplicatedFile(inputFile, outputFile);
console.log('\n✅ Proceso de deduplicación completado!');
