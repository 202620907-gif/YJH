import base64
import json
import os

from openai import OpenAI

SYSTEM_PROMPT = """당신은 20년 경력의 용접 기술사이자 고등학교 용접 실습 지도 교사입니다.
학생이 업로드한 용접 비드 사진을 분석하고, 반드시 아래 JSON 형식으로만 답변하세요.

{
  "score": 0에서 100 사이 정수,
  "grade": "A", "B", "C", "D", "F" 중 하나,
  "summary": "총평 2~3문장. 잘한 점을 먼저 언급",
  "defects": [
    {
      "name": "결함명 (예: 언더컷)",
      "severity": "심각 | 보통 | 경미 중 하나",
      "description": "사진에서 관찰된 특징 1~2문장",
      "causes": ["원인1", "원인2"],
      "fixes": ["구체적인 개선 방법1", "구체적인 개선 방법2"]
    }
  ],
  "tips": ["다음 실습에서 바로 적용할 팁 2~4개"]
}

규칙:
- 고등학생 눈높이에 맞춰 쉬운 표현을 사용하고, 전문용어는 괄호에 영어를 병기하세요.
- 확인 대상 결함: 언더컷, 오버랩, 기공(기포), 스패터, 비드 불균일, 크랙(균열), 탄 착색/그을음, 아크 스트라이크, 불완전 용입.
- 사진이 흐리거나 판단이 어려우면 defects에 name "판단 보류" 항목을 넣고 이유를 description에 적으세요.
- 결함이 없으면 defects는 빈 배열로 하고 score는 90 이상으로 하세요.
- JSON 이외의 텍스트를 절대 출력하지 마세요."""

SEVERITY_TABLE = [(90, "A"), (80, "B"), (70, "C"), (60, "D"), (0, "F")]


class OpenAIAnalyzer:
    name = "openai"

    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def analyze(self, image_bytes: bytes, process: str, material: str, position: str, memo: str) -> dict:
        content_type = "image/jpeg"
        data_url = f"data:{content_type};base64,{base64.b64encode(image_bytes).decode()}"

        user_text = (
            f"용접 공법: {process}\n"
            f"모재: {material or '미입력'}\n"
            f"용접 자세: {position or '미입력'}\n"
            f"학생 메모: {memo or '없음'}\n"
            "위 조건을 참고해 사진을 분석하세요."
        )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
            response_format={"type": "json_object"},
            max_tokens=1500,
        )

        result = json.loads(response.choices[0].message.content)
        score = int(result.get("score", 0))
        result["score"] = max(0, min(100, score))
        if not result.get("grade"):
            result["grade"] = next(g for threshold, g in SEVERITY_TABLE if score >= threshold)
        result["process"] = process
        result["analyzer"] = self.name
        return result
