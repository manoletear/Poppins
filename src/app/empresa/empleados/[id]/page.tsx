'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Eye,
  X,
  FileText,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  Heart,
  DollarSign,
  Palmtree,
  PenLine,
  Printer,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

interface EmployeeData {
  id: number;
  nombre: string;
  iniciales: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  fechaNacimiento: string;
  labor: string;
  cargo: string;
  modalidad: string;
  horario: string;
  diasTrabajo: string;
  contrato: string;
  tipoContrato: string;
  sueldo: string;
  sueldoNum: number;
  afp: string;
  salud: string;
  fechaIngreso: string;
  estado: string;
  antiguedad: string;
  vacaciones: string;
  descripcionLabores: string;
}

const empleadosData: Record<string, EmployeeData> = {
  '1': {
    id: 1,
    nombre: 'María López Soto',
    iniciales: 'ML',
    color: 'bg-rose-500',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-rose-600',
    rut: '15.234.567-8',
    email: 'maria.lopez@email.com',
    telefono: '+56 9 8765 4321',
    direccion: 'Av. Las Condes 1234, Las Condes, Santiago',
    fechaNacimiento: '15/03/1988',
    labor: 'Empleada Doméstica',
    cargo: 'Empleada Doméstica',
    modalidad: 'Puertas Afuera',
    horario: '08:00 - 17:00',
    diasTrabajo: 'Lunes a Viernes',
    contrato: '#PA-2024-001',
    tipoContrato: 'Indefinido',
    sueldo: '$650.000',
    sueldoNum: 650000,
    afp: 'AFP Habitat',
    salud: 'Fonasa',
    fechaIngreso: '01/02/2024',
    estado: 'Activa',
    antiguedad: '2 años, 1 mes',
    vacaciones: '8.5 días',
    descripcionLabores:
      'Realizar labores de aseo, orden, preparación de alimentos, lavado y planchado de ropa, y demás tareas propias del hogar.',
  },
  '2': {
    id: 2,
    nombre: 'Juan Pérez González',
    iniciales: 'JP',
    color: 'bg-emerald-500',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-600',
    rut: '16.789.012-3',
    email: 'juan.perez@email.com',
    telefono: '+56 9 1234 5678',
    direccion: 'Calle Los Aromos 567, Providencia, Santiago',
    fechaNacimiento: '22/07/1990',
    labor: 'Jardinero',
    cargo: 'Jardinero',
    modalidad: 'Puertas Afuera',
    horario: '08:00 - 13:00',
    diasTrabajo: 'Lunes, Miércoles y Viernes',
    contrato: '#PA-2024-002',
    tipoContrato: 'Indefinido',
    sueldo: '$350.000',
    sueldoNum: 350000,
    afp: 'AFP ProVida',
    salud: 'Fonasa',
    fechaIngreso: '15/09/2024',
    estado: 'Activo',
    antiguedad: '1 año, 6 meses',
    vacaciones: '5 días',
    descripcionLabores:
      'Mantenimiento de jardines, poda de árboles y arbustos, riego, limpieza de áreas verdes y trabajos de paisajismo general.',
  },
  '3': {
    id: 3,
    nombre: 'Pedro Soto Muñoz',
    iniciales: 'PS',
    color: 'bg-cyan-500',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-cyan-600',
    rut: '17.456.789-0',
    email: 'pedro.soto@email.com',
    telefono: '+56 9 5678 1234',
    direccion: 'Pasaje El Roble 89, Ñuñoa, Santiago',
    fechaNacimiento: '10/11/1985',
    labor: 'Piscinero',
    cargo: 'Piscinero',
    modalidad: 'Puertas Afuera',
    horario: '09:00 - 11:00',
    diasTrabajo: 'Martes y Sábado',
    contrato: '#PA-2024-003',
    tipoContrato: 'Plazo Fijo',
    sueldo: '$250.000',
    sueldoNum: 250000,
    afp: 'AFP Capital',
    salud: 'Fonasa',
    fechaIngreso: '01/07/2025',
    estado: 'Activo',
    antiguedad: '8 meses',
    vacaciones: '3 días',
    descripcionLabores:
      'Limpieza y mantenimiento de piscina, control de pH y cloro, limpieza de filtros, y mantención general del área de piscina.',
  },
};

interface MockLiquidacion {
  id: number;
  periodo: string;
  sueldoBase: number;
  gratificacion: number;
  bonos: number;
  colacion: number;
  movilizacion: number;
  horasExtra: number;
  totalHaberes: number;
  descAfp: number;
  descSalud: number;
  descCesantia: number;
  impuestoUnico: number;
  totalDescuentos: number;
  liquido: number;
  estado: string;
}

function generateLiquidaciones(sueldoBase: number): MockLiquidacion[] {
  const periodos = [
    'Marzo 2026',
    'Febrero 2026',
    'Enero 2026',
    'Diciembre 2025',
    'Noviembre 2025',
    'Octubre 2025',
  ];
  return periodos.map((periodo, i) => {
    const gratificacion = Math.round(sueldoBase * 0.25);
    const bonos = i === 3 ? 50000 : 0; // Bono en diciembre
    const colacion = 30000;
    const movilizacion = 20000;
    const horasExtra = i % 2 === 0 ? Math.round(sueldoBase / 30 / 8 * 1.5 * 4) : 0;
    const totalHaberes = sueldoBase + gratificacion + bonos + colacion + movilizacion + horasExtra;
    const descAfp = Math.round(sueldoBase * 0.1143);
    const descSalud = Math.round(sueldoBase * 0.07);
    const descCesantia = Math.round(sueldoBase * 0.006);
    const baseImponible = sueldoBase - descAfp - descSalud - descCesantia;
    const impuestoUnico = baseImponible > 800000 ? Math.round(baseImponible * 0.04) : 0;
    const totalDescuentos = descAfp + descSalud + descCesantia + impuestoUnico;
    const liquido = totalHaberes - totalDescuentos;

    return {
      id: i + 1,
      periodo,
      sueldoBase,
      gratificacion,
      bonos,
      colacion,
      movilizacion,
      horasExtra,
      totalHaberes,
      descAfp,
      descSalud,
      descCesantia,
      impuestoUnico,
      totalDescuentos,
      liquido,
      estado: i === 0 ? 'Pendiente' : 'Pagada',
    };
  });
}

interface AsistenciaRow {
  fecha: string;
  entrada: string;
  salida: string;
  horas: string;
  estado: string;
}

function generateAsistencia(): AsistenciaRow[] {
  const rows: AsistenciaRow[] = [];
  for (let d = 1; d <= 15; d++) {
    const day = d.toString().padStart(2, '0');
    const dayOfWeek = new Date(2026, 2, d).getDay(); // March 2026
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
    const lateEntrada = d === 5 || d === 12;
    const ausente = d === 10;
    rows.push({
      fecha: `${day}/03/2026`,
      entrada: ausente ? '-' : lateEntrada ? '08:15' : '08:00',
      salida: ausente ? '-' : '17:00',
      horas: ausente ? '0' : lateEntrada ? '8.75' : '9',
      estado: ausente ? 'Ausente' : lateEntrada ? 'Atraso' : 'Normal',
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// PDF / Print helpers
// ---------------------------------------------------------------------------

function formatCLP(amount: number): string {
  return '$' + amount.toLocaleString('es-CL');
}

function downloadContractPDF(employee: EmployeeData) {
  const contractHTML = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Contrato de Trabajo - ${employee.nombre}</title>
      <style>
        @media print {
          body { margin: 0; }
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          max-width: 700px;
          margin: 40px auto;
          padding: 40px;
          line-height: 1.7;
          color: #1a1a1a;
          font-size: 14px;
        }
        h1 {
          text-align: center;
          font-size: 22px;
          margin-bottom: 30px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        h2 {
          font-size: 15px;
          margin-top: 24px;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .parties {
          margin-bottom: 24px;
        }
        .clause {
          margin-bottom: 16px;
          text-align: justify;
        }
        .signatures {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
        }
        .signature-block {
          text-align: center;
          width: 45%;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-top: 60px;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <h1>Contrato de Trabajo</h1>
      <p class="parties">
        En Santiago de Chile, a ${employee.fechaIngreso}, entre <strong>Rene Alejandro Aravena Riffo</strong>,
        RUT <strong>6.836.579-1</strong>, domiciliado en Av. Las Condes 1234, Las Condes, Santiago,
        en adelante "el Empleador", y <strong>${employee.nombre}</strong>,
        RUT <strong>${employee.rut}</strong>, domiciliado(a) en ${employee.direccion},
        en adelante "el(la) Trabajador(a)", se ha convenido el siguiente contrato de trabajo:
      </p>

      <h2>PRIMERO: Naturaleza de los Servicios</h2>
      <p class="clause">
        El(la) Trabajador(a) se compromete a desempeñar el cargo de <strong>${employee.cargo}</strong>,
        realizando las siguientes labores: ${employee.descripcionLabores}
      </p>

      <h2>SEGUNDO: Lugar de Trabajo</h2>
      <p class="clause">
        Los servicios serán prestados en el domicilio del Empleador ubicado en
        Av. Las Condes 1234, Las Condes, Santiago, bajo la modalidad de <strong>${employee.modalidad}</strong>.
      </p>

      <h2>TERCERO: Jornada de Trabajo</h2>
      <p class="clause">
        La jornada de trabajo será de <strong>${employee.diasTrabajo}</strong>,
        en horario de <strong>${employee.horario}</strong>, respetando los límites establecidos
        en el Código del Trabajo para trabajadores(as) de casa particular.
      </p>

      <h2>CUARTO: Remuneración</h2>
      <p class="clause">
        El Empleador se compromete a pagar al(la) Trabajador(a) una remuneración mensual de
        <strong>${employee.sueldo}</strong> (pesos chilenos), que incluye el sueldo base.
        Adicionalmente, se pagará gratificación legal equivalente al 25% del sueldo base mensual,
        con tope de 4,75 Ingresos Mínimos Mensuales dividido por 12.
        La remuneración será pagada por transferencia bancaria dentro de los primeros 5 días hábiles del mes siguiente.
      </p>

      <h2>QUINTO: Duración del Contrato</h2>
      <p class="clause">
        El presente contrato es de carácter <strong>${employee.tipoContrato}</strong>,
        con fecha de inicio el <strong>${employee.fechaIngreso}</strong>.
        ${employee.tipoContrato === 'Plazo Fijo' ? 'El contrato tendrá una duración de 12 meses, pudiendo ser renovado por acuerdo de ambas partes.' : ''}
      </p>

      <h2>SEXTO: Cotizaciones Previsionales</h2>
      <p class="clause">
        El Empleador se obliga a efectuar las cotizaciones previsionales del(la) Trabajador(a) conforme a la ley:
        <br />- AFP: <strong>${employee.afp}</strong>
        <br />- Salud: <strong>${employee.salud}</strong>
        <br />- Seguro de Cesantía: según normativa vigente
      </p>

      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line">
            <strong>Rene Alejandro Aravena Riffo</strong><br />
            RUT: 6.836.579-1<br />
            Empleador
          </div>
        </div>
        <div class="signature-block">
          <div class="signature-line">
            <strong>${employee.nombre}</strong><br />
            RUT: ${employee.rut}<br />
            Trabajador(a)
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(contractHTML);
    printWindow.document.close();
    printWindow.print();
  }
}

function downloadLiquidacionPDF(employee: EmployeeData, liq: MockLiquidacion) {
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Liquidación ${liq.periodo} - ${employee.nombre}</title>
      <style>
        @media print { body { margin: 0; } }
        body {
          font-family: Arial, Helvetica, sans-serif;
          max-width: 700px;
          margin: 30px auto;
          padding: 30px;
          color: #1a1a1a;
          font-size: 13px;
        }
        h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px; }
        .info-grid div { font-size: 13px; }
        .info-grid strong { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e5e7eb; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .amount { text-align: right; font-variant-numeric: tabular-nums; }
        .total-row { font-weight: bold; background: #f9fafb; }
        .final-row { font-size: 16px; font-weight: bold; background: #ecfdf5; }
        .section-title { font-weight: bold; font-size: 14px; margin: 20px 0 8px; color: #333; }
      </style>
    </head>
    <body>
      <h1>Liquidación de Sueldo</h1>
      <p class="subtitle">${liq.periodo}</p>

      <div class="info-grid">
        <div><strong>Empleador:</strong> Rene Alejandro Aravena Riffo</div>
        <div><strong>RUT Empleador:</strong> 6.836.579-1</div>
        <div><strong>Trabajador(a):</strong> ${employee.nombre}</div>
        <div><strong>RUT:</strong> ${employee.rut}</div>
        <div><strong>Cargo:</strong> ${employee.cargo}</div>
        <div><strong>Fecha Ingreso:</strong> ${employee.fechaIngreso}</div>
      </div>

      <p class="section-title">Haberes</p>
      <table>
        <thead><tr><th>Concepto</th><th class="amount">Monto</th></tr></thead>
        <tbody>
          <tr><td>Sueldo Base</td><td class="amount">${formatCLP(liq.sueldoBase)}</td></tr>
          <tr><td>Gratificación Legal</td><td class="amount">${formatCLP(liq.gratificacion)}</td></tr>
          ${liq.bonos > 0 ? `<tr><td>Bonos</td><td class="amount">${formatCLP(liq.bonos)}</td></tr>` : ''}
          <tr><td>Colación</td><td class="amount">${formatCLP(liq.colacion)}</td></tr>
          <tr><td>Movilización</td><td class="amount">${formatCLP(liq.movilizacion)}</td></tr>
          ${liq.horasExtra > 0 ? `<tr><td>Horas Extra</td><td class="amount">${formatCLP(liq.horasExtra)}</td></tr>` : ''}
          <tr class="total-row"><td>Total Haberes</td><td class="amount">${formatCLP(liq.totalHaberes)}</td></tr>
        </tbody>
      </table>

      <p class="section-title">Descuentos</p>
      <table>
        <thead><tr><th>Concepto</th><th class="amount">Monto</th></tr></thead>
        <tbody>
          <tr><td>AFP (${employee.afp})</td><td class="amount">${formatCLP(liq.descAfp)}</td></tr>
          <tr><td>Salud (${employee.salud})</td><td class="amount">${formatCLP(liq.descSalud)}</td></tr>
          <tr><td>Seguro Cesantía</td><td class="amount">${formatCLP(liq.descCesantia)}</td></tr>
          ${liq.impuestoUnico > 0 ? `<tr><td>Impuesto Único</td><td class="amount">${formatCLP(liq.impuestoUnico)}</td></tr>` : ''}
          <tr class="total-row"><td>Total Descuentos</td><td class="amount">${formatCLP(liq.totalDescuentos)}</td></tr>
        </tbody>
      </table>

      <table>
        <tbody>
          <tr class="final-row"><td>SUELDO LÍQUIDO</td><td class="amount">${formatCLP(liq.liquido)}</td></tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type TabKey = 'resumen' | 'contrato' | 'liquidaciones' | 'asistencia' | 'documentos';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'contrato', label: 'Contrato' },
  { key: 'liquidaciones', label: 'Liquidaciones' },
  { key: 'asistencia', label: 'Asistencia' },
  { key: 'documentos', label: 'Documentos' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmpleadoDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [expandedLiq, setExpandedLiq] = useState<number | null>(null);

  const employee = empleadosData[id];

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertCircle className="h-12 w-12 text-zinc-300" />
        <p className="text-zinc-500 text-lg">Empleado no encontrado</p>
        <Link
          href="/empresa/empleados"
          className="text-sm text-blue-600 hover:underline"
        >
          Volver a Mis Colaboradores
        </Link>
      </div>
    );
  }

  const liquidaciones = generateLiquidaciones(employee.sueldoNum);
  const asistencia = generateAsistencia();

  // Documents mock
  const documentos = [
    { nombre: 'Contrato de Trabajo', tipo: 'PDF', fecha: employee.fechaIngreso, canGenerate: false },
    { nombre: 'Liquidación Marzo 2026', tipo: 'PDF', fecha: '05/04/2026', canGenerate: false },
    { nombre: 'Liquidación Febrero 2026', tipo: 'PDF', fecha: '05/03/2026', canGenerate: false },
    { nombre: 'Certificado AFP', tipo: 'PDF', fecha: '01/03/2026', canGenerate: false },
    { nombre: 'Certificado Antigüedad', tipo: 'PDF', fecha: '15/03/2026', canGenerate: true },
  ];

  function handleDocumentDownload(docName: string) {
    if (docName.startsWith('Contrato')) {
      downloadContractPDF(employee);
    } else if (docName.startsWith('Liquidación')) {
      const liq = docName.includes('Marzo') ? liquidaciones[0] : liquidaciones[1];
      downloadLiquidacionPDF(employee, liq);
    } else {
      // For certificates, generate a simple printable page
      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${docName} - ${employee.nombre}</title>
          <style>
            @media print { body { margin: 0; } }
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 40px; text-align: center; }
            h1 { font-size: 20px; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px; }
            .content { text-align: left; line-height: 1.8; margin: 30px 0; }
            .signature { margin-top: 80px; border-top: 1px solid #333; display: inline-block; padding-top: 8px; min-width: 250px; }
          </style>
        </head>
        <body>
          <h1>${docName}</h1>
          <div class="content">
            <p>Se certifica que <strong>${employee.nombre}</strong>, RUT <strong>${employee.rut}</strong>,
            se desempeña como <strong>${employee.cargo}</strong> bajo contrato ${employee.tipoContrato.toLowerCase()}
            desde el <strong>${employee.fechaIngreso}</strong>.</p>
            <p>Antigüedad: <strong>${employee.antiguedad}</strong></p>
            <p>Se extiende el presente certificado a petición del interesado(a) para los fines que estime conveniente.</p>
            <p>Santiago, 20 de Marzo de 2026.</p>
          </div>
          <div class="signature">
            <strong>Rene Alejandro Aravena Riffo</strong><br />
            RUT: 6.836.579-1<br />
            Empleador
          </div>
        </body>
        </html>
      `;
      const pw = window.open('', '_blank');
      if (pw) {
        pw.document.write(html);
        pw.document.close();
        pw.print();
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <Link
          href="/empresa/empleados"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Mis Colaboradores
        </Link>

        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${employee.gradientFrom} ${employee.gradientTo} text-lg font-bold text-white`}
          >
            {employee.iniciales}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900">{employee.nombre}</h1>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {employee.estado}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {employee.cargo} &middot; {employee.modalidad}
            </p>
          </div>
        </div>
      </div>

      {/* ---- Tab bar ---- */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ---- Tab content ---- */}

      {/* ============ RESUMEN ============ */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal info */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Información Personal</h2>
            <dl className="space-y-3 text-sm">
              {[
                { icon: <FileText className="h-4 w-4" />, label: 'RUT', value: employee.rut },
                { icon: <Mail className="h-4 w-4" />, label: 'Email', value: employee.email },
                { icon: <Phone className="h-4 w-4" />, label: 'Teléfono', value: employee.telefono },
                { icon: <MapPin className="h-4 w-4" />, label: 'Dirección', value: employee.direccion },
                { icon: <Calendar className="h-4 w-4" />, label: 'Fecha de Nacimiento', value: employee.fechaNacimiento },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-zinc-400 mt-0.5">{item.icon}</span>
                  <div>
                    <dt className="text-zinc-500">{item.label}</dt>
                    <dd className="text-zinc-900 font-medium">{item.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {/* Labor info */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-semibold text-zinc-900 mb-4">Información Laboral</h2>
            <dl className="space-y-3 text-sm">
              {[
                { icon: <Briefcase className="h-4 w-4" />, label: 'Cargo', value: employee.cargo },
                { icon: <Clock className="h-4 w-4" />, label: 'Modalidad', value: employee.modalidad },
                { icon: <Clock className="h-4 w-4" />, label: 'Horario', value: `${employee.diasTrabajo}, ${employee.horario}` },
                { icon: <DollarSign className="h-4 w-4" />, label: 'Sueldo Base', value: employee.sueldo },
                { icon: <Shield className="h-4 w-4" />, label: 'AFP', value: employee.afp },
                { icon: <Heart className="h-4 w-4" />, label: 'Salud', value: employee.salud },
                { icon: <Calendar className="h-4 w-4" />, label: 'Fecha de Ingreso', value: employee.fechaIngreso },
                { icon: <Calendar className="h-4 w-4" />, label: 'Antigüedad', value: employee.antiguedad },
                { icon: <Palmtree className="h-4 w-4" />, label: 'Vacaciones Pendientes', value: employee.vacaciones },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-zinc-400 mt-0.5">{item.icon}</span>
                  <div>
                    <dt className="text-zinc-500">{item.label}</dt>
                    <dd className="text-zinc-900 font-medium">{item.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* ============ CONTRATO ============ */}
      {activeTab === 'contrato' && (
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => downloadContractPDF(employee)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              <Download className="h-4 w-4" />
              Descargar Contrato PDF
            </button>
            <button
              disabled
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-400 cursor-not-allowed"
              title="Próximamente"
            >
              <PenLine className="h-4 w-4" />
              Firmar Digitalmente
            </button>
          </div>

          {/* Contract display */}
          <div className="rounded-xl border border-zinc-200 bg-white p-8 lg:p-12 max-w-3xl">
            <h2 className="text-center text-xl font-bold tracking-widest text-zinc-900 mb-8 font-serif uppercase">
              Contrato de Trabajo
            </h2>

            <p className="text-sm text-zinc-700 leading-relaxed mb-6 font-serif">
              En Santiago de Chile, a {employee.fechaIngreso}, entre{' '}
              <strong>Rene Alejandro Aravena Riffo</strong>, RUT <strong>6.836.579-1</strong>,
              domiciliado en Av. Las Condes 1234, Las Condes, Santiago, en adelante
              &quot;el Empleador&quot;, y <strong>{employee.nombre}</strong>, RUT{' '}
              <strong>{employee.rut}</strong>, domiciliado(a) en {employee.direccion}, en adelante
              &quot;el(la) Trabajador(a)&quot;, se ha convenido el siguiente contrato de trabajo:
            </p>

            {[
              {
                title: 'PRIMERO: Naturaleza de los Servicios',
                body: `El(la) Trabajador(a) se compromete a desempeñar el cargo de ${employee.cargo}, realizando las siguientes labores: ${employee.descripcionLabores}`,
              },
              {
                title: 'SEGUNDO: Lugar de Trabajo',
                body: `Los servicios serán prestados en el domicilio del Empleador ubicado en Av. Las Condes 1234, Las Condes, Santiago, bajo la modalidad de ${employee.modalidad}.`,
              },
              {
                title: 'TERCERO: Jornada de Trabajo',
                body: `La jornada de trabajo será de ${employee.diasTrabajo}, en horario de ${employee.horario}, respetando los límites establecidos en el Código del Trabajo para trabajadores(as) de casa particular.`,
              },
              {
                title: 'CUARTO: Remuneración',
                body: `El Empleador se compromete a pagar al(la) Trabajador(a) una remuneración mensual de ${employee.sueldo} (pesos chilenos), que incluye el sueldo base. Adicionalmente, se pagará gratificación legal equivalente al 25% del sueldo base mensual, con tope de 4,75 Ingresos Mínimos Mensuales dividido por 12. La remuneración será pagada por transferencia bancaria dentro de los primeros 5 días hábiles del mes siguiente.`,
              },
              {
                title: 'QUINTO: Duración del Contrato',
                body: `El presente contrato es de carácter ${employee.tipoContrato}, con fecha de inicio el ${employee.fechaIngreso}. ${employee.tipoContrato === 'Plazo Fijo' ? 'El contrato tendrá una duración de 12 meses, pudiendo ser renovado por acuerdo de ambas partes.' : ''}`,
              },
              {
                title: 'SEXTO: Cotizaciones Previsionales',
                body: `El Empleador se obliga a efectuar las cotizaciones previsionales del(la) Trabajador(a) conforme a la ley:\n- AFP: ${employee.afp}\n- Salud: ${employee.salud}\n- Seguro de Cesantía: según normativa vigente`,
              },
            ].map((clause) => (
              <div key={clause.title} className="mb-6">
                <h3 className="text-sm font-bold text-zinc-900 mb-2 font-serif uppercase">
                  {clause.title}
                </h3>
                <p className="text-sm text-zinc-700 leading-relaxed font-serif whitespace-pre-line text-justify">
                  {clause.body}
                </p>
              </div>
            ))}

            {/* Signatures */}
            <div className="flex justify-between mt-16 pt-4">
              <div className="text-center w-[45%]">
                <div className="border-t border-zinc-400 pt-2 mt-16">
                  <p className="text-sm font-bold text-zinc-900">Rene Alejandro Aravena Riffo</p>
                  <p className="text-xs text-zinc-500">RUT: 6.836.579-1</p>
                  <p className="text-xs text-zinc-500">Empleador</p>
                </div>
              </div>
              <div className="text-center w-[45%]">
                <div className="border-t border-zinc-400 pt-2 mt-16">
                  <p className="text-sm font-bold text-zinc-900">{employee.nombre}</p>
                  <p className="text-xs text-zinc-500">RUT: {employee.rut}</p>
                  <p className="text-xs text-zinc-500">Trabajador(a)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ LIQUIDACIONES ============ */}
      {activeTab === 'liquidaciones' && (
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="text-left px-4 py-3 font-medium text-zinc-500">Período</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500">Sueldo Bruto</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500">Descuentos</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-500">Líquido</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-500">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {liquidaciones.map((liq) => (
                  <>
                    <tr
                      key={liq.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">{liq.periodo}</td>
                      <td className="px-4 py-3 text-right text-zinc-700 tabular-nums">
                        {formatCLP(liq.totalHaberes)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums">
                        -{formatCLP(liq.totalDescuentos)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-900 tabular-nums">
                        {formatCLP(liq.liquido)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            liq.estado === 'Pagada'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {liq.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedLiq(expandedLiq === liq.id ? null : liq.id)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                          >
                            {expandedLiq === liq.id ? (
                              <X className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            {expandedLiq === liq.id ? 'Cerrar' : 'Ver'}
                          </button>
                          <button
                            onClick={() => downloadLiquidacionPDF(employee, liq)}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {expandedLiq === liq.id && (
                      <tr key={`detail-${liq.id}`}>
                        <td colSpan={6} className="px-4 py-4 bg-zinc-50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                            {/* Haberes */}
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                                Haberes
                              </h4>
                              <dl className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                  <dt className="text-zinc-600">Sueldo Base</dt>
                                  <dd className="text-zinc-900 tabular-nums">{formatCLP(liq.sueldoBase)}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-zinc-600">Gratificación</dt>
                                  <dd className="text-zinc-900 tabular-nums">{formatCLP(liq.gratificacion)}</dd>
                                </div>
                                {liq.bonos > 0 && (
                                  <div className="flex justify-between">
                                    <dt className="text-zinc-600">Bonos</dt>
                                    <dd className="text-zinc-900 tabular-nums">{formatCLP(liq.bonos)}</dd>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <dt className="text-zinc-600">Colación</dt>
                                  <dd className="text-zinc-900 tabular-nums">{formatCLP(liq.colacion)}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-zinc-600">Movilización</dt>
                                  <dd className="text-zinc-900 tabular-nums">{formatCLP(liq.movilizacion)}</dd>
                                </div>
                                {liq.horasExtra > 0 && (
                                  <div className="flex justify-between">
                                    <dt className="text-zinc-600">Horas Extra</dt>
                                    <dd className="text-zinc-900 tabular-nums">{formatCLP(liq.horasExtra)}</dd>
                                  </div>
                                )}
                                <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-semibold">
                                  <dt className="text-zinc-900">Total Haberes</dt>
                                  <dd className="text-zinc-900 tabular-nums">{formatCLP(liq.totalHaberes)}</dd>
                                </div>
                              </dl>
                            </div>

                            {/* Descuentos */}
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                                Descuentos
                              </h4>
                              <dl className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                  <dt className="text-zinc-600">AFP</dt>
                                  <dd className="text-red-600 tabular-nums">-{formatCLP(liq.descAfp)}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-zinc-600">Salud</dt>
                                  <dd className="text-red-600 tabular-nums">-{formatCLP(liq.descSalud)}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-zinc-600">Cesantía</dt>
                                  <dd className="text-red-600 tabular-nums">-{formatCLP(liq.descCesantia)}</dd>
                                </div>
                                {liq.impuestoUnico > 0 && (
                                  <div className="flex justify-between">
                                    <dt className="text-zinc-600">Impuesto Único</dt>
                                    <dd className="text-red-600 tabular-nums">-{formatCLP(liq.impuestoUnico)}</dd>
                                  </div>
                                )}
                                <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-semibold">
                                  <dt className="text-zinc-900">Total Descuentos</dt>
                                  <dd className="text-red-600 tabular-nums">-{formatCLP(liq.totalDescuentos)}</dd>
                                </div>
                              </dl>
                            </div>

                            {/* Totales */}
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2">
                                Resultado
                              </h4>
                              <div className="rounded-lg bg-emerald-50 p-4">
                                <p className="text-xs text-emerald-600 font-medium">Sueldo Líquido</p>
                                <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                                  {formatCLP(liq.liquido)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ ASISTENCIA ============ */}
      {activeTab === 'asistencia' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Marzo 2026</h2>
            <span className="text-sm text-zinc-500">
              {asistencia.length} días registrados
            </span>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="text-left px-4 py-3 font-medium text-zinc-500">Fecha</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-500">Entrada</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-500">Salida</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-500">Horas</th>
                    <th className="text-center px-4 py-3 font-medium text-zinc-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {asistencia.map((row) => (
                    <tr
                      key={row.fecha}
                      className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900">{row.fecha}</td>
                      <td className="px-4 py-3 text-center text-zinc-700">{row.entrada}</td>
                      <td className="px-4 py-3 text-center text-zinc-700">{row.salida}</td>
                      <td className="px-4 py-3 text-center text-zinc-700">{row.horas}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.estado === 'Normal'
                              ? 'bg-emerald-50 text-emerald-700'
                              : row.estado === 'Atraso'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {row.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============ DOCUMENTOS ============ */}
      {activeTab === 'documentos' && (
        <div className="space-y-3">
          {documentos.map((doc) => (
            <div
              key={doc.nombre}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <FileText className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{doc.nombre}</p>
                  <p className="text-xs text-zinc-500">
                    {doc.tipo} &middot; {doc.fecha}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.canGenerate && (
                  <button
                    onClick={() => handleDocumentDownload(doc.nombre)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Generar Nuevo
                  </button>
                )}
                <button
                  onClick={() => handleDocumentDownload(doc.nombre)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
