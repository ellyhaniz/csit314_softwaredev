from app.services.report_service import ReportService


class GenerateReportController:
    @staticmethod
    def generate_report(start_date: str, end_date: str, generated_by: int = None):
        return ReportService.generate_report(start_date, end_date, generated_by)

    @staticmethod
    def get_report(report_id: int):
        return ReportService.get_report(report_id)
