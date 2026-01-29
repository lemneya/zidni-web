import { motion } from 'framer-motion';
import { Smartphone, Apple, PlayCircle, Star, Check } from 'lucide-react';

export function MobileApp() {
  return (
    <div className="h-screen overflow-y-auto p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-kimi-text mb-2 font-arabic">تطبيق زِدْني</h1>
        <p className="text-kimi-text-muted font-arabic">زِدْني في جيبك، أينما كنت</p>
      </motion.div>

      {/* Phone Mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center mb-12"
      >
        <div className="relative w-64 h-[500px] bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
          {/* Screen */}
          <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
            {/* Notch */}
            <div className="h-6 bg-gray-900 mx-auto w-24 rounded-b-xl" />
            
            {/* App Content */}
            <div className="flex-1 p-4 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-4 mx-auto">
                <span className="text-white font-bold text-xl">ز</span>
              </div>
              <div className="space-y-3">
                <div className="h-12 bg-kimi-bg-sidebar rounded-xl" />
                <div className="h-20 bg-kimi-bg-sidebar rounded-xl" />
                <div className="h-20 bg-kimi-bg-sidebar rounded-xl" />
                <div className="h-12 bg-purple-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-md mx-auto mb-12"
      >
        <h2 className="text-xl font-bold text-kimi-text mb-4 font-arabic text-center">مميزات التطبيق</h2>
        <div className="space-y-3">
          {[
            'محادثة صوتية ونصية',
            'مزامنة مع الويب',
            'وضع عدم الاتصال',
            'إشعارات ذكية',
            'واجهة عربية سهلة',
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-kimi-border">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-kimi-text font-arabic">{feature}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Download Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-w-md mx-auto mb-12"
      >
        <h2 className="text-xl font-bold text-kimi-text mb-4 font-arabic text-center">حمل التطبيق</h2>
        <div className="space-y-3">
          <button className="w-full flex items-center gap-4 p-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
            <Apple className="w-8 h-8" />
            <div className="text-right">
              <p className="text-xs opacity-70 font-arabic">قريباً على</p>
              <p className="text-lg font-bold font-arabic">App Store</p>
            </div>
          </button>
          <button className="w-full flex items-center gap-4 p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
            <PlayCircle className="w-8 h-8" />
            <div className="text-right">
              <p className="text-xs opacity-70 font-arabic">قريباً على</p>
              <p className="text-lg font-bold font-arabic">Google Play</p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Rating */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="w-5 h-5 text-yellow-400 fill-current" />
          ))}
        </div>
        <p className="text-kimi-text-muted font-arabic">قريباً...</p>
      </motion.div>
    </div>
  );
}
