import DiagramNode, { Arrow, FlowRow, XorNode } from '../DiagramNode';

const gcmInfo = {
  overview: {
    title: 'Galois/Counter Mode (GCM)',
    description: 'GCM is an Authenticated Encryption with Associated Data (AEAD) mode that provides both confidentiality (via CTR mode) and authenticity (via GHASH). Standardized in NIST SP 800-38D, GCM is widely used in TLS 1.2/1.3, IPsec, and SSH. It can authenticate additional data (like headers) that remains unencrypted.',
    formula: 'GCM = CTR_encryption + GHASH_authentication'
  },
  iv: {
    title: 'Initialization Vector (IV/Nonce)',
    description: 'GCM IVs are typically 96 bits (12 bytes). The counter for CTR mode is constructed as: IV || 0³¹1 for the first block (used for tag), IV || 0³¹2 for encrypting the first plaintext block, etc. IV reuse is catastrophic—it enables both plaintext recovery and authentication key recovery.',
    formula: 'Counter₀ = IV || 0³¹1, Counterᵢ = IV || 0³¹(i+1)'
  },
  hashKey: {
    title: 'Hash Subkey (H)',
    description: 'The authentication key for GHASH, computed by encrypting the all-zero block: H = eₖ(0¹²⁸). This key is fixed for a given encryption key and used for all GHASH polynomial multiplications. H must remain secret—its compromise allows forgery of authentication tags.',
    formula: 'H = eₖ(0¹²⁸) ∈ GF(2¹²⁸)'
  },
  aad: {
    title: 'Additional Authenticated Data (AAD)',
    description: 'Data that is authenticated but NOT encrypted—useful for headers, metadata, or routing information that must be readable but tamper-proof. The AAD is included in the GHASH computation, so any modification will cause authentication to fail. AAD can be empty.',
    formula: 'AAD is authenticated: T = f(AAD, C, len(AAD), len(C))'
  },
  ctrEncrypt: {
    title: 'CTR Mode Encryption',
    description: 'Plaintext is encrypted using standard CTR mode with incrementing counters. The counter starts at 2 (counter 1 is reserved for generating the final authentication tag). CTR provides confidentiality and enables parallel encryption/decryption with random access.',
    formula: 'yᵢ = xᵢ ⊕ eₖ(IV || CTRᵢ), CTRᵢ = i + 1'
  },
  ghash: {
    title: 'GHASH Function',
    description: 'A universal hash function based on polynomial evaluation in the Galois field GF(2¹²⁸). GHASH processes AAD blocks, then ciphertext blocks, then length block, each time multiplying by H and XORing with the next input. The multiplication uses the irreducible polynomial x¹²⁸ + x⁷ + x² + x + 1.',
    formula: 'GHASHₕ(X₁,...,Xₘ) = X₁·H^m ⊕ X₂·H^(m-1) ⊕ ... ⊕ Xₘ·H'
  },
  gfMult: {
    title: 'Galois Field Multiplication',
    description: 'Multiplication in GF(2¹²⁸) with the reducing polynomial x¹²⁸ + x⁷ + x² + x + 1. Each step of GHASH XORs the current input with the running hash, then multiplies by H. This requires efficient hardware/software implementation—modern CPUs include special instructions (PCLMULQDQ for Intel).',
    formula: '(A · B) mod (x¹²⁸ + x⁷ + x² + x + 1)'
  },
  xorAuth: {
    title: 'XOR into Authentication',
    description: 'The ciphertext is XORed into the running GHASH computation. This binds the ciphertext to the authentication tag—any modification to ciphertext will result in a different GHASH output and authentication failure. The XOR-multiply sequence is efficient for streaming authentication.',
    formula: 'Sᵢ = (Sᵢ₋₁ ⊕ yᵢ) · H'
  },
  lengthBlock: {
    title: 'Length Block',
    description: 'The final GHASH input is a 128-bit block containing the bit lengths of AAD and ciphertext: [len(AAD)]₆₄ || [len(C)]₆₄. This prevents length extension attacks and ensures the tag is bound to the exact message length. Both lengths are encoded as 64-bit big-endian integers.',
    formula: 'L = [len(A)]₆₄ || [len(C)]₆₄'
  },
  tag: {
    title: 'Authentication Tag (T)',
    description: 'The final 128-bit (or truncated) authentication tag. Computed as: T = GHASH(AAD, C, len) ⊕ eₖ(IV || 0³¹1). The encryption of IV||0³¹1 masks the GHASH output, preventing algebraic attacks on the GHASH key H. Tags are typically 128, 120, 112, 104, or 96 bits.',
    formula: 'T = GHASHₕ(A, C, L) ⊕ eₖ(IV || 0³¹1)'
  },
  security: {
    title: 'GCM Security Properties',
    description: 'GCM provides IND-CPA confidentiality and INT-CTXT integrity. Security degrades with message volume: after 2³² blocks under one key, a birthday-bound attack becomes practical. GCM is NOT nonce-misuse resistant—IV reuse enables full plaintext recovery AND authentication key recovery (forgery). For nonce-misuse resistance, consider AES-GCM-SIV.',
    formula: 'Security: 2^(t/2) tag forgery, 2^64 block confidentiality limit'
  }
};

export default function GCMDiagram({ onHover }) {
  return (
    <div 
      className="diagram-container"
      onMouseEnter={() => onHover && onHover(gcmInfo.overview)}
    >
      {/* Header */}
      <div className="text-center text-sm text-slate-600 font-semibold mb-4 bg-slate-200 px-4 py-2 rounded-lg">
        Authenticated Encryption with Associated Data (AEAD)
      </div>
      
      {/* Top row: AAD, Hash Key, IV */}
      <FlowRow>
        <DiagramNode type="auth" info={gcmInfo.aad} onHover={onHover}>
          AAD
        </DiagramNode>
        <div className="w-8" />
        <DiagramNode type="key" info={gcmInfo.hashKey} onHover={onHover}>
          H = eₖ(0)
        </DiagramNode>
        <div className="w-8" />
        <DiagramNode type="key" info={gcmInfo.iv} onHover={onHover}>
          IV
        </DiagramNode>
      </FlowRow>
      
      <Arrow direction="down" />
      
      {/* Two parallel paths: GHASH and CTR */}
      <div className="flex gap-12">
        {/* GHASH Path (Authentication) */}
        <div className="flex flex-col items-center bg-orange-50 p-4 rounded-xl border border-orange-200">
          <div className="text-xs text-orange-600 font-semibold mb-3">AUTHENTICATION PATH</div>
          
          <DiagramNode type="auth" info={gcmInfo.gfMult} onHover={onHover}>
            GF(2¹²⁸) Mult
          </DiagramNode>
          
          <Arrow direction="down" />
          
          <FlowRow>
            <XorNode info={gcmInfo.xorAuth} onHover={onHover} />
            <Arrow direction="left" />
            <span className="text-xs text-slate-500">← y₁</span>
          </FlowRow>
          
          <Arrow direction="down" />
          
          <DiagramNode type="auth" info={gcmInfo.ghash} onHover={onHover}>
            × H (GHASH)
          </DiagramNode>
          
          <Arrow direction="down" />
          
          <FlowRow>
            <XorNode info={gcmInfo.xorAuth} onHover={onHover} />
            <Arrow direction="left" />
            <span className="text-xs text-slate-500">← y₂</span>
          </FlowRow>
          
          <Arrow direction="down" />
          
          <DiagramNode type="auth" info={gcmInfo.ghash} onHover={onHover}>
            × H
          </DiagramNode>
          
          <Arrow direction="down" />
          
          <FlowRow>
            <XorNode info={gcmInfo.xorAuth} onHover={onHover} />
            <Arrow direction="left" />
            <DiagramNode type="internal" info={gcmInfo.lengthBlock} onHover={onHover} className="text-xs">
              len(A)||len(C)
            </DiagramNode>
          </FlowRow>
          
          <Arrow direction="down" />
          
          <DiagramNode type="auth" info={gcmInfo.ghash} onHover={onHover}>
            × H (final)
          </DiagramNode>
        </div>
        
        {/* CTR Path (Encryption) */}
        <div className="flex flex-col items-center bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="text-xs text-blue-600 font-semibold mb-3">ENCRYPTION PATH (CTR)</div>
          
          <FlowRow>
            <DiagramNode type="key" info={gcmInfo.ctrEncrypt} onHover={onHover} className="text-xs">
              IV||CTR₁
            </DiagramNode>
            <div className="w-4" />
            <DiagramNode type="key" info={gcmInfo.ctrEncrypt} onHover={onHover} className="text-xs">
              IV||CTR₂
            </DiagramNode>
          </FlowRow>
          
          <FlowRow>
            <Arrow direction="down" />
            <div className="w-16" />
            <Arrow direction="down" />
          </FlowRow>
          
          <FlowRow>
            <DiagramNode type="function" info={gcmInfo.ctrEncrypt} onHover={onHover}>
              eₖ()
            </DiagramNode>
            <div className="w-4" />
            <DiagramNode type="function" info={gcmInfo.ctrEncrypt} onHover={onHover}>
              eₖ()
            </DiagramNode>
          </FlowRow>
          
          <FlowRow>
            <Arrow direction="down" />
            <div className="w-16" />
            <Arrow direction="down" />
          </FlowRow>
          
          <FlowRow>
            <XorNode info={gcmInfo.ctrEncrypt} onHover={onHover} />
            <Arrow direction="left" />
            <DiagramNode type="plaintext" info={gcmInfo.ctrEncrypt} onHover={onHover} className="min-w-[40px]">
              x₁
            </DiagramNode>
            <div className="w-2" />
            <XorNode info={gcmInfo.ctrEncrypt} onHover={onHover} />
            <Arrow direction="left" />
            <DiagramNode type="plaintext" info={gcmInfo.ctrEncrypt} onHover={onHover} className="min-w-[40px]">
              x₂
            </DiagramNode>
          </FlowRow>
          
          <FlowRow>
            <Arrow direction="down" className="ml-[-30px]" />
            <div className="w-24" />
            <Arrow direction="down" className="ml-[-30px]" />
          </FlowRow>
          
          <FlowRow>
            <DiagramNode type="ciphertext" info={gcmInfo.ctrEncrypt} onHover={onHover} className="min-w-[40px]">
              y₁
            </DiagramNode>
            <div className="w-8" />
            <DiagramNode type="ciphertext" info={gcmInfo.ctrEncrypt} onHover={onHover} className="min-w-[40px]">
              y₂
            </DiagramNode>
          </FlowRow>
        </div>
      </div>
      
      {/* Final tag computation */}
      <Arrow direction="down" />
      
      <FlowRow>
        <span className="text-xs text-slate-500 mr-2">GHASH output →</span>
        <XorNode info={gcmInfo.tag} onHover={onHover} />
        <Arrow direction="left" />
        <DiagramNode type="function" info={gcmInfo.tag} onHover={onHover} className="text-xs">
          eₖ(IV||0³¹1)
        </DiagramNode>
      </FlowRow>
      
      <Arrow direction="down" />
      
      <FlowRow>
        <DiagramNode 
          type="auth" 
          info={gcmInfo.tag} 
          onHover={onHover}
          className="bg-gradient-to-r from-orange-500 to-red-500"
        >
          Auth Tag (T)
        </DiagramNode>
      </FlowRow>
      
      <div 
        className="mt-4 p-3 bg-emerald-100 border border-emerald-300 rounded-lg text-xs text-emerald-700 text-center max-w-lg cursor-pointer"
        onMouseEnter={() => onHover && onHover(gcmInfo.security)}
      >
        <strong>GCM Output:</strong> (Ciphertext, Tag) — Receiver verifies tag before decrypting. Tag failure = reject entire message.
      </div>
    </div>
  );
}
