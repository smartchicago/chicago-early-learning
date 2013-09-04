from django.forms import widgets
from django.utils.safestring import mark_safe


class MapWidget(widgets.HiddenInput):
    """Custom map widget for displaying interactive google map to geocode
    addresses of learning centers.

    This widget displays a readonly input box to store lat+lng data, an empty
    help div, a map div for the google map, and a button to initiate geocoding.
    """

    def render(self, name, value, attrs=None):
        """Overrides the render method. This controls the actual html output of a form
        on the page

        See widget docs for more information:
        https://docs.djangoproject.com/en/1.4/ref/forms/widgets/
        """
        
        widget = super(MapWidget, self).render(name, value, attrs)
        return mark_safe("""<input name="geom" readonly="readonly" value="%s" type="text" id="id_geom" size="60" class="%s">
                         <br>
                         <input type="button" value="Geocode Address" onclick=ecepAdmin.geocodeAddress()>
                         (<a onclick=ecepAdmin.mapHelp() href="#">?</a>)
                         <div id='map-help'></div><div id="map">%s</div>""" % (value, self.attrs.get('class', None), widget))
