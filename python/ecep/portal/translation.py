from modeltranslation.translator import translator, TranslationOptions
from portal.models import Location

class LocationTranslationOptions(TranslationOptions):
    fields = ('q_stmt',)

translator.register(Location, LocationTranslationOptions)