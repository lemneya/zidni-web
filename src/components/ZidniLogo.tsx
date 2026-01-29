import { motion } from "framer-motion";

export function ZidniLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex justify-center mb-8"
    >
      <div className="flex items-center gap-3">
        {/* Zidni Wordmark */}
        <svg
          width="180"
          height="50"
          viewBox="0 0 180 50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-black"
        >
          {/* Z Letter */}
          <path
            d="M5 10H35V15L12 40H35V45H5V40L28 15H5V10Z"
            fill="currentColor"
          />
          {/* I Letter */}
          <rect x="42" y="10" width="6" height="35" fill="currentColor" />
          {/* D Letter */}
          <path
            d="M55 10H70C82 10 90 18 90 27.5C90 37 82 45 70 45H55V10ZM65 18V37H70C77 37 80 32 80 27.5C80 23 77 18 70 18H65Z"
            fill="currentColor"
          />
          {/* N Letter */}
          <path
            d="M98 10V45H108V25L122 45H132V10H122V30L108 10H98Z"
            fill="currentColor"
          />
          {/* I Letter */}
          <rect x="138" y="10" width="6" height="35" fill="currentColor" />
        </svg>
        
        {/* Version Badge */}
        <span className="px-2 py-1 bg-black text-white text-xs font-bold rounded">
          1.0
        </span>
      </div>
    </motion.div>
  );
}
