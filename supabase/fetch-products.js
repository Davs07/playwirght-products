// Ejemplo simple (front-end) usando supabase-js y la anon key para leer productos.
// En el frontend usa SUPABASE_ANON_KEY (no la service_role).
//
// Requiere: npm i @supabase/supabase-js

import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://<PROJECT>.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "<ANON_KEY>";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'api' }
});

async function fetchProducts() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .limit(5);  // Reducir a 5 para ver mejor
    
  if (error) {
    console.error('Error fetching products:', error);
    return null;
  }
  
  return data;
}

async function fetchProductsByBrand(brand) {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('brand', brand);
    
  if (error) {
    console.error('Error fetching products by brand:', error);
    return null;
  }
  
  return data;
}

async function searchProducts(searchTerm) {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
    
  if (error) {
    console.error('Error searching products:', error);
    return null;
  }
  
  return data;
}

// Ejemplo de uso
async function main() {
  console.log("Fetching products...");
  const products = await fetchProducts();
  console.log("Products:", products);
  
  console.log("\nSearching for 'coca cola'...");
  const cocaColaProducts = await searchProducts('coca cola');
  console.log("Coca Cola products:", cocaColaProducts);
}

// Descomenta para ejecutar el ejemplo
main().catch(console.error);

export { fetchProducts, fetchProductsByBrand, searchProducts };
