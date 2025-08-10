import React from 'react'
import './App.css'
import PenroseEditor from './PenroseEditor'
import tilingImg from './assets/penrosetilingfilled3.png'
import sources from './assets/sources.json'

export default function App(){
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, justifyContent: 'center' }}>
        <img src={tilingImg} alt="Penrose" style={{ width: 60, height: 60 }} />
        <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Penrose AI</h1>
        <img src={tilingImg} alt="Penrose" style={{ width: 60, height: 60 }} />
      </div>
      <div style={{ color: '#555', marginBottom: 12 }}>Generate beautiful diagrams with GPT-5!</div>
      <PenroseEditor />

      <div style={{ marginTop: 24, padding: '12px 0' }}>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Acknowledgements & Sources</summary>
          <div style={{ marginTop: 10, color: '#555' }}>
            <p style={{ marginTop: 0 }}>
              This app is licensed under the MIT License. Source code: {' '}
              <a href="https://github.com/williamjsdavis/penrose-AI" target="_blank" rel="noreferrer">
                github.com/williamjsdavis/penrose-AI
              </a>
            </p>
            <ul style={{ lineHeight: 1.6 }}>
              <li>
                <strong>Penrose (@penrose/core)</strong> — MIT License —{' '}
                <a href="https://github.com/penrose/penrose" target="_blank" rel="noreferrer">GitHub</a>
              </li>
              <li>
                <strong>PenroseTilingFilled3.svg</strong> — {sources?.penrosetilingfilled3?.licence || 'Public Domain'} —{' '}
                <a href={sources?.penrosetilingfilled3?.url || '#'} target="_blank" rel="noreferrer">Source</a>
              </li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  )
}
