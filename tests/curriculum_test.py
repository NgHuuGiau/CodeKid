"""Check authored reference programs against every seed test. No learner code is read."""
import json
from pathlib import Path
import subprocess
import sys
import unittest

LESSONS = json.loads((Path(__file__).resolve().parents[1] / "backend/CodeKid.Api/seed/python.json").read_text(encoding="utf-8"))
SOLUTIONS = [
    'print("Xin chào CodeKid")',
    'print("Hello World")',
    'name = "CodeKid"\nprint(name)',
    'name = input()\nprint("Xin chào", name)',
    'a = int(input())\nb = int(input())\nprint(a + b)',
    'n = int(input())\nprint("CHAN" if n % 2 == 0 else "LE")',
    'n = int(input())\nfor i in range(1, n+1):\n    print(i)',
    'n = int(input())\nwhile n > 0:\n    print(n)\n    n -= 1',
    'numbers = list(map(int, input().split()))\nprint(sum(numbers))',
    'def square(n):\n    return n * n\nn = int(input())\nprint(square(n))',
    'text = input().strip()\nprint(text.upper())\nprint(len(text))',
    'numbers = list(map(int, input().split()))\nprint(sum(n for n in numbers if n % 2 == 0))',
]


class CurriculumTests(unittest.TestCase):
    def test_each_lesson_has_a_specific_goal_and_stepwise_explanation(self):
        self.assertEqual(len({lesson["objectives"] for lesson in LESSONS}), len(LESSONS))
        self.assertTrue(all("\n" in lesson["explanation"] for lesson in LESSONS))

    def test_all_authored_programs_match_seed_test_cases(self):
        self.assertEqual(len(LESSONS), len(SOLUTIONS))
        for lesson, source in zip(LESSONS, SOLUTIONS):
            for case in lesson["tests"]:
                with self.subTest(lesson=lesson["title"], input=case["input"]):
                    result = subprocess.run([sys.executable, "-I", "-X", "utf8", "-c", source], input=case["input"], capture_output=True, text=True, timeout=2, encoding="utf-8")
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(result.stdout, case["expected"])


if __name__ == "__main__":
    unittest.main()
