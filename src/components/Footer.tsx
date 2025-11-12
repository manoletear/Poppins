import { motion } from "motion/react";

export function Footer() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      {/* Gradient Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #EFE8FF 0%, #FFD6EC 100%)'
        }}
      />

      {/* Glow Effect */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{ background: '#F46BC1' }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Claim */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="mb-4" style={{ color: '#2D2D90' }}>
            Tu hogar en regla,<br />
            tu conciencia tranquila
          </h2>
          <p className="mb-12" style={{ color: '#1B1B2F' }}>
            Simplemente legal. Humanamente digital.
          </p>
        </motion.div>

        {/* Main CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.button
            className="px-12 py-5 rounded-full text-white shadow-2xl relative overflow-hidden"
            style={{ background: '#F46BC1' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.background = '#2D2D90';
            }}
            onHoverEnd={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.background = '#F46BC1';
            }}
          >
            <motion.span
              className="relative z-10"
              whileHover={{
                textShadow: '0 0 20px rgba(255, 214, 236, 0.8)'
              }}
            >
              Formaliza ahora con POPPINS™
            </motion.span>
            
            {/* Glow on Hover */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: '#FFD6EC' }}
              initial={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.5, opacity: 0.3 }}
              transition={{ duration: 0.5 }}
            />
          </motion.button>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          className="mt-16 pt-8 border-t"
          style={{ borderColor: 'rgba(45, 45, 144, 0.2)' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p style={{ color: '#2D2D90', opacity: 0.7 }}>
            POPPINS™ — Hacerlo Bien Nunca Fue Tan Simple
          </p>
          <p className="mt-2" style={{ color: '#1B1B2F', opacity: 0.5 }}>
            © 2025 POPPINS. Cumplimiento legal para el hogar chileno.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
