import DiagramNode, { Arrow, FlowRow, XorNode } from '../DiagramNode';

const desInfo = {
  plaintext: {
    title: '64-bit Plaintext Block',
    description: 'DES operates on 64-bit plaintext blocks. The input first passes through an Initial Permutation (IP) which rearranges the bits according to a fixed table. This permutation has no cryptographic significance—it was designed for hardware implementation convenience in the 1970s.',
    formula: 'IP: bit 58 → position 1, bit 50 → position 2, ...'
  },
  initialPerm: {
    title: 'Initial Permutation (IP)',
    description: 'A fixed bit-level permutation applied to the 64-bit input. The IP table specifies that bit 58 of the input becomes bit 1 of the output, bit 50 becomes bit 2, and so on. The IP and its inverse FP (Final Permutation) exist for historical hardware reasons and do not contribute to cryptographic security.',
    formula: 'L₀R₀ = IP(plaintext)'
  },
  feistelStructure: {
    title: 'Feistel Network Structure',
    description: 'DES uses a balanced Feistel cipher with 16 rounds. In each round, the 64-bit state is split into left (L) and right (R) halves of 32 bits each. The Feistel structure has a crucial property: the round function f does not need to be invertible, yet the entire cipher remains invertible. Decryption uses the same algorithm with subkeys applied in reverse order.',
    formula: 'Lᵢ = Rᵢ₋₁, Rᵢ = Lᵢ₋₁ ⊕ f(Rᵢ₋₁, Kᵢ)'
  },
  fFunction: {
    title: 'DES Round Function f(R, K)',
    description: 'The heart of DES security. The round function expands R from 32 to 48 bits using the E-box, XORs with the 48-bit round key, passes through 8 S-boxes (each taking 6 bits and outputting 4 bits), and finally applies a P-box permutation. The S-boxes are the only nonlinear element and provide the cipher\'s confusion.',
    formula: 'f(R, K) = P(S(E(R) ⊕ K))'
  },
  expansion: {
    title: 'Expansion Permutation (E-Box)',
    description: 'Expands the 32-bit right half to 48 bits to match the subkey size. Some bits are duplicated: the 32 bits are divided into 8 groups of 4 bits, and each group is expanded to 6 bits by duplicating the boundary bits from adjacent groups. This creates diffusion by overlapping bits.',
    formula: 'E: 32 bits → 48 bits (with bit duplication)'
  },
  sbox: {
    title: 'Substitution Boxes (S-Boxes)',
    description: 'Eight S-boxes, each taking 6 input bits and producing 4 output bits. The outer 2 bits select the row (0-3), and the inner 4 bits select the column (0-15) of a 4×16 lookup table. The S-boxes are carefully designed to resist differential and linear cryptanalysis, providing the essential nonlinearity (confusion) of DES.',
    formula: 'Sᵢ: {0,1}⁶ → {0,1}⁴ for i = 1,...,8'
  },
  pbox: {
    title: 'Permutation Box (P-Box)',
    description: 'A fixed bit-level permutation applied to the 32-bit S-box output. The P-box spreads each S-box\'s output bits across different positions, ensuring that one S-box\'s output affects multiple S-boxes in the next round. This provides diffusion—changing one input bit affects many output bits.',
    formula: 'P: 32 bits → 32 bits (fixed permutation)'
  },
  keySchedule: {
    title: 'Subkey Kᵢ (from Key Schedule)',
    description: 'Each of the 16 rounds uses a different 48-bit subkey derived from the 56-bit key (the actual key is 64 bits with 8 parity bits discarded). The key schedule applies PC-1 (permuted choice 1) to select 56 bits, splits into two 28-bit halves, rotates each left by 1 or 2 positions per round, and applies PC-2 to select 48 bits.',
    formula: 'Key Schedule: 56-bit key → 16 × 48-bit subkeys'
  },
  xor: {
    title: 'XOR Operation',
    description: 'The exclusive-OR operation combines the left half with the output of the round function. In modular arithmetic: (a ⊕ b) ⊕ b = a, which enables decryption. The Feistel structure ensures that XOR\'s self-inverse property allows the same algorithm for encryption and decryption (with reversed key order).',
    formula: 'Rᵢ = Lᵢ₋₁ ⊕ f(Rᵢ₋₁, Kᵢ)'
  },
  finalPerm: {
    title: 'Final Permutation (FP = IP⁻¹)',
    description: 'The inverse of the Initial Permutation, applied after all 16 rounds. It undoes the bit rearrangement of IP. Together with IP, it forms a "wrapper" around the core Feistel network. Note: After round 16, the left and right halves are swapped before FP is applied.',
    formula: 'Ciphertext = FP(R₁₆||L₁₆)'
  },
  ciphertext: {
    title: '64-bit Ciphertext Block',
    description: 'The encrypted output after all 16 Feistel rounds and the final permutation. DES effectively has only 56 bits of key security (not 64) due to parity bits. Today, DES is considered insecure due to its small key size—it can be brute-forced in hours with specialized hardware.',
    formula: 'Ciphertext = DES_K(Plaintext)'
  }
};

export default function DESDiagram({ onHover }) {
  return (
    <div className="diagram-container">
      <FlowRow>
        <DiagramNode type="plaintext" info={desInfo.plaintext} onHover={onHover}>
          64-bit Plaintext
        </DiagramNode>
      </FlowRow>
      
      <Arrow direction="down" />
      
      <FlowRow>
        <DiagramNode type="function" info={desInfo.initialPerm} onHover={onHover}>
          Initial Permutation (IP)
        </DiagramNode>
      </FlowRow>
      
      <Arrow direction="down" />
      
      <div 
        className="bg-blue-50 rounded-xl p-4 border-2 border-dashed border-blue-300"
        onMouseEnter={() => onHover && onHover(desInfo.feistelStructure)}
      >
        <div className="text-center text-xs text-blue-600 font-semibold mb-3">
          16 FEISTEL ROUNDS
        </div>
        
        <FlowRow>
          <DiagramNode type="internal" info={desInfo.feistelStructure} onHover={onHover}>
            L (32 bits)
          </DiagramNode>
          <DiagramNode type="internal" info={desInfo.feistelStructure} onHover={onHover}>
            R (32 bits)
          </DiagramNode>
        </FlowRow>
        
        <Arrow direction="down" />
        
        <FlowRow>
          <DiagramNode type="function" info={desInfo.fFunction} onHover={onHover}>
            f(R, K) Round Function
          </DiagramNode>
          <Arrow direction="left" />
          <DiagramNode type="key" info={desInfo.keySchedule} onHover={onHover}>
            Subkey Kᵢ
          </DiagramNode>
        </FlowRow>
        
        <Arrow direction="down" />
        
        <FlowRow>
          <XorNode info={desInfo.xor} onHover={onHover} />
        </FlowRow>
        
        <Arrow direction="down" />
        
        <div className="text-center text-xs text-slate-500 mt-2">
          Swap L ↔ R, repeat 16 times
        </div>
      </div>
      
      <Arrow direction="down" />
      
      <FlowRow>
        <DiagramNode type="function" info={desInfo.finalPerm} onHover={onHover}>
          Final Permutation (FP)
        </DiagramNode>
      </FlowRow>
      
      <Arrow direction="down" />
      
      <FlowRow>
        <DiagramNode type="ciphertext" info={desInfo.ciphertext} onHover={onHover}>
          64-bit Ciphertext
        </DiagramNode>
      </FlowRow>
    </div>
  );
}
