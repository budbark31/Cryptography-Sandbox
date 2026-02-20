import { useState } from 'react';

// DES S-box tables (from textbook Tables 3.2-3.9)
const SBOXES = [
  // S1
  [
    [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7],
    [0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8],
    [4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0],
    [15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13]
  ],
  // S2
  [
    [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10],
    [3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5],
    [0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15],
    [13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9]
  ],
  // S3
  [
    [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8],
    [13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1],
    [13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7],
    [1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12]
  ],
  // S4
  [
    [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15],
    [13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9],
    [10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4],
    [3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14]
  ],
  // S5
  [
    [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9],
    [14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6],
    [4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14],
    [11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3]
  ],
  // S6
  [
    [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11],
    [10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8],
    [9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6],
    [4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13]
  ],
  // S7
  [
    [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1],
    [13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6],
    [1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2],
    [6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12]
  ],
  // S8
  [
    [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7],
    [1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2],
    [7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8],
    [2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]
  ]
];

// Info tooltips
const desInfo = {
  plaintext: {
    title: 'Plaintext x (64 bits)',
    description: 'DES encrypts blocks of 64 bits. The plaintext first passes through an Initial Permutation (IP) before entering the Feistel network.',
    formula: 'x ∈ {0,1}⁶⁴'
  },
  initialPerm: {
    title: 'Initial Permutation IP',
    description: 'A fixed bitwise permutation (Fig. 3.8) applied to the 64-bit input. For example, bit 58 goes to position 1, bit 50 to position 2. This permutation has no cryptographic significance—it was designed for hardware byte-ordering in the 1970s.',
    formula: 'IP(x) → L₀ || R₀'
  },
  feistelRound: {
    title: 'Feistel Round Structure',
    description: 'Each round splits the 64-bit state into left and right 32-bit halves. The right half R passes through the f-function with round key kᵢ, then XORs with the left half. The halves are then swapped for the next round.',
    formula: 'Lᵢ = Rᵢ₋₁\nRᵢ = Lᵢ₋₁ ⊕ f(Rᵢ₋₁, kᵢ)'
  },
  fFunction: {
    title: 'f-Function f(R, k)',
    description: 'The heart of DES. Takes 32-bit R and 48-bit subkey k. The f-function provides both confusion (S-boxes) and diffusion (E and P permutations).',
    formula: 'f(R, k) = P(S(E(R) ⊕ k))'
  },
  expansion: {
    title: 'Expansion E',
    description: 'Expands 32 bits to 48 bits by duplicating boundary bits. The 32 bits are divided into 8 groups of 4; each group expands to 6 bits by including adjacent boundary bits. This increases diffusion.',
    formula: 'E: 32 bits → 48 bits'
  },
  sbox: {
    title: 'S-Boxes S₁ through S₈',
    description: 'Eight substitution boxes, each mapping 6 bits to 4 bits. The outer 2 bits (positions 1 and 6) select the row (0-3), the inner 4 bits select the column (0-15). The S-boxes are the ONLY nonlinear element in DES, providing confusion.',
    formula: 'Sᵢ: {0,1}⁶ → {0,1}⁴'
  },
  pbox: {
    title: 'Permutation P',
    description: 'A fixed 32-bit permutation applied after the S-boxes. It spreads each S-box output across different positions to affect multiple S-boxes in the next round, providing diffusion.',
    formula: 'P: 32 bits → 32 bits'
  },
  xor: {
    title: 'XOR Operation ⊕',
    description: 'The f-function output XORs with the left half. XOR is self-inverse (a ⊕ b ⊕ b = a), which enables the Feistel decryption property.',
    formula: 'Rᵢ = Lᵢ₋₁ ⊕ f(Rᵢ₋₁, kᵢ)'
  },
  keyInput: {
    title: 'Key k (64 bits with 8 parity bits)',
    description: 'The DES key is 64 bits, but every 8th bit is a parity bit (not used for encryption). The effective key length is 56 bits. Today this is considered too short—brute force is feasible.',
    formula: 'k ∈ {0,1}⁶⁴, effective: 56 bits'
  },
  pc1: {
    title: 'Permuted Choice 1 (PC-1)',
    description: 'Drops the 8 parity bits and permutes the remaining 56 bits. The result is split into two 28-bit halves C₀ and D₀.',
    formula: 'PC-1: 64 bits → 56 bits → C₀ || D₀'
  },
  rotation: {
    title: 'Left Shift (LS)',
    description: 'Each half is rotated left by 1 or 2 positions per round. Rounds 1, 2, 9, 16 shift by 1 bit; all others shift by 2 bits. Total shifts = 28, so C₁₆ = C₀.',
    formula: 'Cᵢ = LSᵢ(Cᵢ₋₁), Dᵢ = LSᵢ(Dᵢ₋₁)'
  },
  pc2: {
    title: 'Permuted Choice 2 (PC-2)',
    description: 'Selects 48 bits from the 56-bit combined C || D to form the round key kᵢ. 8 bits are discarded, providing additional permutation.',
    formula: 'PC-2: 56 bits → 48 bits = kᵢ'
  },
  finalPerm: {
    title: 'Final Permutation IP⁻¹',
    description: 'The inverse of IP, applied after all 16 rounds. Note: the left and right halves are NOT swapped after round 16 before applying IP⁻¹.',
    formula: 'y = IP⁻¹(R₁₆ || L₁₆)'
  },
  ciphertext: {
    title: 'Ciphertext y (64 bits)',
    description: 'The encrypted output. DES is a symmetric cipher, so decryption uses the same algorithm with subkeys in reverse order (k₁₆, k₁₅, ..., k₁).',
    formula: 'y = DESₖ(x)'
  },
  tripleDes: {
    title: 'Triple DES (3DES)',
    description: 'Applies DES three times with two or three independent keys. The EDE (Encrypt-Decrypt-Encrypt) structure provides backward compatibility: using k₁=k₂=k₃ reduces to single DES.',
    formula: 'y = DES_{k₃}(DES⁻¹_{k₂}(DES_{k₁}(x)))'
  },
  tdesKey1: {
    title: 'Key k₁ (56 bits effective)',
    description: 'First key used for encryption in step 1. In 2-key 3DES, k₁ = k₃.',
    formula: 'DES_{k₁}(x)'
  },
  tdesKey2: {
    title: 'Key k₂ (56 bits effective)',
    description: 'Second key used for DECRYPTION in step 2. Using decryption in the middle provides backward compatibility with single DES when all keys are equal.',
    formula: 'DES⁻¹_{k₂}(·)'
  },
  tdesKey3: {
    title: 'Key k₃ (56 bits effective)',
    description: 'Third key used for encryption in step 3. In 2-key 3DES (keying option 2), k₃ = k₁.',
    formula: 'DES_{k₃}(·)'
  },
  tdes2key: {
    title: '2-Key 3DES (Keying Option 2)',
    description: 'Uses only 2 independent keys: k₁ = k₃. Effective key length is 112 bits. This is still widely used but being phased out.',
    formula: 'y = DES_{k₁}(DES⁻¹_{k₂}(DES_{k₁}(x)))'
  },
  tdes3key: {
    title: '3-Key 3DES (Keying Option 1)',
    description: 'Uses 3 independent keys. Effective key length is 168 bits. Provides the strongest security of 3DES variants.',
    formula: 'y = DES_{k₃}(DES⁻¹_{k₂}(DES_{k₁}(x)))'
  }
};

export default function DESDiagram({ onHover }) {
  const [activeTab, setActiveTab] = useState('feistel');
  const [hovered, setHovered] = useState(null);
  const [selectedSbox, setSelectedSbox] = useState(0);
  const [sboxInput, setSboxInput] = useState({ row: 0, col: 0 });

  const handleHover = (key) => {
    setHovered(key);
    if (onHover && desInfo[key]) {
      onHover(desInfo[key]);
    }
  };

  const tabs = [
    { id: 'feistel', label: 'Feistel Structure' },
    { id: 'ffunction', label: 'f-Function' },
    { id: 'keyschedule', label: 'Key Schedule' },
    { id: 'sboxes', label: 'S-Boxes' },
    { id: '3des', label: '3DES' }
  ];

  return (
    <div className="diagram-container">
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 p-1 bg-slate-100 rounded-lg">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'feistel' && <FeistelView hovered={hovered} handleHover={handleHover} setHovered={setHovered} />}
      {activeTab === 'ffunction' && <FFunctionView hovered={hovered} handleHover={handleHover} setHovered={setHovered} />}
      {activeTab === 'keyschedule' && <KeyScheduleView hovered={hovered} handleHover={handleHover} setHovered={setHovered} />}
      {activeTab === 'sboxes' && <SBoxView selectedSbox={selectedSbox} setSelectedSbox={setSelectedSbox} sboxInput={sboxInput} setSboxInput={setSboxInput} />}
      {activeTab === '3des' && <TripleDESView hovered={hovered} handleHover={handleHover} setHovered={setHovered} />}
    </div>
  );
}

// ============ FEISTEL STRUCTURE (Fig. 3.5) ============
function FeistelView({ hovered, handleHover, setHovered }) {
  const boxW = 55, boxH = 24;
  const leftX = 100, rightX = 180;
  const keyX = 310;
  
  return (
    <>
      <svg viewBox="0 0 400 580" className="w-full max-w-lg mx-auto">
        <defs>
          <marker id="desArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
          </marker>
        </defs>

        {/* Title */}
        <text x="200" y="20" textAnchor="middle" className="text-sm fill-slate-700 font-semibold">DES Feistel Structure (Fig. 3.5)</text>

        {/* Plaintext x */}
        <g onMouseEnter={() => handleHover('plaintext')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={140} y={30} width={70} height={22} rx="3" fill={hovered === 'plaintext' ? '#dbeafe' : '#f1f5f9'} stroke="#64748b" />
          <text x={175} y={45} textAnchor="middle" className="text-[10px] fill-slate-700">Plaintext x</text>
        </g>

        {/* Arrow to IP */}
        <line x1={175} y1={52} x2={175} y2={68} stroke="#64748b" markerEnd="url(#desArrow)" />
        <text x={185} y={62} className="text-[8px] fill-slate-500">64</text>

        {/* Initial Permutation */}
        <g onMouseEnter={() => handleHover('initialPerm')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={120} y={70} width={110} height={24} rx="3" fill={hovered === 'initialPerm' ? '#dbeafe' : '#e2e8f0'} stroke="#3b82f6" strokeWidth="1.5" />
          <text x={175} y={86} textAnchor="middle" className="text-[10px] fill-slate-700">Initial Permutation</text>
          <text x={175} y={96} textAnchor="middle" className="text-[8px] fill-slate-500 italic">IP(x)</text>
        </g>

        {/* Arrow to L0/R0 split */}
        <line x1={175} y1={94} x2={175} y2={115} stroke="#64748b" />
        <line x1={leftX + boxW/2} y1={115} x2={rightX + boxW/2} y2={115} stroke="#64748b" />
        <line x1={leftX + boxW/2} y1={115} x2={leftX + boxW/2} y2={125} stroke="#64748b" markerEnd="url(#desArrow)" />
        <line x1={rightX + boxW/2} y1={115} x2={rightX + boxW/2} y2={125} stroke="#64748b" markerEnd="url(#desArrow)" />

        {/* L0 and R0 */}
        <g onMouseEnter={() => handleHover('feistelRound')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={leftX} y={127} width={boxW} height={boxH} rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
          <text x={leftX + boxW/2} y={143} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">L₀</text>
        </g>
        <g onMouseEnter={() => handleHover('feistelRound')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={rightX} y={127} width={boxW} height={boxH} rx="3" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
          <text x={rightX + boxW/2} y={143} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">R₀</text>
        </g>
        <text x={leftX + boxW/2} y={160} textAnchor="middle" className="text-[8px] fill-slate-500">32</text>
        <text x={rightX + boxW/2} y={160} textAnchor="middle" className="text-[8px] fill-slate-500">32</text>

        {/* Round 1 brace */}
        <text x={60} y={210} className="text-[10px] fill-slate-500">Round 1</text>
        <path d="M75,165 Q65,165 65,175 L65,235 Q65,245 75,245" fill="none" stroke="#94a3b8" strokeWidth="1" />

        {/* Round 1 Feistel */}
        {/* XOR circle */}
        <circle cx={leftX + boxW/2} cy={195} r="10" fill="none" stroke="#64748b" strokeWidth="1.5" />
        <line x1={leftX + boxW/2 - 6} y1={195} x2={leftX + boxW/2 + 6} y2={195} stroke="#64748b" strokeWidth="1.5" />
        <line x1={leftX + boxW/2} y1={189} x2={leftX + boxW/2} y2={201} stroke="#64748b" strokeWidth="1.5" />

        {/* L0 down to XOR */}
        <line x1={leftX + boxW/2} y1={151} x2={leftX + boxW/2} y2={185} stroke="#64748b" />

        {/* R0 to f-function and down */}
        <line x1={rightX + boxW/2} y1={151} x2={rightX + boxW/2} y2={175} stroke="#64748b" />
        <line x1={rightX + boxW/2} y1={175} x2={rightX + boxW/2} y2={245} stroke="#64748b" />

        {/* f-function box */}
        <g onMouseEnter={() => handleHover('fFunction')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={rightX + boxW/2 + 15} y={180} width={35} height={28} rx="3" fill={hovered === 'fFunction' ? '#dbeafe' : '#e0f2fe'} stroke="#0ea5e9" strokeWidth="1.5" />
          <text x={rightX + boxW/2 + 32} y={198} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">f</text>
        </g>
        
        {/* R0 to f horizontal */}
        <line x1={rightX + boxW/2} y1={175} x2={rightX + boxW/2 + 15} y2={194} stroke="#64748b" />
        
        {/* f output to XOR */}
        <line x1={rightX + boxW/2 + 33} y1={208} x2={rightX + boxW/2 + 33} y2={220} stroke="#64748b" />
        <line x1={rightX + boxW/2 + 33} y1={220} x2={leftX + boxW/2 + 20} y2={220} stroke="#64748b" />
        <line x1={leftX + boxW/2 + 20} y1={220} x2={leftX + boxW/2 + 10} y2={195} stroke="#64748b" markerEnd="url(#desArrow)" />

        {/* k1 input to f */}
        <line x1={keyX} y1={194} x2={rightX + boxW/2 + 50} y2={194} stroke="#64748b" markerEnd="url(#desArrow)" />
        <text x={keyX + 10} y={190} className="text-[9px] fill-slate-600 font-mono">k₁</text>
        <text x={keyX - 5} y={200} className="text-[8px] fill-slate-500">48</text>

        {/* XOR output down, cross to become R1 */}
        <line x1={leftX + boxW/2} y1={205} x2={leftX + boxW/2} y2={230} stroke="#64748b" />
        
        {/* Swap: L becomes R1, R becomes L1 */}
        <line x1={leftX + boxW/2} y1={230} x2={rightX + boxW/2} y2={260} stroke="#64748b" />
        <line x1={rightX + boxW/2} y1={245} x2={leftX + boxW/2} y2={260} stroke="#64748b" />

        {/* L1 and R1 */}
        <rect x={leftX} y={262} width={boxW} height={boxH} rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x={leftX + boxW/2} y={278} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">L₁</text>
        <rect x={rightX} y={262} width={boxW} height={boxH} rx="3" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
        <text x={rightX + boxW/2} y={278} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">R₁</text>

        {/* Dots for rounds 2-15 */}
        <text x={175} y={310} textAnchor="middle" className="text-lg fill-slate-400">⋮</text>
        <text x={175} y={330} textAnchor="middle" className="text-lg fill-slate-400">⋮</text>

        {/* Round 16 label */}
        <text x={60} y={380} className="text-[10px] fill-slate-500">Round 16</text>
        <path d="M75,345 Q65,345 65,355 L65,415 Q65,425 75,425" fill="none" stroke="#94a3b8" strokeWidth="1" />

        {/* L15 and R15 */}
        <rect x={leftX} y={345} width={boxW} height={boxH} rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x={leftX + boxW/2} y={361} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">L₁₅</text>
        <rect x={rightX} y={345} width={boxW} height={boxH} rx="3" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
        <text x={rightX + boxW/2} y={361} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">R₁₅</text>

        {/* Round 16 Feistel */}
        <circle cx={leftX + boxW/2} cy={400} r="10" fill="none" stroke="#64748b" strokeWidth="1.5" />
        <line x1={leftX + boxW/2 - 6} y1={400} x2={leftX + boxW/2 + 6} y2={400} stroke="#64748b" strokeWidth="1.5" />
        <line x1={leftX + boxW/2} y1={394} x2={leftX + boxW/2} y2={406} stroke="#64748b" strokeWidth="1.5" />

        <line x1={leftX + boxW/2} y1={369} x2={leftX + boxW/2} y2={390} stroke="#64748b" />
        <line x1={rightX + boxW/2} y1={369} x2={rightX + boxW/2} y2={380} stroke="#64748b" />
        <line x1={rightX + boxW/2} y1={380} x2={rightX + boxW/2} y2={450} stroke="#64748b" />

        {/* f-function for round 16 */}
        <rect x={rightX + boxW/2 + 15} y={385} width={35} height={28} rx="3" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="1.5" />
        <text x={rightX + boxW/2 + 32} y={403} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">f</text>

        <line x1={rightX + boxW/2} y1={380} x2={rightX + boxW/2 + 15} y2={399} stroke="#64748b" />
        <line x1={rightX + boxW/2 + 33} y1={413} x2={rightX + boxW/2 + 33} y2={425} stroke="#64748b" />
        <line x1={rightX + boxW/2 + 33} y1={425} x2={leftX + boxW/2 + 20} y2={425} stroke="#64748b" />
        <line x1={leftX + boxW/2 + 20} y1={425} x2={leftX + boxW/2 + 10} y2={400} stroke="#64748b" markerEnd="url(#desArrow)" />

        <line x1={keyX} y1={399} x2={rightX + boxW/2 + 50} y2={399} stroke="#64748b" markerEnd="url(#desArrow)" />
        <text x={keyX + 10} y={395} className="text-[9px] fill-slate-600 font-mono">k₁₆</text>
        <text x={keyX - 5} y={405} className="text-[8px] fill-slate-500">48</text>

        <line x1={leftX + boxW/2} y1={410} x2={leftX + boxW/2} y2={435} stroke="#64748b" />

        {/* NO swap after round 16 - outputs go straight to L16/R16 */}
        <line x1={leftX + boxW/2} y1={435} x2={leftX + boxW/2} y2={455} stroke="#64748b" />

        {/* L16 and R16 */}
        <rect x={leftX} y={457} width={boxW} height={boxH} rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x={leftX + boxW/2} y={473} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">L₁₆</text>
        <rect x={rightX} y={457} width={boxW} height={boxH} rx="3" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
        <text x={rightX + boxW/2} y={473} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">R₁₆</text>

        {/* Join to FP - note R16||L16 order */}
        <line x1={leftX + boxW/2} y1={481} x2={leftX + boxW/2} y2={495} stroke="#64748b" />
        <line x1={rightX + boxW/2} y1={481} x2={rightX + boxW/2} y2={495} stroke="#64748b" />
        <line x1={leftX + boxW/2} y1={495} x2={rightX + boxW/2} y2={495} stroke="#64748b" />
        <line x1={175} y1={495} x2={175} y2={508} stroke="#64748b" markerEnd="url(#desArrow)" />

        {/* Final Permutation */}
        <g onMouseEnter={() => handleHover('finalPerm')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={120} y={510} width={110} height={24} rx="3" fill={hovered === 'finalPerm' ? '#dbeafe' : '#e2e8f0'} stroke="#3b82f6" strokeWidth="1.5" />
          <text x={175} y={526} textAnchor="middle" className="text-[10px] fill-slate-700">Final Permutation</text>
          <text x={175} y={536} textAnchor="middle" className="text-[8px] fill-slate-500 italic">IP⁻¹( )</text>
        </g>

        {/* Ciphertext */}
        <line x1={175} y1={534} x2={175} y2={550} stroke="#64748b" markerEnd="url(#desArrow)" />
        <g onMouseEnter={() => handleHover('ciphertext')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={135} y={552} width={80} height={22} rx="3" fill={hovered === 'ciphertext' ? '#d1fae5' : '#f1f5f9'} stroke="#64748b" />
          <text x={175} y={567} textAnchor="middle" className="text-[10px] fill-slate-700">Ciphertext y</text>
        </g>

        {/* Key schedule arrow from right */}
        <text x={keyX + 30} y={280} className="text-[9px] fill-slate-500" textAnchor="middle">Key</text>
        <text x={keyX + 30} y={292} className="text-[9px] fill-slate-500" textAnchor="middle">Schedule</text>
        <line x1={keyX + 30} y1={300} x2={keyX + 30} y2={370} stroke="#94a3b8" strokeDasharray="4,2" />
        <text x={keyX + 30} y={360} className="text-lg fill-slate-400" textAnchor="middle">⋮</text>
      </svg>

      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
        <strong>Feistel Network:</strong> Each round: Lᵢ = Rᵢ₋₁, Rᵢ = Lᵢ₋₁ ⊕ f(Rᵢ₋₁, kᵢ). Note: After round 16, L₁₆ and R₁₆ are NOT swapped before the final permutation.
      </div>
    </>
  );
}

// ============ f-FUNCTION (Fig. 3.10) ============
function FFunctionView({ hovered, handleHover, setHovered }) {
  return (
    <>
      <svg viewBox="0 0 400 420" className="w-full max-w-lg mx-auto">
        <defs>
          <marker id="fArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
          </marker>
        </defs>

        {/* Title */}
        <text x="200" y="20" textAnchor="middle" className="text-sm fill-slate-700 font-semibold">DES f-Function (Fig. 3.10)</text>

        {/* R input */}
        <text x="200" y="45" textAnchor="middle" className="text-[10px] fill-slate-600 font-mono">Rᵢ₋₁</text>
        <line x1={200} y1={50} x2={200} y2={70} stroke="#64748b" markerEnd="url(#fArrow)" />
        <text x={210} y={62} className="text-[8px] fill-slate-500">32</text>

        {/* Expansion E */}
        <g onMouseEnter={() => handleHover('expansion')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={130} y={72} width={140} height={28} rx="3" fill={hovered === 'expansion' ? '#dbeafe' : '#e0f2fe'} stroke="#0ea5e9" strokeWidth="1.5" />
          <text x={200} y={90} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">Expansion</text>
          <text x={200} y={100} textAnchor="middle" className="text-[8px] fill-slate-500 italic">E(Rᵢ₋₁)</text>
        </g>

        <line x1={200} y1={100} x2={200} y2={125} stroke="#64748b" markerEnd="url(#fArrow)" />
        <text x={210} y={115} className="text-[8px] fill-slate-500">48</text>

        {/* XOR with key */}
        <circle cx={200} cy={140} r="12" fill="none" stroke="#64748b" strokeWidth="1.5" />
        <line x1={192} y1={140} x2={208} y2={140} stroke="#64748b" strokeWidth="1.5" />
        <line x1={200} y1={132} x2={200} y2={148} stroke="#64748b" strokeWidth="1.5" />

        {/* Key input */}
        <line x1={280} y1={140} x2={212} y2={140} stroke="#64748b" markerEnd="url(#fArrow)" />
        <text x={300} y={144} className="text-[9px] fill-slate-600 font-mono">kᵢ</text>
        <text x={295} y={155} className="text-[8px] fill-slate-500">48</text>

        <line x1={200} y1={152} x2={200} y2={175} stroke="#64748b" markerEnd="url(#fArrow)" />
        <text x={210} y={167} className="text-[8px] fill-slate-500">48</text>

        {/* S-boxes */}
        <g onMouseEnter={() => handleHover('sbox')} onMouseLeave={() => setHovered(null)}>
          {/* Fan out lines */}
          {[0,1,2,3,4,5,6,7].map(i => {
            const sboxX = 60 + i * 38;
            return (
              <g key={i}>
                <line x1={200} y1={175} x2={sboxX + 15} y2={195} stroke="#94a3b8" strokeWidth="0.75" />
                <text x={sboxX + 15} y={192} textAnchor="middle" className="text-[7px] fill-slate-400">6</text>
                <rect x={sboxX} y={200} width={30} height={26} rx="2" fill={hovered === 'sbox' ? '#fef3c7' : '#fefce8'} stroke="#eab308" strokeWidth="1.5" style={{ cursor: 'pointer' }} />
                <text x={sboxX + 15} y={217} textAnchor="middle" className="text-[9px] fill-slate-700 font-medium">S{i+1}</text>
                <line x1={sboxX + 15} y1={226} x2={sboxX + 15} y2={245} stroke="#94a3b8" strokeWidth="0.75" />
                <text x={sboxX + 15} y={243} textAnchor="middle" className="text-[7px] fill-slate-400">4</text>
              </g>
            );
          })}
        </g>

        {/* Fan in to 32 bits */}
        {[0,1,2,3,4,5,6,7].map(i => {
          const sboxX = 60 + i * 38;
          return <line key={i} x1={sboxX + 15} y1={245} x2={200} y2={270} stroke="#94a3b8" strokeWidth="0.75" />;
        })}
        <line x1={200} y1={270} x2={200} y2={290} stroke="#64748b" markerEnd="url(#fArrow)" />
        <text x={210} y={282} className="text-[8px] fill-slate-500">32</text>

        {/* Permutation P */}
        <g onMouseEnter={() => handleHover('pbox')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={130} y={292} width={140} height={28} rx="3" fill={hovered === 'pbox' ? '#dbeafe' : '#e0e7ff'} stroke="#6366f1" strokeWidth="1.5" />
          <text x={200} y={310} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">Permutation</text>
          <text x={200} y={322} textAnchor="middle" className="text-[8px] fill-slate-500 italic">P</text>
        </g>

        {/* Output */}
        <line x1={200} y1={320} x2={200} y2={350} stroke="#64748b" markerEnd="url(#fArrow)" />
        <text x={210} y={340} className="text-[8px] fill-slate-500">32</text>

        <text x="200" y="370" textAnchor="middle" className="text-[10px] fill-slate-600 font-mono">f(Rᵢ₋₁, kᵢ)</text>

        {/* Formula */}
        <rect x={80} y={385} width={240} height={28} rx="4" fill="#f8fafc" stroke="#e2e8f0" />
        <text x={200} y={403} textAnchor="middle" className="text-[10px] fill-slate-600 font-mono">f(R, k) = P( S₁...S₈( E(R) ⊕ k ) )</text>
      </svg>

      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
        <strong>f-function:</strong> Expansion E (32→48 bits) → XOR with 48-bit subkey → 8 S-boxes (6→4 bits each) → P permutation (32 bits).
      </div>
    </>
  );
}

// ============ KEY SCHEDULE (Fig. 3.14) ============
function KeyScheduleView({ hovered, handleHover, setHovered }) {
  return (
    <>
      <svg viewBox="0 0 380 520" className="w-full max-w-lg mx-auto">
        <defs>
          <marker id="ksArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
          </marker>
        </defs>

        {/* Title */}
        <text x="190" y="20" textAnchor="middle" className="text-sm fill-slate-700 font-semibold">DES Key Schedule (Fig. 3.14)</text>

        {/* Key input */}
        <g onMouseEnter={() => handleHover('keyInput')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={140} y={30} width={100} height={24} rx="3" fill={hovered === 'keyInput' ? '#dbeafe' : '#f1f5f9'} stroke="#64748b" />
          <text x={190} y={46} textAnchor="middle" className="text-[10px] fill-slate-700">Key k</text>
        </g>
        <line x1={190} y1={54} x2={190} y2={70} stroke="#64748b" markerEnd="url(#ksArrow)" />
        <text x={200} y={63} className="text-[8px] fill-slate-500">64</text>

        {/* PC-1 */}
        <g onMouseEnter={() => handleHover('pc1')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={130} y={72} width={120} height={26} rx="3" fill={hovered === 'pc1' ? '#dbeafe' : '#e0f2fe'} stroke="#0ea5e9" strokeWidth="1.5" />
          <text x={190} y={89} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">PC-1</text>
        </g>
        <line x1={190} y1={98} x2={190} y2={115} stroke="#64748b" />
        <text x={200} y={110} className="text-[8px] fill-slate-500">56</text>

        {/* Split to C0 and D0 */}
        <line x1={130} y1={115} x2={250} y2={115} stroke="#64748b" />
        <line x1={130} y1={115} x2={130} y2={130} stroke="#64748b" markerEnd="url(#ksArrow)" />
        <line x1={250} y1={115} x2={250} y2={130} stroke="#64748b" markerEnd="url(#ksArrow)" />

        {/* C0 and D0 */}
        <rect x={95} y={132} width={70} height={24} rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x={130} y={148} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">C₀</text>
        <rect x={215} y={132} width={70} height={24} rx="3" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
        <text x={250} y={148} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">D₀</text>
        <text x={130} y={165} textAnchor="middle" className="text-[8px] fill-slate-500">28</text>
        <text x={250} y={165} textAnchor="middle" className="text-[8px] fill-slate-500">28</text>

        {/* Transform 1 brace */}
        <text x={30} y={210} className="text-[9px] fill-slate-500">Transform 1</text>
        <path d="M60,172 Q50,172 50,182 L50,242 Q50,252 60,252" fill="none" stroke="#94a3b8" strokeWidth="1" />

        {/* LS1 rotations */}
        <g onMouseEnter={() => handleHover('rotation')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <line x1={130} y1={156} x2={130} y2={175} stroke="#64748b" />
          <circle cx={130} cy={190} r="14" fill={hovered === 'rotation' ? '#dbeafe' : '#f1f5f9'} stroke="#64748b" />
          <text x={130} y={187} textAnchor="middle" className="text-[8px] fill-slate-600">LS₁</text>
          <path d="M122,197 A8,8 0 0 0 138,197" fill="none" stroke="#64748b" strokeWidth="1" />
          <polygon points="136,195 140,199 135,200" fill="#64748b" />
        </g>

        <g onMouseEnter={() => handleHover('rotation')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <line x1={250} y1={156} x2={250} y2={175} stroke="#64748b" />
          <circle cx={250} cy={190} r="14" fill={hovered === 'rotation' ? '#dbeafe' : '#f1f5f9'} stroke="#64748b" />
          <text x={250} y={187} textAnchor="middle" className="text-[8px] fill-slate-600">LS₁</text>
          <path d="M242,197 A8,8 0 0 0 258,197" fill="none" stroke="#64748b" strokeWidth="1" />
          <polygon points="256,195 260,199 255,200" fill="#64748b" />
        </g>

        <line x1={130} y1={204} x2={130} y2={225} stroke="#64748b" />
        <line x1={250} y1={204} x2={250} y2={225} stroke="#64748b" />
        <text x={130} y={220} textAnchor="middle" className="text-[8px] fill-slate-500">28</text>
        <text x={250} y={220} textAnchor="middle" className="text-[8px] fill-slate-500">28</text>

        {/* C1 and D1 */}
        <rect x={95} y={227} width={70} height={24} rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x={130} y={243} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">C₁</text>
        <rect x={215} y={227} width={70} height={24} rx="3" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
        <text x={250} y={243} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">D₁</text>

        {/* PC-2 to k1 */}
        <line x1={130} y1={239} x2={70} y2={239} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={250} y1={239} x2={310} y2={239} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={70} y1={239} x2={70} y2={255} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={310} y1={239} x2={310} y2={255} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={70} y1={255} x2={310} y2={255} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={190} y1={255} x2={190} y2={270} stroke="#64748b" strokeDasharray="3,2" />
        <text x={200} y={265} className="text-[8px] fill-slate-500">56</text>

        <g onMouseEnter={() => handleHover('pc2')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={150} y={272} width={80} height={24} rx="3" fill={hovered === 'pc2' ? '#dbeafe' : '#e0f2fe'} stroke="#0ea5e9" strokeWidth="1.5" />
          <text x={190} y={288} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">PC-2</text>
        </g>

        <line x1={190} y1={296} x2={190} y2={315} stroke="#64748b" markerEnd="url(#ksArrow)" />
        <text x={200} y={308} className="text-[8px] fill-slate-500">48</text>

        {/* k1 */}
        <rect x={160} y={317} width={60} height={22} rx="3" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <text x={190} y={332} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium font-mono">k₁</text>

        {/* Dots */}
        <line x1={130} y1={251} x2={130} y2={365} stroke="#64748b" />
        <line x1={250} y1={251} x2={250} y2={365} stroke="#64748b" />
        <text x={190} y={360} textAnchor="middle" className="text-lg fill-slate-400">⋮</text>

        {/* Transform 16 */}
        <text x={30} y={410} className="text-[9px] fill-slate-500">Transform 16</text>
        <path d="M60,375 Q50,375 50,385 L50,455 Q50,465 60,465" fill="none" stroke="#94a3b8" strokeWidth="1" />

        {/* LS16 rotations */}
        <circle cx={130} cy={390} r="14" fill="#f1f5f9" stroke="#64748b" />
        <text x={130} y={387} textAnchor="middle" className="text-[7px] fill-slate-600">LS₁₆</text>
        <path d="M122,397 A8,8 0 0 0 138,397" fill="none" stroke="#64748b" strokeWidth="1" />

        <circle cx={250} cy={390} r="14" fill="#f1f5f9" stroke="#64748b" />
        <text x={250} y={387} textAnchor="middle" className="text-[7px] fill-slate-600">LS₁₆</text>
        <path d="M242,397 A8,8 0 0 0 258,397" fill="none" stroke="#64748b" strokeWidth="1" />

        <line x1={130} y1={404} x2={130} y2={420} stroke="#64748b" />
        <line x1={250} y1={404} x2={250} y2={420} stroke="#64748b" />

        {/* C16 and D16 */}
        <rect x={95} y={422} width={70} height={24} rx="3" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
        <text x={130} y={438} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">C₁₆</text>
        <rect x={215} y={422} width={70} height={24} rx="3" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5" />
        <text x={250} y={438} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">D₁₆</text>

        {/* PC-2 to k16 */}
        <line x1={130} y1={434} x2={70} y2={434} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={250} y1={434} x2={310} y2={434} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={70} y1={434} x2={70} y2={450} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={310} y1={434} x2={310} y2={450} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={70} y1={450} x2={310} y2={450} stroke="#64748b" strokeDasharray="3,2" />
        <line x1={190} y1={450} x2={190} y2={465} stroke="#64748b" strokeDasharray="3,2" />

        <rect x={150} y={467} width={80} height={24} rx="3" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="1.5" />
        <text x={190} y={483} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium">PC-2</text>

        <line x1={190} y1={491} x2={190} y2={505} stroke="#64748b" markerEnd="url(#ksArrow)" />

        {/* k16 */}
        <rect x={160} y={507} width={60} height={22} rx="3" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <text x={190} y={522} textAnchor="middle" className="text-[10px] fill-slate-700 font-medium font-mono">k₁₆</text>
      </svg>

      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
        <strong>Key Schedule:</strong> PC-1 drops parity bits (64→56). Split into C₀, D₀ (28 bits each). Rotate left 1 or 2 positions per round. PC-2 selects 48 bits for each subkey.
        <br /><span className="text-slate-400">Rounds 1, 2, 9, 16: rotate by 1. Others: rotate by 2.</span>
      </div>
    </>
  );
}

// ============ S-BOXES VIEW ============
function SBoxView({ selectedSbox, setSelectedSbox, sboxInput, setSboxInput }) {
  const sbox = SBOXES[selectedSbox];
  const output = sbox[sboxInput.row][sboxInput.col];

  // Convert to 6-bit input representation
  const input6bit = ((sboxInput.row & 2) << 4) | (sboxInput.col << 1) | (sboxInput.row & 1);
  const inputBinary = input6bit.toString(2).padStart(6, '0');
  const outputBinary = output.toString(2).padStart(4, '0');

  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-medium text-slate-700 mb-2">Select S-Box:</div>
        <div className="flex gap-1 flex-wrap">
          {[0,1,2,3,4,5,6,7].map(i => (
            <button
              key={i}
              onClick={() => setSelectedSbox(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedSbox === i
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              S{i+1}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-3 mb-4">
        <div className="text-xs text-slate-600 mb-2">
          <strong>Input (6 bits):</strong> <span className="font-mono bg-white px-1.5 py-0.5 rounded border">{inputBinary}</span>
          <span className="mx-2">→</span>
          <strong>Row:</strong> <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{sboxInput.row}</span> (bits 1,6)
          <span className="mx-2">|</span>
          <strong>Col:</strong> <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">{sboxInput.col}</span> (bits 2-5)
        </div>
        <div className="text-xs text-slate-600">
          <strong>Output (4 bits):</strong> <span className="font-mono bg-green-100 px-1.5 py-0.5 rounded border border-green-300">{output}</span>
          <span className="text-slate-400 ml-2">= {outputBinary}₂</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="border border-slate-300 bg-slate-100 p-1 font-medium">S{selectedSbox + 1}</th>
              {[...Array(16)].map((_, col) => (
                <th key={col} className="border border-slate-300 bg-slate-100 p-1 font-mono">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0,1,2,3].map(row => (
              <tr key={row}>
                <td className="border border-slate-300 bg-slate-100 p-1 font-medium text-center">{row}</td>
                {[...Array(16)].map((_, col) => {
                  const isSelected = row === sboxInput.row && col === sboxInput.col;
                  return (
                    <td
                      key={col}
                      onClick={() => setSboxInput({ row, col })}
                      className={`border p-1 text-center cursor-pointer transition-all font-mono ${
                        isSelected
                          ? 'bg-amber-400 text-white font-bold border-amber-500'
                          : 'border-slate-200 hover:bg-amber-100'
                      }`}
                    >
                      {sbox[row][col]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
        <strong>S-Box Lookup:</strong> The 6-bit input is split: outer bits (1 and 6) select the row (0-3), middle 4 bits (2-5) select the column (0-15). 
        The table entry gives the 4-bit output. This is the ONLY nonlinear operation in DES.
      </div>
    </>
  );
}

// ============ 3DES / TRIPLE DES (Fig. 3.19) ============
function TripleDESView({ hovered, handleHover, setHovered }) {
  const [keyingOption, setKeyingOption] = useState(2); // 2-key or 3-key

  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-medium text-slate-700 mb-2">Keying Option:</div>
        <div className="flex gap-2">
          <button
            onClick={() => setKeyingOption(2)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              keyingOption === 2
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2-Key (k₁ = k₃)
          </button>
          <button
            onClick={() => setKeyingOption(3)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              keyingOption === 3
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            3-Key (Independent)
          </button>
        </div>
      </div>

      <svg viewBox="0 0 400 380" className="w-full max-w-lg mx-auto">
        <defs>
          <marker id="tdesArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
          </marker>
        </defs>

        {/* Title */}
        <text x="200" y="20" textAnchor="middle" className="text-sm fill-slate-700 font-semibold">
          Triple DES (3DES) - EDE Mode (Fig. 3.19)
        </text>

        {/* Plaintext */}
        <g onMouseEnter={() => handleHover('plaintext')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={155} y={35} width={90} height={24} rx="3" fill={hovered === 'plaintext' ? '#dbeafe' : '#f1f5f9'} stroke="#64748b" />
          <text x={200} y={51} textAnchor="middle" className="text-[10px] fill-slate-700">Plaintext x</text>
        </g>
        <line x1={200} y1={59} x2={200} y2={80} stroke="#64748b" markerEnd="url(#tdesArrow)" />
        <text x={210} y={72} className="text-[8px] fill-slate-500">64</text>

        {/* DES Encrypt with k1 */}
        <g onMouseEnter={() => handleHover('tdesKey1')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={130} y={82} width={140} height={50} rx="4" fill={hovered === 'tdesKey1' ? '#dbeafe' : '#dcfce7'} stroke="#22c55e" strokeWidth="2" />
          <text x={200} y={102} textAnchor="middle" className="text-[11px] fill-slate-700 font-medium">DES Encrypt</text>
          <text x={200} y={120} textAnchor="middle" className="text-[9px] fill-slate-500">16 rounds with k₁</text>
        </g>
        {/* k1 input */}
        <line x1={310} y1={107} x2={270} y2={107} stroke="#64748b" markerEnd="url(#tdesArrow)" />
        <rect x={310} y={95} width={50} height={24} rx="3" fill="#fef3c7" stroke="#f59e0b" />
        <text x={335} y={111} textAnchor="middle" className="text-[10px] fill-slate-700 font-mono font-medium">k₁</text>
        <text x={335} y={130} textAnchor="middle" className="text-[8px] fill-slate-500">56 bits</text>

        <line x1={200} y1={132} x2={200} y2={155} stroke="#64748b" markerEnd="url(#tdesArrow)" />
        <text x={210} y={147} className="text-[8px] fill-slate-500">64</text>

        {/* DES Decrypt with k2 */}
        <g onMouseEnter={() => handleHover('tdesKey2')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={130} y={157} width={140} height={50} rx="4" fill={hovered === 'tdesKey2' ? '#dbeafe' : '#fee2e2'} stroke="#ef4444" strokeWidth="2" />
          <text x={200} y={177} textAnchor="middle" className="text-[11px] fill-slate-700 font-medium">DES Decrypt</text>
          <text x={200} y={195} textAnchor="middle" className="text-[9px] fill-slate-500">16 rounds with k₂ (reversed)</text>
        </g>
        {/* k2 input */}
        <line x1={310} y1={182} x2={270} y2={182} stroke="#64748b" markerEnd="url(#tdesArrow)" />
        <rect x={310} y={170} width={50} height={24} rx="3" fill="#dbeafe" stroke="#3b82f6" />
        <text x={335} y={186} textAnchor="middle" className="text-[10px] fill-slate-700 font-mono font-medium">k₂</text>
        <text x={335} y={205} textAnchor="middle" className="text-[8px] fill-slate-500">56 bits</text>

        <line x1={200} y1={207} x2={200} y2={230} stroke="#64748b" markerEnd="url(#tdesArrow)" />
        <text x={210} y={222} className="text-[8px] fill-slate-500">64</text>

        {/* DES Encrypt with k3 */}
        <g onMouseEnter={() => handleHover('tdesKey3')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={130} y={232} width={140} height={50} rx="4" fill={hovered === 'tdesKey3' ? '#dbeafe' : '#dcfce7'} stroke="#22c55e" strokeWidth="2" />
          <text x={200} y={252} textAnchor="middle" className="text-[11px] fill-slate-700 font-medium">DES Encrypt</text>
          <text x={200} y={270} textAnchor="middle" className="text-[9px] fill-slate-500">16 rounds with k₃</text>
        </g>
        {/* k3 input */}
        <line x1={310} y1={257} x2={270} y2={257} stroke="#64748b" markerEnd="url(#tdesArrow)" />
        <rect x={310} y={245} width={50} height={24} rx="3" fill={keyingOption === 2 ? '#fef3c7' : '#fce7f3'} stroke={keyingOption === 2 ? '#f59e0b' : '#ec4899'} />
        <text x={335} y={261} textAnchor="middle" className="text-[10px] fill-slate-700 font-mono font-medium">
          {keyingOption === 2 ? 'k₁' : 'k₃'}
        </text>
        <text x={335} y={280} textAnchor="middle" className="text-[8px] fill-slate-500">56 bits</text>

        {/* 2-key indication */}
        {keyingOption === 2 && (
          <g>
            <path d="M365,107 Q380,107 380,140 L380,245 Q380,261 365,261" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,2" />
            <text x={387} y={184} className="text-[8px] fill-amber-600" textAnchor="start">same</text>
          </g>
        )}

        <line x1={200} y1={282} x2={200} y2={310} stroke="#64748b" markerEnd="url(#tdesArrow)" />
        <text x={210} y={300} className="text-[8px] fill-slate-500">64</text>

        {/* Ciphertext */}
        <g onMouseEnter={() => handleHover('ciphertext')} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
          <rect x={150} y={312} width={100} height={24} rx="3" fill={hovered === 'ciphertext' ? '#d1fae5' : '#f1f5f9'} stroke="#64748b" />
          <text x={200} y={328} textAnchor="middle" className="text-[10px] fill-slate-700">Ciphertext y</text>
        </g>

        {/* Formula */}
        <rect x={70} y={345} width={260} height={28} rx="4" fill="#f8fafc" stroke="#e2e8f0" />
        <text x={200} y={363} textAnchor="middle" className="text-[9px] fill-slate-600 font-mono">
          {keyingOption === 2 
            ? 'y = DES_{k₁}( DES⁻¹_{k₂}( DES_{k₁}(x) ) )' 
            : 'y = DES_{k₃}( DES⁻¹_{k₂}( DES_{k₁}(x) ) )'}
        </text>

        {/* Labels on left */}
        <text x={60} y={107} textAnchor="middle" className="text-[9px] fill-slate-500">Step 1</text>
        <text x={60} y={182} textAnchor="middle" className="text-[9px] fill-slate-500">Step 2</text>
        <text x={60} y={257} textAnchor="middle" className="text-[9px] fill-slate-500">Step 3</text>
      </svg>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg border text-xs ${
          keyingOption === 2 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="font-medium text-slate-700 mb-1">2-Key 3DES</div>
          <div className="text-slate-600">k₁ = k₃, k₂ independent</div>
          <div className="text-slate-500 mt-1">Effective: <strong>112 bits</strong></div>
        </div>
        <div className={`p-3 rounded-lg border text-xs ${
          keyingOption === 3 ? 'bg-pink-50 border-pink-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="font-medium text-slate-700 mb-1">3-Key 3DES</div>
          <div className="text-slate-600">k₁, k₂, k₃ all independent</div>
          <div className="text-slate-500 mt-1">Effective: <strong>168 bits</strong></div>
        </div>
      </div>

      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
        <strong>EDE Mode:</strong> Encrypt-Decrypt-Encrypt. The middle decryption step provides backward compatibility: if k₁=k₂=k₃, the result equals single DES encryption. 3DES is being phased out in favor of AES.
      </div>
    </>
  );
}
