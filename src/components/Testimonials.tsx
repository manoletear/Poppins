import { motion } from "motion/react";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      name: "Carolina",
      location: "Ñuñoa",
      text: "Antes no sabía si estaba cumpliendo. Hoy POPPINS me avisa todo.",
      background: "#EFE8FF"
    },
    {
      name: "María",
      role: "Trabajadora",
      text: "Recibo mis liquidaciones en mi correo, todo claro y al día.",
      background: "#FFD6EC"
    },
    {
      name: "Rodrigo",
      location: "Las Condes",
      text: "Me ahorro horas cada mes. Todo se paga automáticamente y sin errores.",
      background: "#EFE8FF"
    }
  ];

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-24 px-6 bg-white">
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
            Tranquilidad que se nota
          </h2>
          <p style={{ color: '#1B1B2F' }}>
            Historias reales de quienes ya formalizaron con POPPINS™
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="relative max-w-3xl mx-auto">
          {/* Testimonial Card */}
          <motion.div
            key={currentIndex}
            className="rounded-3xl p-12 relative overflow-hidden"
            style={{ background: testimonials[currentIndex].background }}
            initial={{ opacity: 0, scale: 0.95, filter: "grayscale(100%)" }}
            animate={{ opacity: 1, scale: 1, filter: "grayscale(0%)" }}
            transition={{ duration: 0.6 }}
          >
            {/* Quote Icon */}
            <motion.div
              className="absolute top-8 right-8 opacity-20"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Quote className="w-24 h-24" style={{ color: '#2D2D90' }} />
            </motion.div>

            <div className="relative z-10">
              {/* Text */}
              <p className="mb-8 text-center" style={{ color: '#1B1B2F' }}>
                "{testimonials[currentIndex].text}"
              </p>

              {/* Author */}
              <div className="text-center">
                <h4 style={{ color: '#2D2D90' }}>
                  {testimonials[currentIndex].name}
                </h4>
                <p style={{ color: '#1B1B2F', opacity: 0.7 }}>
                  {testimonials[currentIndex].location || testimonials[currentIndex].role}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <motion.button
              onClick={prevTestimonial}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: '#F46BC1' }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </motion.button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: index === currentIndex ? '#F46BC1' : '#EFE8FF',
                    transform: index === currentIndex ? 'scale(1.5)' : 'scale(1)'
                  }}
                />
              ))}
            </div>

            <motion.button
              onClick={nextTestimonial}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: '#F46BC1' }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
