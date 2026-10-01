import { GoogleGenAI, Type } from "@google/genai";
import type { WeldAnalysis } from "@/lib/types";

const MODEL = "gemini-2.5-flash";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    totalScore: { type: Type.NUMBER },
    summary: { type: Type.STRING },
    defects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          severity: { type: Type.STRING },
          location: { type: Type.STRING },
          cause: { type: Type.STRING },
          fix: { type: Type.STRING },
        },
        required: ["name", "severity", "location", "cause", "fix"],
      },
    },
    appearance: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING },
          evaluation: { type: Type.STRING },
          tip: { type: Type.STRING },
        },
        required: ["item", "evaluation", "tip"],
      },
    },
    nextPractice: { type: Type.STRING },
  },
  required: [
    "totalScore",
    "summary",
    "defects",
    "appearance",
    "nextPractice",
  ],
} as const;

const prompt = `당신은 고등학교 용접 실습을 지도하는 베테랑 용접 기술자입니다.
학생이 올린 용접 작품 사진을 보고 아래 기준으로 진단해 주세요.

[확인할 결함 목록]
- 언더컷(모재가 파인 홈), 오버랩(용착금이 모재에 흘러붙음), 스패터(주변에 튄 금속 방울)
- 비드 불량(비드의 직선성, 폭 균일성, 물결 무늬 리플 상태)
- 탄 착색 / 그을음(soot), 표면 산화 변색
- 기공(표면 기포), 크랙(균열), 아크 스트라이크(틱 자국)
- 불완전 용입·융합이 의심되는 모양 (사진상 판단 가능한 경우)

[평가 규칙]
- totalScore: 0~100점. 고등학생 실습 기준으로 후하게 평가하되 결함이 많으면 낮게. 90 이상은 거의 완벽한 작품.
- summary: 전체 총평 2~3문장. 잘한 점을 먼저 언급할 것.
- defects: 보이는 결함만 나열. 사진에서 확인되지 않는 결함을 지어내지 말 것. 결함이 없으면 빈 배열.
  - severity는 반드시 "심각", "보통", "경미" 중 하나.
  - location: "비드 오른쪽 끝부분"처럼 사진에서 찾기 쉬운 위치로.
  - cause: 고등학생 수준의 원인 설명 (전류/속도/각도/거리 등).
  - fix: 다음 실습에서 바로 적용할 구체적인 방법.
- appearance: 비드 균일성, 표면 상태, 착색, 전체 마감 등 3~5개 항목을 항목별로 평가.
- nextPractice: 다음 실습 때 딱 하나 가장 먼저 고칠 것 한 가지.

용접 방식: {process}
모재: {material}

모든 설명은 고등학생이 이해하기 쉬운 한국어로 작성하세요.`;

function createDemoAnalysis(): WeldAnalysis & { demoMode: true } {
  return {
    demoMode: true,
    totalScore: 0,
    summary:
      "Gemini에 연결되지 않아 업로드한 사진은 실제로 분석하지 않았어요. 아래는 화면 확인용 일반 실습 안내이며, 사진의 점수나 결함 판정이 아닙니다.",
    defects: [],
    appearance: [
      {
        item: "비드 균일성",
        evaluation: "사진 분석을 하지 않았어요.",
        tip: "비드 폭과 물결 간격이 일정한지 직접 확인해 보세요.",
      },
      {
        item: "표면 상태",
        evaluation: "사진 분석을 하지 않았어요.",
        tip: "기공, 스패터, 언더컷이 보이는지 살펴보세요.",
      },
      {
        item: "다음 연습",
        evaluation: "일반 실습 안내",
        tip: "토치 또는 전극의 각도와 이동 속도를 일정하게 유지해 보세요.",
      },
    ],
    nextPractice:
      "실제 사진 분석을 사용하려면 Gemini API 키를 설정해야 해요. 지금은 비드의 폭과 이동 속도를 일정하게 유지하는 연습을 해 보세요.",
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "사진을 업로드해 주세요." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json(
      { error: "이미지 파일만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }
  if (file.size > 15 * 1024 * 1024) {
    return Response.json(
      { error: "파일이 너무 큽니다. 15MB 이하 이미지를 사용해 주세요." },
      { status: 400 }
    );
  }

  const weldProcess = String(form.get("process") || "미지정");
  const material = String(form.get("material") || "미지정");

  if (!apiKey) {
    return Response.json(createDemoAnalysis());
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: file.type, data: base64 } },
            {
              text: prompt
                .replace("{process}", weldProcess)
                .replace("{material}", material),
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.3,
      },
    });

    const text = response.text ?? "";
    const analysis = JSON.parse(text) as WeldAnalysis;
    return Response.json(analysis);
  } catch (err) {
    console.warn("Gemini analysis unavailable; returning demo guidance.", err);
    return Response.json(createDemoAnalysis());
  }
}
