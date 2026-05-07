from app.services.report_service import ReportService


class GenerateReportController:
    @staticmethod
    def generate_report(period: str, generated_by: int = None):
        return ReportService.generate_report(period, generated_by)

    @staticmethod
    def get_report(report_id: int):
        return ReportService.get_report(report_id)
