import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";

export function Hero() {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCheck(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(180deg, #2D2D90 0%, #EFE8FF 50%, #FFD6EC 100%)'
        }}
      />
      
      {/* Soft Lighting Effect */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: '#F46BC1' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-white mb-6 max-w-4xl mx-auto">
            Formaliza a tu trabajadora en minutos.<br />
            <span style={{ color: '#F46BC1' }}>POPPINS™</span> se encarga del resto.
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="text-white/90 mb-12 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Crea contratos, liquida sueldos, paga cotizaciones y cumple la ley chilena — 
          todo desde una app simple, segura y humana.
        </motion.p>

        {/* App Animation Visual */}
        <motion.div
          className="mb-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div 
            className="relative p-8 rounded-3xl backdrop-blur-sm shadow-2xl"
            style={{ 
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {/* Contract Generation Animation */}
            <div className="bg-white rounded-2xl p-6 shadow-xl">
              <div className="space-y-4">
                <motion.div
                  className="h-4 rounded"
                  style={{ background: '#EFE8FF', width: '70%' }}
                  initial={{ width: 0 }}
                  animate={{ width: '70%' }}
                  transition={{ duration: 1, delay: 0.8 }}
                />
                <motion.div
                  className="h-4 rounded"
                  style={{ background: '#EFE8FF', width: '90%' }}
                  initial={{ width: 0 }}
                  animate={{ width: '90%' }}
                  transition={{ duration: 1, delay: 1 }}
                />
                <motion.div
                  className="h-4 rounded"
                  style={{ background: '#EFE8FF', width: '60%' }}
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ duration: 1, delay: 1.2 }}
                />
              </div>

              {/* Success Message */}
              {showCheck && (
                <motion.div
                  className="mt-6 p-4 rounded-xl flex items-center gap-3"
                  style={{ background: '#EFE8FF' }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="rounded-full p-1 flex items-center justify-center"
                    style={{ background: '#22C55E' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                  <p style={{ color: '#1B1B2F' }}>
                    Contrato firmado digitalmente y registrado en la Dirección del Trabajo.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <motion.button
            className="px-8 py-4 rounded-full text-white transition-all shadow-lg"
            style={{ background: '#F46BC1' }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 0 30px rgba(244, 107, 193, 0.5)'
            }}
            whileTap={{ scale: 0.95 }}
          >
            Crear mi Contrato Gratis
          </motion.button>
          
          <motion.a
            href="#como-funciona"
            className="px-8 py-4 relative group"
            style={{ color: '#FFFFFF' }}
            whileHover={{ scale: 1.05 }}
          >
            Ver cómo funciona →
            <motion.span
              className="absolute bottom-2 left-8 right-8 h-0.5"
              style={{ background: '#FFFFFF' }}
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}