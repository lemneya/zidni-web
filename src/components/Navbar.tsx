import { Menu, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex items-center justify-between px-4 py-3 h-16"
    >
      {/* Left side - Menu and Logo */}
      <div className="flex items-center gap-3">
        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors duration-150">
          <Menu className="w-5 h-5 text-gemini-text" />
        </button>
        <span className="text-[22px] font-medium text-gemini-text font-google-sans tracking-tight">
          Gemini
        </span>
      </div>

      {/* Right side - Upgrade button and Avatar */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gemini-border hover:bg-black/5 transition-colors duration-150">
          <Sparkles className="w-4 h-4 text-gemini-purple" />
          <span className="text-sm font-medium text-gemini-text font-google-sans">
            Upgrade
          </span>
        </button>
        <button className="w-10 h-10 rounded-full overflow-hidden hover:opacity-80 transition-opacity duration-150">
          <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm font-medium font-google-sans">M</span>
          </div>
        </button>
      </div>
    </motion.nav>
  );
}
