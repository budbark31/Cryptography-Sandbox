import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, AlertCircle, CheckCircle, Copy, RotateCcw } from 'lucide-react';
import CryptoJS from 'crypto-js';

const algorithms = [
  { value: 'AES', label: 'AES (Advanced Encryption Standard)', blockSize: 128 },
  { value: 'DES', label: 'DES (Data Encryption Standard)', blockSize: 64 },
  { value: 'TripleDES', label: '3DES (Triple DES)', blockSize: 64 },
];

const modes = [
  { value: 'CBC', label: 'CBC (Cipher Block Chaining)', requiresIV: true },
  { value: 'ECB', label: 'ECB (Electronic Codebook) ⚠️', requiresIV: false },
  { value: 'CFB', label: 'CFB (Cipher Feedback)', requiresIV: true },
  { value: 'OFB', label: 'OFB (Output Feedback)', requiresIV: true },
  { value: 'CTR', label: 'CTR (Counter)', requiresIV: true },
];

export default function CryptoSandbox() {
  const [algorithm, setAlgorithm] = useState('AES');
  const [mode, setMode] = useState('CBC');
  const [inputText, setInputText] = useState('');
  const [secretKey, setSecretKey] = useState('MySuperSecretKey128!');
  const [iv, setIv] = useState('1234567890123456');
  const [result, setResult] = useState({ text: '', type: 'idle' });
  const [lastOperation, setLastOperation] = useState(null);

  const selectedMode = modes.find(m => m.value === mode);

  const processData = (action) => {
    if (!inputText.trim()) {
      setResult({ text: 'Please enter some text to process.', type: 'error' });
      return;
    }

    if (!secretKey.trim()) {
      setResult({ text: 'Please provide a secret key.', type: 'error' });
      return;
    }

    if (selectedMode?.requiresIV && !iv.trim()) {
      setResult({ text: `${mode} mode requires an Initialization Vector (IV).`, type: 'error' });
      return;
    }

    try {
      const options = {};
      
      // Set IV if required
      if (selectedMode?.requiresIV && iv) {
        options.iv = CryptoJS.enc.Utf8.parse(iv);
      }

      // Set mode
      switch (mode) {
        case 'ECB':
          options.mode = CryptoJS.mode.ECB;
          break;
        case 'CBC':
          options.mode = CryptoJS.mode.CBC;
          break;
        case 'CFB':
          options.mode = CryptoJS.mode.CFB;
          break;
        case 'OFB':
          options.mode = CryptoJS.mode.OFB;
          break;
        case 'CTR':
          options.mode = CryptoJS.mode.CTR;
          break;
        default:
          options.mode = CryptoJS.mode.CBC;
      }

      options.padding = CryptoJS.pad.Pkcs7;

      const cipherObject = CryptoJS[algorithm];

      if (action === 'encrypt') {
        const encrypted = cipherObject.encrypt(inputText, secretKey, options);
        setResult({ 
          text: encrypted.toString(), 
          type: 'success',
          details: {
            algorithm,
            mode,
            keyUsed: secretKey,
            ivUsed: selectedMode?.requiresIV ? iv : 'N/A'
          }
        });
        setLastOperation('encrypt');
      } else {
        const decrypted = cipherObject.decrypt(inputText, secretKey, options);
        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!plaintext) {
          throw new Error('Decryption failed. Check your key, IV, mode, and ciphertext.');
        }
        
        setResult({ 
          text: plaintext, 
          type: 'success',
          details: {
            algorithm,
            mode,
            keyUsed: secretKey,
            ivUsed: selectedMode?.requiresIV ? iv : 'N/A'
          }
        });
        setLastOperation('decrypt');
      }
    } catch (error) {
      setResult({ 
        text: `Error: ${error.message}`, 
        type: 'error' 
      });
    }
  };

  const copyToClipboard = () => {
    if (result.text && result.type === 'success') {
      navigator.clipboard.writeText(result.text);
      setResult(prev => ({ ...prev, copied: true }));
      setTimeout(() => setResult(prev => ({ ...prev, copied: false })), 2000);
    }
  };

  const swapInputOutput = () => {
    if (result.text && result.type === 'success') {
      setInputText(result.text);
      setResult({ text: '', type: 'idle' });
    }
  };

  const reset = () => {
    setInputText('');
    setResult({ text: '', type: 'idle' });
    setLastOperation(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Live Cryptography Sandbox
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          Experiment with real encryption using crypto-js
        </p>
      </div>

      <div className="p-6">
        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Algorithm
            </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="sandbox-select"
            >
              {algorithms.map(algo => (
                <option key={algo.value} value={algo.value}>
                  {algo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mode of Operation
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="sandbox-select"
            >
              {modes.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Secret Key
            </label>
            <input
              type="text"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter secret key..."
              className="sandbox-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Initialization Vector (IV)
              {!selectedMode?.requiresIV && (
                <span className="text-slate-400 ml-2">(not used in {mode})</span>
              )}
            </label>
            <input
              type="text"
              value={iv}
              onChange={(e) => setIv(e.target.value)}
              placeholder="Enter IV..."
              className="sandbox-input"
              disabled={!selectedMode?.requiresIV}
            />
          </div>
        </div>

        {/* Input Text Area */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Input (Plaintext for encryption / Ciphertext for decryption)
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to encrypt or Base64 ciphertext to decrypt..."
            className="sandbox-input min-h-[100px] resize-y"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => processData('encrypt')}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Encrypt
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => processData('decrypt')}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            Decrypt
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={reset}
            className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Result Box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={result.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Result
              {result.type === 'success' && lastOperation && (
                <span className="ml-2 text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                  {lastOperation === 'encrypt' ? 'Encrypted' : 'Decrypted'}
                </span>
              )}
            </label>
            
            <div className={`relative rounded-lg p-4 min-h-[80px] font-mono text-sm break-all ${
              result.type === 'error' 
                ? 'bg-red-50 border border-red-200 text-red-700'
                : result.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-slate-800'
                : 'bg-slate-100 border border-slate-200 text-slate-500'
            }`}>
              <div className="flex items-start gap-2">
                {result.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                {result.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />}
                <span>{result.text || 'Results will appear here...'}</span>
              </div>

              {result.type === 'success' && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    {result.copied ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <button
                    onClick={swapInputOutput}
                    className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                    title="Use as input"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Operation Details */}
            {result.details && result.type === 'success' && (
              <div className="mt-3 p-3 bg-slate-100 rounded-lg text-xs text-slate-600 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <span className="font-medium">Algorithm:</span> {result.details.algorithm}
                </div>
                <div>
                  <span className="font-medium">Mode:</span> {result.details.mode}
                </div>
                <div>
                  <span className="font-medium">Key:</span> {result.details.keyUsed.substring(0, 8)}...
                </div>
                <div>
                  <span className="font-medium">IV:</span> {result.details.ivUsed === 'N/A' ? 'N/A' : result.details.ivUsed.substring(0, 8) + '...'}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mode Warning */}
        {mode === 'ECB' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Security Warning:</strong> ECB mode is insecure for most applications. 
              Identical plaintext blocks produce identical ciphertext blocks, revealing patterns in your data.
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
