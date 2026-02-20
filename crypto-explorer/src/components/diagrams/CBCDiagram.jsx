import { useState } from 'react';

// Based on Paar/Pelzl "Understanding Cryptography" Section 5.1.2, Fig. 5.4
const cbcInfo = {
  iv: {
    title: 'Initialization Vector (IV)',
    description: `The IV is a nonce of length b (same as block size). For the first plaintext block x₁, there is no previous ciphertext, so the IV is added to the first plaintext instead.

The IV makes CBC encryption nondeterministic — if we choose a new IV every time we encrypt, the CBC mode becomes a probabilistic encryption scheme. If we encrypt the same message twice with different IVs, the resulting ciphertext sequences look completely unrelated.

The IV does NOT need to be kept secret. However, in most cases, we want the IV to be a nonce (number used only once). The IV can be:
• A randomly chosen number transmitted in the clear
• A counter value known to both parties
• Derived from values like IP addresses + current time
• ECB-encrypted to ensure unpredictability`,
    formula: 'y₀ = IV (used in place of y₀ for first block)'
  },
  plaintext: {
    title: 'Plaintext Block xᵢ',
    description: `The plaintext is divided into blocks of b bits. In CBC mode, the encryption of block xᵢ depends not only on xᵢ itself but on ALL previous plaintext blocks as well.

The ciphertext yᵢ₋₁ (result of encrypting xᵢ₋₁) is fed back to the cipher input and XORed with the succeeding plaintext block xᵢ. This XOR sum is then encrypted, yielding yᵢ.

This chaining means:
• The last ciphertext is a function of ALL plaintext blocks and the IV
• Identical plaintexts produce different ciphertexts (if IV differs)
• Patterns in plaintext are completely hidden`,
    formula: 'Encryption: yᵢ = eₖ(xᵢ ⊕ yᵢ₋₁), i ≥ 1'
  },
  xor: {
    title: 'XOR Operation (⊕)',
    description: `The XOR combines the plaintext block with the previous ciphertext block (or IV for the first block).

For encryption: xᵢ ⊕ yᵢ₋₁ → input to block cipher
For decryption: eₖ⁻¹(yᵢ) ⊕ yᵢ₋₁ → recovered plaintext

This chaining operation is what makes CBC fundamentally different from ECB. Substitution attacks that work on ECB do NOT work on CBC if the IV is properly chosen for every wire transfer.`,
    formula: 'XOR: a ⊕ b ⊕ b = a (self-inverse property)'
  },
  encrypt: {
    title: 'Block Cipher Encryption e (Definition 5.1.2)',
    description: `The block cipher encrypts the XOR of plaintext and previous ciphertext.

Encryption (first block): y₁ = eₖ(x₁ ⊕ IV)
Encryption (general block): yᵢ = eₖ(xᵢ ⊕ yᵢ₋₁), i ≥ 2

Unlike ECB, encryption in CBC mode CANNOT be parallelized — each block depends on the previous ciphertext, which must be computed first. However, decryption CAN be parallelized.`,
    formula: 'yᵢ = eₖ(xᵢ ⊕ yᵢ₋₁)'
  },
  decrypt: {
    title: 'Block Cipher Decryption e⁻¹ (Definition 5.1.2)',
    description: `When decrypting ciphertext block yᵢ in CBC mode, we reverse the two encryption operations:

1. First, apply the decryption function e⁻¹() to get eₖ⁻¹(yᵢ) = xᵢ ⊕ yᵢ₋₁
2. Then XOR with the previous ciphertext: (xᵢ ⊕ yᵢ₋₁) ⊕ yᵢ₋₁ = xᵢ

Decryption (first block): x₁ = eₖ⁻¹(y₁) ⊕ IV
Decryption (general block): xᵢ = eₖ⁻¹(yᵢ) ⊕ yᵢ₋₁, i ≥ 2

Verification: d(yᵢ) = eₖ⁻¹(yᵢ) ⊕ yᵢ₋₁ = eₖ⁻¹(eₖ(xᵢ ⊕ yᵢ₋₁)) ⊕ yᵢ₋₁ = (xᵢ ⊕ yᵢ₋₁) ⊕ yᵢ₋₁ = xᵢ`,
    formula: 'xᵢ = eₖ⁻¹(yᵢ) ⊕ yᵢ₋₁'
  },
  ciphertext: {
    title: 'Ciphertext Block yᵢ',
    description: `The output ciphertext block serves two purposes:
1. It is transmitted/stored as the encrypted data
2. It is fed back and XORed with the NEXT plaintext block

This feedback loop creates the "chaining" in Cipher Block Chaining. The second ciphertext y₂ depends on IV, x₁, AND x₂. The third ciphertext y₃ depends on IV, x₁, x₂, AND x₃. And so on.`,
    formula: 'yᵢ depends on IV, x₁, x₂, ..., xᵢ'
  },
  feedback: {
    title: 'Feedback Loop (yᵢ₋₁)',
    description: `The previous ciphertext block yᵢ₋₁ is fed back to be XORed with the current plaintext. This is shown by the line going from the output yᵢ up and back to the XOR.

On the decryption side, we need the same yᵢ₋₁ value — but we already have it (it's the previous ciphertext we received). This means decryption can be parallelized: all yᵢ values are available immediately.

Error propagation: A single bit error in ciphertext yᵢ will:
• Completely corrupt the decrypted block xᵢ (random garbage)
• Cause exactly one bit error in xᵢ₊₁ (where the bit flip occurred in yᵢ)`,
    formula: 'yᵢ₋₁ → XOR with xᵢ (encrypt) or e⁻¹(yᵢ) (decrypt)'
  },
  key: {
    title: 'Secret Key k',
    description: `The same key k is used for all block encryptions and decryptions. The key must be shared between sender and receiver through a secure channel.

Unlike the IV, the key MUST be kept secret. Key lengths depend on the block cipher: 128/192/256 bits for AES, 56 bits for DES, 112/168 bits for 3DES.`,
    formula: 'k is shared secret between Alice and Bob'
  },
  substitution: {
    title: 'CBC vs Substitution Attacks',
    description: `The substitution attack that worked on ECB does NOT work on CBC — if the IV is properly chosen for every message.

If Oscar substitutes ciphertext block 4 (the receiving account number) in another wire transfer, bank B would decrypt blocks 4 and 5 to random garbage values. The money would not go to Oscar's account, but might go to some random account (also undesirable).

This shows that even though Oscar cannot perform SPECIFIC manipulations, ciphertext alterations can cause random changes to plaintext. This is why we need integrity protection (MACs or authenticated encryption like GCM).`,
    formula: 'Substitution → random plaintext (but still a problem!)'
  }
};

// Reusable SVG components
const ArrowHead = ({ x, y, direction = 'right' }) => {
  const rotations = { right: 0, down: 90, left: 180, up: -90 };
  return (
    <polygon
      points="-6,-4 0,0 -6,4"
      transform={`translate(${x},${y}) rotate(${rotations[direction]})`}
      fill="#64748b"
    />
  );
};

const XorCircle = ({ cx, cy, onMouseEnter, onMouseLeave, hovered }) => (
  <g onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ cursor: 'pointer' }}>
    <circle 
      cx={cx} cy={cy} r="12" 
      fill={hovered ? '#dbeafe' : '#f8fafc'}
      stroke={hovered ? '#3b82f6' : '#64748b'} 
      strokeWidth="2" 
    />
    <text x={cx} y={cy + 4} textAnchor="middle" className="text-sm fill-slate-700" style={{ fontSize: '14px' }}>⊕</text>
  </g>
);

export default function CBCDiagram({ onHover }) {
  const [hovered, setHovered] = useState(null);

  const handleHover = (key) => {
    setHovered(key);
    if (onHover && cbcInfo[key]) {
      onHover(cbcInfo[key]);
    }
  };

  const boxStyle = (key) => ({
    fill: hovered === key ? '#dbeafe' : '#f8fafc',
    stroke: hovered === key ? '#3b82f6' : '#cbd5e1',
    strokeWidth: 2,
    cursor: 'pointer',
  });

  return (
    <div className="diagram-container">
      <svg viewBox="0 0 580 200" className="w-full max-w-4xl mx-auto">
        {/* Title */}
        <text x="290" y="15" textAnchor="middle" className="text-xs fill-slate-500 font-medium">
          Fig. 5.4 — Encryption and decryption in CBC mode
        </text>

        {/* ========== ENCRYPTION (LEFT SIDE) ========== */}
        
        {/* IV label (top left) */}
        <text 
          x="20" y="48" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('iv')}
          onMouseLeave={() => setHovered(null)}
        >
          IV
        </text>
        
        {/* Arrow from IV going right */}
        <line x1="32" y1="45" x2="55" y2="45" stroke="#64748b" strokeWidth="1.5" />
        
        {/* Feedback box y_{i-1} at top */}
        <g onMouseEnter={() => handleHover('feedback')} onMouseLeave={() => setHovered(null)}>
          <rect x="58" y="30" width="50" height="30" rx="3" style={boxStyle('feedback')} />
          <text x="83" y="50" textAnchor="middle" className="text-xs fill-slate-600 font-mono">yᵢ₋₁</text>
        </g>
        
        {/* Arrow down from y_{i-1} to XOR */}
        <line x1="83" y1="60" x2="83" y2="78" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={83} y={78} direction="down" />
        
        {/* Plaintext x_i coming from left */}
        <text 
          x="20" y="95" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('plaintext')}
          onMouseLeave={() => setHovered(null)}
        >
          xᵢ
        </text>
        <line x1="32" y1="90" x2="68" y2="90" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={68} y={90} direction="right" />
        
        {/* XOR circle */}
        <XorCircle 
          cx={83} cy={90} 
          hovered={hovered === 'xor'}
          onMouseEnter={() => handleHover('xor')}
          onMouseLeave={() => setHovered(null)}
        />
        
        {/* Arrow from XOR down to encryption box */}
        <line x1="83" y1="102" x2="83" y2="118" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={83} y={118} direction="down" />
        
        {/* Encryption box e */}
        <g onMouseEnter={() => handleHover('encrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="53" y="120" width="60" height="35" rx="4" style={boxStyle('encrypt')} />
          <text x="83" y="142" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e
          </text>
        </g>
        
        {/* Key k arrow (from below) */}
        <line x1="83" y1="180" x2="83" y2="155" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={83} y={155} direction="up" />
        <text 
          x="83" y="193" 
          textAnchor="middle" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>
        
        {/* Arrow from e box to y_i output */}
        <line x1="113" y1="137" x2="165" y2="137" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={165} y={137} direction="right" />
        
        {/* y_i output (ciphertext) */}
        <text 
          x="185" y="142" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('ciphertext')}
          onMouseLeave={() => setHovered(null)}
        >
          yᵢ
        </text>
        
        {/* FEEDBACK LOOP: Line going up from y_i and back to y_{i-1} */}
        {/* Vertical line up */}
        <line x1="185" y1="125" x2="185" y2="45" stroke="#64748b" strokeWidth="1.5" />
        {/* Horizontal line left back to y_{i-1} box */}
        <line x1="185" y1="45" x2="108" y2="45" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={108} y={45} direction="left" />
        
        {/* ========== DECRYPTION (RIGHT SIDE) ========== */}
        
        {/* Feedback box y_{i-1} at top (decryption side) */}
        <g onMouseEnter={() => handleHover('feedback')} onMouseLeave={() => setHovered(null)}>
          <rect x="330" y="30" width="50" height="30" rx="3" style={boxStyle('feedback')} />
          <text x="355" y="50" textAnchor="middle" className="text-xs fill-slate-600 font-mono">yᵢ₋₁</text>
        </g>
        
        {/* Arrow from y_{i-1} down past e^{-1} to XOR on right */}
        <line x1="355" y1="60" x2="355" y2="137" stroke="#64748b" strokeWidth="1.5" />
        <line x1="355" y1="137" x2="433" y2="137" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={433} y={137} direction="right" />

        {/* IV label (top right) - connects to y_{i-1} for first block */}
        <line x1="380" y1="45" x2="430" y2="45" stroke="#64748b" strokeWidth="1.5" />
        <text 
          x="450" y="48" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('iv')}
          onMouseLeave={() => setHovered(null)}
        >
          IV
        </text>
        
        {/* y_i input (from left - ciphertext to decrypt) */}
        <text 
          x="245" y="95" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('ciphertext')}
          onMouseLeave={() => setHovered(null)}
        >
          yᵢ
        </text>
        <line x1="260" y1="90" x2="290" y2="90" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={290} y={90} direction="right" />
        
        {/* Decryption box e^{-1} */}
        <g onMouseEnter={() => handleHover('decrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="295" y="72" width="60" height="35" rx="4" style={boxStyle('decrypt')} />
          <text x="325" y="94" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e⁻¹
          </text>
        </g>
        
        {/* Key k arrow (from below) - decryption */}
        <line x1="325" y1="180" x2="325" y2="107" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={325} y={107} direction="up" />
        <text 
          x="325" y="193" 
          textAnchor="middle" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>
        
        {/* Arrow from e^{-1} to XOR */}
        <line x1="355" y1="90" x2="420" y2="90" stroke="#64748b" strokeWidth="1.5" />
        <line x1="420" y1="90" x2="420" y2="107" stroke="#64748b" strokeWidth="1.5" />
        <line x1="420" y1="125" x2="420" y2="137" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={448} y={137} direction="right" />
        
        {/* XOR circle (decryption) */}
        <XorCircle 
          cx={448} cy={137} 
          hovered={hovered === 'xor'}
          onMouseEnter={() => handleHover('xor')}
          onMouseLeave={() => setHovered(null)}
        />
        
        {/* Arrow from XOR to recovered plaintext */}
        <line x1="460" y1="137" x2="500" y2="137" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={500} y={137} direction="right" />
        
        {/* Recovered plaintext x_i */}
        <text 
          x="520" y="142" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('plaintext')}
          onMouseLeave={() => setHovered(null)}
        >
          xᵢ
        </text>

        {/* FEEDBACK on decryption: y_i goes up to become y_{i-1} for next block */}
        {/* This is implicit - the y_{i-1} IS the previous y_i */}
      </svg>

      {/* Substitution Attack Note */}
      <div 
        className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
        onMouseEnter={() => handleHover('substitution')}
        onMouseLeave={() => setHovered(null)}
      >
        <h4 className="text-sm font-semibold text-amber-800 mb-2">⚠️ CBC vs ECB Substitution Attack</h4>
        <p className="text-xs text-amber-700">
          Unlike ECB, substituting blocks in CBC causes subsequent blocks to decrypt to <strong>random garbage</strong>. 
          Oscar cannot redirect money to his account, but random corruption is still dangerous — use MACs or GCM for integrity.
        </p>
      </div>
    </div>
  );
}
