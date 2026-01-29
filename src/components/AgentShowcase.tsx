import { motion } from "framer-motion";
import { ArrowUpLeft } from "lucide-react";

const agents = [
  {
    title: "معالجة المستندات مثل الخبير البشري",
    description: "تحليل ومعالجة الملفات والمستندات باحترافية",
    image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&h=250&fit=crop",
    color: "from-blue-500 to-cyan-400",
  },
  {
    title: "موقع أحمر الشفاه",
    description: "تصميم مواقع جذابة واحترافية",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=250&fit=crop",
    color: "from-pink-500 to-rose-400",
  },
  {
    title: "خريطة مكونات مكافحة الشيخوخة",
    description: "تحليل البيانات وتصور المعلومات المعقدة",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
    color: "from-emerald-500 to-teal-400",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.4,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

export function AgentShowcase() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-16 px-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-kimi-text font-arabic">
          نماذج مختارة من وكلاء زِدْني
        </h2>
        <button className="flex items-center gap-1 text-sm text-kimi-text-secondary hover:text-kimi-text transition-colors font-arabic">
          المزيد
          <ArrowUpLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {agents.map((agent, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="group cursor-pointer"
          >
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br aspect-[16/10]">
              {/* Background Image */}
              <img
                src={agent.image}
                alt={agent.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${agent.color} opacity-60`} />
              {/* Content */}
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">ز</span>
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm mb-1 font-arabic line-clamp-2">
                    {agent.title}
                  </h3>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer Note */}
      <p className="text-center text-xs text-kimi-text-muted mt-8 font-arabic">
        المحتوى مولد بواسطة زِدْني، يرجى التحقق بعناية
      </p>
    </motion.div>
  );
}
