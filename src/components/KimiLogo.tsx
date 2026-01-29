import { motion } from "framer-motion";

export function KimiLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex justify-center mb-8"
    >
      <svg
        width="200"
        height="60"
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-black"
      >
        {/* K Letter */}
        <path
          d="M10 10V50H20V35L30 50H42L28 30L40 10H28L20 25V10H10Z"
          fill="currentColor"
        />
        {/* I Letter */}
        <rect x="48" y="10" width="10" height="40" fill="currentColor" />
        {/* M Letter */}
        <path
          d="M68 10V50H78V25L88 40L98 25V50H108V10H96L88 25L80 10H68Z"
          fill="currentColor"
        />
        {/* I Letter */}
        <rect x="118" y="10" width="10" height="40" fill="currentColor" />
        {/* K2.5 Badge */}
        <g transform="translate(140, 20)">
          <rect x="0" y="0" width="50" height="24" rx="4" fill="black" />
          <text
            x="25"
            y="16"
            textAnchor="middle"
            fill="white"
            fontSize="12"
            fontWeight="bold"
            fontFamily="system-ui"
          >
            K2.5
          </text>
        </g>
      </svg>
    </motion.div>
  );
}
