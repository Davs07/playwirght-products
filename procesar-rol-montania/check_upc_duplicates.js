import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para analizar duplicados por UPC
function analyzeUpcDuplicates(products) {
    const upcMap = new Map();
    const duplicates = [];
    const uniqueProducts = [];
    
    // Agrupar productos por UPC
    products.forEach((product, index) => {
        const upc = product.upc;
        
        if (!upc || upc === 'null' || upc === '') {
            // Productos sin UPC válido
            uniqueProducts.push({...product, originalIndex: index});
            return;
        }
        
        if (!upcMap.has(upc)) {
            upcMap.set(upc, []);
        }
        
        upcMap.get(upc).push({...product, originalIndex: index});
    });
    
    // Identificar duplicados y únicos
    upcMap.forEach((productList, upc) => {
        if (productList.length > 1) {
            duplicates.push({
                upc: upc,
                count: productList.length,
                products: productList
            });
        } else {
            uniqueProducts.push(productList[0]);
        }
    });
    
    return {
        duplicates,
        uniqueProducts,
        totalDuplicateGroups: duplicates.length,
        totalDuplicateProducts: duplicates.reduce((sum, group) => sum + group.count, 0)
    };
}

// Función para comparar productos duplicados
function compareProducts(products) {
    const comparison = {
        sameName: true,
        sameBrand: true,
        samePrice: true,
        sameImage: true,
        sources: [],
        priceRange: { min: null, max: null },
        names: [],
        brands: [],
        images: []
    };
    
    // Extraer información de cada producto
    products.forEach(product => {
        if (!comparison.sources.includes(product.source)) {
            comparison.sources.push(product.source);
        }
        
        if (!comparison.names.includes(product.name)) {
            comparison.names.push(product.name);
        }
        
        if (product.brand && !comparison.brands.includes(product.brand)) {
            comparison.brands.push(product.brand);
        }
        
        if (product.sourceImageUrl && !comparison.images.includes(product.sourceImageUrl)) {
            comparison.images.push(product.sourceImageUrl);
        }
        
        // Precio
        if (comparison.priceRange.min === null || product.price < comparison.priceRange.min) {
            comparison.priceRange.min = product.price;
        }
        if (comparison.priceRange.max === null || product.price > comparison.priceRange.max) {
            comparison.priceRange.max = product.price;
        }
    });
    
    // Determinar si son iguales
    comparison.sameName = comparison.names.length === 1;
    comparison.sameBrand = comparison.brands.length <= 1;
    comparison.samePrice = comparison.priceRange.min === comparison.priceRange.max;
    comparison.sameImage = comparison.images.length <= 1;
    
    return comparison;
}

// Función principal
function checkUpcDuplicates(inputFile, outputFile) {
    try {
        console.log('🔍 Iniciando análisis de duplicados por UPC...\n');
        
        // Leer archivo
        console.log('📖 Leyendo archivo:', inputFile);
        const data = fs.readFileSync(inputFile, 'utf8');
        const products = JSON.parse(data);
        
        console.log(`📊 Total de productos: ${products.length}`);
        
        // Analizar duplicados
        console.log('\n🔎 Analizando duplicados...');
        const analysis = analyzeUpcDuplicates(products);
        
        console.log(`\n📈 Resultados del análisis:`);
        console.log(`   • Grupos de productos duplicados: ${analysis.totalDuplicateGroups}`);
        console.log(`   • Total de productos duplicados: ${analysis.totalDuplicateProducts}`);
        console.log(`   • Productos únicos: ${analysis.uniqueProducts.length}`);
        console.log(`   • Porcentaje de duplicados: ${((analysis.totalDuplicateProducts / products.length) * 100).toFixed(1)}%`);
        
        if (analysis.duplicates.length === 0) {
            console.log('\n✅ ¡No se encontraron productos duplicados por UPC!');
            return;
        }
        
        // Analizar detalles de duplicados
        console.log('\n🎯 Análisis detallado de duplicados:');
        console.log('====================================');
        
        let crossSourceDuplicates = 0;
        let sameSourceDuplicates = 0;
        let identicalProducts = 0;
        let differentPrices = 0;
        
        analysis.duplicates.forEach((duplicateGroup, index) => {
            const comparison = compareProducts(duplicateGroup.products);
            
            // Mostrar primeros 10 duplicados como ejemplo
            if (index < 10) {
                console.log(`\n📦 Grupo ${index + 1} - UPC: ${duplicateGroup.upc} (${duplicateGroup.count} productos)`);
                console.log(`   Fuentes: ${comparison.sources.join(', ')}`);
                console.log(`   Nombres: ${comparison.sameName ? 'Iguales' : 'Diferentes'}`);
                console.log(`   Marcas: ${comparison.sameBrand ? 'Iguales' : 'Diferentes'}`);
                console.log(`   Precios: ${comparison.samePrice ? `${comparison.priceRange.min}` : `${comparison.priceRange.min} - ${comparison.priceRange.max}`}`);
                
                duplicateGroup.products.forEach((product, i) => {
                    console.log(`     ${i + 1}. [${product.source.toUpperCase()}] ${product.name} - S/ ${product.price}`);
                });
            }
            
            // Estadísticas
            if (comparison.sources.length > 1) {
                crossSourceDuplicates++;
            } else {
                sameSourceDuplicates++;
            }
            
            if (comparison.sameName && comparison.sameBrand && comparison.samePrice) {
                identicalProducts++;
            }
            
            if (!comparison.samePrice) {
                differentPrices++;
            }
        });
        
        console.log(`\n📊 Estadísticas de duplicados:`);
        console.log(`   • Duplicados entre fuentes diferentes: ${crossSourceDuplicates}`);
        console.log(`   • Duplicados en la misma fuente: ${sameSourceDuplicates}`);
        console.log(`   • Productos idénticos: ${identicalProducts}`);
        console.log(`   • Productos con precios diferentes: ${differentPrices}`);
        
        // Generar reporte detallado
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalProducts: products.length,
                duplicateGroups: analysis.totalDuplicateGroups,
                totalDuplicates: analysis.totalDuplicateProducts,
                uniqueProducts: analysis.uniqueProducts.length,
                duplicatePercentage: ((analysis.totalDuplicateProducts / products.length) * 100).toFixed(1)
            },
            statistics: {
                crossSourceDuplicates,
                sameSourceDuplicates,
                identicalProducts,
                differentPrices
            },
            duplicateGroups: analysis.duplicates.map(group => ({
                upc: group.upc,
                count: group.count,
                comparison: compareProducts(group.products),
                products: group.products.map(p => ({
                    id: p.id,
                    name: p.name,
                    brand: p.brand,
                    price: p.price,
                    source: p.source,
                    sourceUrl: p.sourceUrl
                }))
            }))
        };
        
        // Guardar reporte
        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
        console.log(`\n💾 Reporte detallado guardado como: ${outputFile}`);
        
        // Top 5 UPCs con más duplicados
        const topDuplicates = analysis.duplicates
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        console.log('\n🏆 Top 5 UPCs con más duplicados:');
        console.log('=================================');
        topDuplicates.forEach((group, index) => {
            const comparison = compareProducts(group.products);
            console.log(`${index + 1}. UPC: ${group.upc} - ${group.count} productos`);
            console.log(`   Fuentes: ${comparison.sources.join(', ')}`);
            console.log(`   Rango de precios: S/ ${comparison.priceRange.min} - S/ ${comparison.priceRange.max}`);
        });
        
        // Recomendaciones
        console.log('\n💡 Recomendaciones:');
        console.log('===================');
        if (crossSourceDuplicates > 0) {
            console.log(`✓ Revisar ${crossSourceDuplicates} productos que aparecen en ambas fuentes`);
        }
        if (differentPrices > 0) {
            console.log(`✓ Verificar ${differentPrices} productos con precios diferentes`);
        }
        if (sameSourceDuplicates > 0) {
            console.log(`✓ Limpiar ${sameSourceDuplicates} duplicados dentro de la misma fuente`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Configuración de archivos
const inputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'productos_unificados.json');
const outputFile = path.join(__dirname, 'web-scrapping-products-28-08', 'reporte_duplicados_upc.json');

// Ejecutar el script
checkUpcDuplicates(inputFile, outputFile);
console.log('\n✅ Análisis de duplicados completado!');
