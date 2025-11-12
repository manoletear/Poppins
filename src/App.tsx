import { Hero } from "./components/Hero";
import { Problem } from "./components/Problem";
import { Solution } from "./components/Solution";
import { Heart } from "./components/Heart";
import { Testimonials } from "./components/Testimonials";
import { HowItWorks } from "./components/HowItWorks";
import { Security } from "./components/Security";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Problem />
      <Solution />
      <Heart />
      <Testimonials />
      <HowItWorks />
      <Security />
      <Footer />
    </div>
  );
}