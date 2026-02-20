import { useState } from 'react';
import { Shield, BookOpen, Github } from 'lucide-react';
import InfoPanel from './components/InfoPanel';
import CryptoSandbox from './components/CryptoSandbox';
import AESDiagram from './components/diagrams/AESDiagram';
import DESDiagram from './components/diagrams/DESDiagram';
import TripleDESDiagram from './components/diagrams/TripleDESDiagram';
import ECBDiagram from './components/diagrams/ECBDiagram';
import CBCDiagram from './components/diagrams/CBCDiagram';
import OFBDiagram from './components/diagrams/OFBDiagram';
import CFBDiagram from './components/diagrams/CFBDiagram';
import CTRDiagram from './components/diagrams/CTRDiagram';
import GCMDiagram from './components/diagrams/GCMDiagram';

const defaultInfo = {
  title: 'Welcome to the Cryptography Explorer',
  description: 'Hover over any component in the diagrams below to see detailed explanations based on "Understanding Cryptography" by Christof Paar and Jan Pelzl.',
};

function App() {
  const [info, setInfo] = useState(defaultInfo);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header 
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white"
        style={{ background: 'linear-gradient(to right, #0f172a, #1e293b, #0f172a)', color: 'white', padding: '2rem 0' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg" style={{ padding: '0.75rem', background: '#2563eb', borderRadius: '0.75rem' }}>
                <Shield className="w-8 h-8" style={{ width: '2rem', height: '2rem' }} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>
                  Cryptography Explorer
                </h1>
                <p className="text-slate-400 text-sm mt-1" style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Interactive Study Tool for Block Ciphers
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">AES</h2>
              <AESDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">DES</h2>
              <DESDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Triple DES (3DES)</h2>
              <TripleDESDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-2">ECB Mode</h2>
              <p className="text-slate-500 text-sm mb-4">Electronic Codebook - simplest mode, not recommended</p>
              <ECBDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-2">CBC Mode</h2>
              <p className="text-slate-500 text-sm mb-4">Cipher Block Chaining - requires IV</p>
              <CBCDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-2">OFB Mode</h2>
              <p className="text-slate-500 text-sm mb-4">Output Feedback - stream cipher mode</p>
              <OFBDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-2">CFB Mode</h2>
              <p className="text-slate-500 text-sm mb-4">Cipher Feedback - self-synchronizing</p>
              <CFBDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-2">CTR Mode</h2>
              <p className="text-slate-500 text-sm mb-4">Counter mode - parallel encryption</p>
              <CTRDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-2">GCM Mode</h2>
              <p className="text-slate-500 text-sm mb-4">Galois/Counter Mode - authenticated encryption</p>
              <GCMDiagram onHover={setInfo} />
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Live Crypto Sandbox</h2>
              <p className="text-slate-500 text-sm mb-4">Try real encryption and decryption</p>
              <CryptoSandbox />
            </div>
          </div>
          <div className="lg:col-span-1">
            <InfoPanel info={info} />
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-400" />
              <span className="font-semibold">Cryptography Explorer</span>
            </div>
            <p className="text-slate-400 text-sm text-center">
              Based on "Understanding Cryptography" by Christof Paar and Jan Pelzl
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" 
                 className="text-slate-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800 text-center text-slate-500 text-sm">
            Interactive educational tool for cryptography students
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
