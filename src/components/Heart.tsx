import { motion } from "motion/react";
import { Brain, Scale, Database, Palette } from "lucide-react";

export function Heart() {
  const nodes = [
    {
      icon: Brain,
      role: "Head of AI",
      description: "Estrategia y aprendizaje continuo",
      color: "#2D2D90",
      position: { x: 0, y: -120 }
    },
    {
      icon: Scale,
      role: "Legal & Ethics Hub",
      description: "Cumplimiento y privacidad",
      color: "#F46BC1",
      position: { x: 120, y: 40 }
    },
    {
      icon: Database,
      role: "Data Pod",
      description: "Procesamiento de contratos y cotizaciones",
      color: "#FFD6EC",
      position: { x: -120, y: 40 }
    },
    {
      icon: Palette,
      role: "UX Squad",
      description: "Experiencia fluida para hogares y trabajadoras",
      color: "#EFE8FF",
      position: { x: 0, y: 120 }
    }
  ];

  return (
    <section className="py-24 px-6" style={{ background: '#EFE8FF' }}>
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 style={{ color: '#2D2D90' }} className="mb-6">
            IA con conciencia humana
          </h2>
          <p className="max-w-3xl mx-auto mb-4" style={{ color: '#1B1B2F' }}>
            Detrás de POPPINS™ hay un sistema cognitivo completo — no un algoritmo.<br />
            Un equipo que combina ética, precisión y empatía digital.
          </p>
        </motion.div>

        {/* Network Visualization */}
        <div className="relative max-w-4xl mx-auto h-[600px] flex items-center justify-center">
          {/* Central Hub */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full flex items-center justify-center z-20 shadow-2xl"
            style={{ 
              background: 'linear-gradient(135deg, #2D2D90 0%, #F46BC1 100%)',
            }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <span className="text-white">POPPINS™</span>
          </motion.div>

          {/* Connecting Lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {nodes.map((node, i) => (
              <motion.line
                key={i}
                x1="50%"
                y1="50%"
                x2={`calc(50% + ${node.position.x}px)`}
                y2={`calc(50% + ${node.position.y}px)`}
                stroke="url(#gradient)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.3 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.2 }}
              />
            ))}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2D2D90" />
                <stop offset="100%" stopColor="#F46BC1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <motion.div
                key={index}
                className="absolute left-1/2 top-1/2 z-10"
                style={{
                  marginLeft: `${node.position.x - 80}px`,
                  marginTop: `${node.position.y - 80}px`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                <motion.div
                  className="bg-white rounded-2xl p-6 shadow-xl w-40"
                  whileHover={{ scale: 1.1, zIndex: 30 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto"
                    style={{ 
                      background: node.color,
                      border: node.color === '#FFD6EC' || node.color === '#EFE8FF' 
                        ? '2px solid #2D2D90' 
                        : 'none'
                    }}
                  >
                    <Icon 
                      className="w-6 h-6" 
                      style={{ 
                        color: node.color === '#FFD6EC' || node.color === '#EFE8FF' 
                          ? '#2D2D90' 
                          : '#FFFFFF' 
                      }} 
                    />
                  </div>
                  <h4 
                    className="mb-2 text-center"
                    style={{ color: '#2D2D90' }}
                  >
                    {node.role}
                  </h4>
                  <p 
                    className="text-center"
                    style={{ color: '#1B1B2F', opacity: 0.7 }}
                  >
                    {node.description}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Tagline */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p style={{ color: '#2D2D90' }}>
            POPPINS™ combina la inteligencia del CoE con la calidez del hogar.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
