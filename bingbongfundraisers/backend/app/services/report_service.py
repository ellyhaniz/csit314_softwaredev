from datetime import date

from fastapi import HTTPException

from app.repositories.donation_repository import DonationRepository
from app.repositories.fra_repository import FRARepository
from app.repositories.platform_report_repository import PlatformReportRepository
from app.repositories.user_repository import UserRepository


class ReportService:
    # PM-01: Generate Platform Activity Report
    @staticmethod
    def generate_report(start_date: str, end_date: str, generated_by: int = None):
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="start_date and end_date are required")
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="start_date must be before end_date")

        new_fras = FRARepository.get_new_count(start_date, end_date)
        total_donations = DonationRepository.get_total_donations(start_date, end_date)
        active_users = UserRepository.get_active_count(start_date, end_date)
        new_users = UserRepository.get_new_count(start_date, end_date)

        data = {
            "period": f"{start_date} to {end_date}",
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
