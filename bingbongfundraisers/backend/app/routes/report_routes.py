from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.controllers.report_controller import GenerateReportController

router = APIRouter(prefix="/api/reports", tags=["Platform Reports"])


class GenerateReportRequest(BaseModel):
    period: str
    generated_by: Optional[int] = None


# PM-01: Generate Report
@router.post("", summary="PM-01: Generate Platform Activity Report")
def generate_report(body: GenerateReportRequest):
    return GenerateReportController.generate_report(body.period, body.generated_by)


@router.get("/{report_id}", summary="PM-01: Get Report")
def get_report(report_id: int):
    return GenerateReportController.get_report(report_id)
