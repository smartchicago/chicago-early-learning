from modeltranslation.translator import translator, TranslationOptions
from portal.models import Location

class LocationTranslationOptions(TranslationOptions):
    fields = ('q_stmt', 'open_house',)

translator.register(Location, LocationTranslationOptions)