"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";

type UploadFile = { name: string; size: number; type: string };

const products = {
  speedy: {
    name: "스피디 버블 마스크",
    category: "마스크",
    line: "스피디",
    facts: [
      "펌핑할 때부터 버블 형태로 토출",
      "얼굴에서 버블이 새롭게 생성되는 제품이 아님",
      "버블을 얼굴에 바른 뒤 부드럽게 흡수",
      "화장 전 10초 고광채 루틴",
    ],
  },
  melting: {
    name: "멜팅 에어 버블 클렌저",
    category: "클렌저",
    line: "멜팅 에어",
    facts: ["부드러운 버블 세안", "본품 160ml", "미니 34ml"],
  },
  needle: {
    name: "니들샷 부스터 에센스",
    category: "부스터 에센스",
    line: "프로17H",
    facts: ["피부 고민별 7종", "사용 전 제품별 자료 확인 필수"],
  },
};

const stages = [
  ["제품 확인", "등록된 제품 사실과 광고 표현을 확인합니다."],
  ["영상 분석", "훅·전개·제품 노출·편집 구조를 분석합니다."],
  ["타깃 설정", "제품이 필요한 구체적인 상황을 설정합니다."],
  ["셀링포인트", "소비자 결과 중심의 메시지 하나를 선정합니다."],
  ["17아워즈화", "구조만 추출해 브랜드 콘텐츠로 재구성합니다."],
  ["스토리보드", "시간·화면·대사·자막을 완성합니다."],
];

const sampleOutput = `[래퍼런스 특징 및 좋은 부분]\n초반에 화장 들뜸이라는 문제를 즉시 보여준 뒤, 실사용 비교 장면으로 해결 근거를 제시해 짧은 시간 안에 제품 필요성을 설득하는 구조입니다.\n\n[광고 영상 기획안]\nStep 1. 타겟 설정\n- 핵심 타겟: 아침 메이크업이 자주 들뜨는 20~30대 여성\n- 타겟의 구체적인 상황: 출근 준비 시간이 촉박해 시트팩을 할 여유는 없지만 베이스가 매끄럽게 밀착되길 원하는 상황\n- 타겟의 핵심 고민: 건조하고 거친 피부결 때문에 쿠션이 들뜨고 밀리는 것\n\nStep 2. 셀링포인트 선정\n- 메인 셀링포인트: 화장 전 10초 만에 피부를 촉촉하고 매끄럽게 정돈하는 고광채 루틴\n- 핵심 메시지: 팩 할 시간 없는 아침, 10초 버블 루틴으로 화잘먹 피부 완성\n\nStep 3. 레퍼런스 구조 분석 및 17아워즈화\n- 레퍼런스 구조: 문제를 보여주는 훅 → 짧은 해결 팁 → 사용 장면 → 전후 비교 → 제품 제안\n- 17아워즈 적용: 베이스 들뜸을 먼저 보여주고 스피디 버블 마스크 사용 전후의 쿠션 밀착 차이를 같은 조건에서 비교\n\nStep 4. 스크립트·스토리보드\n- 훅 (0–3초) 화면: 코 옆에 들뜬 쿠션을 초근접 촬영 / 자막: “아침마다 베이스가 뜬다면?”\n- 전개 (3–7초) 화면: 펌핑 즉시 버블 형태로 나오는 제품을 얼굴에 도포 / 대사: “팩 할 시간 없어도 10초면 돼요.”\n- 제품 핵심 장면 (7–12초) 화면: 버블을 부드럽게 흡수시킨 뒤 양쪽 피부에 같은 쿠션을 바르고 밀착력 비교 / 자막: “촉촉하고 매끄럽게 피부 정돈”\n- 클로징 (12–15초) 화면: 완성된 메이크업과 제품 클로즈업 / 자막: “화장 전 10초, 스피디 버블 마스크”`;

function formatSize(size: number) {
  return size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.ceil(size / 1024)}KB`;
}

export default function Home() {
  const [productKey, setProductKey] = useState<keyof typeof products>("speedy");
  const [video, setVideo] = useState<UploadFile | null>(null);
  const [materials, setMaterials] = useState<UploadFile[]>([]);
  const [activeStage, setActiveStage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState<"video" | "materials" | null>(null);
  const product = products[productKey];

  const recent = useMemo(() => [
    { title: "스피디 버블 마스크 숏폼 광고 기획", product: "스피디 버블 마스크", status: "분석 완료", time: "오늘 14:25" },
    { title: "니들샷 추천템형 광고 기획", product: "니들샷 부스터 에센스", status: "임시 저장", time: "어제 09:40" },
  ], []);

  function pickVideo(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) return setNotice("MP4, MOV 등 영상 파일을 업로드해 주세요.");
    setVideo({ name: file.name, size: file.size, type: file.type });
    setNotice("");
  }

  function pickMaterials(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).map((file) => ({ name: file.name, size: file.size, type: file.type }));
    setMaterials((current) => [...current, ...added].slice(0, 8));
  }

  function drop(e: DragEvent<HTMLLabelElement>, kind: "video" | "materials") {
    e.preventDefault();
    setDragging(null);
    if (kind === "video") pickVideo(e.dataTransfer.files);
    else pickMaterials(e.dataTransfer.files);
  }

  async function generate() {
    if (!video) return setNotice("먼저 분석할 레퍼런스 영상을 업로드해 주세요.");
    setNotice("");
    setResult("");
    setIsGenerating(true);
    for (let i = 0; i < stages.length; i++) {
      setActiveStage(i);
      await new Promise((resolve) => setTimeout(resolve, 430));
    }
    setResult(sampleOutput);
    setIsGenerating(false);
    setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }), 80);
  }

  async function copyResult() {
    await navigator.clipboard.writeText(result);
    setNotice("기획안을 클립보드에 복사했습니다.");
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="SSI Content Studio 홈">
          <span className="brand-mark"><i /><i /><i /><i /></span>
          <span>SSI CONTENT STUDIO</span>
        </a>
        <nav>
          <button className="nav-button">프로젝트 ▾</button>
          <button className="nav-button">히스토리</button>
          <span className="avatar">17</span>
        </nav>
      </header>

      <div className="shell" id="top">
        <section className="intro">
          <p className="eyebrow">17HOURS · SHORT-FORM AD PLANNER</p>
          <h1>레퍼런스로 시작하는 광고 기획</h1>
          <p>레퍼런스 영상과 검증된 제품 정보를 기반으로, 17아워즈만의 숏폼 광고 기획안을 빠르게 생성해보세요.</p>
        </section>

        <div className="workspace">
          <section className="input-panel" aria-label="기획안 입력">
            <article className="input-card">
              <div className="card-title"><span>1</span><h2>레퍼런스 영상</h2></div>
              <label
                className={`dropzone ${dragging === "video" ? "dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging("video"); }}
                onDragLeave={() => setDragging(null)}
                onDrop={(e) => drop(e, "video")}
              >
                <input type="file" accept="video/*" onChange={(e: ChangeEvent<HTMLInputElement>) => pickVideo(e.target.files)} />
                <strong>↑</strong><b>영상 파일을 올려주세요</b><small>MP4, MOV · 최대 500MB</small>
              </label>
              {video && <div className="file-row"><span className="file-icon video-icon">▶</span><div><b>{video.name}</b><small>{formatSize(video.size)} · 분석 준비 완료</small></div><button onClick={() => setVideo(null)} aria-label="영상 삭제">×</button></div>}
            </article>

            <article className="input-card product-card">
              <div className="card-title"><span>2</span><h2>제품 선택</h2></div>
              <select value={productKey} onChange={(e) => setProductKey(e.target.value as keyof typeof products)} aria-label="제품 선택">
                {Object.entries(products).map(([key, value]) => <option value={key} key={key}>{value.name}</option>)}
              </select>
              <div className="product-info">
                <p className="info-label">◇ 검증된 제품 정보</p>
                <dl><div><dt>카테고리</dt><dd>{product.category}</dd></div><div><dt>라인</dt><dd>{product.line}</dd></div></dl>
                <ul>{product.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
              </div>
            </article>

            <article className="input-card">
              <div className="card-title"><span>3</span><h2>제품 자료</h2></div>
              <label
                className={`dropzone compact ${dragging === "materials" ? "dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging("materials"); }}
                onDragLeave={() => setDragging(null)}
                onDrop={(e) => drop(e, "materials")}
              >
                <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={(e) => pickMaterials(e.target.files)} />
                <strong>↥</strong><b>제품 자료 추가</b><small>PDF, PPT, DOC</small>
              </label>
              <div className="material-list">
                {materials.length === 0 && <p className="empty">등록된 제품 정보를 우선 사용합니다.</p>}
                {materials.map((file, index) => <div className="file-row mini" key={`${file.name}-${index}`}><span className="file-icon">DOC</span><div><b>{file.name}</b><small>{formatSize(file.size)}</small></div><button onClick={() => setMaterials((m) => m.filter((_, i) => i !== index))}>×</button></div>)}
              </div>
            </article>

            <button className="generate" disabled={isGenerating} onClick={generate}>
              <span>{isGenerating ? "✦" : "✣"}</span>{isGenerating ? `${activeStage + 1}단계 분석 중…` : "기획안 생성하기"}
            </button>
            {notice && <p className="notice" role="status">{notice}</p>}
          </section>

          <aside className="stage-panel" aria-label="AI 분석 단계">
            <div className="stage-head"><span>AI WORKFLOW</span><b>{isGenerating ? `${activeStage + 1}/6` : result ? "완료" : "준비"}</b></div>
            {stages.map(([title, description], index) => {
              const active = isGenerating ? index === activeStage : result ? true : index === 0;
              const complete = result || (isGenerating && index < activeStage);
              return <div className={`stage ${active ? "active" : ""} ${complete ? "complete" : ""}`} key={title}>
                <span className="stage-number">{complete ? "✓" : index + 1}</span>
                <div><b>{title}</b><p>{description}</p></div>
              </div>;
            })}
          </aside>
        </div>

        {result && <section className="result" id="result">
          <div className="result-head"><div><span>GENERATED PLAN</span><h2>{product.name} 숏폼 광고 기획안</h2></div><button onClick={copyResult}>기획안 복사</button></div>
          <pre>{result}</pre>
          <p className="fact-note">※ 업로드한 영상 원본을 서버에서 실제 분석하는 AI 연동 전의 화면 검증용 결과입니다. 제품 자료에 없는 내용은 최종 생성 시 사용하지 않도록 설계됩니다.</p>
        </section>}

        <section className="recent">
          <div className="section-title"><h2>최근 프로젝트</h2><button>전체 보기 →</button></div>
          <div className="recent-table">
            <div className="table-row table-head"><span>프로젝트명</span><span>제품</span><span>상태</span><span>최근 수정</span></div>
            {recent.map((item) => <button className="table-row" key={item.title}><span><i>▣</i>{item.title}</span><span>{item.product}</span><span><em>{item.status}</em></span><span>{item.time}</span></button>)}
          </div>
        </section>
      </div>
    </main>
  );
}
