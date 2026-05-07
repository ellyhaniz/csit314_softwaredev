class HelloRepository:
    _count = 0

    @classmethod
    def get_count(cls):
        return cls._count

    @classmethod
    def increment_count(cls):
        cls._count += 1
        return cls._count
