import { useState } from 'react';

// Based on Paar/Pelzl "Understanding Cryptography" Section 5.1.1, Fig. 5.1
const ecbInfo = {
  plaintext: {
    title: 'Plaintext Block xᵢ (Definition 5.1.1)',
    description: `The plaintext is partitioned into blocks of size b bits (e.g., 128 bits for AES, 64 bits for DES). Messages exceeding b bits are divided into multiple blocks. If the message length is not a multiple of b bits, it must be padded prior to encryption.

In ECB mode, each block xᵢ is encrypted separately and independently. This is the most straightforward way of encrypting a message, but it has severe security implications.`,
    formula: 'Encryption: yᵢ = eₖ(xᵢ),  i ≥ 1'
  },
  encrypt: {
    title: 'Block Cipher Encryption e (Fig. 5.1)',
    description: `The encryption function e() encrypts plaintext block xᵢ with key k to produce ciphertext block yᵢ. The block cipher can be AES, 3DES, or any other block cipher.

The critical weakness: ECB encrypts highly deterministically. Identical plaintext blocks result in identical ciphertext blocks, as long as the key does not change. The mode can be viewed as a gigantic code book — hence the name — which maps every input to a certain output.`,
    formula: 'yᵢ = eₖ(xᵢ)'
  },
  decrypt: {
    title: 'Block Cipher Decryption e⁻¹ (Fig. 5.1)',
    description: `The decryption function e⁻¹() reverses the encryption. It takes ciphertext block yᵢ and key k to recover the original plaintext block xᵢ.

It is straightforward to verify correctness: eₖ⁻¹(yᵢ) = eₖ⁻¹(eₖ(xᵢ)) = xᵢ

Block synchronization between encryption and decryption parties is not necessary — if the receiver does not receive all encrypted blocks due to transmission problems, it is still possible to decrypt the received blocks.`,
    formula: 'Decryption: xᵢ = eₖ⁻¹(yᵢ) = eₖ⁻¹(eₖ(xᵢ)),  i ≥ 1'
  },
  ciphertext: {
    title: 'Ciphertext Block yᵢ',
    description: `The encrypted output block. Each yᵢ corresponds directly to its input xᵢ with no dependency on other blocks.

This independence has consequences:
• Traffic analysis: An attacker recognizes if the same message has been sent twice
• Detecting patterns: Fixed headers always encrypt to the same ciphertext
• Bitmap encryption: Identical pixel blocks reveal image patterns even after encryption`,
    formula: 'yᵢ = eₖ(xᵢ) — Deterministic: same input → same output'
  },
  key: {
    title: 'Secret Key k',
    description: `The same key k is used to encrypt all blocks. If the key changes, the entire "code book" changes, but as long as the key is static, the mapping from plaintext to ciphertext remains fixed.

This is why frequent key freshness is important in ECB — though in practice, other modes should be used instead of ECB.`,
    formula: 'Key length depends on cipher: 128/192/256 bits (AES), 56 bits (DES)'
  },
  substitution: {
    title: 'Substitution Attack (Example 5.1)',
    description: `ECB is susceptible to substitution attacks. Example: In a bank wire transfer with 5 blocks [Sending Bank | Sending Account | Receiving Bank | Receiving Account | Amount], an attacker Oscar can:

1. Open accounts at Bank A and Bank B
2. Tap the encrypted communication and send $1.00 transfers repeatedly
3. Identify and store repeating ciphertext blocks (the encrypted account numbers)
4. Replace block 4 (receiving account) in OTHER people's transfers with his stored block

Result: All transfers from Bank A to Bank B now go to Oscar's account! This attack works without breaking the block cipher itself — it violates message integrity.`,
    formula: 'If xᵢ → yᵢ is known, yᵢ can be substituted into other messages'
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

export default function ECBDiagram({ onHover }) {
  const [hovered, setHovered] = useState(null);

  const handleHover = (key) => {
    setHovered(key);
    if (onHover && ecbInfo[key]) {
      onHover(ecbInfo[key]);
    }
  };

  const boxStyle = (key) => ({
    fill: hovered === key ? '#dbeafe' : '#f8fafc',
    stroke: hovered === key ? '#3b82f6' : '#cbd5e1',
    strokeWidth: 2,
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  return (
    <div className="diagram-container">
      <svg viewBox="0 0 520 140" className="w-full max-w-3xl mx-auto">
        {/* Title */}
        <text x="260" y="15" textAnchor="middle" className="text-xs fill-slate-500 font-medium">
          Fig. 5.1 — Encryption and decryption in ECB mode
        </text>

        {/* === LEFT SIDE: ENCRYPTION === */}
        
        {/* Plaintext xᵢ label */}
        <text 
          x="30" y="55" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('plaintext')}
          onMouseLeave={() => setHovered(null)}
        >
          xᵢ
        </text>
        
        {/* Arrow from xᵢ to e box */}
        <line x1="45" y1="50" x2="75" y2="50" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={75} y={50} direction="right" />

        {/* Encryption box e */}
        <g onMouseEnter={() => handleHover('encrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="80" y="30" width="60" height="40" rx="4" style={boxStyle('encrypt')} />
          <text x="110" y="55" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e
          </text>
        </g>

        {/* Key k arrow (from below into e box) */}
        <line x1="110" y1="100" x2="110" y2="70" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={110} y={70} direction="up" />
        <text 
          x="110" y="115" 
          textAnchor="middle" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>

        {/* Arrow from e box to yᵢ */}
        <line x1="140" y1="50" x2="185" y2="50" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={185} y={50} direction="right" />

        {/* Ciphertext yᵢ label (middle - connects both sides) */}
        <text 
          x="210" y="55" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('ciphertext')}
          onMouseLeave={() => setHovered(null)}
        >
          yᵢ
        </text>

        {/* === CONNECTION LINE (yᵢ flows to decryption) === */}
        <line x1="230" y1="50" x2="280" y2="50" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={280} y={50} direction="right" />

        {/* === RIGHT SIDE: DECRYPTION === */}

        {/* Decryption box e⁻¹ */}
        <g onMouseEnter={() => handleHover('decrypt')} onMouseLeave={() => setHovered(null)}>
          <rect x="285" y="30" width="60" height="40" rx="4" style={boxStyle('decrypt')} />
          <text x="315" y="55" textAnchor="middle" className="text-sm fill-slate-700 font-mono" style={{ fontStyle: 'italic' }}>
            e⁻¹
          </text>
        </g>

        {/* Key k arrow (from below into e⁻¹ box) */}
        <line x1="315" y1="100" x2="315" y2="70" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={315} y={70} direction="up" />
        <text 
          x="315" y="115" 
          textAnchor="middle" 
          className="text-sm fill-blue-600 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('key')}
          onMouseLeave={() => setHovered(null)}
        >
          k
        </text>

        {/* Arrow from e⁻¹ box to xᵢ */}
        <line x1="345" y1="50" x2="390" y2="50" stroke="#64748b" strokeWidth="1.5" />
        <ArrowHead x={390} y={50} direction="right" />

        {/* Recovered plaintext xᵢ label */}
        <text 
          x="415" y="55" 
          textAnchor="middle" 
          className="text-sm fill-slate-700 font-mono cursor-pointer"
          style={{ fontStyle: 'italic' }}
          onMouseEnter={() => handleHover('plaintext')}
          onMouseLeave={() => setHovered(null)}
        >
          xᵢ
        </text>
      </svg>

      {/* Substitution Attack Warning */}
      <div 
        className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
        onMouseEnter={() => handleHover('substitution')}
        onMouseLeave={() => setHovered(null)}
      >
        <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ Substitution Attack (Example 5.1, Fig. 5.2)</h4>
        <div className="flex justify-center gap-1 text-xs flex-wrap">
          <div className="px-2 py-1 bg-white border border-red-300 rounded">1: Sending Bank</div>
          <div className="px-2 py-1 bg-white border border-red-300 rounded">2: Account #</div>
          <div className="px-2 py-1 bg-white border border-red-300 rounded">3: Receiving Bank</div>
          <div className="px-2 py-1 bg-red-200 border-2 border-red-500 rounded font-bold">4: Account # ← SWAPPED</div>
          <div className="px-2 py-1 bg-white border border-red-300 rounded">5: Amount</div>
        </div>
        <p className="text-xs text-red-600 mt-2 text-center">Blocks can be substituted without breaking the cipher — violates integrity</p>
      </div>
    </div>
  );
}
