def pytest_runtest_call(item):
    doc = getattr(item.function, "__doc__", None)
    if doc:
        print(f"\n  WHAT IS BEING TESTED: {doc.strip()}")
