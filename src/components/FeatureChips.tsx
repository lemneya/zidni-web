import { motion } from "framer-motion";
import { Globe, FileText, Presentation, Table, Search, Users } from "lucide-react";

const features = [
  { icon: Globe, label: "مواقع", href: "#" },
  { icon: FileText, label: "مستندات", href: "#" },
  { icon: Presentation, label: "عروض تقديمية", href: "#" },
  { icon: Table, label: "جداول", href: "#" },
  { icon: Search, label: "بحث عميق", href: "#" },
  { icon: Users, label: "وكلاء زِدْني", href: "#", badge: "Beta" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

export function FeatureChips() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap items-center justify-center gap-2 mt-6"
    >
      {features.map((feature, index) => (
        <motion.a
          key={index}
          variants={itemVariants}
          href={feature.href}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-kimi-border rounded-full hover:bg-kimi-bg-hover hover:border-kimi-text-muted transition-all duration-150 group"
        >
          <feature.icon className="w-4 h-4 text-kimi-text-secondary group-hover:text-kimi-text transition-colors" />
          <span className="text-sm text-kimi-text font-arabic">{feature.label}</span>
          {feature.badge && (
            <span className="text-xs text-kimi-blue bg-blue-50 px-1.5 py-0.5 rounded">
              {feature.badge}
            </span>
          )}
        </motion.a>
      ))}
    </motion.div>
  );
}
