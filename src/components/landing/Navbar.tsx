"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Umbrella } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Cómo funciona", href: "#how-it-works" },
    { name: "Características", href: "#features" },
    { name: "Testimonios", href: "#testimonials" },
    { name: "Contacto", href: "#contact" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
        scrolled ? "glass-nav py-3" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-poppins-pink rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Umbrella className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-poppins-navy leading-none">Poppins</span>
            <span className="text-[10px] uppercase tracking-widest text-poppins-pink font-semibold">Magia en tu casa</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-poppins-navy/70 hover:text-poppins-pink transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/auth/login"
            className="px-5 py-2 text-sm font-semibold text-poppins-navy hover:bg-poppins-navy/5 rounded-full transition-all"
          >
            Iniciar sesión
          </Link>
          <Link
            href="#contact"
            className="px-6 py-2.5 text-sm font-bold text-white bg-poppins-pink rounded-full shadow-lg shadow-poppins-pink/20 hover:scale-105 active:scale-95 transition-all"
          >
            Quiero la magia →
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-poppins-navy"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-poppins-navy/5 shadow-2xl p-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-semibold text-poppins-navy"
                >
                  {link.name}
                </Link>
              ))}
              <hr className="border-poppins-navy/5" />
              <Link
                href="/auth/login"
                className="w-full py-4 text-center font-bold text-poppins-navy bg-poppins-navy/5 rounded-2xl"
              >
                Iniciar sesión
              </Link>
              <Link
                href="#contact"
                onClick={() => setIsOpen(false)}
                className="w-full py-4 text-center font-bold text-white bg-poppins-pink rounded-2xl shadow-xl"
              >
                Quiero la magia en mi casa
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
