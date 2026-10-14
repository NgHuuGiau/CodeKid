import unittest
from server import normalize, valid_job


class ValidationTests(unittest.TestCase):
    def test_jobs_reject_wrong_types_and_resource_overflow(self):
        self.assertTrue(valid_job({"code": "print(1)", "tests": [{"input": "", "expected": "1\n"}]}))
        for value in [None, {}, {"code": "x" * 12001, "tests": []}, {"code": "x", "tests": [{}]}, {"code": "x", "tests": [{"input": 7, "expected": ""}]}]:
            self.assertFalse(valid_job(value))

    def test_output_comparison_preserves_spaces_and_blank_lines(self):
        self.assertEqual(normalize("1\r\n"), normalize("1"))
        self.assertNotEqual(normalize("1 \n"), normalize("1\n"))
        self.assertNotEqual(normalize("\n0\n"), normalize("0\n"))


if __name__ == "__main__":
    unittest.main()
