# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

from django.test import TestCase
from portal.sms import Sms
from portal.admin import LocationForm
from django import forms
import pprint


class SimpleTest(TestCase):
    def test_basic_addition(self):
        """
        Tests that 1 + 1 always equals 2.
        """
        self.assertEqual(1 + 1, 2)


class SmsTests(TestCase):
    """
    Unit tests for portal.sms.Sms class
    """
    test_cases = []
    length = 100    #Length of messages for pagination tests

    def __init__(self, dummy):
        self.test_cases = [
            # (input, expected number of pages)
            ("abcdefghij" * 5, 1),
            ("abcdefghij" * 50, 7),
            ("abcdefghij\n" * 20, 3),
            ("abcdefghij " * 20, 3),
            ("abcde fghij\n" * 20, 3),
            ("abcdefghij" * 9 + "\n" + "klmnopqrst" * 10 + "\n" + "uvwxyz " * 19, 4)
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


class CustomAdminForm(TestCase):
    """
    Unit tests for admin.LocationForm to make sure form validation
    still works after subclassing
    """
    def setUp(self):
        self.test_form = LocationForm()
        self.test_form.data = {'q_stmt': u'', 'ages': u'',
                               'e_info': u'', 'site_affil': u'', 'is_age_lt_3': None, 'prg_dur': u'',
                               'exec_director': u'', 'city': u'Chicago', 'lat_and_long': False,
                               'ctr_director': u'', 'zip': u'60611', 'is_tuition_based': None,
                               'state': u'IL', 'geom': u'',
                               'is_age_gt_3': None, 'prg_sched': u'', 'email': u'', 'accred': u'',
                               'is_child_care': None, 'is_hs': None, 'fax': u'', 'as_proc': u'',
                               'is_montessori': None, 'waitlist': u'', 'phone2': u'', 'phone3': u'',
                               'phone1': u'555 555 5555', 'is_pre4all': None,
                               'address': u'301 E North Water St', 'is_ehs': None,
                               'is_special_ed': None, 'url': u'', 'is_child_parent_center': None}
        self.test_form.cleaned_data = self.test_form.data
    def test_saving_empy_point(self):
        """Test that clean method correctly throws a validation error if no point in form"""
        try:
            self.test_form.clean()
            self.assertFail('Should be able to save a point from a string')
        except forms.ValidationError:
            pass

    def test_saving_invalid_point(self):
        """Test that clean method correctly throws a validation error if point is gibberish"""
        self.test_form.cleaned_data['geom'] = 'gibberish'
        try:
            self.test_form.clean()
            self.assertFail('Should not be able to save a point of gibberish')
        except forms.ValidationError:
            pass

    def test_saving_valid_point(self):
        """Test that clean method correctly handles a well-formatted Point"""
        self.test_form.cleaned_data['geom'] = 'POINT (-12.213123213, 100.112343674)'
        try:
            self.test_form.clean()
        except forms.ValidationError:
            self.assertFail('Should be able to save a valid point from the LocationForm')
