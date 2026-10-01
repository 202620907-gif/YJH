# ⚡ 용접 피드백 코치 (Welding Feedback Coach)

고등학교 용접 실습생을 위한 **용접 사진 AI 분석·피드백 웹사이트**입니다.
실습한 용접 비드 사진(TIG / 아크 / CO2)을 스마트폰으로 올리면, 결함·원인·개선 방법을 피드백으로 받을 수 있습니다.

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 📷 사진 업로드 | 스마트폰 카메라 직접 촬영 / 앨범 선택 / 드래그앤드롭 지원 |
| 🏷️ 공법 선택 | TIG · 아크(SMAW) · CO2(GMAW) + 재질·자세·메모(선택) |
| 🤖 AI 분석 | 결함 추정(언더컷, 오버랩, 기공, 스패터, 비드 불균일, 크랙, 탄 착색, 아크 스트라이크) + 원인 + 구체적 개선 방법 |
| 📊 점수·등급 | 100점 만점 점수 게이지와 A~F 등급, 총평 제공 |
| 📂 실습 기록 | 분석 결과를 브라우저(localStorage)에 저장해 성장 추이 확인 |
| 📱 모바일 최적화 | 실습실 스마트폰 기준 모바일 퍼스트 UI |

## 프로젝트 구조

```
welding-feedback/
├── backend/
│   ├── main.py                  # FastAPI 서버 (API + 프론트엔드 정적 서빙)
│   ├── schemas.py               # 응답 데이터 모델 (Pydantic)
│   ├── analyzers/
│   │   ├── mock_analyzer.py     # Mock 분석기 (이미지 통계 + 용접 결함 지식 베이스)
│   │   └── openai_analyzer.py   # OpenAI Vision API 연동 뼈대
│   ├── requirements.txt
│   └── .env.example             # 환경변수 예시 (ANALYZER_PROVIDER, OPENAI_API_KEY ...)
└── frontend/
    ├── index.html               # 메인 페이지 (Tailwind CSS)
    ├── css/style.css            # 커스텀 스타일·애니메이션
    └── js/app.js                # 업로드 → 분석 → 결과 렌더링 로직
```

## 실행 방법

### 1. 백엔드 설치 및 실행 (Python 3.10+)

```powershell
cd welding-feedback\backend

# 가상환경 생성 (최초 1회)
python -m venv .venv
.venv\Scripts\activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --reload --port 8000
```

서버가 실행되면 브라우저에서 접속:

- **웹앱**: http://localhost:8000
- **API 문서(Swagger)**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/api/health

> 스마트폰에서 접속하려면 PC와 같은 Wi-Fi에서 `http://<PC의 IP주소>:8000` 으로 접속하세요.
> (`ipconfig`로 PC IP 확인 가능. 방화벽에서 8000 포트 허용 필요)

### 2. (선택) OpenAI Vision API로 실제 AI 분석하기

기본값은 인터넷·API 키 없이 동작하는 **Mock 분석기**입니다.
실제 Vision 모델로 분석하려면:

1. `backend/.env.example`을 `backend/.env`로 복사
2. 아래처럼 수정:

```env
ANALYZER_PROVIDER=openai
OPENAI_API_KEY=sk-실제키
OPENAI_MODEL=gpt-4o-mini
```

3. 서버 재시작. OpenAI 호출 실패 시 자동으로 Mock 분석기로 대체됩니다.

## API 명세

### `POST /api/analyze`

multipart/form-data:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `file` | File | 용접 사진 (JPG/PNG/WEBP, 10MB 이하) |
| `process` | string | `TIG` / `SMAW` / `GMAW` (기본 TIG) |
| `material` | string | 모재 (선택) |
| `position` | string | 용접 자세 (선택) |
| `memo` | string | 학생 메모 (선택) |

응답 예시:

```json
{
  "score": 77,
  "grade": "C",
  "summary": "GMAW 용접 사진을 분석했습니다. ...",
  "defects": [
    {
      "name": "언더컷 (Undercut)",
      "severity": "보통",
      "description": "비드 가장자리의 모재가 파인 홈이 관찰됩니다. ...",
      "causes": ["전압이 높거나 와이어 송급 속도가 낮음", "..."],
      "fixes": ["전류를 10~15A 낮추고 ...", "..."]
    }
  ],
  "tips": ["[언더컷] 전류를 10~15A 낮추고 ..."],
  "process": "GMAW",
  "analyzer": "mock"
}
```

### `GET /api/health`

`{"status": "ok", "provider": "mock" | "openai"}`

## Mock 분석기의 동작 원리

인증·API 키 없이 데모가 가능하도록, 업로드된 이미지에서 다음 통계를 계산해
용접 결함 지식 베이스와 조합합니다.

- 이미지 밝기 → 탄 착색·그을음 가능성
- 엣지(윤곽) 강도 → 스패터·비드 불균일 가능성
- 이미지 해시 기반 시드 → 같은 사진이면 항상 같은 결과(재현성)
- 공법(TIG/SMAW/GMAW)에 맞는 원인·개선책 제시

> ⚠️ Mock 분석기는 교육용 데모이며 실제 결함을 판별하지 않습니다.
> 실제 판별은 `ANALYZER_PROVIDER=openai`로 전환하거나, 자체 학습 모델을 연동하도록
> `analyzers/` 아래에 새 분석기를 추가하면 됩니다.

## 확장 가이드

- **자체 이미지 분류 모델 연동**: `analyzers/`에 새 클래스를 만들고 `main.py`의 `get_analyzer()`에 프로바이더를 추가하세요.
- **결함 지식 베이스 보강**: `analyzers/mock_analyzer.py`의 `DEFECT_LIBRARY`에 결함·원인·개선법을 추가하면 UI에 자동 반영됩니다.
- **결과 공유/저장 서버화**: 현재 기록은 브라우저 localStorage에만 저장됩니다. DB 연동 시 `schemas.py` 모델을 그대로 활용할 수 있습니다.
