import { useState } from 'react';

// Based on Paar/Pelzl "Understanding Cryptography" Section 5.1.3, Fig. 5.5
const ofbInfo = {
  iv: {
    title: 'Initialization Vector (IV)',
    description: `In OFB mode, encryption starts with encrypting an IV with a block cipher. The cipher output gives us the first b key stream bits (where b is the block cipher width).

The next block of key stream bits is computed by feeding the previous cipher output back into the block cipher and encrypting it. This process is repeated as shown in Fig. 5.5.

As with CBC mode, the IV should be a nonce. Using OFB with the same IV and key twice completely breaks security — the same keystream is generated, allowing XOR of ciphertexts to reveal the XOR of plaintexts.`,
    formula: 's₁ = eₖ(IV)'
  },
  keystream: {
    title: 'Key Stream Block sᵢ (Definition 5.1.3)',
    description: `The key stream sᵢ is the output of the block cipher. It is NOT the ciphertext — the ciphertext yᵢ is produced by XORing sᵢ with the plaintext xᵢ.

The key stream can be precomputed before the plaintext arrives, since the block cipher computations are independent of the plaintext. This is a major advantage of OFB mode for high-speed applications.

The key stream forms a synchronous stream cipher: both parties must generate the same sequence s₁, s₂, s₃, ... in lockstep.`,
    formula: 'sᵢ = eₖ(sᵢ₋₁), where s₀ = IV'
  },
  feedbackLoop: {
    title: 'Feedback Loop (sᵢ₋₁)',
    description: `The previous key stream block sᵢ₋₁ is fed back into the block cipher to generate the next key stream block sᵢ. This is shown by the line going from sᵢ up and back to sᵢ₋₁.

This is "Output Feedback" — the OUTPUT of the cipher (not the ciphertext) is fed back. Compare to CBC where the CIPHERTEXT is fed back, or CFB where a shifted version of ciphertext is fed back.`,
    formula: 'sᵢ = eₖ(sᵢ₋₁) — output feeds back as next input'
  },
  encrypt: {
    title: 'Block Cipher e (Definition 5.1.3)',
    description: `The block cipher is used to generate the key stream. Notice that ONLY the encryption function e() is used — even for decryption!

This is because the actual "encryption" in OFB is XOR with the key stream. Since XOR is self-inverse (a ⊕ b ⊕ b = a), we simply XOR with the same key stream to decrypt.

Encryption (first block): s₁ = eₖ(IV) and y₁ = s₁ ⊕ x₁
Encryption (general): sᵢ = eₖ(sᵢ₋₁) and yᵢ = sᵢ ⊕ xᵢ, i ≥ 2`,
    formula: 'Both encryption and decryption use e() — not e⁻¹()'
  },
  decrypt: {
    title: 'Decryption uses e (NOT e⁻¹)',
    description: `Unlike ECB and CBC, OFB decryption does NOT use the block cipher decryption function e⁻¹(). Instead, it uses the same encryption function e().

This is because the actual encryption is performed by XOR, and to reverse XOR, we simply XOR again with the same value.

Decryption (first block): s₁ = eₖ(IV) and x₁ = s₁ ⊕ y₁
Decryption (general): sᵢ = eₖ(sᵢ₋₁) and xᵢ = sᵢ ⊕ yᵢ, i ≥ 2

This is in contrast to ECB and CBC mode, where the data is actually being encrypted and decrypted by the block cipher.`,
    formula: 'xᵢ = sᵢ ⊕ yᵢ (same as encryption, but swap x↔y)'
  },
  xor: {
    title: 'XOR Operation (⊕)',
    description: `The XOR operation combines the key stream sᵢ with the plaintext xᵢ to produce ciphertext yᵢ (or vice versa for decryption).

This is identical to a stream cipher or one-time pad. The security relies entirely on the unpredictability of the key stream.

Properties:
• Encryption and decryption are identical operations
• Bit errors in ciphertext cause corresponding bit errors in plaintext (no propagation)
• No padding needed — can encrypt partial blocks
• Malleable — flipping a ciphertext bit flips the plaintext bit`,
    formula: 'yᵢ = sᵢ ⊕ xᵢ and xᵢ = sᵢ ⊕ yᵢ'
  },
  plaintext: {
    title: 'Plaintext Block xᵢ',
    description: `The plaintext block is XORed with the key stream to produce ciphertext. Since the key stream generation is independent of the plaintext, OFB can precompute key stream blocks before the message arrives.

One advantage of the OFB mode is that the block cipher computations are independent of the plaintext. Hence, one can precompute one or several blocks sᵢ of key stream material.`,
    formula: 'yᵢ = sᵢ ⊕ xᵢ'
  },
  ciphertext: {
    title: 'Ciphertext Block yᵢ',
    description: `The ciphertext is the XOR of plaintext and key stream. Note that in OFB, the ciphertext does NOT feed back into the cipher — only the key stream output does.

The OFB mode forms a synchronous stream cipher: the key stream does not depend on the plain or ciphertext. Using OFB is quite similar to using a standard stream cipher such as RC4 or Trivium.`,
    formula: 'yᵢ = xᵢ ⊕ sᵢ'
  },
  key: {
    title: 'Secret Key k',
    description: `The same key k is used for all block cipher operations. The key must be kept secret and shared between sender and receiver.

If the same key and IV are ever reused, the same key stream is generated, completely breaking security.`,
    formula: 'k is the shared secret key'
  },
  streamCipher: {
    title: 'Synchronous Stream Cipher Properties',
    description: `OFB converts a block cipher into a synchronous stream cipher. Key properties:

• Key stream is independent of plaintext/ciphertext
• Encryption and decryption are identical operations (just XOR)
• No error propagation — a bit flip in ciphertext causes the same bit flip in plaintext
• Can precompute key stream before message arrives
• If synchronization is lost, all subsequent decryption fails
• No integrity protection — use with MAC or switch to GCM`,
    formula: 'OFB ≈ Stream cipher using block cipher as PRNG'
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

export default function OFBDiagram({ onHover }) {
  const [hovered, setHovered] = useState(null);

  const handleHover = (key) => {
    setHovered(key);
    if (onHover && ofbInfo[key]) {
      onHover(ofbInfo[key]);
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
          Fig. 5.5 — Encryption and decryption in OFB mode
        </text>

        {/* ========== ENCRYPTION (LEFT SIDE) ========== */}
        
        {/* IV arrow coming into s_{i-1} */}
        <line x1="70" y1="25" x2="70" y2="33" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={70} y={33} direction="down" />
        <text 
          x="82" y="30" 
          textAnchor="start" 
          className="text-xs fill-slate-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('iv')}
          onMouseLeave={() => setHovered(null)}
        >
          IV
        </text>
        
        {/* Feedback box s_{i-1} */}
        <g onMouseEnter={() => handleHover('feedbackLoop')} onMouseLeave={() => setHovered(null)}>
          <rect x="45" y="35" width="50" height="28" rx="3" style={boxStyle('feedbackLoop')} />
          <text x="70" y="54" textAnchor="middle" className="text-xs fill-slate-600 font-mono">sᵢ₋₁</text>
        </g>
        
        {/* Arrow from s_{i-1} to e box */}
        <line x1="70" y1="63" x2="70" y2="75" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={70} y={75} direction="down" />
        
        {/* Encryption box e */}
        <g onMouseEnter={() => handleHover('encrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="40" y="78" width="60" height="35" rx="4" style={boxStyle('encrypt')} />
          <text x="70" y="100" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e
          </text>
        </g>
        
        {/* Key k arrow from right into e box */}
        <line x1="125" y1="95" x2="100" y2="95" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={100} y={95} direction="left" />
        <text 
          x="135" y="99" 
          textAnchor="start" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>
        
        {/* Output s_i going down */}
        <line x1="70" y1="113" x2="70" y2="135" stroke="#64748b" strokeWidth="1.5" />
        
        {/* s_i label */}
        <text 
          x="58" y="128" 
          textAnchor="end" 
          className="text-xs fill-slate-600 font-mono cursor-pointer"
          onMouseEnter={() => handleHover('keystream')}
          onMouseLeave={() => setHovered(null)}
        >
          sᵢ
        </text>
        
        {/* Branch point - s_i splits */}
        <circle cx="70" cy="135" r="3" fill="#64748b" />
        
        {/* s_i continues down to XOR */}
        <line x1="70" y1="135" x2="70" y2="158" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={70} y={158} direction="down" />
        
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
        <ArrowHead x={130} y={170} direction="right" />
        <text 
          x="145" y="175" 
          textAnchor="start" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('ciphertext')}
          onMouseLeave={() => setHovered(null)}
        >
          yᵢ
        </text>
        
        {/* FEEDBACK LOOP: s_i goes right, up, and back to s_{i-1} */}
        <line x1="70" y1="135" x2="140" y2="135" stroke="#64748b" strokeWidth="1.5" />
        <line x1="140" y1="135" x2="140" y2="49" stroke="#64748b" strokeWidth="1.5" />
        <line x1="140" y1="49" x2="95" y2="49" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={95} y={49} direction="left" />

        {/* ========== DECRYPTION (RIGHT SIDE) ========== */}
        
        {/* IV arrow coming into s_{i-1} */}
        <line x1="350" y1="25" x2="350" y2="33" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={350} y={33} direction="down" />
        <text 
          x="362" y="30" 
          textAnchor="start" 
          className="text-xs fill-slate-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('iv')}
          onMouseLeave={() => setHovered(null)}
        >
          IV
        </text>
        
        {/* Feedback box s_{i-1} */}
        <g onMouseEnter={() => handleHover('feedbackLoop')} onMouseLeave={() => setHovered(null)}>
          <rect x="325" y="35" width="50" height="28" rx="3" style={boxStyle('feedbackLoop')} />
          <text x="350" y="54" textAnchor="middle" className="text-xs fill-slate-600 font-mono">sᵢ₋₁</text>
        </g>
        
        {/* Arrow from s_{i-1} to e box */}
        <line x1="350" y1="63" x2="350" y2="75" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={350} y={75} direction="down" />
        
        {/* Encryption box e (NOT e⁻¹!) */}
        <g onMouseEnter={() => handleHover('decrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="320" y="78" width="60" height="35" rx="4" style={boxStyle('decrypt')} />
          <text x="350" y="100" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e
          </text>
        </g>
        
        {/* Key k arrow from right into e box */}
        <line x1="405" y1="95" x2="380" y2="95" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={380} y={95} direction="left" />
        <text 
          x="415" y="99" 
          textAnchor="start" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>
        
        {/* Output s_i going down */}
        <line x1="350" y1="113" x2="350" y2="135" stroke="#64748b" strokeWidth="1.5" />
        
        {/* s_i label */}
        <text 
          x="338" y="128" 
          textAnchor="end" 
          className="text-xs fill-slate-600 font-mono cursor-pointer"
          onMouseEnter={() => handleHover('keystream')}
          onMouseLeave={() => setHovered(null)}
        >
          sᵢ
        </text>
        
        {/* Branch point */}
        <circle cx="350" cy="135" r="3" fill="#64748b" />
        
        {/* s_i continues down to XOR */}
        <line x1="350" y1="135" x2="350" y2="158" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={350} y={158} direction="down" />
        
        {/* Ciphertext y_i coming from left */}
        <text 
          x="295" y="175" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('ciphertext')}
          onMouseLeave={() => setHovered(null)}
        >
          yᵢ
        </text>
        <line x1="305" y1="170" x2="335" y2="170" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={335} y={170} direction="right" />
        
        {/* XOR circle */}
        <XorCircle 
          cx={350} cy={170} 
          hovered={hovered === 'xor'}
          onMouseEnter={() => handleHover('xor')}
          onMouseLeave={() => setHovered(null)}
        />
        
        {/* Output x_i going right */}
        <line x1="362" y1="170" x2="410" y2="170" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={410} y={170} direction="right" />
        <text 
          x="425" y="175" 
          textAnchor="start" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('plaintext')}
          onMouseLeave={() => setHovered(null)}
        >
          xᵢ
        </text>
        
        {/* FEEDBACK LOOP: s_i goes right, up, and back to s_{i-1} */}
        <line x1="350" y1="135" x2="420" y2="135" stroke="#64748b" strokeWidth="1.5" />
        <line x1="420" y1="135" x2="420" y2="49" stroke="#64748b" strokeWidth="1.5" />
        <line x1="420" y1="49" x2="375" y2="49" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={375} y={49} direction="left" />
      </svg>

      {/* Key insight note */}
      <div 
        className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
        onMouseEnter={() => handleHover('streamCipher')}
        onMouseLeave={() => setHovered(null)}
      >
        <h4 className="text-sm font-semibold text-emerald-800 mb-2">Key Insight: Decryption uses e, NOT e⁻¹</h4>
        <p className="text-xs text-emerald-700">
          OFB is a stream cipher — actual encryption is XOR with key stream. Since XOR is self-inverse, 
          both encryption and decryption generate the same key stream using <strong>e()</strong> and just XOR with it.
        </p>
      </div>
    </div>
  );
}
