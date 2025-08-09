import React, { useState } from 'react';

const defaultDomain = `
type Set
predicate Disjoint(Set s1, Set s2)
predicate Intersecting(Set s1, Set s2)
predicate Subset(Set s1, Set s2)
`;

const defaultStyle = `
canvas {
  width = 800
  height = 700
}

forall Set x {
  shape x.icon = Circle { }
  shape x.text = Equation {
    string : x.label
    fontSize : "32px"
  }
  ensure contains(x.icon, x.text)
  encourage norm(x.text.center - x.icon.center) == 0
  layer x.text above x.icon
}

forall Set x; Set y
where Subset(x, y) {
  ensure disjoint(y.text, x.icon, 10)
  ensure contains(y.icon, x.icon, 5)
  layer x.icon above y.icon
}

forall Set x; Set y
where Disjoint(x, y) {
  ensure disjoint(x.icon, y.icon)
}

forall Set x; Set y
where Intersecting(x, y) {
  ensure overlapping(x.icon, y.icon)
  ensure disjoint(y.text, x.icon)
  ensure disjoint(x.text, y.icon)
}
`;

const defaultSubstance = `
Set A, B, C, D, E, F, G

Subset(B, A)
Subset(C, A)
Subset(D, B)
Subset(E, B)
Subset(F, C)
Subset(G, C)

Disjoint(E, D)
Disjoint(F, G)
Disjoint(B, C)

AutoLabel All
`;

export default function PenroseEditor() {
  const [domain, setDomain] = useState(defaultDomain);
  const [substance, setSubstance] = useState(defaultSubstance);
  const [style, setStyle] = useState(defaultStyle);
  const [variation, setVariation] = useState('test');
  const [svg, setSvg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleRender() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/render/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, substance, style, variation }),
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

  return (
    <div className="p-4">
      <h2>Penrose Editor</h2>
      <div>
        <label>Variation</label>
        <input value={variation} onChange={e => setVariation(e.target.value)} />
      </div>
      <div>
        <label>Domain</label>
        <textarea value={domain} onChange={e => setDomain(e.target.value)} rows={8} cols={80} />
      </div>
      <div>
        <label>Substance</label>
        <textarea value={substance} onChange={e => setSubstance(e.target.value)} rows={12} cols={80} />
      </div>
      <div>
        <label>Style</label>
        <textarea value={style} onChange={e => setStyle(e.target.value)} rows={20} cols={80} />
      </div>
      <button onClick={handleRender} disabled={loading}>{loading ? 'Rendering...' : 'Render'}</button>
      {error && <div style={{color:'red'}}>{error}</div>}

      <div style={{marginTop:20}}>
        <h3>Output</h3>
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div>No SVG yet</div>
        )}
      </div>
    </div>
  );
} 