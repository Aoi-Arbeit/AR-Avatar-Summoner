import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type Category = 'face' | 'body' | 'hair' | 'acc_1' | 'acc_2'
type Selection = Record<Category, number> & { color_hex: string }
type CharacterResult = { character_id: string; access_code: string; qr_payload?: string }

const categories: { key: Category; label: string; hint: string }[] = [
  { key: 'face', label: '顔', hint: '表情とフェイスデザイン' },
  { key: 'body', label: 'ボディ', hint: 'キャラクターの体型' },
  { key: 'hair', label: 'ヘアスタイル', hint: '髪型を選択' },
  { key: 'acc_1', label: 'アクセサリー 01', hint: 'ひとつめのアクセサリー' },
  { key: 'acc_2', label: 'アクセサリー 02', hint: 'ふたつめのアクセサリー' },
]
const initial: Selection = { face: 1, body: 1, hair: 1, acc_1: 0, acc_2: 0, color_hex: '#a78bfa' }
const options: Record<Category, { id: number; name: string }[]> = {
  face: [{ id: 1, name: 'ソフト' }, { id: 2, name: 'クール' }, { id: 3, name: 'スマイル' }],
  body: [{ id: 1, name: 'ベーシック' }, { id: 2, name: 'アクティブ' }, { id: 3, name: 'エレガント' }],
  hair: [{ id: 1, name: 'ショート' }, { id: 2, name: 'ミディアム' }, { id: 3, name: 'ロング' }],
  acc_1: [{ id: 0, name: 'なし' }, { id: 1, name: 'キャップ' }, { id: 2, name: 'ヘッドホン' }],
  acc_2: [{ id: 0, name: 'なし' }, { id: 1, name: 'メガネ' }, { id: 2, name: 'イヤリング' }],
}

function Preview({ selection }: { selection: Selection }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectionRef = useRef(selection)
  selectionRef.current = selection

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#17151e')
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 1.25, 5.8)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 1.05, 0)
    controls.minDistance = 3
    controls.maxDistance = 8
    scene.add(new THREE.HemisphereLight(0xe8dcff, 0x332840, 2))
    const keyLight = new THREE.DirectionalLight(0xffe3d1, 3)
    keyLight.position.set(3, 5, 4)
    scene.add(keyLight)
    const fill = new THREE.PointLight(0xa78bfa, 18, 12)
    fill.position.set(-3, 2, 1)
    scene.add(fill)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ color: '#262230' }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.03
    scene.add(floor)

    const avatar = new THREE.Group()
    scene.add(avatar)
    const makeMaterial = (color: string, roughness = 0.72) => new THREE.MeshStandardMaterial({ color, roughness })
    const skin = makeMaterial('#f2c6a5')
    const outfit = makeMaterial('#7c63b8')
    const dark = makeMaterial('#30283a')
    const hairMat = makeMaterial(selectionRef.current.color_hex)
    const addMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z)
      mesh.scale.set(sx, sy, sz)
      avatar.add(mesh)
      return mesh
    }
    // Placeholder avatar keeps the editor usable until GLB assets are supplied.
    addMesh(new THREE.CapsuleGeometry(0.43, 0.82, 8, 16), outfit, 0, 0.78, 0, 1, 1, 0.72)
    addMesh(new THREE.SphereGeometry(0.42, 32, 24), skin, 0, 1.82, 0, 0.92, 1.05, 0.9)
    addMesh(new THREE.SphereGeometry(0.44, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat, 0, 2.03, -0.015, 1.05, 1.05, 1.05)
    if (selectionRef.current.hair === 2) addMesh(new THREE.SphereGeometry(0.16, 20, 16), hairMat, 0.28, 1.7, -0.12, 0.9, 1.8, 0.8)
    if (selectionRef.current.hair === 3) addMesh(new THREE.SphereGeometry(0.18, 20, 16), hairMat, -0.3, 1.55, -0.1, 0.9, 2, 0.8)
    for (const x of [-0.15, 0.15]) addMesh(new THREE.SphereGeometry(0.045, 16, 12), dark, x, 1.83, 0.36)
    addMesh(new THREE.SphereGeometry(0.055, 16, 12), makeMaterial('#e88c91'), 0, 1.68, 0.39, 1.2, 0.45, 0.45)
    addMesh(new THREE.CapsuleGeometry(0.11, 0.48, 4, 10), skin, -0.51, 0.92, 0, 1, 1, 1).rotation.z = -0.45
    addMesh(new THREE.CapsuleGeometry(0.11, 0.48, 4, 10), skin, 0.51, 0.92, 0, 1, 1, 1).rotation.z = 0.45
    addMesh(new THREE.CapsuleGeometry(0.13, 0.48, 4, 10), dark, -0.2, 0.22, 0, 1, 1, 1)
    addMesh(new THREE.CapsuleGeometry(0.13, 0.48, 4, 10), dark, 0.2, 0.22, 0, 1, 1, 1)
    if (selectionRef.current.acc_1 === 1) addMesh(new THREE.CylinderGeometry(0.28, 0.42, 0.08, 32), makeMaterial('#f2a65a'), 0, 2.27, 0)
    if (selectionRef.current.acc_1 === 2) {
      addMesh(new THREE.TorusGeometry(0.55, 0.055, 8, 32), dark, 0, 1.86, -0.03).rotation.x = Math.PI / 2
    }
    if (selectionRef.current.acc_2 === 1) {
      for (const x of [-0.15, 0.15]) addMesh(new THREE.TorusGeometry(0.07, 0.018, 8, 20), dark, x, 1.83, 0.4)
    }
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    let frame = 0
    let animation = 0
    const render = () => {
      frame = requestAnimationFrame(render)
      controls.update()
      avatar.position.y = Math.sin(animation++ * 0.025) * 0.025
      renderer.render(scene, camera)
    }
    render()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
    }
  }, [selection])

  return <canvas ref={canvasRef} className="preview-canvas" aria-label="3D character preview" />
}

function App() {
  const [selection, setSelection] = useState(initial)
  const [name, setName] = useState('')
  const [persona, setPersona] = useState({ personality: '', first_person: 'わたし', speaking_style: '' })
  const [result, setResult] = useState<CharacterResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiMessage, setAiMessage] = useState('')

  const update = (key: keyof Selection, value: number | string) => setSelection((current) => ({ ...current, [key]: value }))
  const save = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch('/api/v1/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'NoName',
          parts_config: {
            face: selection.face,
            body: selection.body,
            hair: selection.hair,
            accessories: [selection.acc_1, selection.acc_2].filter((id) => id > 0),
            hair_color: selection.color_hex,
          },
          agent_persona: persona,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || `保存に失敗しました (${response.status})`)
      if (!data.character_id || !data.access_code) throw new Error('APIレスポンスにキャラクターIDまたはアクセスコードがありません')
      setResult(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存に失敗しました。バックエンドの起動状態を確認してください。')
    } finally {
      setBusy(false)
    }
  }

  const generatePreset = async () => {
    if (!prompt.trim()) return
    setAiBusy(true)
    setAiMessage('')
    try {
      const response = await fetch('/api/v1/agent/generate-preset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: prompt.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || `AI提案を取得できません (${response.status})`)
      const parts = data.parts_config || data
      if (parts.face != null || parts.body != null || parts.hair != null) {
        setSelection((current) => ({ ...current, face: parts.face ?? current.face, body: parts.body ?? current.body, hair: parts.hair ?? current.hair, acc_1: parts.accessories?.[0] ?? 0, acc_2: parts.accessories?.[1] ?? 0, color_hex: parts.hair_color || current.color_hex }))
      }
      if (data.persona) {
        setPersona((current) => ({ ...current, ...data.persona }))
        if (data.persona.character_name) setName(data.persona.character_name)
      }
      setAiMessage('提案をプレビューに反映しました。')
    } catch (cause) {
      setAiMessage(cause instanceof Error ? cause.message : 'AI提案に失敗しました。')
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">A</span><span>AVATAR<span className="brand-light"> / STUDIO</span></span></a>
        <div className="topbar-right"><span className="online-dot" /> CREATOR STUDIO <span className="version">BETA 01</span></div>
      </header>
      <div className="workspace" id="top">
        <section className="intro">
          <div className="eyebrow"><span>01</span> CHARACTER DESIGN</div>
          <h1>Make it<br /><em>your own.</em></h1>
          <p>パーツを組み合わせて、あなただけの相棒をデザインしよう。<br />AR召喚画面は今後対応予定です。</p>
        </section>
        <div className="creator-grid">
          <section className="preview-column">
            <div className="section-heading"><div><span className="step">01 / PREVIEW</span><h2>キャラクタープレビュー</h2></div><span className="drag-hint">DRAG TO ROTATE ↗</span></div>
            <div className="preview-frame"><div className="preview-grid" /><div className="preview-glow" /><Preview selection={selection} /><div className="preview-label"><span className="online-dot" /> LIVE PREVIEW</div><div className="preview-index">FIG. 001</div></div>
            <div className="preview-caption"><span>仮の3Dモデルを表示しています。</span><span>3D VIEWER · 360°</span></div>
            <div className="name-field"><label htmlFor="character-name">CHARACTER NAME</label><input id="character-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={50} placeholder="キャラクターの名前" /></div>
            <div className="persona-card"><div className="persona-title"><span className="sparkle">✳</span><div><strong>キャラクターの個性</strong><small>ARで話すときの性格を設定</small></div></div><label>性格<input value={persona.personality} onChange={(e) => setPersona({ ...persona, personality: e.target.value })} placeholder="例：好奇心旺盛で明るい" /></label><div className="persona-row"><label>一人称<input value={persona.first_person} onChange={(e) => setPersona({ ...persona, first_person: e.target.value })} placeholder="わたし" /></label><label>話し方<input value={persona.speaking_style} onChange={(e) => setPersona({ ...persona, speaking_style: e.target.value })} placeholder="例：語尾に「だよ！」" /></label></div></div>
          </section>
          <section className="editor-column">
            <div className="section-heading"><div><span className="step">02 / CUSTOMIZE</span><h2>パーツをカスタマイズ</h2></div><span className="parts-count">05 PARTS</span></div>
            <div className="ai-card"><div className="ai-card-top"><span className="ai-icon">✳</span><div><strong>AI STYLIST</strong><small>イメージからコーディネートを提案</small></div><span className="ai-tag">BETA</span></div><div className="ai-input-row"><input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void generatePreset() }} placeholder="例：夏っぽくて爽やかな冒険者" /><button onClick={() => void generatePreset()} disabled={aiBusy || !prompt.trim()} aria-label="AIスタイリストに提案を依頼">{aiBusy ? '…' : '↗'}</button></div>{aiMessage && <p className="ai-message">{aiMessage}</p>}</div>
            <div className="parts-list">{categories.map((category, index) => <div className="part-section" key={category.key}><div className="part-title"><span className="part-number">0{index + 1}</span><div><h3>{category.label}</h3><p>{category.hint}</p></div></div><div className="option-row">{options[category.key].map((option) => <button key={option.id} className={`option ${selection[category.key] === option.id ? 'selected' : ''}`} onClick={() => update(category.key, option.id)}><span className={`option-art art-${category.key}-${option.id}`}><span>{category.key === 'face' ? '◡' : category.key === 'body' ? '◇' : category.key === 'hair' ? '〰' : option.id === 0 ? '—' : '✳'}</span></span><span className="option-name">{option.name}</span>{selection[category.key] === option.id && <span className="selected-dot" />}</button>)}</div></div>)}</div>
            <div className="color-control"><div><h3>ヘアカラー</h3><p>キャラクターの印象を彩る</p></div><label className="color-picker"><span className="color-swatch" style={{ backgroundColor: selection.color_hex }} /><input type="color" value={selection.color_hex} onChange={(e) => update('color_hex', e.target.value)} aria-label="ヘアカラーを選択" /><span>{selection.color_hex.toUpperCase()}</span></label></div>
            <div className="save-area"><button className="save-button" onClick={() => void save()} disabled={busy}><span>{busy ? 'キャラクターを保存中…' : 'キャラクターを保存'}</span><span className="save-arrow">↗</span></button><p>保存するとキャラクターIDとアクセスコードが発行されます。</p>{error && <div className="error-message" role="alert">{error}</div>}</div>
          </section>
        </div>
        {result && <section className="result-card" aria-live="polite"><div className="result-heading"><div><span className="step">03 / SUMMON</span><h2>キャラクターが完成しました</h2></div><button className="close-button" onClick={() => setResult(null)} aria-label="閉じる">×</button></div><p>IDとアクセスコードを控えてください。スマートフォン用画面は未実装です。</p><div className="result-details"><div><span>CHARACTER ID</span><strong>{result.character_id}</strong><button onClick={() => void navigator.clipboard?.writeText(result.character_id)}>コピー</button></div><div><span>ACCESS CODE</span><strong className="access-code">{result.access_code}</strong><button onClick={() => void navigator.clipboard?.writeText(result.access_code)}>コピー</button></div></div></section>}
        <footer><span>AVATAR / STUDIO</span><span>CREATE A LITTLE MAGIC.</span></footer>
      </div>
    </main>
  )
}

export default App
