import { motion } from "motion/react";
import { FileCheck, Building2, Shield } from "lucide-react";

export function Security() {
  const connections = [
    {
      icon: Building2,
      name: "SII",
      description: "Declaraciones automáticas"
    },
    {
      icon: Shield,
      name: "PreviRed",
      description: "Imposiciones previsionales"
    },
    {
      icon: FileCheck,
      name: "Dirección del Trabajo",
      description: "Registro de contratos"
    }
  ];

  return (
    <section id="seguridad" className="py-24 px-6 relative overflow-hidden" style={{ background: '#2D2D90' }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, #FFFFFF 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-white mb-6">
            Legalidad real. Privacidad real. Tranquilidad real.
          </h2>
          <p className="text-white/80 max-w-3xl mx-auto">
            POPPINS™ se conecta directamente con las instituciones que importan
          </p>
        </motion.div>

        {/* Radial Diagram */}
        <div className="relative max-w-4xl mx-auto h-[500px] flex items-center justify-center">
          {/* Central Hub */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full flex flex-col items-center justify-center z-20 shadow-2xl"
            style={{ background: '#F46BC1' }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(244, 107, 193, 0.5)',
                '0 0 40px rgba(244, 107, 193, 0.8)',
                '0 0 20px rgba(244, 107, 193, 0.5)',
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Shield className="w-12 h-12 text-white mb-2" />
            <span className="text-white">POPPINS™</span>
          </motion.div>

          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {connections.map((_, i) => {
              const angle = (i * 2 * Math.PI) / connections.length - Math.PI / 2;
              const x = Math.cos(angle) * 180;
              const y = Math.sin(angle) * 180;
              
              return (
                <motion.line
                  key={i}
                  x1="50%"
                  y1="50%"
                  x2={`calc(50% + ${x}px)`}
                  y2={`calc(50% + ${y}px)`}
                  stroke="#FFD6EC"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.5 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.3 }}
                />
              );
            })}
          </svg>

          {/* Connected Entities */}
          {connections.map((connection, index) => {
            const angle = (index * 2 * Math.PI) / connections.length - Math.PI / 2;
            const x = Math.cos(angle) * 180;
            const y = Math.sin(angle) * 180;
            const Icon = connection.icon;
            
            return (
              <motion.div
                key={index}
                className="absolute left-1/2 top-1/2 z-10"
                style={{
                  marginLeft: `${x - 90}px`,
                  marginTop: `${y - 60}px`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.3 }}
              >
                <motion.div
                  className="bg-white rounded-2xl p-6 w-48 shadow-xl"
                  whileHover={{ scale: 1.1, zIndex: 30 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto"
                    style={{ background: '#FFD6EC' }}
                  >
                    <Icon className="w-6 h-6" style={{ color: '#2D2D90' }} />
                  </div>
                  <h4 className="text-center mb-2" style={{ color: '#2D2D90' }}>
                    {connection.name}
                  </h4>
                  <p className="text-center" style={{ color: '#1B1B2F', opacity: 0.7 }}>
                    {connection.description}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Microcopy */}
        <motion.div
          className="text-center mt-16 space-y-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-white/90">
            Infraestructura certificada.
          </p>
          <p className="text-white/90">
            Tus datos, solo tuyos.
          </p>
        </motion.div>
      </div>
    </section>
  );
}