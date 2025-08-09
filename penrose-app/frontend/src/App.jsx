import React from 'react'
import './App.css'
import PenroseEditor from './PenroseEditor'

export default function App(){
  return (
    <div>
      <h1>Penrose AI</h1>
      <div style={{ color: '#555', marginBottom: 12 }}>Generate beautiful diagrams with GPT-5!</div>
      <PenroseEditor />
    </div>
  )
}
