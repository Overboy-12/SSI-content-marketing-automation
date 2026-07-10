const SYSTEM_PROMPT = `너는 17아워즈 화장품 브랜드의 숏폼 광고 영상 기획 전문 AI다.
사용자가 전달한 레퍼런스 영상 프레임을 시간순으로 처음부터 끝까지 확인하고 실제 구조를 먼저 분석한다.

절대 규칙:
1. 레퍼런스의 제품이나 대사를 복제하지 말고 훅→전개→근거→클로징 구조만 추출한다.
2. 영상에서 실제로 확인되지 않은 장면·대사·편집 방식을 지어내지 않는다.
3. 제품 자료와 필수 제품 사실에 없는 효능·수치·시험 결과를 생성하지 않는다.
4. 영상이 정상적으로 확인되지 않거나 프레임만으로 구조 판단이 불가능하면 result에 기획안을 쓰지 말고 error에 재업로드 요청을 작성한다.
5. 타깃은 제품이 필요한 구체적인 상황과 고민으로 설정한다.
6. 메인 셀링포인트는 소비자가 얻는 결과 중심으로 단 하나만 선정한다.
7. 레퍼런스의 실제 형식이 추천템형이면 추천템형, 실험형이면 실험형, 팁 리스트형이면 팁 리스트형으로 적용한다.
8. 각 장면에는 시간, 화면, 대사 또는 자막을 짧게 작성한다.
9. 불필요하게 길게 쓰지 않는다.

출력 형식:
[래퍼런스 특징 및 좋은 부분]
1~2줄

[광고 영상 기획안]
Step 1. 타겟 설정
- 핵심 타겟
- 타겟의 구체적인 상황
- 타겟의 핵심 고민
Step 2. 셀링포인트 선정
- 메인 셀링포인트
- 핵심 메시지
Step 3. 레퍼런스 구조 분석 및 17아워즈화
- 레퍼런스 구조
- 17아워즈 적용
Step 4. 스크립트·스토리보드
- 훅
- 전개
- 제품 핵심 장면
- 클로징`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      apiKey?: string;
      product?: { name: string; facts: string[] };
      videoName?: string;
      frames?: { image: string; time: number }[];
      productFiles?: { name: string; data: string }[];
      transcript?: string;
    };
    if (!body.apiKey || !body.product || !body.frames || body.frames.length < 6) return Response.json({ error: "영상 프레임을 충분히 확인하지 못했습니다. 영상을 다시 업로드해 주세요." }, { status: 400 });

    const content: Record<string, unknown>[] = [{ type: "input_text", text: `제품명: ${body.product.name}\n필수 제품 사실:\n- ${body.product.facts.join("\n- ")}\n영상 파일명: ${body.videoName || "reference video"}\n${body.transcript ? `영상 대사/내레이션:\n${body.transcript}` : "별도 대사 원문 없음. 화면에 보이는 자막만 근거로 판단할 것."}\n\n아래 이미지는 영상에서 시간순으로 추출한 프레임이다. 각 프레임 앞 시간표시를 기준으로 실제 전개 순서를 분석하라.` }];
    for (const frame of body.frames) {
      content.push({ type: "input_text", text: `[${frame.time.toFixed(1)}초 프레임]` });
      content.push({ type: "input_image", image_url: frame.image, detail: "high" });
    }
    for (const file of body.productFiles || []) content.push({ type: "input_file", filename: file.name, file_data: file.data });

    const apiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${body.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6",
        instructions: SYSTEM_PROMPT,
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "reference_plan", strict: true, schema: { type: "object", additionalProperties: false, properties: { referenceSummary: { type: "string" }, result: { type: "string" }, error: { type: "string" } }, required: ["referenceSummary", "result", "error"] } } },
      }),
    });
    const raw = await apiResponse.json() as Record<string, unknown>;
    if (!apiResponse.ok) {
      const apiError = raw.error as { message?: string } | undefined;
      return Response.json({ error: apiError?.message || "OpenAI API 요청에 실패했습니다." }, { status: apiResponse.status });
    }
    const output = raw.output as { type?: string; content?: { type?: string; text?: string }[] }[] | undefined;
    const text = output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!text) return Response.json({ error: "AI 응답에서 기획안을 확인하지 못했습니다." }, { status: 502 });
    const parsed = JSON.parse(text) as { referenceSummary: string; result: string; error: string };
    if (parsed.error || !parsed.result) return Response.json({ error: parsed.error || "영상 분석 결과가 충분하지 않습니다. 다른 영상으로 다시 시도해 주세요." }, { status: 422 });
    return Response.json({ referenceSummary: parsed.referenceSummary, result: parsed.result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
