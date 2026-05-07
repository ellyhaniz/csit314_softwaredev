from datetime import date

from fastapi import HTTPException

from app.repositories.donation_repository import DonationRepository
from app.repositories.fra_repository import FRARepository
from app.repositories.platform_report_repository import PlatformReportRepository
from app.repositories.user_repository import UserRepository

VALID_PERIODS = {"daily", "weekly", "monthly"}


class ReportService:
    # PM-01: Generate Platform Activity Report
    @staticmethod
    def generate_report(period: str, generated_by: int = None):
        if period not in VALID_PERIODS:
            raise HTTPException(status_code=400, detail="Period must be daily, weekly, or monthly")

        new_fras = FRARepository.get_new_count(period)
        total_donations = DonationRepository.get_total_donations(period)
        active_users = UserRepository.get_active_count(period)
        new_users = UserRepository.get_new_count(period)

        data = {
            "period": period,
            "report_date": date.today().isoformat(),
            "new_fras": new_fras,
            "total_donations": total_donations,
            "active_users": active_users,
            "new_users": new_users,
            "generated_by": generated_by,
        }

        report = PlatformReportRepository.create(data)
        return {"message": "Report generated", "report": report}

    @staticmethod
    def get_report(report_id: int):
        report = PlatformReportRepository.get_by_id(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return report
