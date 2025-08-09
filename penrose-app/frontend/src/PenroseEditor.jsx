import React, { useState, useRef } from 'react';

const defaultDomain = `
type Set
type Point
type Map

constructor Singleton(Point p) -> Set

function Intersection(Set a, Set b) -> Set
function Union(Set a, Set b) -> Set
function Subtraction(Set a, Set b) -> Set
function CartesianProduct(Set a, Set b) -> Set
function Difference(Set a, Set b) -> Set
function Subset(Set a, Set b) -> Set
function AddPoint(Point p, Set s1) -> Set

predicate From(Map f, Set domain, Set codomain)
predicate Empty(Set s)
predicate Intersecting(Set s1, Set s2)
predicate Subset(Set s1, Set s2)
predicate Equal(Set s1, Set s2)
predicate PointIn(Set s, Point p)
predicate In(Point p, Set s)
predicate Injection(Map m)
predicate Surjection(Map m)
predicate Bijection(Map m)
predicate PairIn(Point, Point, Map)
`;

const defaultStyle = `
canvas {
  width = 800
  height = 700
}

Const {
  strokeWidth = 1.5
  padding = 20.0
}

Colors {
  black = #000000
  lightBlue = #1a1ae633
  lightYellow = setOpacity(#f2f5eb, 0.5)
}

forall Set x {
    x.icon = Circle {
        fillColor : Colors.lightBlue
        strokeColor : Colors.black
        strokeStyle : "solid"
        strokeWidth : 1.0
        -- rotation : 0.0
    }

    x.text    = Equation {
      string : x.label
      -- rotation : 0.0
    }

    x.labelFn = ensure contains(x.icon, x.text)
    x.icon below x.text
}

-- Selector ordering matters!
forall Set x; Set y
where Subset(x, y) {
  ensure contains(y.icon, x.icon, 10.0)
  -- y.sizeFn    = ensure smallerThan(x.icon, y.icon)
  y.outsideFn = ensure disjoint(y.text, x.icon, 1.0)
  x.icon above y.icon
}

forall Map f
where From(f, X, Y); Subset(X, R1); Subset(Y, R2)
with Set X; Set Y; Set R1; Set R2 {
  f.padding = 20.0

    f.icon = Line {
      start : (R1.icon.center[0] + R1.icon.width / 2.0 + f.padding, R1.icon.center[1])
      end : (R2.icon.center[0] - R2.icon.width / 2.0 - f.padding, R2.icon.center[1])
      strokeWidth : 2.0
      strokeColor : Colors.black
      endArrowhead: "straight"
        -- style : "curved"
    }

    f.text = Equation {
      -- Doesn't seem to work after the first resample. Is the server updating f.text.height on resample?
      -- x : (f.icon.startX + f.icon.endX) / 2.0
      -- y : (f.icon.startY + f.icon.endY) / 2.0 + 1.1 * f.text.height
      string : f.label
    }

    encourage centerLabelAbove(f.icon, f.text, 5.0)
}

forall Set \`U\` {
    override \`U\`.icon.strokeStyle = "dashed"
    override \`U\`.icon.strokeWidth = Const.strokeWidth
}

forall Set \`V\` {
    override \`V\`.icon.strokeStyle = "dashed"
    override \`V\`.icon.strokeWidth = Const.strokeWidth
}

-- TODO: use subtyping for reals?
forall Set \`Rn\` {
    \`Rn\`.iconSize = canvas.height / 3

    override \`Rn\`.icon = Rectangle {
      -- Works but is slow
      -- x : -100.0
      -- y = 0.0
      width : \`Rn\`.iconSize
      height : \`Rn\`.iconSize
      fillColor : Colors.lightYellow
      -- rotation : 0.0
      strokeWidth : Const.strokeWidth
      strokeColor : Colors.black
    }

    override \`Rn\`.text.center = (\`Rn\`.icon.center[0] + \`Rn\`.icon.width / 2.0 - Const.padding, \`Rn\`.icon.center[1] + \`Rn\`.icon.width / 2.0 - Const.padding)

    delete \`Rn\`.labelFn
    delete \`Rn\`.outsideFn

}

forall Set \`Rm\`
with Set \`Rn\` {
    -- TODO: factor this block out
    override \`Rm\`.icon = Rectangle {
        fillColor : Colors.lightYellow
        center : (\`Rn\`.icon.center[0] + 400.0, \`Rn\`.icon.center[1])
        width : \`Rn\`.iconSize
        height : \`Rn\`.iconSize
        -- rotation : 0.0
        strokeWidth : 1.0
        strokeColor : Colors.black
    }

     override \`Rm\`.text.center = (\`Rm\`.icon.center[0] + \`Rm\`.icon.width / 2.0 - Const.padding, \`Rm\`.icon.center[1] + \`Rm\`.icon.width / 2.0 - Const.padding)

    delete \`Rm\`.labelFn
    delete \`Rm\`.outsideFn

    -- This doesn't seem to work
    --    \`Rm\`.posFn = encourage topRightOf(\`Rm\`.text, \`Rm\`.icon)
}
`;

const defaultSubstance = `
AutoLabel All

Set A
Set U
Label U $f^{-1}(V)$
Set Rn
Label Rn $\\mathbb{R}^n$
Subset(U, A)
Subset(A, Rn)

Set B
Set V
Set Rm
Label Rm $\\mathbb{R}^m$
Subset(V, B)
Subset(B, Rm)

Map f
From(f, A, B)
`;

export default function PenroseEditor() {
  const [domain, setDomain] = useState(defaultDomain);
  const [substance, setSubstance] = useState(defaultSubstance);
  const [style, setStyle] = useState(defaultStyle);
  const [svg, setSvg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('substance');

  const [imageUrl, setImageUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef(null);

  async function handleRender() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/render/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, substance, style }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Render failed');
      setSvg(json.svg);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateFromImage() {
    if (!imageUrl) {
      setError('Please upload an image first.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-substance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generation failed');
      if (!json.substance) throw new Error('No substance returned');
      setSubstance(json.substance);
      // Auto-render after setting substance
      await handleRender();
      setActiveTab('substance');
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  // rest of component remains unchanged...
  const commonProps = { rows: 16, cols: 100, style: { width: '100%', fontFamily: 'monospace', padding: 8 } };
  function renderEditorArea() {
    if (activeTab === 'domain') {
      return <textarea {...commonProps} value={domain} onChange={e => setDomain(e.target.value)} />;
    }
    if (activeTab === 'style') {
      return <textarea {...commonProps} value={style} onChange={e => setStyle(e.target.value)} />;
    }
    return <textarea {...commonProps} value={substance} onChange={e => setSubstance(e.target.value)} />;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={handleRender} disabled={loading}>
          {loading ? 'Rendering...' : 'Render'}
        </button>
        <button onClick={handleGenerateFromImage} disabled={generating || !imageUrl}>
          {generating ? 'Generating with GPT‑5...' : 'Generate Substance from Image (GPT‑5)'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e0dfd8', borderRadius: 8, padding: 12 }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Uploaded Image</strong>
            <div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                ref={fileInputRef}
                onChange={e => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('image', file);
                  fetch('/api/upload-image/', { method: 'POST', body: form })
                    .then(r => r.json())
                    .then(json => {
                      if (!json.url) throw new Error(json.error || 'Upload failed');
                      setImageUrl(json.url);
                    })
                    .catch(err => setError(String(err)));
                }}
              />
            </div>
          </div>
          <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {imageUrl ? (
              <img src={imageUrl} alt="uploaded" style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} />
            ) : (
              <div style={{ color: '#777' }}>No image uploaded</div>
            )}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e0dfd8', borderRadius: 8, padding: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Penrose Output</strong>
          </div>
          <div style={{ minHeight: 300, background: '#fafaf7', border: '1px dashed #e0dfd8', borderRadius: 6, padding: 8 }}>
            {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
            {svg ? (
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div style={{ color: '#777' }}>No SVG yet</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e0dfd8', borderRadius: 8 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e0dfd8' }}>
          <button
            onClick={() => setActiveTab('substance')}
            style={{
              padding: '8px 12px',
              background: activeTab === 'substance' ? '#f2f2ec' : 'transparent',
              border: 'none',
              borderRight: '1px solid #e0dfd8',
              cursor: 'pointer',
            }}
          >
            Substance
          </button>
          <button
            onClick={() => setActiveTab('domain')}
            style={{
              padding: '8px 12px',
              background: activeTab === 'domain' ? '#f2f2ec' : 'transparent',
              border: 'none',
              borderRight: '1px solid #e0dfd8',
              cursor: 'pointer',
            }}
          >
            Domain
          </button>
          <button
            onClick={() => setActiveTab('style')}
            style={{
              padding: '8px 12px',
              background: activeTab === 'style' ? '#f2f2ec' : 'transparent',
              border: 'none',
              borderRight: '1px solid #e0dfd8',
              cursor: 'pointer',
            }}
          >
            Style
          </button>
        </div>
        <div style={{ padding: 12 }}>{renderEditorArea()}</div>
      </div>
    </div>
  );
} 