import { motion, AnimatePresence } from 'framer-motion';
import { Info, Lightbulb } from 'lucide-react';

export default function InfoPanel({ info }) {
  return (
    <motion.div 
      className="info-panel sticky top-4 z-50"
      layout
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={info.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-3">
            {info.title === 'Welcome' ? (
              <Lightbulb className="w-5 h-5 text-yellow-400" />
            ) : (
              <Info className="w-5 h-5 text-blue-400" />
            )}
            <h3 className="text-lg font-bold text-yellow-400 m-0">
              {info.title}
            </h3>
          </div>
          <p className="text-slate-300 leading-relaxed m-0 text-sm">
            {info.description}
          </p>
          {info.formula && (
            <div className="mt-3 px-3 py-2 bg-slate-700/50 rounded-lg font-mono text-blue-300 text-sm">
              {info.formula}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
