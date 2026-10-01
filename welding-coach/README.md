# 초보 용접 실습 가이드

탄소강 맞대기 이음 실습을 위해 모재 두께에 따른 루트부 개선 참고값과 공정별 패스 전류 범위를 보여주는 웹사이트입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 <http://localhost:3000>을 여세요.

## 지원 공정 및 계산 가정

공정, 판 두께(0.8–20 mm), 용접 자세를 선택할 수 있습니다.

- **SMAW:** E6013, 2.6 / 3.2 / 4.0 mm 전극, DC+ 기준. 전류 범위는 [Weldcote Metals E6013 기술자료](https://www.weldcotemetals.com/dataFiles/specs/teche6013.pdf)의 지름·자세별 제조사 값을 사용합니다.
- **TIG:** 탄소강, DCEN, 아르곤 차폐의 일반적인 교육용 시작 범위입니다.
- **CO₂ 솔리드 GMAW:** ER70S-6, 0.9 mm 와이어, 순수 CO₂를 가정한 교육용 전류·전압 시작 범위입니다.
- **CO₂ 플럭스코어드 FCAW-G:** E71T-1C, 1.2 mm 와이어, CO₂ 차폐를 가정한 교육용 전류·전압 시작 범위입니다.

TIG·GMAW·FCAW 전류·전압 밴드와 패스별 분배는 범용 참고치이지 특정 소모재 제조사의 승인 설정이나 WPS가 아닙니다. CO₂ 솔리드/플럭스코어드 기본 전압 범위는 아래와 같습니다.

| 모재 두께 | 솔리드 ER70S-6 Ø0.9 | FCAW-G E71T-1C Ø1.2 |
| --- | --- | --- |
| ≤2 mm | 16–18 V 참고 | 권장 소모재 아님 |
| 2–3 mm | 17–19 V 참고 | 3 mm 미만 자동 추천 제외 |
| 3–6 mm | 18–22 V 참고 | 22–25 V 참고 |
| 6–12 mm | 22–26 V 참고 | 24–28 V 참고 |
| >12 mm | 24–28 V 참고 | 26–30 V 참고 |

패스별 값은 전체 참고 범위를 루트→충전→캡으로 나눈 교육용 밴드입니다. 특히 솔리드/플럭스코어드 공정에서 암페어는 와이어 송급속도, 전압, 와이어 규격, 가스와 함께 결정됩니다. 화면의 값은 용접기 다이얼에 그대로 넣는 승인 설정값이 아니며, 실제 사용할 와이어 데이터시트와 용접기 작업표를 우선하세요.

## 루트부 개선

화면의 개선각·루트면(root face/land)·루트간격(root gap)은 탄소강 한쪽 V형 맞대기 이음의 연습용 치수입니다. 두께 구간에 따라 사각 맞대기 또는 약 60° 포함각 V 개선의 참고값을 제공합니다. [TWI의 맞대기 이음 설계 자료](https://www.twi-global.com/technical-knowledge/job-knowledge/design-part-3-092)는 루트면, 루트간격, 개선각이 용입과 결함 위험에 영향을 주며 일반적인 맞대기 이음 예시에서 60° 포함각·1–2 mm 간격·0–1.5 mm 루트면을 제시합니다.

실제 치수는 공정, 백킹 유무, 재료, 이음 형상, 용접 위치 및 승인 용접절차(WPS)에 따라 달라집니다. 2 mm 미만 SMAW와 소모재 규격이 맞지 않는 얇은 FCAW 판재는 자동 전류를 제시하지 않도록 제한합니다.

## 초보자 안내

- 루트는 추천 범위의 낮은 쪽에서 시작하고, 충전은 패스 상태를 확인하며 작은 폭으로 조정합니다.
- 캡 패스 전류를 무조건 올리지 않습니다. 비드 폭이나 언더컷을 보며 유지하거나 낮춰 조정합니다.
- 한 번에 한 변수만 바꿔 고철에서 비교하고, 공정 특성에 맞춰 전류·송급속도·전압을 설정합니다.
- 용접면·장갑·환기 등 보호구를 갖추고 지도교사 지시에 따릅니다.

## 참고 링크

- [TWI — Design: butt welds, root face and root gap](https://www.twi-global.com/technical-knowledge/job-knowledge/design-part-3-092)
- [Weldcote Metals — E6013 technical data sheet](https://www.weldcotemetals.com/dataFiles/specs/teche6013.pdf)
- [Miller — TIG Weld Setting Calculator](https://www.millerwelds.com/en-us/resources/weld-setting-calculators/tig-welding-calculator)

이 사이트는 학습용 시작 참고값이며 승인 용접절차, 설계값, 검사 또는 품질 판정을 대신하지 않습니다.

## 기술

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
