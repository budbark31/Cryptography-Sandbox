import { useState } from 'react';

// Based on Paar/Pelzl "Understanding Cryptography" Section 5.1.4, Fig. 5.6
const cfbInfo = {
  iv: {
    title: 'Initialization Vector (IV)',
    description: `In CFB mode, the IV is used as the initial "previous ciphertext" value y₀. The cipher encrypts the IV to produce the first key stream block s₁.

As with CBC and OFB modes, the IV should be a nonce. The CFB encryption is nondeterministic: encrypting the same plaintext twice results in different ciphertexts.

The IV does not need to be secret — it can be transmitted in the clear.`,
    formula: 'y₀ = IV, s₁ = eₖ(IV)'
  },
  feedbackLoop: {
    title: 'Ciphertext Feedback (yᵢ₋₁)',
    description: `The previous ciphertext block yᵢ₋₁ is fed back into the block cipher. This is "Ciphertext Feedback" — a more accurate name would have been "Ciphertext Feedback mode."

This is the key difference from OFB:
• OFB feeds back the cipher OUTPUT (sᵢ) — independent of plaintext
• CFB feeds back the CIPHERTEXT (yᵢ) — depends on plaintext

CFB is an asynchronous stream cipher: the key stream is a function of the ciphertext.`,
    formula: 'yᵢ₋₁ feeds into block cipher (y₀ = IV)'
  },
  encrypt: {
    title: 'Block Cipher e (Definition 5.1.4)',
    description: `The block cipher encrypts the previous ciphertext to generate the key stream block sᵢ. Like OFB, only the encryption function e() is used — even for decryption!

Encryption (first block): y₁ = eₖ(IV) ⊕ x₁
Encryption (general): yᵢ = eₖ(yᵢ₋₁) ⊕ xᵢ, i ≥ 2

The actual "encryption" is the XOR with the key stream, so we only need e() to generate the key stream.`,
    formula: 'sᵢ = eₖ(yᵢ₋₁)'
  },
  decrypt: {
    title: 'Decryption uses e (NOT e⁻¹)',
    description: `Like OFB, CFB decryption does NOT use the block cipher decryption function e⁻¹(). It uses the same encryption function e().

This is because the block cipher is only used to generate the key stream. The actual "encryption" is XOR, which is self-inverse.

Decryption (first block): x₁ = eₖ(IV) ⊕ y₁
Decryption (general): xᵢ = eₖ(yᵢ₋₁) ⊕ yᵢ, i ≥ 2

Note: yᵢ₋₁ is the same in both encryption and decryption — the previous ciphertext.`,
    formula: 'xᵢ = eₖ(yᵢ₋₁) ⊕ yᵢ'
  },
  keystream: {
    title: 'Key Stream Block sᵢ',
    description: `The key stream sᵢ is the output of the block cipher. It is XORed with plaintext (encryption) or ciphertext (decryption).

Unlike OFB where the key stream can be precomputed, in CFB each key stream block depends on the previous ciphertext. This means:
• Encryption cannot be parallelized (each block depends on the previous)
• But decryption CAN be parallelized (all yᵢ₋₁ values are known)`,
    formula: 'sᵢ = eₖ(yᵢ₋₁)'
  },
  xor: {
    title: 'XOR Operation (⊕)',
    description: `The XOR operation combines the key stream sᵢ with plaintext xᵢ to produce ciphertext yᵢ (or vice versa for decryption).

Properties of CFB XOR:
• Encryption and decryption are the same operation
• Bit errors propagate: one error in yᵢ affects both xᵢ and xᵢ₊₁
• Self-synchronizing: after one block, cipher re-syncs from bit loss
• No padding needed for partial blocks`,
    formula: 'yᵢ = sᵢ ⊕ xᵢ, xᵢ = sᵢ ⊕ yᵢ'
  },
  plaintext: {
    title: 'Plaintext Block xᵢ',
    description: `The plaintext block is XORed with the key stream to produce ciphertext. 

A variant CFB-s encrypts only s bits at a time (e.g., CFB-8 for byte-by-byte encryption). This is useful when short plaintext blocks need to be encrypted, such as keyboard input over a secure link.`,
    formula: 'yᵢ = eₖ(yᵢ₋₁) ⊕ xᵢ'
  },
  ciphertext: {
    title: 'Ciphertext Block yᵢ',
    description: `The ciphertext is both the encrypted output AND the feedback value for the next block. This is the defining characteristic of CFB mode.

In the diagram, note that yᵢ:
1. Goes to the right as output
2. Feeds back up to become yᵢ₋₁ for the next block

This feedback creates an asynchronous stream cipher where the key stream depends on the message being encrypted.`,
    formula: 'yᵢ = xᵢ ⊕ eₖ(yᵢ₋₁)'
  },
  key: {
    title: 'Secret Key k',
    description: `The same key k is used for all block cipher operations. The key must be kept secret and shared between sender and receiver.

As with all modes, using the same key and IV twice allows comparison attacks.`,
    formula: 'k is the shared secret key'
  },
  asyncStream: {
    title: 'Asynchronous Stream Cipher',
    description: `CFB is an asynchronous (self-synchronizing) stream cipher. Key properties:

• Key stream depends on ciphertext (unlike OFB)
• Self-recovery: if bits are lost, re-syncs after one block
• Error propagation: one corrupted ciphertext block affects two plaintext blocks
• Encryption is sequential, but decryption can be parallelized
• Like OFB, provides no integrity protection — use with MAC or switch to GCM

Compare to OFB (synchronous): if sync is lost in OFB, ALL subsequent decryption fails.`,
    formula: 'CFB = Asynchronous stream cipher from block cipher'
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

export default function CFBDiagram({ onHover }) {
  const [hovered, setHovered] = useState(null);

  const handleHover = (key) => {
    setHovered(key);
    if (onHover && cfbInfo[key]) {
      onHover(cfbInfo[key]);
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
      <svg viewBox="0 0 560 220" className="w-full max-w-4xl mx-auto">
        {/* Title */}
        <text x="280" y="15" textAnchor="middle" className="text-xs fill-slate-500 font-medium">
          Fig. 5.6 — Encryption and decryption in CFB mode
        </text>

        {/* ========== ENCRYPTION (LEFT SIDE) ========== */}
        
        {/* IV arrow coming diagonally into y_{i-1} */}
        <line x1="30" y1="25" x2="48" y2="40" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={48} y={40} direction="down" />
        <text 
          x="18" y="25" 
          textAnchor="start" 
          className="text-xs fill-slate-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('iv')}
          onMouseLeave={() => setHovered(null)}
        >
          IV
        </text>
        
        {/* Feedback box y_{i-1} */}
        <g onMouseEnter={() => handleHover('feedbackLoop')} onMouseLeave={() => setHovered(null)}>
          <rect x="45" y="35" width="50" height="28" rx="3" style={boxStyle('feedbackLoop')} />
          <text x="70" y="54" textAnchor="middle" className="text-xs fill-slate-600 font-mono">yᵢ₋₁</text>
        </g>
        
        {/* Arrow from y_{i-1} to e box */}
        <line x1="70" y1="63" x2="70" y2="75" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={70} y={75} direction="down" />
        
        {/* Encryption box e */}
        <g onMouseEnter={() => handleHover('encrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="40" y="78" width="60" height="35" rx="4" style={boxStyle('encrypt')} />
          <text x="70" y="100" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e
          </text>
        </g>
        
        {/* Key k arrow from left into e box */}
        <line x1="15" y1="95" x2="40" y2="95" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={40} y={95} direction="right" />
        <text 
          x="8" y="99" 
          textAnchor="end" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>
        
        {/* Output s_i going down */}
        <line x1="70" y1="113" x2="70" y2="158" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={70} y={158} direction="down" />
        
        {/* s_i label */}
        <text 
          x="58" y="138" 
          textAnchor="end" 
          className="text-xs fill-slate-600 font-mono cursor-pointer"
          onMouseEnter={() => handleHover('keystream')}
          onMouseLeave={() => setHovered(null)}
        >
          sᵢ
        </text>
        
        {/* Plaintext x_i coming from left */}
        <text 
          x="15" y="175" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('plaintext')}
          onMouseLeave={() => setHovered(null)}
        >
          xᵢ
        </text>
        <line x1="25" y1="170" x2="55" y2="170" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={55} y={170} direction="right" />
        
        {/* XOR circle */}
        <XorCircle 
          cx={70} cy={170} 
          hovered={hovered === 'xor'}
          onMouseEnter={() => handleHover('xor')}
          onMouseLeave={() => setHovered(null)}
        />
        
        {/* Output y_i going right */}
        <line x1="82" y1="170" x2="130" y2="170" stroke="#64748b" strokeWidth="1.5" />
        
        {/* Branch point - y_i splits to output AND feedback */}
        <circle cx="130" cy="170" r="3" fill="#64748b" />
        
        {/* y_i continues right as output */}
        <line x1="130" y1="170" x2="170" y2="170" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={170} y={170} direction="right" />
        <text 
          x="185" y="175" 
          textAnchor="start" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('ciphertext')}
          onMouseLeave={() => setHovered(null)}
        >
          yᵢ
        </text>
        
        {/* FEEDBACK LOOP: y_i goes up and back to y_{i-1} */}
        <line x1="130" y1="170" x2="130" y2="49" stroke="#64748b" strokeWidth="1.5" />
        <line x1="130" y1="49" x2="95" y2="49" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={95} y={49} direction="left" />

        {/* ========== DECRYPTION (RIGHT SIDE) ========== */}
        
        {/* IV arrow coming diagonally into y_{i-1} */}
        <line x1="410" y1="25" x2="392" y2="40" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={392} y={40} direction="down" />
        <text 
          x="420" y="25" 
          textAnchor="start" 
          className="text-xs fill-slate-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('iv')}
          onMouseLeave={() => setHovered(null)}
        >
          IV
        </text>
        
        {/* Feedback box y_{i-1} */}
        <g onMouseEnter={() => handleHover('feedbackLoop')} onMouseLeave={() => setHovered(null)}>
          <rect x="345" y="35" width="50" height="28" rx="3" style={boxStyle('feedbackLoop')} />
          <text x="370" y="54" textAnchor="middle" className="text-xs fill-slate-600 font-mono">yᵢ₋₁</text>
        </g>
        
        {/* Arrow from y_{i-1} to e box */}
        <line x1="370" y1="63" x2="370" y2="75" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={370} y={75} direction="down" />
        
        {/* Encryption box e (NOT e⁻¹!) */}
        <g onMouseEnter={() => handleHover('decrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="340" y="78" width="60" height="35" rx="4" style={boxStyle('decrypt')} />
          <text x="370" y="100" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e
          </text>
        </g>
        
        {/* Key k arrow from right into e box */}
        <line x1="425" y1="95" x2="400" y2="95" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={400} y={95} direction="left" />
        <text 
          x="432" y="99" 
          textAnchor="start" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>
        
        {/* Output s_i going down */}
        <line x1="370" y1="113" x2="370" y2="158" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={370} y={158} direction="down" />
        
        {/* s_i label */}
        <text 
          x="358" y="138" 
          textAnchor="end" 
          className="text-xs fill-slate-600 font-mono cursor-pointer"
          onMouseEnter={() => handleHover('keystream')}
          onMouseLeave={() => setHovered(null)}
        >
          sᵢ
        </text>
        
        {/* Ciphertext y_i coming from left - with branch point */}
        <text 
          x="270" y="175" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('ciphertext')}
          onMouseLeave={() => setHovered(null)}
        >
          yᵢ
        </text>
        <line x1="280" y1="170" x2="310" y2="170" stroke="#64748b" strokeWidth="1.5" />
        
        {/* Branch point - y_i splits to XOR AND feedback */}
        <circle cx="310" cy="170" r="3" fill="#64748b" />
        
        {/* y_i continues to XOR */}
        <line x1="310" y1="170" x2="355" y2="170" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={355} y={170} direction="right" />
        
        {/* XOR circle */}
        <XorCircle 
          cx={370} cy={170} 
          hovered={hovered === 'xor'}
          onMouseEnter={() => handleHover('xor')}
          onMouseLeave={() => setHovered(null)}
        />
        
        {/* Output x_i going right */}
        <line x1="382" y1="170" x2="430" y2="170" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={430} y={170} direction="right" />
        <text 
          x="445" y="175" 
          textAnchor="start" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('plaintext')}
          onMouseLeave={() => setHovered(null)}
        >
          xᵢ
        </text>
        
        {/* FEEDBACK LOOP: y_i goes up and back to y_{i-1} */}
        <line x1="310" y1="170" x2="310" y2="49" stroke="#64748b" strokeWidth="1.5" />
        <line x1="310" y1="49" x2="345" y2="49" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={345} y={49} direction="right" />
      </svg>

      {/* Key insight note */}
      <div 
        className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
        onMouseEnter={() => handleHover('asyncStream')}
        onMouseLeave={() => setHovered(null)}
      >
        <h4 className="text-sm font-semibold text-amber-800 mb-2">CFB vs OFB: What feeds back?</h4>
        <p className="text-xs text-amber-700">
          <strong>CFB:</strong> Ciphertext yᵢ feeds back → Asynchronous stream cipher (keystream depends on message)
          <br />
          <strong>OFB:</strong> Cipher output sᵢ feeds back → Synchronous stream cipher (keystream independent of message)
        </p>
      </div>
    </div>
  );
}
