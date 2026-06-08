// Template React-PDF para liquidación de sueldo (TCP Chile)
import React from 'react';
import path from 'path';
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from '@react-pdf/renderer';

// Ruta absoluta al logo — funciona en Node (API route)
const LOGO_PATH = path.join(process.cwd(), 'public', 'landing', 'logo-poppins.png');

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: 30, color: '#111' },
  title: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 12 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', backgroundColor: '#1a2e6e', color: '#fff', padding: '3 5', marginBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottom: '0.5 solid #e5e7eb' },
  rowLabel: { flex: 1, color: '#444' },
  rowValue: { width: 90, textAlign: 'right', fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, backgroundColor: '#f1f5f9', marginTop: 2 },
  totalLabel: { flex: 1, fontWeight: 'bold' },
  totalValue: { width: 90, textAlign: 'right', fontWeight: 'bold' },
  netBox: { backgroundColor: '#1a2e6e', color: '#fff', padding: '6 8', marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLabel: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  netValue: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  footer: { marginTop: 16, borderTop: '0.5 solid #ccc', paddingTop: 6, fontSize: 7, color: '#888', textAlign: 'center' },
  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  col: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 2 },
  infoLabel: { width: 90, color: '#666' },
  infoValue: { flex: 1, fontWeight: 'bold' },
  separator: { borderTop: '0.5 solid #ddd', marginVertical: 6 },
});

const CLP = (v: number) => `$${Math.round(v).toLocaleString('es-CL')}`;

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export interface LiquidacionData {
  period: string;                  // YYYY-MM
  // Empleador
  empleadorNombre: string;
  empleadorRut: string;
  // Trabajador
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo?: string;
  // Contrato
  sueldoBase: number;
  fechaIngreso: string;
  // Cálculos
  grossIncome: number;
  horasExtraValor: number;
  gratificacion: number;
  otrosHaberes: number;
  deductionAfp10: number;
  deductionAfpCommission: number;
  deductionHealth7: number;
  deductionHealthDiff: number;     // diferencia plan isapre
  deductionIncomeTax: number;
  deductionAdvances: number;
  deductionOther: number;
  netPay: number;
  paidDays: number;
  daysInMonth: number;
  afpNombre: string;
  saludNombre: string;
  ufValor?: number;
}

export function LiquidacionDocument({ data }: { data: LiquidacionData }) {
  const [y, m] = data.period.split('-').map(Number);
  const periodoLabel = `${MESES[m - 1]} ${y}`;

  const totalHaberes = data.grossIncome;
  const totalDescuentos =
    data.deductionAfp10 + data.deductionAfpCommission +
    data.deductionHealth7 + data.deductionHealthDiff +
    data.deductionIncomeTax + data.deductionAdvances + data.deductionOther;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header — título + logo */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <View>
            <Text style={styles.title}>Liquidación de Sueldo</Text>
            <Text style={styles.subtitle}>Período: {periodoLabel}</Text>
          </View>
          <Image src={LOGO_PATH} style={{ width: 90, height: 'auto', objectFit: 'contain' }} />
        </View>
        <View style={styles.twoCol}>
          {/* Empleador */}
          <View style={styles.col}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Empleador</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>{data.empleadorNombre}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>RUT</Text>
              <Text style={styles.infoValue}>{data.empleadorRut}</Text>
            </View>
          </View>

          {/* Trabajador */}
          <View style={styles.col}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Trabajador</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre</Text>
              <Text style={styles.infoValue}>{data.trabajadorNombre}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>RUT</Text>
              <Text style={styles.infoValue}>{data.trabajadorRut}</Text>
            </View>
            {data.cargo && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cargo</Text>
                <Text style={styles.infoValue}>{data.cargo}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ingreso</Text>
              <Text style={styles.infoValue}>{data.fechaIngreso}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Días trabajados</Text>
              <Text style={styles.infoValue}>{data.paidDays} / {data.daysInMonth}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AFP</Text>
              <Text style={styles.infoValue}>{data.afpNombre}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Salud</Text>
              <Text style={styles.infoValue}>{data.saludNombre}</Text>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.twoCol}>
          {/* Haberes */}
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Haberes</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sueldo base</Text>
              <Text style={styles.rowValue}>{CLP(data.sueldoBase)}</Text>
            </View>
            {data.horasExtraValor > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Horas extra</Text>
                <Text style={styles.rowValue}>{CLP(data.horasExtraValor)}</Text>
              </View>
            )}
            {data.gratificacion > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Gratificación legal</Text>
                <Text style={styles.rowValue}>{CLP(data.gratificacion)}</Text>
              </View>
            )}
            {data.otrosHaberes > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Otros haberes</Text>
                <Text style={styles.rowValue}>{CLP(data.otrosHaberes)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total haberes</Text>
              <Text style={styles.totalValue}>{CLP(totalHaberes)}</Text>
            </View>
          </View>

          {/* Descuentos */}
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Descuentos</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>AFP 10%</Text>
              <Text style={styles.rowValue}>{CLP(data.deductionAfp10)}</Text>
            </View>
            {data.deductionAfpCommission > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Comisión AFP</Text>
                <Text style={styles.rowValue}>{CLP(data.deductionAfpCommission)}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Salud 7%</Text>
              <Text style={styles.rowValue}>{CLP(data.deductionHealth7)}</Text>
            </View>
            {data.deductionHealthDiff > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Dif. plan salud</Text>
                <Text style={styles.rowValue}>{CLP(data.deductionHealthDiff)}</Text>
              </View>
            )}
            {data.deductionIncomeTax > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Imp. Único 2ª cat.</Text>
                <Text style={styles.rowValue}>{CLP(data.deductionIncomeTax)}</Text>
              </View>
            )}
            {data.deductionAdvances > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Anticipos</Text>
                <Text style={styles.rowValue}>{CLP(data.deductionAdvances)}</Text>
              </View>
            )}
            {data.deductionOther > 0 && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Otras deducciones</Text>
                <Text style={styles.rowValue}>{CLP(data.deductionOther)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total descuentos</Text>
              <Text style={styles.totalValue}>{CLP(totalDescuentos)}</Text>
            </View>
          </View>
        </View>

        {/* Líquido */}
        <View style={styles.netBox}>
          <Text style={styles.netLabel}>Líquido a Pagar</Text>
          <Text style={styles.netValue}>{CLP(data.netPay)}</Text>
        </View>

        {/* Footer firma */}
        <View style={{ flexDirection: 'row', gap: 30, marginTop: 40 }}>
          <View style={{ flex: 1, borderTop: '0.5 solid #666', paddingTop: 4, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>Firma Empleador</Text>
          </View>
          <View style={{ flex: 1, borderTop: '0.5 solid #666', paddingTop: 4, alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>Firma Trabajador</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Documento generado por Poppins · {new Date().toLocaleDateString('es-CL')}{data.ufValor ? ` · UF $${data.ufValor.toLocaleString('es-CL')}` : ''}
        </Text>
      </Page>
    </Document>
  );
}
