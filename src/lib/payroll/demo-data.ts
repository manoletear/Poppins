// ============================================================
// Datos de demostración basados en el scraping de Buk
// ============================================================

import type { AfpEmpleado, SaludEmpleado } from "./types";
import { AFPS } from "./constants";

export interface EmpleadoCompleto {
  id: number;
  // Datos personales
  rut: string;
  primer_nombre: string;
  segundo_nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo: "M" | "F";
  estado_civil: string;
  nacionalidad: string;
  // Contacto
  email_personal: string;
  email_corporativo: string;
  telefono_personal: string;
  telefono_oficina: string;
  // Dirección
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
  // Bancarios
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  // Previsión
  afp: string;
  afp_codigo: string;
  salud_tipo: "fonasa" | "isapre";
  salud_nombre: string;
  plan_salud_uf: number | null;
  // Contrato
  tipo_contrato: string;
  fecha_inicio_contrato: string;
  fecha_termino_contrato: string | null;
  tipo_jornada: string;
  horas_semanales: number;
  sueldo_base: number;
  tipo_gratificacion: string;
  cargo: string;
  area: string;
  centro_costo: string;
  // Cargas familiares
  cargas_simples: number;
  cargas_maternales: number;
  cargas_invalidez: number;
  // Flags
  es_pensionado: boolean;
  art22_excluido: boolean;
  discapacidad: boolean;
  pueblo_originario: boolean;
  // Estado
  activo: boolean;
  foto_url: string;
}

export const EMPLEADOS_DEMO: EmpleadoCompleto[] = [
  {
    id: 1,
    rut: "12.345.678-9",
    primer_nombre: "Rene",
    segundo_nombre: "Alejandro",
    apellido_paterno: "Aravena",
    apellido_materno: "Riffo",
    fecha_nacimiento: "1975-08-20",
    sexo: "M",
    estado_civil: "Casado",
    nacionalidad: "Chilena",
    email_personal: "rene.aravena@gmail.com",
    email_corporativo: "rene@empresa.cl",
    telefono_personal: "+56 9 1234 5678",
    telefono_oficina: "+56 2 2345 6789",
    direccion: "Av. Principal 1234, Depto 501",
    comuna: "Providencia",
    ciudad: "Santiago",
    region: "Región Metropolitana",
    banco: "Banco de Chile",
    tipo_cuenta: "Corriente",
    numero_cuenta: "00-123-45678-90",
    afp: "Cuprum",
    afp_codigo: "05",
    salud_tipo: "isapre",
    salud_nombre: "Banmédica",
    plan_salud_uf: 8.5,
    tipo_contrato: "Indefinido",
    fecha_inicio_contrato: "2018-01-15",
    fecha_termino_contrato: null,
    tipo_jornada: "Completa",
    horas_semanales: 45,
    sueldo_base: 3500000,
    tipo_gratificacion: "Art. 50",
    cargo: "Gerente General",
    area: "Gerencia",
    centro_costo: "ADM-001",
    cargas_simples: 3,
    cargas_maternales: 0,
    cargas_invalidez: 0,
    es_pensionado: false,
    art22_excluido: true,
    discapacidad: false,
    pueblo_originario: false,
    activo: true,
    foto_url: "",
  },
  {
    id: 34,
    rut: "15.678.901-2",
    primer_nombre: "Fernando",
    segundo_nombre: "Guillermo",
    apellido_paterno: "Astete",
    apellido_materno: "Muñoz",
    fecha_nacimiento: "1990-03-12",
    sexo: "M",
    estado_civil: "Soltero",
    nacionalidad: "Chilena",
    email_personal: "fernando.astete@gmail.com",
    email_corporativo: "fastete@empresa.cl",
    telefono_personal: "+56 9 8765 4321",
    telefono_oficina: "",
    direccion: "Calle Los Robles 567",
    comuna: "Maipú",
    ciudad: "Santiago",
    region: "Región Metropolitana",
    banco: "BancoEstado",
    tipo_cuenta: "CuentaRUT",
    numero_cuenta: "15678901",
    afp: "Habitat",
    afp_codigo: "08",
    salud_tipo: "fonasa",
    salud_nombre: "FONASA",
    plan_salud_uf: null,
    tipo_contrato: "Indefinido",
    fecha_inicio_contrato: "2020-06-01",
    fecha_termino_contrato: null,
    tipo_jornada: "Completa",
    horas_semanales: 45,
    sueldo_base: 600000,
    tipo_gratificacion: "Art. 50",
    cargo: "Operario de Producción",
    area: "Producción",
    centro_costo: "PROD-001",
    cargas_simples: 2,
    cargas_maternales: 0,
    cargas_invalidez: 0,
    es_pensionado: false,
    art22_excluido: false,
    discapacidad: false,
    pueblo_originario: false,
    activo: true,
    foto_url: "",
  },
  {
    id: 35,
    rut: "16.789.012-3",
    primer_nombre: "Ismael",
    segundo_nombre: "Humberto",
    apellido_paterno: "Liempi",
    apellido_materno: "Cárdenas",
    fecha_nacimiento: "1988-11-25",
    sexo: "M",
    estado_civil: "Casado",
    nacionalidad: "Chilena",
    email_personal: "ismael.liempi@gmail.com",
    email_corporativo: "iliempi@empresa.cl",
    telefono_personal: "+56 9 5555 1234",
    telefono_oficina: "",
    direccion: "Pasaje Las Flores 89",
    comuna: "Puente Alto",
    ciudad: "Santiago",
    region: "Región Metropolitana",
    banco: "BancoEstado",
    tipo_cuenta: "CuentaRUT",
    numero_cuenta: "16789012",
    afp: "Modelo",
    afp_codigo: "29",
    salud_tipo: "fonasa",
    salud_nombre: "FONASA",
    plan_salud_uf: null,
    tipo_contrato: "Indefinido",
    fecha_inicio_contrato: "2021-03-15",
    fecha_termino_contrato: null,
    tipo_jornada: "Completa",
    horas_semanales: 45,
    sueldo_base: 550000,
    tipo_gratificacion: "Art. 50",
    cargo: "Operario de Producción",
    area: "Producción",
    centro_costo: "PROD-001",
    cargas_simples: 1,
    cargas_maternales: 1,
    cargas_invalidez: 0,
    es_pensionado: false,
    art22_excluido: false,
    discapacidad: false,
    pueblo_originario: true,
    activo: true,
    foto_url: "",
  },
  {
    id: 36,
    rut: "17.890.123-4",
    primer_nombre: "Bernardo",
    segundo_nombre: "Eugenio",
    apellido_paterno: "Toro",
    apellido_materno: "Sepúlveda",
    fecha_nacimiento: "1992-07-08",
    sexo: "M",
    estado_civil: "Conviviente Civil",
    nacionalidad: "Chilena",
    email_personal: "bernardo.toro@gmail.com",
    email_corporativo: "btoro@empresa.cl",
    telefono_personal: "+56 9 4444 5678",
    telefono_oficina: "",
    direccion: "Villa Los Aromos, Casa 12",
    comuna: "La Florida",
    ciudad: "Santiago",
    region: "Región Metropolitana",
    banco: "Banco Santander",
    tipo_cuenta: "Vista",
    numero_cuenta: "0-000-1234567-8",
    afp: "ProVida",
    afp_codigo: "33",
    salud_tipo: "fonasa",
    salud_nombre: "FONASA",
    plan_salud_uf: null,
    tipo_contrato: "Plazo Fijo",
    fecha_inicio_contrato: "2025-12-01",
    fecha_termino_contrato: "2026-05-31",
    tipo_jornada: "Completa",
    horas_semanales: 45,
    sueldo_base: 500000,
    tipo_gratificacion: "Art. 50",
    cargo: "Operario de Producción",
    area: "Producción",
    centro_costo: "PROD-001",
    cargas_simples: 0,
    cargas_maternales: 0,
    cargas_invalidez: 0,
    es_pensionado: false,
    art22_excluido: false,
    discapacidad: false,
    pueblo_originario: false,
    activo: true,
    foto_url: "",
  },
  {
    id: 37,
    rut: "18.901.234-5",
    primer_nombre: "Ivan",
    segundo_nombre: "Martin",
    apellido_paterno: "Gonzalez",
    apellido_materno: "Pérez",
    fecha_nacimiento: "1995-01-30",
    sexo: "M",
    estado_civil: "Soltero",
    nacionalidad: "Chilena",
    email_personal: "ivan.gonzalez@gmail.com",
    email_corporativo: "igonzalez@empresa.cl",
    telefono_personal: "+56 9 3333 9876",
    telefono_oficina: "",
    direccion: "Calle Arturo Prat 456",
    comuna: "San Bernardo",
    ciudad: "Santiago",
    region: "Región Metropolitana",
    banco: "Banco BCI",
    tipo_cuenta: "Corriente",
    numero_cuenta: "12345678",
    afp: "PlanVital",
    afp_codigo: "04",
    salud_tipo: "fonasa",
    salud_nombre: "FONASA",
    plan_salud_uf: null,
    tipo_contrato: "Indefinido",
    fecha_inicio_contrato: "2022-08-01",
    fecha_termino_contrato: null,
    tipo_jornada: "Completa",
    horas_semanales: 45,
    sueldo_base: 580000,
    tipo_gratificacion: "Art. 50",
    cargo: "Bodeguero / Almacenista",
    area: "Logística",
    centro_costo: "LOG-001",
    cargas_simples: 0,
    cargas_maternales: 0,
    cargas_invalidez: 0,
    es_pensionado: false,
    art22_excluido: false,
    discapacidad: false,
    pueblo_originario: false,
    activo: true,
    foto_url: "",
  },
];

export const BANCOS = [
  "Banco de Chile",
  "BancoEstado",
  "Banco Santander",
  "Banco BCI",
  "Banco Itaú",
  "Scotiabank",
  "Banco Falabella",
  "Banco Security",
  "Banco BICE",
  "Banco Consorcio",
  "Banco Ripley",
  "Banco Internacional",
];

export const TIPOS_CUENTA = ["Corriente", "Vista", "Ahorro", "CuentaRUT"];

export const ESTADOS_CIVILES = [
  "Soltero",
  "Casado",
  "Divorciado",
  "Viudo",
  "Conviviente Civil",
];

export const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Región Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
];

export const TIPOS_CONTRATO = ["Indefinido", "Plazo Fijo", "Obra o Faena", "Honorarios"];
export const TIPOS_JORNADA = ["Completa", "Parcial", "Art. 22"];
export const TIPOS_GRATIFICACION = ["Art. 50", "Art. 47"];

export const ISAPRES = [
  "Banmédica",
  "Colmena",
  "Cruz Blanca",
  "Nueva Masvida",
  "Vida Tres",
  "Consalud",
  "Esencial",
];
