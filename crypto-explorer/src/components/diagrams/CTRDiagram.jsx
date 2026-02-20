import { useState } from 'react';

// Based on Paar/Pelzl "Understanding Cryptography" Section 5.1.5, Fig. 5.7
const ctrInfo = {
  initialValue: {
    title: 'Initial Value (IV / Nonce)',
    description: `The initial value is a nonce with a length smaller than the block length. For AES with 128-bit blocks, a typical choice is 96 bits for the IV.

The IV stays constant for all blocks in a message. It MUST be unique for each message encrypted under the same key. If an attacker knows one of two plaintexts encrypted with the same input value, they can immediately decrypt the other ciphertext.

The string (IV||CTR₁) does not have to be kept secret — it can be sent to the receiver with the first ciphertext block.`,
    formula: 'IV ∈ {0,1}^(b-c) where c is counter bits'
  },
  counterValue: {
    title: 'Counter Value CTRᵢ',
    description: `The counter is initialized to zero and incremented for every block encrypted during the session. For AES-128 with a 96-bit IV, the counter uses the remaining 32 bits.

With 32 counter bits, we can encrypt up to 2³² blocks = 2³⁵ bytes ≈ 32 GB before needing a new IV.

The counter can be a regular integer counter or a slightly more complex function such as a maximum-length LFSR.`,
    formula: 'CTRᵢ = i (starting from 0 or 1)'
  },
  counter: {
    title: 'Counter Block (IV || CTRᵢ) — Definition 5.1.5',
    description: `The concatenation of IV and counter forms the input to the block cipher. This is denoted (IV||CTRᵢ) and is a bit string of length b (the block size).

For each block to encrypt, the counter portion increments while the IV stays the same. This ensures unique inputs to the block cipher.

Encryption: yᵢ = eₖ(IV||CTRᵢ) ⊕ xᵢ, i ≥ 1
Decryption: xᵢ = eₖ(IV||CTRᵢ) ⊕ yᵢ, i ≥ 1`,
    formula: '(IV||CTRᵢ) is the block cipher input'
  },
  encrypt: {
    title: 'Block Cipher e (Definition 5.1.5)',
    description: `The block cipher encrypts the counter block to produce the key stream. Like OFB and CFB, only the encryption function e() is used — even for decryption!

One attractive feature of Counter mode is that it can be parallelized because, unlike OFB or CFB mode, it does not require any feedback. We can have multiple block cipher engines running in parallel.

For instance, one engine encrypts CTR₁ while another encrypts CTR₂. This allows encryption at twice the data rate of a single implementation.`,
    formula: 'sᵢ = eₖ(IV||CTRᵢ)'
  },
  keystream: {
    title: 'Key Stream Block sᵢ',
    description: `The key stream is the output of encrypting the counter block. It is XORed with plaintext to produce ciphertext (or vice versa for decryption).

Since key stream generation depends only on the counter (not on plaintext or previous ciphertext), CTR mode enables:
• Full parallelization of encryption AND decryption
• Random access — can decrypt any block without processing others
• Precomputation of key stream before message arrives`,
    formula: 'sᵢ = eₖ(IV||CTRᵢ)'
  },
  xor: {
    title: 'XOR Operation (⊕)',
    description: `The XOR operation combines the key stream with plaintext to produce ciphertext. Encryption and decryption are identical operations.

Properties:
• No padding needed — can encrypt partial blocks
• Bit errors don't propagate — one error affects only one bit
• Malleable — flipping a ciphertext bit flips the plaintext bit
• No integrity protection — use with MAC or switch to GCM`,
    formula: 'yᵢ = sᵢ ⊕ xᵢ, xᵢ = sᵢ ⊕ yᵢ'
  },
  plaintext: {
    title: 'Plaintext Block xᵢ',
    description: `The message block to encrypt. CTR mode has excellent efficiency:
• Random access — can encrypt/decrypt any block independently
• Fully parallelizable
• No padding required for partial blocks
• Can precompute key stream

These properties make CTR ideal for high-performance applications like disk encryption and high-speed network protocols.`,
    formula: 'x = (x₁, x₂, ..., xₙ)'
  },
  ciphertext: {
    title: 'Ciphertext Block yᵢ',
    description: `The encrypted output. Note that unlike CBC, OFB, or CFB, there is NO feedback in CTR mode — the ciphertext is not used to compute anything.

This lack of feedback is what enables full parallelization. However, it also means CTR provides no integrity protection — use GCM for authenticated encryption.`,
    formula: 'yᵢ = xᵢ ⊕ eₖ(IV||CTRᵢ)'
  },
  key: {
    title: 'Secret Key k',
    description: `The same key k is used for all block cipher operations.

Critical security requirement: NEVER reuse (key, nonce/IV) pair. If the same (k, IV) is used twice, the same key stream is generated. An attacker who knows one plaintext can immediately decrypt any other ciphertext encrypted with that key stream.`,
    formula: 'k is the shared secret key'
  },
  parallel: {
    title: 'Fully Parallelizable — Major Advantage',
    description: `Counter mode's biggest advantage is complete parallelization for both encryption AND decryption.

Unlike:
• CBC — sequential encryption, parallel decryption only
• OFB — no parallelization (needs feedback)
• CFB — sequential encryption, parallel decryption only

CTR has no dependencies between blocks. Each block only needs its counter value. This enables:
• Hardware parallelism with multiple cipher cores
• Random access encryption/decryption
• Encryption at N times the single-core data rate with N cores

For high-throughput applications (gigabits per second), parallelizable modes are essential.`,
    formula: 'Block i is independent of blocks j ≠ i'
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

export default function CTRDiagram({ onHover }) {
  const [hovered, setHovered] = useState(null);

  const handleHover = (key) => {
    setHovered(key);
    if (onHover && ctrInfo[key]) {
      onHover(ctrInfo[key]);
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
      <svg viewBox="0 0 300 200" className="w-full max-w-md mx-auto">
        {/* Title */}
        <text x="150" y="15" textAnchor="middle" className="text-xs fill-slate-500 font-medium">
          Fig. 5.7 — Encryption and decryption in counter mode
        </text>

        {/* ========== COUNTER BLOCK STRUCTURE ========== */}
        
        {/* Initial value box */}
        <g onMouseEnter={() => handleHover('initialValue')} onMouseLeave={() => setHovered(null)}>
          <rect x="60" y="28" width="80" height="26" rx="3" style={boxStyle('initialValue')} />
          <text x="100" y="45" textAnchor="middle" className="text-xs fill-slate-600">initial value</text>
        </g>
        
        {/* Counter value box - adjacent to initial value */}
        <g onMouseEnter={() => handleHover('counterValue')} onMouseLeave={() => setHovered(null)}>
          <rect x="140" y="28" width="80" height="26" rx="3" style={boxStyle('counterValue')} />
          <text x="180" y="45" textAnchor="middle" className="text-xs fill-slate-600">counter value</text>
        </g>
        
        {/* Arrow from combined counter block to e box */}
        <line x1="140" y1="54" x2="140" y2="68" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={140} y={68} direction="down" />
        
        {/* Encryption box e */}
        <g onMouseEnter={() => handleHover('encrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="110" y="72" width="60" height="35" rx="4" style={boxStyle('encrypt')} />
          <text x="140" y="94" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e
          </text>
        </g>
        
        {/* Key k arrow from left into e box */}
        <line x1="75" y1="89" x2="110" y2="89" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={110} y={89} direction="right" />
        <text 
          x="65" y="93" 
          textAnchor="end" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>
        
        {/* Output s_i going down */}
        <line x1="140" y1="107" x2="140" y2="138" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={140} y={138} direction="down" />
        
        {/* Plaintext x_i coming from left */}
        <text 
          x="55" y="155" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('plaintext')}
          onMouseLeave={() => setHovered(null)}
        >
          xᵢ
        </text>
        <line x1="65" y1="150" x2="125" y2="150" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={125} y={150} direction="right" />
        
        {/* XOR circle */}
        <XorCircle 
          cx={140} cy={150} 
          hovered={hovered === 'xor'}
          onMouseEnter={() => handleHover('xor')}
          onMouseLeave={() => setHovered(null)}
        />
        
        {/* Output y_i going right */}
        <line x1="152" y1="150" x2="210" y2="150" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={210} y={150} direction="right" />
        <text 
          x="225" y="155" 
          textAnchor="start" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('ciphertext')}
          onMouseLeave={() => setHovered(null)}
        >
          yᵢ
        </text>
      </svg>

      {/* Key advantage note */}
      <div 
        className="mt-6 p-4 bg-violet-50 border border-violet-200 rounded-lg cursor-pointer hover:bg-violet-100 transition-colors"
        onMouseEnter={() => handleHover('parallel')}
        onMouseLeave={() => setHovered(null)}
      >
        <h4 className="text-sm font-semibold text-violet-800 mb-2">Key Advantage: Fully Parallelizable</h4>
        <p className="text-xs text-violet-700">
          No feedback! Each block needs only its counter value. Multiple cipher engines can run in parallel, 
          enabling encryption at N× the data rate with N cores. Also supports random access decryption.
        </p>
      </div>

      {/* Security warning */}
      <div 
        className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
        onMouseEnter={() => handleHover('key')}
        onMouseLeave={() => setHovered(null)}
      >
        <p className="text-xs text-red-700">
          <strong>⚠️ Critical:</strong> Never reuse (key, IV) pair. No integrity protection — use GCM for authenticated encryption.
        </p>
      </div>
    </div>
  );
}
