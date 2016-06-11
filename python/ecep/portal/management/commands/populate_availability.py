import random

from django.core.management.base import BaseCommand, CommandError

from portal.models import Location


class Command(BaseCommand):
    """
    """

    def handle(self, *args, **options):
        """
        """

        q = Location.objects.all()
        l = [0, 1, 2, 3]

        for location in q:
            choice = random.choice(l)

            if choice == 0:
                pass

            elif choice == 1:
                location.availability = Location.LOW

            elif choice == 2:
                location.availability = Location.MEDIUM

            elif choice == 3:
                location.availability = Location.HIGH

            location.save()

