"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

from django.test import TestCase
from portal.sms import Sms
import pprint


class SimpleTest(TestCase):
    def test_basic_addition(self):
        """
        Tests that 1 + 1 always equals 2.
        """
        self.assertEqual(1 + 1, 2)

class SmsTests(TestCase):
    test_cases = []
    length = 100

    def __init__(self, dummy):
        self.test_cases = [
            # (input, expected number of pages)
            ("abcdefghij" * 5, 1),
            ("abcdefghij" * 50, 6),
            ("abcdefghij\n" * 20, 3),
            ("abcdefghij " * 20, 3),
            ("abcde fghij\n" * 20, 3),
            ("abcdefghij" * 9 + "\n" + "klmnopqrst" * 10 + "\n" + "uvwxyz " * 20, 4)
        ]
        super(TestCase, self).__init__(dummy)

    def test_pagination(self):
        for t in self.test_cases:
            pages = Sms.paginate(t[0], SmsTests.length)
            #print(t[0])
            pprint.pprint(pages)
            print("\n")
            self.assertEqual(len(pages), t[1])
            for page in pages:
                self.assertLessEqual(len(page), SmsTests.length)

        
