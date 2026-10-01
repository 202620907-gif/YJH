export type DefectSeverity = "심각" | "보통" | "경미";

export type Defect = {
  name: string;
  severity: DefectSeverity;
  location: string;
  cause: string;
  fix: string;
};

export type AppearanceItem = {
  item: string;
  evaluation: string;
  tip: string;
};

export type WeldAnalysis = {
  totalScore: number;
  summary: string;
  defects: Defect[];
  appearance: AppearanceItem[];
  nextPractice: string;
};

export type AnalysisRecord = {
  id: string;
  created_at: string;
  image_url: string | null;
  weld_process: string | null;
  material: string | null;
  total_score: number | null;
  summary: string | null;
  defects: Defect[] | null;
  appearance: AppearanceItem[] | null;
  next_practice: string | null;
};
