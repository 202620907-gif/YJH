"use client";

import { useState } from "react";

type ProcessId = "smaw" | "tig" | "gmawSolid" | "fcaw";
type Position = "flat" | "verticalOverhead";
type AmpRange = [number, number];
type PassSetting = { label: string; amps: AmpRange; volts?: AmpRange };

const PROCESS_INFO: Record<
  ProcessId,
  {
    name: string;
    subtitle: string;
    setup: string;
    control: string;
    passControl: string;
  }
> = {
  smaw: {
    name: "피복아크 · SMAW",
    subtitle: "탄소강용 일반 루틸계 피복전극",
    setup: "E6013 전극 · 2.6 / 3.2 / 4.0 mm · DC+ 기준",
    control: "용접기 전류(A)를 직접 설정합니다.",
    passControl: "루트는 범위 하단에서 시작하고 충전에서 5–10A 올려 비교하세요. 캡은 같은 값 또는 5–10A 낮게 조절합니다.",
  },
  tig: {
    name: "티그 · TIG",
    subtitle: "탄소강 · 직류 정극성(DCEN) 기준",
    setup: "아르곤 차폐 · 텅스텐 2.4 mm · 용가봉 사용 기준",
    control: "페달 또는 토치 스위치로 열 입력을 조절합니다.",
    passControl: "루트는 페달을 낮게 시작해 용입을 확인하세요. 충전은 조금 더 열을 주고, 캡은 페달을 낮춰 폭을 다듬습니다.",
  },
  gmawSolid: {
    name: "CO₂ 솔리드와이어",
    subtitle: "가스메탈아크 · GMAW",
    setup: "ER70S-6 솔리드와이어 0.9 mm · 순수 CO₂ 기준",
    control: "전류는 주로 와이어 송급속도로 바뀌며, 전압도 함께 맞춥니다.",
    passControl: "루트는 WFS/전압 조합의 낮은 쪽에서 시작하세요. 충전은 WFS를 조금씩 올리고 전압은 장비표로 맞춥니다. 표시 암페어를 단독으로 설정하는 공정이 아닙니다.",
  },
  fcaw: {
    name: "CO₂ 플럭스코어드와이어",
    subtitle: "가스실드 플럭스코어드 · FCAW-G",
    setup: "E71T-1C 플럭스코어드와이어 1.2 mm · CO₂ 기준",
    control: "전압은 용접기에서 설정하고, 전류는 주로 와이어 송급속도로 바뀝니다.",
    passControl: "루트는 제품별 절차의 낮은 송급 범위에서 시작하세요. 충전은 송급량을 조정하고, 매 패스 사이 슬래그를 제거합니다.",
  },
};

const PROCESS_OPTIONS: { id: ProcessId; icon: string }[] = [
  { id: "smaw", icon: "⚡" },
  { id: "tig", icon: "〰️" },
  { id: "gmawSolid", icon: "🔩" },
  { id: "fcaw", icon: "🧵" },
];

const SMAW_CURRENTS: Record<
  string,
  Record<Position, AmpRange>
> = {
  "2.6 mm": { flat: [60, 90], verticalOverhead: [50, 80] },
  "3.2 mm": { flat: [100, 120], verticalOverhead: [80, 110] },
  "4.0 mm": { flat: [110, 160], verticalOverhead: [100, 150] },
};

function roundToFive(value: number) {
  return Math.round(value / 5) * 5;
}

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function scaleRange(range: AmpRange, factor: number): AmpRange {
  return [roundToFive(range[0] * factor), roundToFive(range[1] * factor)];
}

function getBaseCurrent(
  process: ProcessId,
  thickness: number,
  position: Position
): {
  range: AmpRange | null;
  voltageRange?: AmpRange;
  consumable: string;
  note: string;
} {
  if (process === "smaw") {
    if (thickness < 2) {
      return {
        range: null,
        consumable: "",
        note: "2 mm 미만은 SMAW 자동 추천 제외",
      };
    }
    const consumable = thickness <= 3 ? "2.6 mm" : thickness <= 6 ? "3.2 mm" : "4.0 mm";
    return {
      range: SMAW_CURRENTS[consumable][position],
      consumable: `E6013 ${consumable}`,
      note: "제조사 E6013 전류표의 전극 지름·자세별 범위",
    };
  }

  let range: AmpRange;
  let voltageRange: AmpRange | undefined;
  let consumable: string;
  let note: string;

  if (process === "tig") {
    consumable = "DCEN · 아르곤";
    note = "탄소강 TIG 교육용 시작 범위";
    if (thickness <= 2) range = [30, 60];
    else if (thickness <= 3) range = [50, 90];
    else if (thickness <= 6) range = [80, 140];
    else if (thickness <= 12) range = [120, 180];
    else range = [160, 220];
  } else if (process === "gmawSolid") {
    consumable = "ER70S-6 · Ø0.9 mm";
    note = "순수 CO₂ 솔리드와이어 교육용 시작 범위";
    if (thickness <= 2) {
      range = [50, 100];
      voltageRange = [16, 18];
    } else if (thickness <= 3) {
      range = [80, 130];
      voltageRange = [17, 19];
    } else if (thickness <= 6) {
      range = [100, 180];
      voltageRange = [18, 22];
    } else if (thickness <= 12) {
      range = [150, 220];
      voltageRange = [22, 26];
    } else {
      range = [180, 260];
      voltageRange = [24, 28];
    }
  } else {
    consumable = "E71T-1C · Ø1.2 mm";
    note = "CO₂ 가스실드 플럭스코어드 교육용 시작 범위";
    if (thickness < 3) {
      return {
        range: null,
        consumable,
        note: "얇은 판재에는 Ø1.2 mm FCAW 와이어를 권장하지 않음",
      };
    }
    if (thickness <= 6) {
      range = [120, 180];
      voltageRange = [22, 25];
    } else if (thickness <= 12) {
      range = [160, 240];
      voltageRange = [24, 28];
    } else {
      range = [200, 280];
      voltageRange = [26, 30];
    }
  }

  if (position === "verticalOverhead") {
    range = scaleRange(range, 0.9);
    if (voltageRange) {
      voltageRange = [
        roundToHalf(voltageRange[0] - 1),
        roundToHalf(voltageRange[1] - 1),
      ];
    }
    note += " · 수직/위보기는 낮은 열입력 참고값";
  }

  return { range, voltageRange, consumable, note };
}

function getJointPrep(thickness: number) {
  if (thickness <= 3) {
    return {
      bevel: "개선 없음 · 사각 맞대기",
      rootFace: "가공하지 않음 (판 두께 유지)",
      rootGap: "0–1 mm 참고",
      note: "얇은 판재는 개선 가공보다 변형·용락 방지가 중요해요.",
      passCount: "1",
    };
  }
  if (thickness <= 6) {
    return {
      bevel: "포함각 약 60° (양쪽 각도 약 30°)",
      rootFace: "1–1.5 mm",
      rootGap: "1–2 mm",
      note: "한쪽 V 개선 맞대기 연습용 기준입니다.",
      passCount: "2–3",
    };
  }
  if (thickness <= 12) {
    return {
      bevel: "포함각 약 60° (양쪽 각도 약 30°)",
      rootFace: "1–1.5 mm",
      rootGap: "1.5–2.5 mm",
      note: "루트 용입을 확인하고 필요한 경우 패스 수를 늘리세요.",
      passCount: "4",
    };
  }
  return {
    bevel: "포함각 약 60–70° 또는 양면 개선",
    rootFace: "1.5–2 mm",
    rootGap: "2–3 mm",
    note: "두꺼운 판재는 다층·다층간 청소가 필요해요. 가능하면 양면 개선도 검토하세요.",
    passCount: "4+",
  };
}

function getPassSchedule(
  range: AmpRange,
  thickness: number,
  voltageRange?: AmpRange
): PassSetting[] {
  const [min, max] = range;
  const span = max - min;
  const ampBand = (from: number, to: number): AmpRange => [
    roundToFive(min + span * from),
    roundToFive(min + span * to),
  ];
  const voltageBand = (from: number, to: number): AmpRange | undefined => {
    if (!voltageRange) return undefined;
    const voltageSpan = voltageRange[1] - voltageRange[0];
    return [
      roundToHalf(voltageRange[0] + voltageSpan * from),
      roundToHalf(voltageRange[0] + voltageSpan * to),
    ];
  };
  const pass = (label: string, from: number, to: number): PassSetting => ({
    label,
    amps: ampBand(from, to),
    volts: voltageBand(from, to),
  });

  if (thickness <= 3) return [{ label: "단일 패스", amps: range, volts: voltageRange }];
  if (thickness <= 6) {
    return [
      pass("루트 패스", 0, 0.35),
      pass("본용접 1차", 0.2, 0.65),
      pass("본용접 2차 · 캡", 0.25, 0.65),
    ];
  }
  return [
    pass("루트 패스", 0, 0.3),
    pass("본용접 1차", 0.2, 0.5),
    pass("본용접 2차", 0.4, 0.8),
    pass("본용접 3차 · 캡", 0.25, 0.65),
  ];
}

function JointDiagram({ squareEdge }: { squareEdge: boolean }) {
  const left = squareEdge ? 135 : 126;
  const right = squareEdge ? 165 : 174;
  return (
    <svg
      viewBox="0 0 300 150"
      role="img"
      aria-label="한쪽 V 개선 맞대기 이음의 개선각, 루트면, 루트간격 설명도"
      className="h-auto w-full"
    >
      <path
        d={
          squareEdge
            ? "M20 20H135V112H20Z M280 20H165V112H280Z"
            : "M20 20H106L126 77V112H20Z M280 20H194L174 77V112H280Z"
        }
        fill="#e4e4e7"
        stroke="#71717a"
        strokeWidth="3"
      />
      <path d={squareEdge ? "M135 20H165V112H135Z" : "M129 77H171V112H129Z"} fill="#fb923c" opacity="0.9" />
      {!squareEdge && (
        <>
          <path d="M106 20L126 77M194 20L174 77" stroke="#f97316" strokeWidth="3" />
          <path d="M126 77V112M174 77V112" stroke="#52525b" strokeWidth="3" />
          <text x="150" y="36" textAnchor="middle" fill="#c2410c" fontSize="10">개선각</text>
        </>
      )}
      <path d={`M${left} 124H${right}M${left} 120V128M${right} 120V128`} stroke="#0f766e" strokeWidth="2" />
      <path d={squareEdge ? "M130 20V112" : "M119 77V112M115 77H123M115 112H123"} stroke="#52525b" strokeWidth="2" />
      <text x="150" y="143" textAnchor="middle" fill="#0f766e" fontSize="10">루트간격</text>
      <text x={squareEdge ? "88" : "98"} y="99" textAnchor="middle" fill="#52525b" fontSize="9">루트면</text>
    </svg>
  );
}

const QUICK_THICKNESSES = [2, 3.2, 6, 10];

export default function Home() {
  const [thicknessInput, setThicknessInput] = useState("6");
  const [process, setProcess] = useState<ProcessId>("smaw");
  const [position, setPosition] = useState<Position>("flat");
  const thickness = Number(thicknessInput);
  const valid = Number.isFinite(thickness) && thickness >= 0.8 && thickness <= 20;
  const processInfo = PROCESS_INFO[process];
  const current = valid ? getBaseCurrent(process, thickness, position) : null;
  const prep = valid ? getJointPrep(thickness) : null;
  const passes = current?.range
    ? getPassSchedule(current.range, thickness, current.voltageRange)
    : [];

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-zinc-900 dark:bg-[#111315] dark:text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl text-white shadow-sm">
              ⚡
            </span>
            <span>
              <span className="block text-sm font-bold tracking-wide">WELDING GUIDE</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">초보 용접 실습 도우미</span>
            </span>
          </div>
          <span className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            탄소강 · 맞대기 이음
          </span>
        </header>

        <section className="py-9 text-center sm:py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
            Joint Prep &amp; Pass Planner
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            두께에 맞춰 개선하고,
            <br className="hidden sm:block" /> 패스별 전류를 계획해요
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
            모재 두께와 용접 공정을 고르면 루트면·루트간격 참고값과 루트부터 캡까지의
            전류 시작 범위를 보여줍니다.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">1. 조건 선택</h2>
              <span className="text-xs text-zinc-400">실습 기준 설정</span>
            </div>

            <label className="mt-5 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              용접 공정
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PROCESS_OPTIONS.map(({ id, icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={process === id}
                  onClick={() => setProcess(id)}
                  className={`rounded-2xl border p-3 text-left transition-colors ${
                    process === id
                      ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100 dark:bg-orange-950/30 dark:ring-orange-950"
                      : "border-zinc-200 hover:border-orange-300 dark:border-zinc-700"
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  <span className="mt-1 block text-sm font-semibold">{PROCESS_INFO[id].name}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                    {PROCESS_INFO[id].setup.split(" · ")[0]}
                  </span>
                </button>
              ))}
            </div>

            <label htmlFor="thickness" className="mt-6 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              모재 두께 (탄소강)
            </label>
            <div className="mt-2 flex items-center rounded-2xl border border-zinc-200 px-4 py-3 focus-within:border-orange-400 dark:border-zinc-700">
              <input
                id="thickness"
                type="number"
                min="0.8"
                max="20"
                step="0.1"
                value={thicknessInput}
                onChange={(event) => setThicknessInput(event.target.value)}
                className="w-full bg-transparent text-3xl font-bold tabular-nums outline-none"
              />
              <span className="text-sm text-zinc-400">mm</span>
            </div>
            <input
              aria-label="두께 조절"
              type="range"
              min="0.8"
              max="20"
              step="0.1"
              value={valid ? thickness : 0.8}
              onChange={(event) => setThicknessInput(event.target.value)}
              className="mt-4 w-full accent-orange-500"
            />
            <div className="flex justify-between text-[11px] text-zinc-400"><span>0.8 mm</span><span>20 mm</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_THICKNESSES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setThicknessInput(String(value))}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:border-orange-400 dark:border-zinc-700"
                >
                  {value} mm
                </button>
              ))}
            </div>

            <label htmlFor="position" className="mt-6 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              용접 자세
            </label>
            <select
              id="position"
              value={position}
              onChange={(event) => setPosition(event.target.value as Position)}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="flat">아래보기 · 수평 (F)</option>
              <option value="verticalOverhead">수직 · 위보기 (V / OH)</option>
            </select>
          </div>

          <div className="rounded-3xl bg-[#202528] p-5 text-white shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">Recommended Setup</p>
                <h2 className="mt-1 text-xl font-bold">{processInfo.name}</h2>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300">{valid ? `${thickness} mm` : "두께 확인"}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">{processInfo.subtitle}</p>

            {current?.range ? (
              <>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-zinc-400">기준 소모재</p>
                      <p className="mt-1 text-lg font-bold">{current.consumable}</p>
                    </div>
                    <p className="text-xs text-zinc-400">{position === "flat" ? "아래보기/수평" : "수직/위보기"}</p>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-zinc-400">{current.note}</p>
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tabular-nums sm:text-6xl">{current.range[0]}–{current.range[1]}</span>
                  <span className="text-xl font-semibold text-orange-300">A</span>
                  <span className="ml-auto text-xs text-zinc-400">전체 참고 범위</span>
                </div>
                {current.voltageRange && (
                  <div className="mt-2 flex items-baseline gap-2 rounded-xl border border-orange-300/20 bg-orange-300/10 px-3 py-2">
                    <span className="text-xs text-orange-100">전체 전압 참고 범위</span>
                    <span className="ml-auto text-lg font-bold tabular-nums text-orange-200">
                      {current.voltageRange[0]}–{current.voltageRange[1]} V
                    </span>
                  </div>
                )}

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      {current.voltageRange ? "패스별 전류·전압 시작 범위" : "패스별 전류 시작 범위"}
                    </h3>
                    <span className="text-[11px] text-zinc-400">
                      {current.voltageRange ? "A / V · 참고값" : "A · 시작 참고값"}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {passes.map((pass, index) => (
                      <div key={pass.label} className="rounded-xl bg-white/8 p-3">
                        <p className="text-xs text-zinc-400"><span className="mr-1 text-orange-300">0{index + 1}</span>{pass.label}</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{pass.amps[0]}–{pass.amps[1]} <span className="text-sm font-medium text-orange-300">A</span></p>
                        {pass.volts && (
                          <p className="mt-1 text-sm font-semibold tabular-nums text-sky-200">
                            전압 {pass.volts[0]}–{pass.volts[1]} V
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-4 rounded-xl border border-orange-300/20 bg-orange-300/10 p-3 text-xs leading-5 text-orange-100">
                  {processInfo.control} {processInfo.passControl}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-zinc-400">
                  패스별 밴드는 전체 참고 범위 안에서 분배한 교육용 시작값이며, 승인된 WPS의 패스별 설정값은 아닙니다.
                </p>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                {!valid
                  ? "두께를 0.8–20 mm 사이로 입력해 주세요."
                  : process === "smaw"
                    ? "2 mm 미만은 SMAW로 쉽게 용락될 수 있어 일반 전류를 추천하지 않아요. TIG 등 적합한 공법을 지도교사와 확인하세요."
                    : "이 두께에는 선택한 소모재 지름이 너무 클 수 있어요. 더 작은 와이어 규격과 제조사 자료를 확인하세요."}
              </div>
            )}
            <p className="mt-4 text-[11px] leading-5 text-zinc-400">
              {process === "smaw"
                ? "SMAW 범위는 Weldcote E6013 제조사 전류표를 반영합니다."
                : "TIG·GMAW·FCAW는 교육용 일반 시작 범위이며 제품별 WPS/소모재 표를 우선하세요."}
            </p>
          </div>
        </section>

        {prep && (
          <section className="mt-6 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Joint Preparation</p>
                  <h2 className="mt-1 text-xl font-bold">2. 루트부 개선 참고</h2>
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-800">맞대기 이음</span>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  ["개선각", prep.bevel],
                  ["루트면 (Root face)", prep.rootFace],
                  ["루트간격 (Root gap)", prep.rootGap],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</p>
                    <p className="mt-1 text-sm font-semibold leading-5">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{prep.note}</p>
              <p className="mt-2 text-xs font-medium text-orange-700 dark:text-orange-300">예상 패스 수: 약 {prep.passCount}회부터 확인</p>
            </article>

            <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
              <h2 className="text-xl font-bold">루트면과 루트간격, 어디를 재나요?</h2>
              <div className="mt-4 grid items-center gap-4 sm:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/70">
                  <JointDiagram squareEdge={thickness <= 3} />
                </div>
                <ul className="space-y-3 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                  <li><strong className="text-zinc-900 dark:text-white">개선각:</strong> 두 판 가장자리를 비스듬히 깎아 만든 홈의 각도예요. 표시값은 양쪽을 합친 포함각입니다.</li>
                  <li><strong className="text-zinc-900 dark:text-white">루트면:</strong> 개선 끝에 남겨두는 평평한 두께(land)예요. 너무 두꺼우면 루트 용입이 어려울 수 있어요.</li>
                  <li><strong className="text-zinc-900 dark:text-white">루트간격:</strong> 맞댄 두 판 사이의 틈이에요. 너무 좁으면 용입이 부족하고, 너무 넓으면 용락될 수 있어요.</li>
                </ul>
              </div>
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                위 치수는 탄소강 한쪽 V형 맞대기 이음의 연습용 참고값입니다. 실제 치수는 공정, 이음 형식, 뒷면 접근/백킹 유무, 재료 규격과 WPS에 따라 달라집니다.
              </p>
            </article>
          </section>
        )}

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Beginner Steps</p>
            <h2 className="mt-1 text-xl font-bold">패스 전류, 이렇게 조절해요</h2>
            <ol className="mt-5 space-y-3">
              {[
                ["루트", "용락을 피하면서 루트가 붙도록 전체 범위의 낮은 쪽에서 시작해요."],
                ["본용접 1차", "루트 상태가 양호하면 5–10A 올리거나 권장 밴드 안에서 송급량을 조금 높여요."],
                ["본용접 2·3차", "패스가 깊고 좁으면 조금 올리고, 비드가 넓거나 모서리가 파이면 낮춰요."],
                ["마지막 캡", "전류를 무조건 올리지 않아요. 같은 값 또는 5–10A 낮게 시작해 비드 폭을 조절해요."],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">{index + 1}</span>
                  <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{description}</p></div>
                </li>
              ))}
            </ol>
          </article>

          <article className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Process Notes</p>
            <h2 className="mt-1 text-xl font-bold">공정마다 조절하는 방식이 달라요</h2>
            <div className="mt-4 space-y-2 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
              <p><strong className="text-zinc-900 dark:text-white">SMAW:</strong> 전류를 직접 설정해요. E6013도 지름·자세·제조사에 따라 범위가 달라요.</p>
              <p><strong className="text-zinc-900 dark:text-white">TIG:</strong> 페달로 열을 조절하고, 토치 속도·용가봉 투입이 전류만큼 중요해요.</p>
              <p><strong className="text-zinc-900 dark:text-white">솔리드/FCAW:</strong> 암페어 숫자를 직접 다이얼로 정하기보다 와이어 송급속도와 전압으로 작업점을 맞춰요. CO₂, 와이어 지름, 극성을 해당 제품 자료와 대조하세요.</p>
            </div>
            <div className="mt-4 rounded-xl bg-sky-50 p-4 text-xs leading-5 text-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              전극이 붙고 아크가 끊기면 전류/송급이 낮을 수 있어요. 스패터가 과하거나 언더컷이 생기면 높은 열입력이나 진행 속도·아크 길이도 함께 점검하세요. 한 번에 한 조건만 바꿔 고철에서 비교합니다.
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/60 dark:bg-orange-950/20 sm:p-6">
          <h2 className="font-bold">안전·적용 범위</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            이 계산기는 탄소강 평판 맞대기 이음을 위한 학습용 시작값이며, 구조물·압력용기·배관의 승인 용접절차(WPS)를 대체하지 않습니다. 용접면·장갑·환기를 갖추고, 실습장에서는 지도교사 지시에 따르세요. 루트면을 과도하게 얇게 남기거나 넓은 루트간격을 임의로 적용하지 마세요.
          </p>
        </section>

        <footer className="mt-6 rounded-2xl bg-zinc-100 px-5 py-4 text-xs leading-6 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <strong className="text-zinc-800 dark:text-zinc-200">참고 자료</strong>
          <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
            <li><a className="underline underline-offset-2 hover:text-orange-600" href="https://www.twi-global.com/technical-knowledge/job-knowledge/design-part-3-092" target="_blank" rel="noreferrer">TWI · 맞대기 이음/루트면 설계 참고</a></li>
            <li><a className="underline underline-offset-2 hover:text-orange-600" href="https://www.weldcotemetals.com/dataFiles/specs/teche6013.pdf" target="_blank" rel="noreferrer">Weldcote Metals · E6013 전류표</a></li>
            <li><a className="underline underline-offset-2 hover:text-orange-600" href="https://www.millerwelds.com/en-us/resources/weld-setting-calculators/tig-welding-calculator" target="_blank" rel="noreferrer">Miller · TIG 설정 계산기</a></li>
          </ul>
          <p className="mt-2">TIG·GMAW·FCAW의 숫자와 패스별 분배는 특정 제조사 WPS가 아닌 교육용 초기 추정치입니다. 실제 전극·와이어의 데이터시트와 승인 절차를 우선하세요.</p>
        </footer>
      </div>
    </main>
  );
}
