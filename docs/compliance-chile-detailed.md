# Poppins ERP - Requisitos Detallados de Compliance Chile

## 1. PREVIRED - Formato Archivo Plano (65 campos)

El archivo PREVIRED es **CSV delimitado por punto y coma (`;`)**, codificación **ISO-8859-1**.

| # | Campo | Tipo | Largo | Req | Descripción |
|---|-------|------|-------|-----|-------------|
| 1 | RUT Empleador | Char | 10 | Sí | Con guión y DV |
| 2 | RUT Trabajador | Char | 10 | Sí | Con guión y DV |
| 3 | Período de Pago | Num | 6 | Sí | AAAAMM |
| 4 | Nombre Trabajador | Char | 40 | Sí | Nombres |
| 5 | Apellido Paterno | Char | 40 | Sí | |
| 6 | Apellido Materno | Char | 40 | Sí | |
| 7 | Sexo | Char | 1 | Sí | M/F |
| 8 | Fecha Nacimiento | Num | 8 | No | DDMMAAAA |
| 9 | Nacionalidad | Num | 3 | No | 056=Chile |
| 10 | Tipo de Pago | Num | 1 | Sí | 1=Normal, 2=Retroactivo, 3=Solo voluntarios |
| 11 | Período Remuneración | Num | 6 | Sí | AAAAMM |
| 12 | Código AFP | Num | 2 | Sí* | Ver tabla AFP |
| 13 | Renta Imponible AFP | Num | 9 | Sí* | Entero sin decimales |
| 14 | Cotización Obligatoria AFP | Num | 9 | Sí* | Monto |
| 15 | Cotización SIS | Num | 9 | Sí* | Monto |
| 16 | Cuenta Ahorro Voluntario AFP (APV Régimen A) | Num | 9 | No | |
| 17 | Renta Imponible IPS (ex-INP) | Num | 9 | No | |
| 18 | Cotización Obligatoria IPS | Num | 9 | No | |
| 19 | Renta Imponible Desahucio | Num | 9 | No | Sector público |
| 20 | Código ISAPRE/FONASA | Num | 3 | Sí | Ver tabla salud |
| 21 | Renta Imponible Salud | Num | 9 | Sí | |
| 22 | Cotización Salud (7% o pactada) | Num | 9 | Sí | |
| 23 | Cotización Adicional Salud | Num | 9 | No | Excedente ISAPRE sobre 7% |
| 24 | Código Mutual | Num | 2 | No | Ver tabla mutual |
| 25 | Renta Imponible Mutual | Num | 9 | No | |
| 26 | Cotización ATEP | Num | 9 | No | Accidentes del trabajo |
| 27 | Código CCAF | Num | 3 | No | Ver tabla CCAF |
| 28 | Renta Imponible CCAF | Num | 9 | No | |
| 29 | Créditos Personales CCAF | Num | 9 | No | |
| 30 | Descuento Dental CCAF | Num | 9 | No | |
| 31 | Descuento Leasing CCAF | Num | 9 | No | |
| 32 | Descuento Seguro de Vida CCAF | Num | 9 | No | |
| 33 | Otros Descuentos CCAF | Num | 9 | No | |
| 34 | Cotización CCAF | Num | 9 | No | |
| 35 | Código Sucursal Mutual | Num | 4 | No | |
| 36 | Código Movimiento Personal | Num | 2 | No | Ver tabla movimientos |
| 37 | Fecha Movimiento | Num | 8 | No | DDMMAAAA |
| 38 | Tramo Asignación Familiar | Char | 1 | No | A, B, C, D |
| 39 | Nro Cargas Simples | Num | 2 | No | |
| 40 | Nro Cargas Maternales | Num | 2 | No | |
| 41 | Nro Cargas Invalidez | Num | 2 | No | |
| 42 | Asignación Familiar (monto) | Num | 9 | No | |
| 43 | Asignación Familiar Retroactiva | Num | 9 | No | |
| 44 | Reintegro Cargas Familiares | Num | 9 | No | |
| 45 | Solicitud Trabajador Joven | Char | 1 | No | S/N |
| 46 | Código AFC | Num | 2 | Sí | 01=AFC Chile |
| 47 | Renta Imponible Seguro Cesantía | Num | 9 | Sí | |
| 48 | Aporte Trabajador Cesantía | Num | 9 | Sí | |
| 49 | Aporte Empleador Cesantía | Num | 9 | Sí | |
| 50 | Tipo de Contrato | Char | 1 | Sí | I=Indefinido, P=Plazo fijo |
| 51 | Días Trabajados | Num | 2 | Sí | |
| 52 | Tipo de Trabajador | Num | 1 | Sí | 0=Activo, 1=Pensionado, 2=Exento AFP |
| 53 | Código APVI | Num | 3 | No | APV Individual institución |
| 54 | Monto APVI | Num | 9 | No | |
| 55 | Código APVC | Num | 3 | No | APV Colectivo institución |
| 56 | Monto APVC Trabajador | Num | 9 | No | |
| 57 | Monto APVC Empleador | Num | 9 | No | |
| 58 | RUT Pagadora Subsidio | Char | 10 | No | |
| 59 | Renta Imponible Subsidio | Num | 9 | No | |
| 60 | Tasa Pactada Salud (%) | Num | 5 | No | Ej: 7.00 |
| 61 | Monto APV Régimen B | Num | 9 | No | Tributario |
| 62 | Forma APV | Char | 1 | No | D=Directa, I=Indirecta |
| 63 | Cotización Desahucio | Num | 9 | No | |
| 64 | Cot. FONASA/ISAPRE Independiente | Num | 9 | No | |
| 65 | Tasa Cotización SIS | Num | 4 | No | |

---

## 2. Códigos de Movimiento Personal

| Código | Descripción |
|--------|-------------|
| 0 | Sin movimiento |
| 1 | Contratación (primer período) |
| 2 | Retiro / Desvinculación |
| 3 | Subsidio por Incapacidad Laboral |
| 4 | Permiso sin goce de sueldo |
| 5 | Reincorporación |
| 6 | Accidente del Trabajo |
| 7 | Licencia Médica |
| 8 | Cambio AFP/ISAPRE/Mutual/CCAF |
| 11 | Separación del trabajador |
| 12 | Cambio de contrato |

---

## 3. Códigos LRE (Libro de Remuneraciones Electrónico - DT)

### Haberes
| Código | Concepto |
|--------|----------|
| 1101 | Sueldo Base |
| 1102 | Sobresueldo (Horas Extra) |
| 1103 | Comisiones |
| 1104 | Participación |
| 1105 | Gratificación Legal |
| 1106 | Bono o Premio |
| 1201 | Asignación Movilización |
| 1202 | Asignación Colación |
| 1203 | Asignación de Viáticos |
| 1204 | Asignación Desgaste Herramientas |
| 1205 | Asignación Pérdida de Caja |
| 1301 | Semana Corrida |

### Descuentos
| Código | Concepto |
|--------|----------|
| 2101 | Cotización Obligatoria AFP |
| 2102 | Cotización Salud 7% |
| 2103 | Cotización Adicional Salud (ISAPRE) |
| 2104 | Cotización AFC Trabajador |
| 2105 | Impuesto Único Segunda Categoría |
| 2201 | Anticipos |
| 2202 | Préstamos |
| 2203 | Cuota Sindical |
| 2204 | Pensión Alimenticia |

---

## 4. Formato DJ 1887 (SII - Archivo Ancho Fijo)

### Registro Tipo 0 (Cabecera)
| Pos | Largo | Campo |
|-----|-------|-------|
| 1 | 1 | Tipo registro = "0" |
| 2-5 | 4 | Año tributario |
| 6-9 | 4 | Formulario = "1887" |
| 10-19 | 10 | RUT declarante (relleno ceros izq) |

### Registro Tipo 1 (Detalle por trabajador)
| Pos | Largo | Campo |
|-----|-------|-------|
| 1 | 1 | Tipo registro = "1" |
| 2-11 | 10 | RUT trabajador |
| 12-14 | 3 | Código país (extranjeros) |
| 15 | 1 | Tipo renta (1=Sueldos Art.42 N°1) |
| 16-28 | 13 | Renta total neta pagada |
| 29-41 | 13 | Impuesto único retenido |
| 42-54 | 13 | Renta total no gravada |
| 55-67 | 13 | Renta total exenta |
| 68-80 | 13 | Rebaja zona extrema |
| 81-86 | 6 | Período desde (AAAAMM) |
| 87-92 | 6 | Período hasta (AAAAMM) |
| 93 | 1 | Indicador jubilación (S/N) |
| 94-106 | 13 | Mayor retención solicitada |
| 107-119 | 13 | Renta exenta por factor |
| 120-132 | 13 | Impuesto tasa mayor |

### Registro Tipo 2 (Resumen)
| Pos | Largo | Campo |
|-----|-------|-------|
| 1 | 1 | Tipo registro = "2" |
| 2-9 | 8 | Número de registros |
| 10-22 | 13 | Total renta neta pagada |
| 23-35 | 13 | Total impuesto retenido |
| 36-48 | 13 | Total renta no gravada |
| 49-61 | 13 | Total renta exenta |

---

## 5. Tipos de Licencia/Ausencia (Completo)

| Código | Tipo | Días | Remunerado | Ref. Legal |
|--------|------|------|------------|------------|
| FERIADO_LEGAL | Vacaciones anuales | 15 hábiles | Sí | Art. 67 CT |
| FERIADO_PROGRESIVO | Vacaciones progresivas | +1 día/3 años sobre 10 | Sí | Art. 68 CT |
| LICENCIA_MEDICA | Licencia médica | Según certificado | SIL (subsidio) | DFL 44 |
| PRENATAL | Prenatal | 6 semanas (42 días) | SIL | Art. 195 CT |
| POSTNATAL | Postnatal | 12 semanas (84 días) | SIL | Art. 195 CT |
| POSTNATAL_PARENTAL | Postnatal parental | 12 o 18 semanas | SIL | Art. 197 bis CT |
| PERMISO_PATERNIDAD | Permiso paternidad | 5 días | Sí | Art. 195 inc.2 CT |
| MATRIMONIO | Permiso matrimonio | 5 días | Sí | Art. 207 bis CT |
| MUERTE_HIJO_CONYUGE | Fallecimiento hijo/cónyuge | 7 días | Sí | Art. 66 CT |
| MUERTE_PADRE_HERMANO | Fallecimiento padre/hermano | 3 días | Sí | Art. 66 CT |
| PERMISO_SINDICAL | Permiso sindical | Según acuerdo | Según acuerdo | Art. 249-252 CT |
| DIA_ADMINISTRATIVO | Día administrativo | Según contrato | Sí | Contractual |
| SIN_GOCE | Permiso sin goce | Según acuerdo | No | Contractual |
| SERVICIO_MILITAR | Servicio militar | Duración servicio | Protección empleo | Art. 158 CT |
| SANNA | Enfermedad grave hijo | Variable | SIL | Ley 21.063 |

---

## 6. Causales de Terminación de Contrato

| Código | Causal | Artículo | Aviso Previo | Indem. Años Servicio |
|--------|--------|----------|-------------|---------------------|
| 159-1 | Mutuo acuerdo | Art. 159 N°1 | No | No |
| 159-2 | Renuncia del trabajador | Art. 159 N°2 | 30 días | No |
| 159-3 | Muerte del trabajador | Art. 159 N°3 | No | No |
| 159-4 | Vencimiento del plazo | Art. 159 N°4 | No | No |
| 159-5 | Conclusión del trabajo/servicio | Art. 159 N°5 | No | No |
| 159-6 | Caso fortuito/fuerza mayor | Art. 159 N°6 | No | No |
| 160-1 | Conductas indebidas graves | Art. 160 N°1 | No | No |
| 160-2 | Negociaciones incompatibles | Art. 160 N°2 | No | No |
| 160-3 | Inasistencia injustificada | Art. 160 N°3 | No | No |
| 160-4 | Abandono del trabajo | Art. 160 N°4 | No | No |
| 160-5 | Actos que afecten seguridad | Art. 160 N°5 | No | No |
| 160-6 | Perjuicio material intencional | Art. 160 N°6 | No | No |
| 160-7 | Incumplimiento grave obligaciones | Art. 160 N°7 | No | No |
| 161-1 | Necesidades de la empresa | Art. 161 inc.1 | 30 días o paga | Sí (tope 11 años) |
| 161-2 | Desahucio | Art. 161 inc.2 | 30 días o paga | Sí (tope 11 años) |

---

## 7. Ley 40 Horas (21.561) - Reducción Gradual

| Período | Horas semanales |
|---------|----------------|
| Hasta abril 2024 | 45 hrs |
| Abril 2024 - Abril 2026 | 44 hrs |
| Abril 2026 - Abril 2028 | 42 hrs |
| Desde abril 2028 | 40 hrs |

---

## 8. Retención Boletas de Honorarios

| Año | Tasa Retención |
|-----|---------------|
| 2024 | 13.75% |
| 2025 | 14.50% |
| 2026 | 15.25% |
| 2027 | 16.00% |
| 2028+ | 17.00% |

---

## 9. Orden de Cálculo de Liquidación

```
1. Sumar total haberes imponibles
2. Aplicar tope imponible (81.6 UF para AFP/Salud, 122.6 UF para AFC)
3. Calcular AFP = renta_imponible × (10% + comisión%)
4. Calcular SIS = renta_imponible × 1.53% (costo empleador)
5. Calcular Salud = max(renta_imponible × 7%, plan_ISAPRE_en_CLP)
6. Calcular AFC trabajador = renta_imponible_afc × 0.6% (indefinido) o 0% (plazo fijo)
7. Calcular AFC empleador = renta_imponible_afc × 2.4% (indefinido) o 3% (plazo fijo)
8. Calcular base tributable = total_imponible - AFP - salud_7% - AFC_trabajador - APV_B
9. Calcular impuesto único (tabla progresiva en UTM)
10. Aplicar otros descuentos (sindicato, anticipos, préstamos, pensión alimenticia)
11. Líquido = total_haberes - total_descuentos + asignación_familiar
12. Costo empresa = AFC_empleador + SIS + mutual_ATEP
```

---

## 10. Conceptos de Remuneración - Clasificación Completa

| Concepto | Imponible | Tributable | Ref. Legal |
|----------|-----------|------------|------------|
| Sueldo base | Sí | Sí | Art. 42 a) |
| Gratificación legal | Sí | Sí | Art. 47-50 |
| Sobresueldo (horas extra) | Sí | Sí | Art. 30-32 |
| Comisiones | Sí | Sí | Art. 42 c) |
| Participación | Sí | Sí | Art. 42 d) |
| Semana corrida | Sí | Sí | Art. 45 |
| Bonos imponibles | Sí | Sí | Contractual |
| Colación | No | No | Art. 41 inc.2 |
| Movilización | No | No | Art. 41 inc.2 |
| Viáticos | No | No | Art. 41 inc.2 |
| Desgaste herramientas | No | No | Art. 41 inc.2 |
| Pérdida de caja | No | No | Art. 41 inc.2 |
| Asignación familiar | No | No | DFL 150/1982 |

---

## 11. Límite Art. 58 - Descuentos Voluntarios

Total de descuentos voluntarios no puede exceder el **15%** de la remuneración total.
Descuentos legales (AFP, salud, impuesto, sindicato, pensión alimenticia) no tienen tope propio más allá de sus reglas específicas.

---

## 12. Integración con Bancos - Formatos de Pago

Cada banco tiene su propio formato de archivo de nómina. Los más comunes:

| Banco | Formato | Campos principales |
|-------|---------|-------------------|
| BancoEstado | CSV/TXT | RUT, nombre, banco destino, tipo cuenta, nro cuenta, monto |
| BCI | TXT fijo | Similar, con código banco SBIF |
| Santander | CSV | RUT, nombre, cuenta, monto, tipo pago |
| Banco de Chile | TXT | RUT, cuenta, monto, glosa |
| Scotiabank | CSV | RUT, cuenta, sucursal, monto |

El sistema debe generar archivos en formato de cada banco para la nómina de pagos.

---

## 13. APIs para Indicadores Económicos

### mindicador.cl (gratuita)
```
GET https://mindicador.cl/api
GET https://mindicador.cl/api/uf
GET https://mindicador.cl/api/uf/DD-MM-YYYY
GET https://mindicador.cl/api/utm
GET https://mindicador.cl/api/utm/DD-MM-YYYY
```

### SII
- UF: https://www.sii.cl/valores_y_fechas/uf/uf2026.htm
- UTM: https://www.sii.cl/valores_y_fechas/utm/utm2026.htm

### CMF (Comisión para el Mercado Financiero)
- API REST con datos oficiales de UF, dólar, euro, etc.
