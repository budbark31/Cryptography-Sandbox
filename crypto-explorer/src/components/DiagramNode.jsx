import { motion } from 'framer-motion';

const typeStyles = {
  plaintext: 'node-plaintext',
  ciphertext: 'node-ciphertext',
  key: 'node-key',
  function: 'node-function',
  xor: 'node-xor',
  auth: 'node-auth',
  internal: 'node-internal',
};

export default function DiagramNode({ 
  children, 
  type = 'function', 
  info,
  onHover,
  className = '',
  style = {}
}) {
  const handleMouseEnter = () => {
    if (onHover && info) {
      onHover(info);
    }
  };

  return (
    <motion.div
      className={`diagram-node ${typeStyles[type] || typeStyles.function} ${className}`}
      style={style}
      onMouseEnter={handleMouseEnter}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

export function Arrow({ direction = 'down', className = '' }) {
  const arrows = {
    down: '↓',
    up: '↑',
    left: '←',
    right: '→',
  };

  return (
    <span className={`diagram-arrow ${className}`}>
      {arrows[direction]}
    </span>
  );
}

export function FlowRow({ children, className = '' }) {
  return (
    <div className={`flow-row ${className}`}>
      {children}
    </div>
  );
}

export function XorNode({ info, onHover }) {
  const handleMouseEnter = () => {
    if (onHover && info) {
      onHover(info);
    }
  };

  return (
    <motion.div
      className="diagram-node node-xor"
      onMouseEnter={handleMouseEnter}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      ⊕
    </motion.div>
  );
}
