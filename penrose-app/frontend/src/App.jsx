import React from 'react'
import './App.css'
import PenroseEditor from './PenroseEditor'
import tilingImg from './assets/penrosetilingfilled3.png'

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
    </div>
  )
}
