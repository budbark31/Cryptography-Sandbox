import DiagramNode, { Arrow, FlowRow } from '../DiagramNode';

const tripleDesInfo = {
  plaintext: {
    title: '64-bit Plaintext Block',
    description: 'Triple DES (3DES) processes 64-bit blocks like standard DES. It was designed to extend DES\'s effective key length to resist brute-force attacks. 3DES remains approved for legacy systems but is being phased out in favor of AES due to its small block size and slower performance.',
    formula: 'Block size: 64 bits (same as DES)'
  },
  encryptK1: {
    title: 'DES Encryption with K₁',
    description: 'The first DES encryption using key K₁. In the EDE (Encrypt-Decrypt-Encrypt) scheme, this is a standard DES encryption operation. The EDE structure was chosen to maintain backward compatibility: with K₁=K₂=K₃, 3DES reduces to single DES.',
    formula: 'C₁ = DES_K₁(P)'
  },
  decryptK2: {
    title: 'DES Decryption with K₂',
    description: 'The middle operation uses DES decryption with key K₂. Using decryption in the middle step is mathematically equivalent to encryption with a related key, but it provides the compatibility feature: if K₂=K₁, the first two operations cancel out.',
    formula: 'C₂ = DES⁻¹_K₂(C₁)'
  },
  encryptK3: {
    title: 'DES Encryption with K₃',
    description: 'The final DES encryption using key K₃. The complete 3DES-EDE operation applies three DES operations in sequence. The effective key length depends on whether 2-key or 3-key 3DES is used.',
    formula: 'C = DES_K₃(C₂)'
  },
  keyOptions: {
    title: '3DES Key Options',
    description: 'Two main keying options exist: (1) 3-Key 3DES uses three independent 56-bit keys (168 bits total, ~112 bits effective security), (2) 2-Key 3DES sets K₃=K₁, using only two keys (112 bits total, ~80 bits effective security). Meet-in-the-middle attacks reduce effective security below the total key length.',
    formula: '3-Key: K₁≠K₂≠K₃, 2-Key: K₁=K₃≠K₂'
  },
  ciphertext: {
    title: '64-bit Ciphertext Block',
    description: 'The output after three DES operations. While 3DES is much more secure than single DES, its 64-bit block size makes it vulnerable to birthday attacks after 2³² blocks (approximately 32 GB of data). NIST deprecated 3DES in 2017 and plans to disallow it after 2023.',
    formula: 'C = 3DES_EDE(P) = DES_K₃(DES⁻¹_K₂(DES_K₁(P)))'
  }
};

export default function TripleDESDiagram({ onHover }) {
  return (
    <div className="diagram-container">
      <FlowRow>
        <DiagramNode type="plaintext" info={tripleDesInfo.plaintext} onHover={onHover}>
          64-bit Plaintext
        </DiagramNode>
      </FlowRow>
      
      <Arrow direction="down" />
      
      {/* 3DES EDE Structure */}
      <div 
        className="bg-purple-50 rounded-xl p-4 border-2 border-dashed border-purple-300"
        onMouseEnter={() => onHover && onHover(tripleDesInfo.keyOptions)}
      >
        <div className="text-center text-xs text-purple-700 font-semibold mb-3">
          EDE (ENCRYPT-DECRYPT-ENCRYPT) MODE
        </div>
        
        <div className="flex flex-col items-center gap-3">
          <FlowRow>
            <DiagramNode type="function" info={tripleDesInfo.encryptK1} onHover={onHover}>
              DES Encrypt
            </DiagramNode>
            <Arrow direction="left" />
            <DiagramNode type="key" info={tripleDesInfo.keyOptions} onHover={onHover}>
              K₁
            </DiagramNode>
          </FlowRow>
          
          <Arrow direction="down" />
          
          <FlowRow>
            <DiagramNode type="auth" info={tripleDesInfo.decryptK2} onHover={onHover}>
              DES Decrypt
            </DiagramNode>
            <Arrow direction="left" />
            <DiagramNode type="key" info={tripleDesInfo.keyOptions} onHover={onHover}>
              K₂
            </DiagramNode>
          </FlowRow>
          
          <Arrow direction="down" />
          
          <FlowRow>
            <DiagramNode type="function" info={tripleDesInfo.encryptK3} onHover={onHover}>
              DES Encrypt
            </DiagramNode>
            <Arrow direction="left" />
            <DiagramNode type="key" info={tripleDesInfo.keyOptions} onHover={onHover}>
              K₃
            </DiagramNode>
          </FlowRow>
        </div>
      </div>
      
      <Arrow direction="down" />
      
      <FlowRow>
        <DiagramNode type="ciphertext" info={tripleDesInfo.ciphertext} onHover={onHover}>
          64-bit Ciphertext
        </DiagramNode>
      </FlowRow>
      
      {/* Key Info Box */}
      <div className="mt-4 p-3 bg-slate-200 rounded-lg text-xs text-slate-600 text-center max-w-md">
        <strong>Note:</strong> In 2-key mode, K₃ = K₁. Setting K₁ = K₂ = K₃ reduces 3DES to single DES for backward compatibility.
      </div>
    </div>
  );
}
