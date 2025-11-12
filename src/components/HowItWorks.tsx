import { motion } from "motion/react";
import { UserCircle, FileSignature, CreditCard } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: UserCircle,
      number: "01",
      title: "Completa el perfil",
      description: "POPPINS genera el contrato legal automáticamente",
      color: "#F46BC1"
    },
    {
      icon: FileSignature,
      number: "02",
      title: "Firma digital segura",
      description: "Sin imprimir, sin moverte. Validación legal instantánea",
      color: "#2D2D90"
    },
    {
      icon: CreditCard,
      number: "03",
      title: "Pago automático y PreviRed",
      description: "Todo listo en un clic. Tu tranquilidad asegurada",
      color: "#F46BC1"
    }
  ];

  return (
    <section id="como-funciona" className="py-24 px-6" style={{ background: '#EFE8FF' }}>
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
            De la conversación al cumplimiento
          </h2>
          <p style={{ color: '#1B1B2F' }}>
            Tres pasos simples para formalizar tu relación laboral
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
              >
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <motion.div
                    className="hidden md:block absolute top-20 left-full w-full h-0.5 -translate-x-1/2"
                    style={{ background: '#FFD6EC' }}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.2 + 0.4 }}
                  />
                )}

                <div className="bg-white rounded-2xl p-8 text-center relative z-10 shadow-lg">
                  {/* Number Badge */}
                  <div 
                    className="absolute -top-4 -right-4 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                    style={{ background: step.color }}
                  >
                    {step.number}
                  </div>

                  {/* Icon */}
                  <motion.div
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ background: step.color }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon className="w-10 h-10 text-white" />
                  </motion.div>

                  {/* Text */}
                  <h3 className="mb-3" style={{ color: '#2D2D90' }}>
                    {step.title}
                  </h3>
                  <p style={{ color: '#1B1B2F', opacity: 0.8 }}>
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            className="px-10 py-4 rounded-full text-white shadow-xl"
            style={{ background: '#F46BC1' }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 0 40px rgba(244, 107, 193, 0.5)'
            }}
            whileTap={{ scale: 0.95 }}
          >
            Empieza ahora — gratis y legal
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
