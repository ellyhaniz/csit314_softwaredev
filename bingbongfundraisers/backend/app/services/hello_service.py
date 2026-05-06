from app.repositories.hello_repository import HelloRepository


class HelloService:
    @staticmethod
    def health_payload():
        return {"status": "ok", "service": "backend"}

    @staticmethod
    def get_count_payload():
        return {"count": HelloRepository.get_count()}

    @staticmethod
    def increment_count_payload():
        return {"count": HelloRepository.increment_count()}
