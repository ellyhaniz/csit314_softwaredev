from app.services.hello_service import HelloService


class HelloController:
    @staticmethod
    def health():
        return HelloService.health_payload()

    @staticmethod
    def get_hello_count():
        return HelloService.get_count_payload()

    @staticmethod
    def click_hello():
        return HelloService.increment_count_payload()
