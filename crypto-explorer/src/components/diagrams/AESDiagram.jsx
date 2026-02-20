import { useState } from 'react';

const aesInfo = {
  overview: {
    title: 'AES Round Function (Fig. 4.3)',
    description: 'AES is a byte-oriented cipher using a Substitution-Permutation Network (SPN). Each round applies four transformations: SubBytes (confusion via S-box), ShiftRows (diffusion via row permutation), MixColumns (diffusion via column mixing), and AddRoundKey (key mixing via XOR). The final round omits MixColumns.',
    formula: 'Nr = 10, 12, or 14 rounds for 128, 192, 256-bit keys'
  },
  subBytes: {
    title: 'Byte Substitution (SubBytes)',
    description: 'The only nonlinear layer in AES. Each byte Aᵢ is independently substituted by Bᵢ = S(Aᵢ). The S-box is constructed in two steps: (1) compute multiplicative inverse in GF(2⁸), then (2) apply an affine transformation. This provides optimal resistance against linear and differential cryptanalysis.',
    formula: 'S(Aᵢ) = Affine(Aᵢ⁻¹) in GF(2⁸)'
  },
  sboxInverse: {
    title: 'GF(2⁸) Inverse',
    description: 'The first step computes B\'ᵢ = Aᵢ⁻¹ in the Galois field GF(2⁸) with irreducible polynomial P(x) = x⁸ + x⁴ + x³ + x + 1. The inverse of zero is defined as zero. This provides high nonlinearity to resist algebraic attacks.',
    formula: 'B\'ᵢ = Aᵢ⁻¹ mod P(x)'
  },
  sboxAffine: {
    title: 'Affine Transformation',
    description: 'The second step multiplies each bit vector B\'ᵢ by a constant 8×8 matrix and adds a constant vector (1,1,0,0,0,1,1,0). This "destroys" the algebraic structure of the GF inversion, preventing attacks that exploit the field structure.',
    formula: 'Bᵢ = M · B\'ᵢ + c (mod 2)'
  },
  shiftRows: {
    title: 'ShiftRows Layer',
    description: 'A byte-wise permutation that cyclically shifts each row of the state matrix by different offsets. Row 0: no shift, Row 1: shift left by 1, Row 2: shift left by 2, Row 3: shift left by 3. This ensures columns of output come from different input columns.',
    formula: 'B\'[r,c] = B[r, (c+r) mod 4]'
  },
  mixColumns: {
    title: 'MixColumns Layer',
    description: 'Each 4-byte column is treated as a polynomial over GF(2⁸) and multiplied by c(x) = 03·x³ + 01·x² + 01·x + 02 modulo x⁴+1. This is equivalent to matrix multiplication by a fixed 4×4 MDS matrix. After 3 rounds, every output byte depends on all 16 input bytes.',
    formula: 'C = MDS × B (in GF(2⁸))'
  },
  keyAddition: {
    title: 'Key Addition (AddRoundKey)',
    description: 'The round key (derived from the cipher key via the Key Schedule) is XORed with the state. This is the only step that introduces key material into the encryption. Without this step, AES would be a fixed, key-independent permutation.',
    formula: 'State\' = State ⊕ RoundKey'
  }
};

// S-Box lookup table (Table 4.3)
const SBOX = [
  ['63','7c','77','7b','f2','6b','6f','c5','30','01','67','2b','fe','d7','ab','76'],
  ['ca','82','c9','7d','fa','59','47','f0','ad','d4','a2','af','9c','a4','72','c0'],
  ['b7','fd','93','26','36','3f','f7','cc','34','a5','e5','f1','71','d8','31','15'],
  ['04','c7','23','c3','18','96','05','9a','07','12','80','e2','eb','27','b2','75'],
  ['09','83','2c','1a','1b','6e','5a','a0','52','3b','d6','b3','29','e3','2f','84'],
  ['53','d1','00','ed','20','fc','b1','5b','6a','cb','be','39','4a','4c','58','cf'],
  ['d0','ef','aa','fb','43','4d','33','85','45','f9','02','7f','50','3c','9f','a8'],
  ['51','a3','40','8f','92','9d','38','f5','bc','b6','da','21','10','ff','f3','d2'],
  ['cd','0c','13','ec','5f','97','44','17','c4','a7','7e','3d','64','5d','19','73'],
  ['60','81','4f','dc','22','2a','90','88','46','ee','b8','14','de','5e','0b','db'],
  ['e0','32','3a','0a','49','06','24','5c','c2','d3','ac','62','91','95','e4','79'],
  ['e7','c8','37','6d','8d','d5','4e','a9','6c','56','f4','ea','65','7a','ae','08'],
  ['ba','78','25','2e','1c','a6','b4','c6','e8','dd','74','1f','4b','bd','8b','8a'],
  ['70','3e','b5','66','48','03','f6','0e','61','35','57','b9','86','c1','1d','9e'],
  ['e1','f8','98','11','69','d9','8e','94','9b','1e','87','e9','ce','55','28','df'],
  ['8c','a1','89','0d','bf','e6','42','68','41','99','2d','0f','b0','54','bb','16']
];

// MDS Matrix for MixColumns
const MDS_MATRIX = [
  ['02', '03', '01', '01'],
  ['01', '02', '03', '01'],
  ['01', '01', '02', '03'],
  ['03', '01', '01', '02']
];

// Affine matrix (8x8)
const AFFINE_MATRIX = [
  [1,0,0,0,1,1,1,1],
  [1,1,0,0,0,1,1,1],
  [1,1,1,0,0,0,1,1],
  [1,1,1,1,0,0,0,1],
  [1,1,1,1,1,0,0,0],
  [0,1,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,0],
  [0,0,0,1,1,1,1,1]
];

const AFFINE_CONSTANT = [1,1,0,0,0,1,1,0];

export default function AESDiagram({ onHover }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [hovered, setHovered] = useState(null);
  const [sboxInput, setSboxInput] = useState({ x: 12, y: 2 }); // C2 hex example

  const handleHover = (key) => {
    setHovered(key);
    if (onHover && aesInfo[key]) {
      onHover(aesInfo[key]);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Round Function' },
    { id: 'subbytes', label: 'SubBytes' },
    { id: 'shiftrows', label: 'ShiftRows' },
    { id: 'mixcolumns', label: 'MixColumns' }
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
      {activeTab === 'overview' && <RoundOverview hovered={hovered} handleHover={handleHover} setHovered={setHovered} />}
      {activeTab === 'subbytes' && <SubBytesView hovered={hovered} handleHover={handleHover} setHovered={setHovered} sboxInput={sboxInput} setSboxInput={setSboxInput} />}
      {activeTab === 'shiftrows' && <ShiftRowsView hovered={hovered} handleHover={handleHover} setHovered={setHovered} />}
      {activeTab === 'mixcolumns' && <MixColumnsView hovered={hovered} handleHover={handleHover} setHovered={setHovered} />}
    </div>
  );
}

// ============ ROUND OVERVIEW (Fig. 4.3) ============
function RoundOverview({ hovered, handleHover, setHovered }) {
  // Layout: 4 rows × 4 columns, displayed as horizontal rows
  const cellW = 32, cellH = 22;
  const rowGap = 6, colGap = 28;
  
  // X positions for 4 cells in a row (centered, wider spacing)
  const gridX = (col) => 70 + col * (cellW + colGap);
  // Y positions for 4 rows at a given section Y
  const gridY = (row, sectionY) => sectionY + row * (cellH + rowGap);
  
  // Section Y positions
  const yA = 35;
  const ySbox = yA + 4 * (cellH + rowGap) + 25;
  const yB = ySbox + 35;
  const yC = yB + 4 * (cellH + rowGap) + 90;
  const yKeyAdd = yC + 4 * (cellH + rowGap) + 35;

  const rowColors = ['#64748b', '#3b82f6', '#10b981', '#f59e0b'];
  const shiftLabels = ['no shift', '← 1', '← 2', '← 3'];

  return (
    <div>
      <svg viewBox="0 0 480 510" className="w-full max-w-2xl mx-auto">
        {/* Title */}
        <text x="240" y="18" textAnchor="middle" className="text-xs fill-slate-500 font-medium">
          Fig. 4.3 — AES round function for rounds 1, 2, ..., nᵣ − 1
        </text>

        {/* ===== INPUT STATE (A) ===== */}
        <g onMouseEnter={() => handleHover('overview')} onMouseLeave={() => setHovered(null)}>
          {[0,1,2,3].map(row => (
            <g key={row}>
              {[0,1,2,3].map(col => (
                <g key={col}>
                  <rect 
                    x={gridX(col)} 
                    y={gridY(row, yA)} 
                    width={cellW} height={cellH} 
                    fill="#f1f5f9" stroke={rowColors[row]} strokeWidth="1.5" rx="2"
                  />
                  <text 
                    x={gridX(col) + cellW/2} 
                    y={gridY(row, yA) + 14} 
                    textAnchor="middle" 
                    className="text-[9px] fill-slate-600 font-mono"
                  >
                    A<tspan fontSize="7" dy="1">{row},{col}</tspan>
                  </text>
                </g>
              ))}
            </g>
          ))}
        </g>

        {/* Arrows down to S-boxes */}
        {[0,1,2,3].map(row => (
          <g key={row}>
            {[0,1,2,3].map(col => (
              <line 
                key={col}
                x1={gridX(col) + cellW/2} 
                y1={gridY(row, yA) + cellH}
                x2={gridX(col) + cellW/2} 
                y2={ySbox - 12}
                stroke="#94a3b8" strokeWidth="1"
              />
            ))}
          </g>
        ))}

        {/* Label: Byte Substitution */}
        <text x="50" y={ySbox + 5} textAnchor="end" className="text-[9px] fill-slate-400">SubBytes</text>

        {/* ===== S-BOXES (single row) ===== */}
        <g onMouseEnter={() => handleHover('subBytes')} onMouseLeave={() => setHovered(null)}>
          {[0,1,2,3].map(col => (
            <g key={col}>
              <circle 
                cx={gridX(col) + cellW/2} cy={ySbox} r="11" 
                fill={hovered === 'subBytes' ? '#dbeafe' : '#f8fafc'} 
                stroke={hovered === 'subBytes' ? '#3b82f6' : '#64748b'} 
                strokeWidth="1.5" 
                style={{ cursor: 'pointer' }}
              />
              <text x={gridX(col) + cellW/2} y={ySbox + 4} textAnchor="middle" className="text-[10px] fill-slate-600">S</text>
            </g>
          ))}
        </g>

        {/* Arrows down to B */}
        {[0,1,2,3].map(row => (
          <g key={row}>
            {[0,1,2,3].map(col => (
              <line 
                key={col}
                x1={gridX(col) + cellW/2} 
                y1={ySbox + 12}
                x2={gridX(col) + cellW/2} 
                y2={gridY(row, yB)}
                stroke="#94a3b8" strokeWidth="1"
              />
            ))}
          </g>
        ))}

        {/* ===== OUTPUT STATE (B) ===== */}
        <g onMouseEnter={() => handleHover('subBytes')} onMouseLeave={() => setHovered(null)}>
          {[0,1,2,3].map(row => (
            <g key={row}>
              {[0,1,2,3].map(col => (
                <g key={col}>
                  <rect 
                    x={gridX(col)} 
                    y={gridY(row, yB)} 
                    width={cellW} height={cellH} 
                    fill="#fef3c7" stroke={rowColors[row]} strokeWidth="1.5" rx="2"
                  />
                  <text 
                    x={gridX(col) + cellW/2} 
                    y={gridY(row, yB) + 14} 
                    textAnchor="middle" 
                    className="text-[9px] fill-slate-600 font-mono"
                  >
                    B<tspan fontSize="7" dy="1">{row},{col}</tspan>
                  </text>
                </g>
              ))}
              {/* Shift label */}
              <text 
                x={gridX(3) + cellW + 10} 
                y={gridY(row, yB) + 14} 
                textAnchor="start" 
                className="text-[8px] font-mono"
                fill={rowColors[row]}
              >
                {shiftLabels[row]}
              </text>
            </g>
          ))}
        </g>

        {/* Label: ShiftRows */}
        <text x="50" y={yB + 50} textAnchor="end" className="text-[9px] fill-slate-400">ShiftRows</text>

        {/* ===== SHIFTROWS LINES ===== */}
        <g onMouseEnter={() => handleHover('shiftRows')} onMouseLeave={() => setHovered(null)}>
          {[0,1,2,3].map(row => {
            const shift = row;
            return [0,1,2,3].map(col => {
              const destCol = (col + shift) % 4;
              const x1 = gridX(col) + cellW/2;
              const y1 = gridY(row, yB) + cellH;
              const x2 = gridX(destCol) + cellW/2;
              const y2 = gridY(row, yC);
              return (
                <line 
                  key={`shift-${row}-${col}`}
                  x1={x1} y1={y1}
                  x2={x2} y2={y2}
                  stroke={rowColors[row]}
                  strokeWidth="1.5"
                />
              );
            });
          })}
        </g>

        {/* ===== OUTPUT STATE (C) ===== */}
        <g onMouseEnter={() => handleHover('mixColumns')} onMouseLeave={() => setHovered(null)}>
          {[0,1,2,3].map(row => (
            <g key={row}>
              {[0,1,2,3].map(col => (
                <g key={col}>
                  <rect 
                    x={gridX(col)} 
                    y={gridY(row, yC)} 
                    width={cellW} height={cellH} 
                    fill="#dbeafe" stroke={rowColors[row]} strokeWidth="1.5" rx="2"
                  />
                  <text 
                    x={gridX(col) + cellW/2} 
                    y={gridY(row, yC) + 14} 
                    textAnchor="middle" 
                    className="text-[9px] fill-slate-600 font-mono"
                  >
                    C<tspan fontSize="7" dy="1">{row},{col}</tspan>
                  </text>
                </g>
              ))}
            </g>
          ))}
        </g>

        {/* Label: MixColumn */}
        <text x="50" y={yC + 50} textAnchor="end" className="text-[9px] fill-slate-400">MixColumns</text>

        {/* Lines from C to XOR */}
        {[0,1,2,3].map(col => (
          <line 
            key={col}
            x1={gridX(col) + cellW/2} 
            y1={gridY(3, yC) + cellH}
            x2={gridX(col) + cellW/2} 
            y2={yKeyAdd - 14}
            stroke="#64748b" strokeWidth="1.5"
          />
        ))}

        {/* Label: Key Addition */}
        <text x="50" y={yKeyAdd + 5} textAnchor="end" className="text-[9px] fill-slate-400">AddRoundKey</text>

        {/* ===== KEY ADDITION XOR ===== */}
        <g onMouseEnter={() => handleHover('keyAddition')} onMouseLeave={() => setHovered(null)}>
          <circle cx={(gridX(1) + gridX(2) + cellW) / 2} cy={yKeyAdd} r="14" fill="none" stroke="#64748b" strokeWidth="2" style={{ cursor: 'pointer' }} />
          <line x1={(gridX(1) + gridX(2) + cellW) / 2 - 8} y1={yKeyAdd} x2={(gridX(1) + gridX(2) + cellW) / 2 + 8} y2={yKeyAdd} stroke="#64748b" strokeWidth="2" />
          <line x1={(gridX(1) + gridX(2) + cellW) / 2} y1={yKeyAdd - 8} x2={(gridX(1) + gridX(2) + cellW) / 2} y2={yKeyAdd + 8} stroke="#64748b" strokeWidth="2" />
          
          {/* Key input arrow */}
          <line x1={gridX(3) + cellW + 15} y1={yKeyAdd} x2="440" y2={yKeyAdd} stroke="#64748b" strokeWidth="1.5" />
          <polygon points={`${gridX(3) + cellW + 15},${yKeyAdd} ${gridX(3) + cellW + 22},${yKeyAdd - 4} ${gridX(3) + cellW + 22},${yKeyAdd + 4}`} fill="#64748b" />
          <text x="450" y={yKeyAdd + 5} textAnchor="start" className="text-sm fill-slate-600 font-mono italic">kᵢ</text>
        </g>
      </svg>

      {/* Notes */}
      <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
        <strong>Row colors:</strong> 
        <span className="ml-2" style={{color: rowColors[0]}}>● Row 0 (no shift)</span>
        <span className="ml-2" style={{color: rowColors[1]}}>● Row 1 (← 1)</span>
        <span className="ml-2" style={{color: rowColors[2]}}>● Row 2 (← 2)</span>
        <span className="ml-2" style={{color: rowColors[3]}}>● Row 3 (← 3)</span>
      </div>
    </div>
  );
}

// ============ SubBytes VIEW ============
function SubBytesView({ hovered, handleHover, setHovered, sboxInput, setSboxInput }) {
  const inputHex = sboxInput.x.toString(16).toUpperCase() + sboxInput.y.toString(16).toUpperCase();
  const outputHex = SBOX[sboxInput.x][sboxInput.y];

  return (
    <div>
      {/* S-Box internal structure (Fig. 4.4) */}
      <svg viewBox="0 0 400 80" className="w-full max-w-lg mx-auto mb-4">
        <text x="200" y="12" textAnchor="middle" className="text-[10px] fill-slate-500">
          Fig. 4.4 — S-Box: Bᵢ = S(Aᵢ)
        </text>
        
        {/* Input */}
        <text x="20" y="50" textAnchor="start" className="text-sm fill-slate-700 font-mono italic">Aᵢ</text>
        <line x1="35" y1="45" x2="65" y2="45" stroke="#64748b" strokeWidth="1.5" />
        <polygon points="65,45 60,42 60,48" fill="#64748b" />
        
        {/* GF inverse box */}
        <g onMouseEnter={() => handleHover('sboxInverse')} onMouseLeave={() => setHovered(null)}>
          <rect x="70" y="30" width="80" height="30" rx="4" 
            fill={hovered === 'sboxInverse' ? '#dbeafe' : '#f8fafc'} 
            stroke={hovered === 'sboxInverse' ? '#3b82f6' : '#64748b'} 
            strokeWidth="1.5" style={{ cursor: 'pointer' }} />
          <text x="110" y="42" textAnchor="middle" className="text-[9px] fill-slate-600">GF(2⁸)</text>
          <text x="110" y="53" textAnchor="middle" className="text-[9px] fill-slate-600">inverse</text>
        </g>
        
        <line x1="150" y1="45" x2="175" y2="45" stroke="#64748b" strokeWidth="1.5" />
        <text x="163" y="38" textAnchor="middle" className="text-xs fill-slate-500 font-mono italic">B′ᵢ</text>
        <polygon points="175,45 170,42 170,48" fill="#64748b" />
        
        {/* Affine mapping box */}
        <g onMouseEnter={() => handleHover('sboxAffine')} onMouseLeave={() => setHovered(null)}>
          <rect x="180" y="30" width="80" height="30" rx="4"
            fill={hovered === 'sboxAffine' ? '#dbeafe' : '#f8fafc'} 
            stroke={hovered === 'sboxAffine' ? '#3b82f6' : '#64748b'} 
            strokeWidth="1.5" style={{ cursor: 'pointer' }} />
          <text x="220" y="42" textAnchor="middle" className="text-[9px] fill-slate-600">affine</text>
          <text x="220" y="53" textAnchor="middle" className="text-[9px] fill-slate-600">mapping</text>
        </g>
        
        <line x1="260" y1="45" x2="290" y2="45" stroke="#64748b" strokeWidth="1.5" />
        <polygon points="290,45 285,42 285,48" fill="#64748b" />
        
        {/* Output */}
        <text x="300" y="50" textAnchor="start" className="text-sm fill-slate-700 font-mono italic">Bᵢ</text>
      </svg>

      {/* Affine transformation matrix */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="text-xs font-semibold text-amber-800 mb-2">Affine Transformation</h4>
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono">
          <div className="flex flex-col">
            {['b₀','b₁','b₂','b₃','b₄','b₅','b₆','b₇'].map((b, i) => (
              <span key={i} className="text-slate-600">{b}</span>
            ))}
          </div>
          <span className="text-slate-500">=</span>
          <div className="grid grid-cols-8 gap-0 border border-slate-300 p-1 bg-white rounded">
            {AFFINE_MATRIX.flat().map((v, i) => (
              <span key={i} className={`w-3 h-3 flex items-center justify-center ${v ? 'text-indigo-600 font-bold' : 'text-slate-300'}`}>
                {v}
              </span>
            ))}
          </div>
          <span className="text-slate-500">·</span>
          <div className="flex flex-col">
            {["b′₀","b′₁","b′₂","b′₃","b′₄","b′₅","b′₆","b′₇"].map((b, i) => (
              <span key={i} className="text-slate-600">{b}</span>
            ))}
          </div>
          <span className="text-slate-500">+</span>
          <div className="flex flex-col">
            {AFFINE_CONSTANT.map((v, i) => (
              <span key={i} className={v ? 'text-emerald-600 font-bold' : 'text-slate-400'}>{v}</span>
            ))}
          </div>
        </div>
      </div>

      {/* S-Box Table */}
      <div className="overflow-x-auto">
        <div className="text-xs text-slate-500 mb-2 text-center">Table 4.3 — S-Box values in hex (click to select)</div>
        <table className="text-[9px] font-mono mx-auto border-collapse">
          <thead>
            <tr>
              <th className="p-1 border bg-slate-100">y→<br/>x↓</th>
              {[...Array(16)].map((_, i) => (
                <th key={i} className="p-1 border bg-slate-100 w-6">{i.toString(16).toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SBOX.map((row, x) => (
              <tr key={x}>
                <td className="p-1 border bg-slate-100 font-bold">{x.toString(16).toUpperCase()}</td>
                {row.map((val, y) => (
                  <td 
                    key={y} 
                    className={`p-1 border cursor-pointer transition-colors ${
                      sboxInput.x === x && sboxInput.y === y 
                        ? 'bg-indigo-500 text-white font-bold' 
                        : 'hover:bg-indigo-100'
                    }`}
                    onClick={() => setSboxInput({ x, y })}
                  >
                    {val.toUpperCase()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Example */}
      <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
        <strong className="text-emerald-800">Example:</strong>
        <span className="ml-2 font-mono text-emerald-700">
          S(({inputHex})<sub>hex</sub>) = ({outputHex.toUpperCase()})<sub>hex</sub>
        </span>
      </div>
    </div>
  );
}

// ============ ShiftRows VIEW ============
function ShiftRowsView({ hovered, handleHover, setHovered }) {
  // Before state
  const before = [
    ['B₀','B₄','B₈','B₁₂'],
    ['B₁','B₅','B₉','B₁₃'],
    ['B₂','B₆','B₁₀','B₁₄'],
    ['B₃','B₇','B₁₁','B₁₅']
  ];
  // After state (shifted)
  const after = [
    ['B₀','B₄','B₈','B₁₂'],
    ['B₅','B₉','B₁₃','B₁'],
    ['B₁₀','B₁₄','B₂','B₆'],
    ['B₁₅','B₃','B₇','B₁₁']
  ];

  const rowColors = ['#64748b', '#3b82f6', '#10b981', '#f59e0b'];
  const shifts = ['no shift', '← one position left shift', '← two positions left shift', '← three positions left shift'];

  return (
    <div>
      <svg viewBox="0 0 500 200" className="w-full max-w-2xl mx-auto">
        <text x="250" y="15" textAnchor="middle" className="text-xs fill-slate-500 font-medium">
          ShiftRows Transformation (Expression 4.1)
        </text>

        {/* Before matrix */}
        <text x="70" y="40" textAnchor="middle" className="text-xs fill-slate-600 font-semibold">Input</text>
        <g onMouseEnter={() => handleHover('shiftRows')} onMouseLeave={() => setHovered(null)}>
          {before.map((row, r) => (
            row.map((cell, c) => (
              <g key={`before-${r}-${c}`}>
                <rect 
                  x={20 + c * 35} 
                  y={50 + r * 30} 
                  width="30" height="26" 
                  fill="#f8fafc" 
                  stroke={rowColors[r]} 
                  strokeWidth="2"
                />
                <text 
                  x={35 + c * 35} 
                  y={68 + r * 30} 
                  textAnchor="middle" 
                  className="text-[9px] font-mono"
                  fill={rowColors[r]}
                >
                  {cell}
                </text>
              </g>
            ))
          ))}
        </g>

        {/* Arrow */}
        <line x1="170" y1="110" x2="210" y2="110" stroke="#64748b" strokeWidth="2" />
        <polygon points="210,110 205,107 205,113" fill="#64748b" />

        {/* After matrix */}
        <text x="290" y="40" textAnchor="middle" className="text-xs fill-slate-600 font-semibold">Output</text>
        <g onMouseEnter={() => handleHover('shiftRows')} onMouseLeave={() => setHovered(null)}>
          {after.map((row, r) => (
            row.map((cell, c) => (
              <g key={`after-${r}-${c}`}>
                <rect 
                  x={220 + c * 35} 
                  y={50 + r * 30} 
                  width="30" height="26" 
                  fill="#fef3c7" 
                  stroke={rowColors[r]} 
                  strokeWidth="2"
                />
                <text 
                  x={235 + c * 35} 
                  y={68 + r * 30} 
                  textAnchor="middle" 
                  className="text-[9px] font-mono"
                  fill={rowColors[r]}
                >
                  {cell}
                </text>
              </g>
            ))
          ))}
        </g>

        {/* Shift labels */}
        {shifts.map((shift, i) => (
          <text 
            key={i}
            x="380" 
            y={68 + i * 30} 
            textAnchor="start" 
            className="text-[9px] fill-slate-500"
            fill={rowColors[i]}
          >
            {shift}
          </text>
        ))}
      </svg>

      {/* Explanation */}
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>Purpose:</strong> ShiftRows ensures that the four bytes of each column are spread to four different columns. 
        Combined with MixColumns, this achieves full diffusion after just 2 rounds — every output byte depends on every input byte.
      </div>
    </div>
  );
}

// ============ MixColumns VIEW ============
function MixColumnsView({ hovered, handleHover, setHovered }) {
  return (
    <div>
      <svg viewBox="0 0 400 180" className="w-full max-w-lg mx-auto">
        <text x="200" y="15" textAnchor="middle" className="text-xs fill-slate-500 font-medium">
          MixColumns — Matrix Multiplication in GF(2⁸)
        </text>

        {/* Output vector */}
        <g onMouseEnter={() => handleHover('mixColumns')} onMouseLeave={() => setHovered(null)}>
          {['C₀','C₁','C₂','C₃'].map((c, i) => (
            <g key={i}>
              <rect x="20" y={40 + i * 30} width="30" height="26" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
              <text x="35" y={58 + i * 30} textAnchor="middle" className="text-xs font-mono fill-slate-700">{c}</text>
            </g>
          ))}
        </g>

        {/* Equals sign */}
        <text x="65" y="95" textAnchor="middle" className="text-lg fill-slate-500">=</text>

        {/* MDS Matrix */}
        <g onMouseEnter={() => handleHover('mixColumns')} onMouseLeave={() => setHovered(null)}>
          <rect x="80" y="35" width="130" height="115" fill="none" stroke="#64748b" strokeWidth="1.5" rx="4" />
          {MDS_MATRIX.map((row, r) => (
            row.map((val, c) => (
              <text 
                key={`${r}-${c}`}
                x={100 + c * 30} 
                y={58 + r * 28} 
                textAnchor="middle" 
                className={`text-xs font-mono ${val === '02' || val === '03' ? 'fill-indigo-600 font-bold' : 'fill-slate-500'}`}
              >
                {val}
              </text>
            ))
          ))}
        </g>

        {/* Dot */}
        <text x="220" y="95" textAnchor="middle" className="text-lg fill-slate-500">·</text>

        {/* Input vector */}
        <g onMouseEnter={() => handleHover('mixColumns')} onMouseLeave={() => setHovered(null)}>
          {['B₀','B₅','B₁₀','B₁₅'].map((b, i) => (
            <g key={i}>
              <rect x="235" y={40 + i * 30} width="35" height="26" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="252" y={58 + i * 30} textAnchor="middle" className="text-xs font-mono fill-slate-700">{b}</text>
            </g>
          ))}
        </g>
      </svg>

      {/* GF arithmetic explanation */}
      <div className="mt-3 space-y-2">
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800">
          <strong>GF(2⁸) Arithmetic:</strong>
          <ul className="mt-1 ml-4 list-disc space-y-1">
            <li><span className="font-mono">01</span> = multiplication by 1 (identity)</li>
            <li><span className="font-mono">02</span> = multiplication by x (left shift, conditional XOR with 0x1B if MSB=1)</li>
            <li><span className="font-mono">03</span> = multiplication by (x + 1) = 02 ⊕ 01</li>
          </ul>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          <strong>MDS Property:</strong> The MixColumns matrix is a Maximum Distance Separable code. 
          This guarantees that the minimum number of active S-boxes across any 4-round differential is at least 25, 
          providing strong resistance to differential cryptanalysis.
        </div>
      </div>
    </div>
  );
}
