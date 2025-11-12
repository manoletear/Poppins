import { motion } from "motion/react";
import { FileText, Calculator, Shield, Check } from "lucide-react";
import { useState } from "react";

export function Solution() {
  const [activeModule, setActiveModule] = useState(0);

  const modules = [
    {
      title: "Contrato Inteligente",
      icon: FileText,
      tooltip: "Plantilla validada por Dirección del Trabajo y PreviRed.",
      visual: (
        <div className="space-y-3">
          <motion.div
            className="flex items-center gap-3 p-3 bg-white rounded-lg"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Check className="w-5 h-5" style={{ color: '#22C55E' }} />
            <span style={{ color: '#1B1B2F' }}>Campo autocompletado legal</span>
          </motion.div>
          <motion.div
            className="flex items-center gap-3 p-3 bg-white rounded-lg"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Check className="w-5 h-5" style={{ color: '#22C55E' }} />
            <span style={{ color: '#1B1B2F' }}>Validación en tiempo real</span>
          </motion.div>
          <motion.div
            className="flex items-center gap-3 p-3 bg-white rounded-lg"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Check className="w-5 h-5" style={{ color: '#22C55E' }} />
            <span style={{ color: '#1B1B2F' }}>Listo para firmar digitalmente</span>
          </motion.div>
        </div>
      )
    },
    {
      title: "Liquidaciones y Pagos",
      icon: Calculator,
      tooltip: "Cálculo automático de sueldo y cotizaciones",
      visual: (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span style={{ color: '#1B1B2F' }}>Sueldo Base</span>
              <span style={{ color: '#1B1B2F' }}>$450.000</span>
            </div>
            <div className="flex justify-between mb-2">
              <span style={{ color: '#1B1B2F' }}>AFP (10%)</span>
              <span style={{ color: '#1B1B2F' }}>$45.000</span>
            </div>
            <div className="flex justify-between mb-4">
              <span style={{ color: '#1B1B2F' }}>Salud (7%)</span>
              <span style={{ color: '#1B1B2F' }}>$31.500</span>
            </div>
            <motion.div
              className="h-2 rounded-full"
              style={{ background: '#EFE8FF' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#22C55E' }}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </motion.div>
          </div>
          <motion.button
            className="w-full py-3 rounded-lg text-white"
            style={{ background: '#F46BC1' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Enviar a PreviRed → Confirmado ✓
          </motion.button>
        </div>
      )
    },
    {
      title: "Cumplimiento Automático",
      icon: Shield,
      tooltip: "POPPINS paga, registra y notifica — siempre al día.",
      visual: (
        <div className="relative h-64 flex items-center justify-center">
          {/* Central Logo */}
          <motion.div
            className="absolute w-20 h-20 rounded-full flex items-center justify-center z-10"
            style={{ background: '#F46BC1' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>

          {/* Orbiting Logos */}
          {['AFP', 'Isapre', 'SII'].map((org, i) => (
            <motion.div
              key={org}
              className="absolute w-16 h-16 rounded-full flex items-center justify-center bg-white shadow-lg"
              style={{
                border: '2px solid #EFE8FF'
              }}
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
                delay: (i * 8) / 3
              }}
              style={{
                transformOrigin: '0 0',
                left: '50%',
                top: '50%',
                marginLeft: '-32px',
                marginTop: '-32px',
              }}
            >
              <motion.div
                animate={{
                  rotate: [0, -360],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear",
                  delay: (i * 8) / 3
                }}
                style={{
                  transform: `translate(${Math.cos((i * 2 * Math.PI) / 3) * 80}px, ${Math.sin((i * 2 * Math.PI) / 3) * 80}px)`
                }}
              >
                <span style={{ color: '#2D2D90' }}>{org}</span>
              </motion.div>
            </motion.div>
          ))}
        </div>
      )
    }
  ];

  return (
    <section id="solucion" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 style={{ color: '#2D2D90' }} className="mb-4">
            Legalidad sin Fricción
          </h2>
          <p style={{ color: '#1B1B2F' }}>
            Tres módulos que transforman la complejidad en simplicidad
          </p>
        </motion.div>

        {/* Module Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.button
                key={index}
                className="px-6 py-3 rounded-full flex items-center gap-2 transition-all"
                style={{
                  background: activeModule === index ? '#F46BC1' : '#EFE8FF',
                  color: activeModule === index ? '#FFFFFF' : '#2D2D90'
                }}
                onClick={() => setActiveModule(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-5 h-5" />
                {module.title}
              </motion.button>
            );
          })}
        </div>

        {/* Active Module Display */}
        <motion.div
          className="max-w-3xl mx-auto rounded-3xl p-8 relative overflow-hidden"
          style={{ background: '#FFD6EC' }}
          key={activeModule}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Tooltip */}
          <div className="mb-6 text-center">
            <p style={{ color: '#2D2D90' }}>
              {modules[activeModule].tooltip}
            </p>
          </div>

          {/* Visual */}
          <div className="min-h-[300px]">
            {modules[activeModule].visual}
          </div>
        </motion.div>
      </div>
    </section>
  );
}