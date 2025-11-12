import { motion } from "motion/react";
import { Clock, DollarSign, Frown } from "lucide-react";
import { useState } from "react";

export function Problem() {
  const [hoveredIcon, setHoveredIcon] = useState<number | null>(null);

  const problems = [
    {
      icon: Clock,
      title: "Horas perdidas en trámites y planillas",
      description: "El tiempo que podrías dedicar a tu familia",
      color: "#F46BC1"
    },
    {
      icon: DollarSign,
      title: "Errores en pagos, cotizaciones o vacaciones",
      description: "Cálculos complejos que generan incertidumbre",
      color: "#FFD6EC"
    },
    {
      icon: Frown,
      title: "Miedo a multas o sanciones",
      description: "La preocupación constante de no estar cumpliendo",
      color: "#F46BC1"
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
          <h2 style={{ color: '#1B1B2F' }} className="mb-6">
            Cuando hacer las cosas bien parece imposible
          </h2>
          <p className="max-w-3xl mx-auto" style={{ color: '#1B1B2F' }}>
            En Chile, <strong>3 de cada 4 relaciones laborales domésticas son informales</strong>.<br />
            No por falta de voluntad, sino por falta de simplicidad.
          </p>
        </motion.div>

        {/* Problem Icons */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            const isHovered = hoveredIcon === index;
            
            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onHoverStart={() => setHoveredIcon(index)}
                onHoverEnd={() => setHoveredIcon(null)}
              >
                <div className="bg-white rounded-2xl p-8 text-center shadow-lg transition-all hover:shadow-xl">
                  {/* Animated Icon */}
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ background: problem.color }}
                    animate={
                      index === 0 
                        ? { rotate: [0, 360] }
                        : index === 1
                        ? { y: [0, -10, 0] }
                        : isHovered 
                        ? { scale: [1, 1.1, 1] }
                        : {}
                    }
                    transition={
                      index === 0
                        ? { duration: 3, repeat: Infinity, ease: "linear" }
                        : index === 1
                        ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.5 }
                    }
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </motion.div>

                  {/* Text */}
                  <h3 className="mb-3" style={{ color: '#1B1B2F' }}>
                    {problem.title}
                  </h3>
                  <p style={{ color: '#1B1B2F', opacity: 0.7 }}>
                    {problem.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
