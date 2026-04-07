-- Programas de puntos/millas por banco y tipo de tarjeta
CREATE TABLE IF NOT EXISTS public.programas_puntos_banco (
  id SERIAL PRIMARY KEY,
  banco VARCHAR NOT NULL,
  tipo_tarjeta VARCHAR NOT NULL,
  categoria VARCHAR NOT NULL,
  programa VARCHAR NOT NULL,
  moneda_puntos VARCHAR DEFAULT 'puntos',
  tasa_por_1000 NUMERIC NOT NULL DEFAULT 1,
  valor_punto_clp NUMERIC DEFAULT 10,
  notas TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  activo BOOLEAN DEFAULT true
);

ALTER TABLE programas_puntos_banco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read" ON programas_puntos_banco FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admin_write" ON programas_puntos_banco FOR ALL USING (is_admin());

INSERT INTO programas_puntos_banco (banco, tipo_tarjeta, categoria, programa, moneda_puntos, tasa_por_1000, valor_punto_clp, notas) VALUES
('Banco de Chile', 'visa', 'signature', 'LATAM Pass', 'millas', 1.5, 15, 'Visa Signature acumula 1.5 millas por cada $1.000'),
('Banco de Chile', 'visa', 'platinum', 'LATAM Pass', 'millas', 1.0, 15, 'Visa Platinum acumula 1 milla por cada $1.000'),
('Banco de Chile', 'visa', 'gold', 'LATAM Pass', 'millas', 0.5, 15, 'Visa Gold acumula 0.5 millas por cada $1.000'),
('Banco de Chile', 'visa', 'classic', 'Puntos Bch', 'puntos', 1.0, 5, 'Visa Classic acumula 1 punto por cada $1.000'),
('Santander', 'visa', 'signature', 'LATAM Pass', 'millas', 1.5, 15, 'Acumula 1.5 millas por cada $1.000'),
('Santander', 'visa', 'platinum', 'LATAM Pass', 'millas', 1.0, 15, 'Acumula 1 milla por cada $1.000'),
('Santander', 'mastercard', 'black', 'LATAM Pass', 'millas', 2.0, 15, 'MC Black acumula 2 millas por cada $1.000'),
('Santander', 'visa', 'gold', 'SuperPuntos', 'puntos', 1.0, 5, '1 punto por cada $1.000'),
('BCI', 'visa', 'signature', 'LATAM Pass', 'millas', 1.5, 15, 'Visa Signature 1.5 millas/$1.000'),
('BCI', 'visa', 'platinum', 'Puntos BCI', 'puntos', 1.5, 8, '1.5 puntos por cada $1.000'),
('BCI', 'mastercard', 'platinum', 'Puntos BCI', 'puntos', 1.5, 8, '1.5 puntos por cada $1.000'),
('BCI', 'visa', 'gold', 'Puntos BCI', 'puntos', 1.0, 8, '1 punto por cada $1.000'),
('Banco Estado', 'visa', 'classic', 'CuentaRUT Puntos', 'puntos', 0.5, 3, '0.5 puntos por $1.000'),
('Banco Estado', 'visa', 'gold', 'BE Puntos', 'puntos', 1.0, 5, '1 punto por $1.000'),
('Scotiabank', 'visa', 'signature', 'Scotia Rewards', 'dólares', 0.3, 900, 'Acumula USD 0.30 por cada $1.000'),
('Scotiabank', 'visa', 'platinum', 'Scotia Rewards', 'dólares', 0.2, 900, 'Acumula USD 0.20 por cada $1.000'),
('Itaú', 'visa', 'signature', 'LATAM Pass', 'millas', 1.5, 15, '1.5 millas por $1.000'),
('Itaú', 'visa', 'platinum', 'Puntos Itaú', 'puntos', 1.0, 7, '1 punto por $1.000'),
('Falabella', 'mastercard', 'platinum', 'CMR Puntos', 'CMR puntos', 1.0, 4, '1 punto CMR por $1.000');
