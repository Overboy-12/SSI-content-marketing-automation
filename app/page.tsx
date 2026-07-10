"use client";

import { ChangeEvent, useState } from "react";

type Material = { file: File; name: string; size: number };

const products = {
  speedy: {
    name: "스피디 버블 마스크",
    facts: [
      "펌핑할 때부터 버블 형태로 토출된다.",
      "얼굴에서 새롭게 버블이 생성되거나 올라오는 제품이 아니다.",
      "버블을 얼굴에 바른 뒤 부드럽게 흡수시켜 사용한다.",
      "핵심 소구는 화장 전 10초 만에 피부를 촉촉하고 매끄럽게 정돈하는 고광채 루틴이다.",
      "버블 토출 방식 자체를 메인 셀링포인트로 설정하지 않는다.",
    ],
  },
  melting: { name: "멜팅 에어 버블 클렌저", facts: ["부드러운 버블 세안", "본품 160ml", "미니 34ml"] },
  needle: { name: "니들샷 부스터 에센스", facts: ["피부 고민별 7종", "제품별 상세 자료에서 확인된 표현만 사용"] },
};

const stages = ["제품 사실 확인", "영상 프레임 추출", "레퍼런스 구조 분석", "타깃·셀링포인트 선정", "17아워즈화", "스토리보드 작성"];

function formatSize(size: number) {
  return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(size / 1024)}KB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`${file.name} 파일을 읽지 못했습니다.`));
    reader.readAsDataURL(file);
  });
}

async function captureFrames(file: File, count = 16): Promise<{ image: string; time: number }[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("영상이 정상적으로 확인되지 않습니다. MP4 또는 MOV 파일로 다시 업로드해 주세요."));
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error("영상 길이를 확인할 수 없습니다. 영상을 다시 업로드해 주세요.");
    const canvas = document.createElement("canvas");
    const ratio = Math.min(1, 960 / Math.max(video.videoWidth, 1));
    canvas.width = Math.max(320, Math.round(video.videoWidth * ratio));
    canvas.height = Math.max(180, Math.round(video.videoHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("영상 프레임을 처리할 수 없습니다.");
    const frameCount = Math.min(count, Math.max(8, Math.ceil(video.duration / 2)));
    const frames: { image: string; time: number }[] = [];
    for (let i = 0; i < frameCount; i++) {
      const time = Math.min(video.duration - 0.05, (video.duration * i) / Math.max(frameCount - 1, 1));
      video.currentTime = Math.max(0, time);
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("영상 프레임 확인 시간이 초과되었습니다. 영상을 다시 업로드해 주세요.")), 8000);
        video.onseeked = () => { window.clearTimeout(timer); resolve(); };
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ image: canvas.toDataURL("image/jpeg", 0.72), time: Math.round(time * 10) / 10 });
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function Home() {
  const [productKey, setProductKey] = useState<keyof typeof products>("speedy");
  const [video, setVideo] = useState<File | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transcript, setTranscript] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [activeStage, setActiveStage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [referenceSummary, setReferenceSummary] = useState("");
  const [error, setError] = useState("");
  const product = products[productKey];

  function pickVideo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) return setError("MP4, MOV 등 영상 파일을 업로드해 주세요.");
    if (file.size > 500 * 1024 * 1024) return setError("영상은 500MB 이하만 업로드할 수 있습니다.");
    setVideo(file); setResult(""); setReferenceSummary(""); setError("");
  }

  function pickMaterials(files: FileList | null) {
    if (!files) return;
    const allowed = Array.from(files).filter((file) => file.size <= 10 * 1024 * 1024);
    setMaterials((current) => [...current, ...allowed.map((file) => ({ file, name: file.name, size: file.size }))].slice(0, 5));
  }

  async function generate() {
    if (!video) return setError("먼저 분석할 레퍼런스 영상을 업로드해 주세요.");
    if (!apiKey.trim().startsWith("sk-")) return setError("OpenAI API 키를 입력해 주세요. 키는 저장되지 않고 이번 분석에만 사용됩니다.");
    setIsGenerating(true); setError(""); setResult(""); setReferenceSummary("");
    try {
      setActiveStage(0);
      const productFiles = await Promise.all(materials.map(async ({ file, name }) => ({ name, data: await fileToDataUrl(file) })));
      setActiveStage(1);
      const frames = await captureFrames(video, 16);
      setActiveStage(2);
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), product, videoName: video.name, frames, productFiles, transcript: transcript.trim() }),
      });
      const data = await response.json() as { result?: string; referenceSummary?: string; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error || "기획안 생성에 실패했습니다.");
      setActiveStage(5); setReferenceSummary(data.referenceSummary || ""); setResult(data.result);
      setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
    } finally { setIsGenerating(false); }
  }

  async function copyResult() { await navigator.clipboard.writeText(result); }

  return <main>
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><i/><i/><i/><i/></span><span>SSI CONTENT STUDIO</span></a><nav><span className="ai-badge">실제 AI 분석</span><span className="avatar">17</span></nav></header>
    <div className="shell" id="top">
      <section className="intro"><p className="eyebrow">17HOURS · REFERENCE-BASED AD PLANNER</p><h1>레퍼런스를 분석해 광고 기획으로</h1><p>영상의 실제 훅과 전개 구조를 먼저 분석한 뒤, 검증된 제품 사실에 맞춰 17아워즈 광고 기획안으로 재구성합니다.</p></section>

      <section className="analysis-notice"><b>분석 원칙</b><span>영상 구조를 그대로 읽고, 제품·대사·내용은 복제하지 않습니다.</span><span>영상 확인 실패 시 임의로 작성하지 않습니다.</span><span>제품 자료에 없는 효능은 생성하지 않습니다.</span></section>

      <div className="workspace">
        <section className="input-panel">
          <article className="input-card">
            <div className="card-title"><span>1</span><h2>레퍼런스 영상</h2></div>
            <label className="dropzone"><input type="file" accept="video/mp4,video/quicktime,video/*" onChange={(e:ChangeEvent<HTMLInputElement>)=>pickVideo(e.target.files)}/><strong>↑</strong><b>{video ? "다른 영상으로 변경" : "영상 파일을 올려주세요"}</b><small>처음부터 끝까지 8~16개 구간을 분석합니다.</small></label>
            {video && <div className="file-row"><span className="file-icon video-icon">▶</span><div><b>{video.name}</b><small>{formatSize(video.size)} · 분석 준비 완료</small></div><button onClick={()=>setVideo(null)}>×</button></div>}
            <textarea className="transcript" value={transcript} onChange={(e)=>setTranscript(e.target.value)} placeholder="선택사항: 영상 대사·내레이션을 붙여넣으면 대사 구조까지 더 정확하게 분석합니다."/>
          </article>

          <article className="input-card product-card">
            <div className="card-title"><span>2</span><h2>제품 선택</h2></div>
            <select value={productKey} onChange={(e)=>setProductKey(e.target.value as keyof typeof products)}>{Object.entries(products).map(([key,p])=><option key={key} value={key}>{p.name}</option>)}</select>
            <div className="product-info"><p className="info-label">◇ 반드시 지켜야 할 제품 사실</p><ul>{product.facts.map((fact)=><li key={fact}>{fact}</li>)}</ul></div>
          </article>

          <article className="input-card">
            <div className="card-title"><span>3</span><h2>제품 근거 자료</h2></div>
            <label className="dropzone compact"><input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={(e)=>pickMaterials(e.target.files)}/><strong>↥</strong><b>상세페이지·가이드·시험자료</b><small>파일당 10MB · 최대 5개</small></label>
            <div className="material-list">{materials.length===0&&<p className="empty">자료가 없으면 등록된 필수 사실만 사용합니다.</p>}{materials.map((item,index)=><div className="file-row mini" key={`${item.name}-${index}`}><span className="file-icon">DOC</span><div><b>{item.name}</b><small>{formatSize(item.size)}</small></div><button onClick={()=>setMaterials((m)=>m.filter((_,i)=>i!==index))}>×</button></div>)}</div>
          </article>

          <div className="key-box"><label htmlFor="api-key">OpenAI API 키</label><input id="api-key" type="password" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} placeholder="sk-…" autoComplete="off"/><small>브라우저에 저장하지 않으며, 이번 분석 요청에만 사용합니다.</small></div>
          <button className="generate" disabled={isGenerating} onClick={generate}><span>✣</span>{isGenerating ? `${stages[activeStage]} 중…` : "레퍼런스 기반 기획안 생성"}</button>
          {error&&<p className="notice error" role="alert">{error}</p>}
        </section>

        <aside className="stage-panel"><div className="stage-head"><span>ACTUAL ANALYSIS</span><b>{isGenerating?`${activeStage+1}/6`:result?"완료":"대기"}</b></div>{stages.map((title,index)=><div className={`stage ${isGenerating&&index===activeStage?"active":""} ${result||isGenerating&&index<activeStage?"complete":""}`} key={title}><span className="stage-number">{result||isGenerating&&index<activeStage?"✓":index+1}</span><div><b>{title}</b><p>{index===2?"훅·순서·노출·자막·편집 장치를 추출합니다.":index===4?"구조만 남기고 제품에 맞게 새로 구성합니다.":"근거를 확인하며 다음 단계로 진행합니다."}</p></div></div>)}</aside>
      </div>

      {result&&<section className="result" id="result"><div className="result-head"><div><span>REFERENCE-GROUNDED PLAN</span><h2>{product.name} 광고 영상 기획안</h2></div><button onClick={copyResult}>전체 복사</button></div>{referenceSummary&&<div className="reference-proof"><b>AI가 확인한 레퍼런스 구조</b><p>{referenceSummary}</p></div>}<pre>{result}</pre><p className="fact-note">제품 자료와 등록된 필수 사실을 근거로 생성되었습니다. 광고 집행 전 최종 표현 검수는 별도로 진행해 주세요.</p></section>}
    </div>
  </main>;
}
