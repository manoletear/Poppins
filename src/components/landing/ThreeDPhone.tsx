"use client";

import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef } from "react";

export const ThreeDPhone = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Smooth springs for a premium feel
  const smoothY = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // Transforms based on scroll
  const rotateY = useTransform(smoothY, [0, 0.5, 1], [0, 180, 360]);
  const rotateX = useTransform(smoothY, [0, 0.5, 1], [15, 0, 15]);
  const scale = useTransform(smoothY, [0, 0.2, 0.5, 0.8, 1], [1, 1.2, 1, 1.2, 1]);
  const xOffset = useTransform(smoothY, [0, 0.3, 0.7, 1], ["0%", "20%", "-20%", "0%"]);

  return (
    <div ref={containerRef} className="relative h-[200vh] w-full pointer-events-none">
      <div className="sticky top-1/2 -translate-y-1/2 left-0 right-0 flex items-center justify-center">
        <motion.div
          style={{
            rotateY,
            rotateX,
            scale,
            x: xOffset,
            perspective: 2000,
            transformStyle: "preserve-3d",
          }}
          className="relative w-[300px] h-[600px] md:w-[350px] md:h-[700px]"
        >
          {/* Main Phone Body */}
          <div className="absolute inset-0 bg-[#0f172a] rounded-[3rem] border-[12px] border-[#334155] shadow-[0_0_50px_rgba(30,27,75,0.3)] overflow-hidden">
            {/* Screen Content */}
            <div className="absolute inset-0 bg-white">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-8 bg-[#0f172a] rounded-b-3xl z-20" /> {/* Dynamic Island */}
              <div className="pt-12 px-6">
                <div className="w-full h-8 bg-poppins-pink/10 rounded-lg mb-4 animate-pulse" />
                <div className="flex gap-4 mb-8">
                  <div className="w-12 h-12 bg-poppins-navy/5 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="w-3/4 h-4 bg-poppins-navy/10 rounded" />
                    <div className="w-1/2 h-4 bg-poppins-navy/5 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-poppins-light rounded-3xl border border-poppins-navy/5 shadow-sm p-4 flex flex-col justify-end">
                      <div className="w-8 h-8 rounded-full bg-poppins-pink/20 mb-2" />
                      <div className="w-full h-2 bg-poppins-navy/10 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Success Overlay Animation on Bottom */}
              <motion.div 
                animate={{ y: [20, 0, 20] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute bottom-8 left-6 right-6 p-4 bg-white rounded-3xl shadow-2xl border border-poppins-pink/10 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-poppins-navy">PAGO EXITOSO</p>
                  <p className="text-[8px] text-poppins-navy/60">Sueldo Asesora - Marzo</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Side Reflections/Edges for 3D Depth */}
          <div className="absolute top-0 bottom-0 -right-2 w-4 bg-[#1e293b] rounded-r-3xl transform skew-y-[3deg]" />
          <div className="absolute top-0 bottom-0 -left-2 w-4 bg-[#1e293b] rounded-l-3xl transform -skew-y-[3deg]" />
        </motion.div>
      </div>
    </div>
  );
};
