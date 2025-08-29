-- Script SQL para crear la tabla productos en Supabase
-- Ejecuta este script en el editor SQL de Supabase (https://supabase.com/dashboard)

-- Crear esquema api si no existe
CREATE SCHEMA IF NOT EXISTS api;

-- Crear tabla productos
CREATE TABLE IF NOT EXISTS api.productos (
    id TEXT PRIMARY KEY,
    name TEXT,
    brand TEXT,
    upc TEXT,
    price NUMERIC,
    source_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_productos_name ON api.productos(name);
CREATE INDEX IF NOT EXISTS idx_productos_brand ON api.productos(brand);
CREATE INDEX IF NOT EXISTS idx_productos_upc ON api.productos(upc);

-- Habilitar RLS (Row Level Security)
ALTER TABLE api.productos ENABLE ROW LEVEL SECURITY;

-- Política para permitir lecturas con anon key
CREATE POLICY "Allow public read access" ON api.productos
    FOR SELECT USING (true);

-- Política para permitir escritura con service role
CREATE POLICY "Allow service role write access" ON api.productos
    FOR ALL USING (auth.role() = 'service_role');

-- Exponer la tabla en la API REST
GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;
GRANT ALL ON api.productos TO anon, authenticated, service_role;

-- Comentarios para documentación
COMMENT ON TABLE api.productos IS 'Tabla de productos scrapeados';
COMMENT ON COLUMN api.productos.id IS 'ID único del producto';
COMMENT ON COLUMN api.productos.name IS 'Nombre del producto';
COMMENT ON COLUMN api.productos.brand IS 'Marca del producto';
COMMENT ON COLUMN api.productos.upc IS 'Código UPC/SKU del producto';
COMMENT ON COLUMN api.productos.price IS 'Precio del producto';
COMMENT ON COLUMN api.productos.source_image_url IS 'URL de la imagen del producto';
