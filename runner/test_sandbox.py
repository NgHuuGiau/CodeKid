"""Run only inside the Linux runner image with access to a dedicated Docker engine."""
import unittest
from server import run_case


class SandboxTests(unittest.TestCase):
    def test_correct_and_alternative_programs(self):
        for code in ['a=int(input()); b=int(input()); print(a+b)', 'print(sum([int(input()), int(input())]))']:
            self.assertTrue(run_case(code, {"input": "2\n3\n", "expected": "5\n"})["passed"])

    def test_syntax_error_and_wrong_answer(self):
        self.assertFalse(run_case('print(7)', {"input": "", "expected": "5\n"})["passed"])
        self.assertIn("SyntaxError", run_case('print(', {"input": "", "expected": ""})["error"])

    def test_timeout_and_output_limit(self):
        self.assertTrue(run_case('while True: pass', {"input": "", "expected": ""})["error"])
        self.assertIn("8 KB", run_case('while True: print("x" * 1000)', {"input": "", "expected": ""})["error"])

    def test_network_and_root_filesystem_are_blocked(self):
        network = 'import socket\nsocket.create_connection(("1.1.1.1", 80), timeout=1)'
        filesystem = 'open("/not-allowed.txt", "w").write("test")'
        self.assertTrue(run_case(network, {"input": "", "expected": ""})["error"])
        self.assertTrue(run_case(filesystem, {"input": "", "expected": ""})["error"])


if __name__ == "__main__":
    unittest.main()
