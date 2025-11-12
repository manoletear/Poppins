import { motion, useScroll, useTransform } from "motion/react";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.95)"]
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    { label: "Inicio", href: "#hero" },
    { label: "Solución", href: "#solucion" },
    { label: "Cómo Funciona", href: "#como-funciona" },
    { label: "Seguridad", href: "#seguridad" }
  ];

  const handleClick = (href: string) => {
    setIsOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all"
      style={{ 
        backgroundColor,
        backdropFilter: isScrolled ? "blur(10px)" : "none",
        boxShadow: isScrolled ? "0 2px 20px rgba(45, 45, 144, 0.1)" : "none"
      }}
    >
      <div
        className="max-w-7xl mx-auto px-6 py-4"
        style={{ color: "rgba(255, 0, 0, 1)" }}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.a
            href="#hero"
            className="flex items-center gap-3"
            onClick={(e) => {
              e.preventDefault();
              handleClick("#hero");
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img 
              src="https://raw.githubusercontent.com/manoletear/manuel.aravena.github.io/main/Poppins_icono.png"
              alt="POPPINS Logo"
              className="h-12 w-auto object-contain"
              style={{
                filter: isScrolled ? 'none' : 'brightness(0) invert(1)',
                transition: 'filter 0.3s ease'
              }}
            />
          </motion.a>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => (
              <motion.a
                key={item.href}
                href={item.href}
                className="relative transition-colors"
                style={{ 
                  color: isScrolled ? '#2D2D90' : '#FFFFFF',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(item.href);
                }}
                whileHover={{ y: -2 }}
              >
                {item.label}
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-0.5"
                  style={{ background: '#F46BC1' }}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.a>
            ))}
            
            <motion.button
              className="px-6 py-2 rounded-full text-white transition-all"
              style={{ background: '#F46BC1' }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: '0 0 20px rgba(244, 107, 193, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
            >
              Comenzar
            </motion.button>
          </nav>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden p-2 rounded-lg"
            style={{ 
              background: isScrolled ? '#EFE8FF' : 'rgba(255, 255, 255, 0.2)',
              color: isScrolled ? '#2D2D90' : '#FFFFFF'
            }}
            onClick={() => setIsOpen(!isOpen)}
            whileTap={{ scale: 0.95 }}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <motion.nav
          className="md:hidden overflow-hidden"
          initial={false}
          animate={{
            height: isOpen ? "auto" : 0,
            opacity: isOpen ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="pt-4 pb-2 space-y-2">
            {menuItems.map((item) => (
              <motion.a
                key={item.href}
                href={item.href}
                className="block px-4 py-3 rounded-lg transition-colors"
                style={{ 
                  color: isScrolled ? '#2D2D90' : '#FFFFFF',
                  background: 'rgba(239, 232, 255, 0.3)'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleClick(item.href);
                }}
                whileTap={{ scale: 0.98 }}
              >
                {item.label}
              </motion.a>
            ))}
            <motion.button
              className="w-full px-4 py-3 rounded-lg text-white"
              style={{ background: '#F46BC1' }}
              whileTap={{ scale: 0.98 }}
            >
              Comenzar
            </motion.button>
          </div>
        </motion.nav>
      </div>
    </motion.header>
  );
}
