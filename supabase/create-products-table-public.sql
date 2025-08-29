-- Script SQL simplificado para crear tabla productos en schema público
-- Ejecuta este script en el editor SQL de Supabase

-- Crear tabla productos en schema público
CREATE TABLE IF NOT EXISTS public.productos (
    id TEXT PRIMARY KEY,
    name TEXT,
    brand TEXT,
    upc TEXT,
    price NUMERIC,
    source_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_productos_name ON public.productos(name);
CREATE INDEX IF NOT EXISTS idx_productos_brand ON public.productos(brand);
CREATE INDEX IF NOT EXISTS idx_productos_upc ON public.productos(upc);

-- Habilitar RLS
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- Política para permitir lecturas públicas
CREATE POLICY "Enable read access for all users" ON public.productos
    FOR SELECT USING (true);

-- Política para permitir escritura con service role
CREATE POLICY "Enable insert for service role only" ON public.productos
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update for service role only" ON public.productos
    FOR UPDATE USING (auth.role() = 'service_role');

-- Dar permisos
GRANT ALL ON public.productos TO service_role;
GRANT SELECT ON public.productos TO anon, authenticated;
