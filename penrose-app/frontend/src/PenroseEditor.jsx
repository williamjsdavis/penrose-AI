import React, { useState, useRef } from 'react';

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
  const [activeTab, setActiveTab] = useState('substance');

  const [imageUrl, setImageUrl] = useState(null);
  const fileInputRef = useRef(null);

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

  async function handleUploadChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch('/api/upload-image/', {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setImageUrl(json.url);
    } catch (err) {
      setError(String(err));
    }
  }

  function renderEditorArea() {
    const commonProps = { rows: 16, cols: 100, style: { width: '100%', fontFamily: 'monospace', padding: 8 } };
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
      <h1>Penrose Render Demo</h1>
      <div style={{ marginBottom: 12 }}>
        <label>Variation</label>{' '}
        <input value={variation} onChange={e => setVariation(e.target.value)} />{' '}
        <button onClick={handleRender} disabled={loading}>
          {loading ? 'Rendering...' : 'Render'}
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
                onChange={handleUploadChange}
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