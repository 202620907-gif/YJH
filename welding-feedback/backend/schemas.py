from typing import List

from pydantic import BaseModel


class Defect(BaseModel):
    name: str
    severity: str
    description: str
    causes: List[str]
    fixes: List[str]


class AnalysisResult(BaseModel):
    score: int
    grade: str
    summary: str
    defects: List[Defect]
    tips: List[str]
    process: str
    analyzer: str
