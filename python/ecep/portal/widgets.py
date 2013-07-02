from django.forms import widgets
from django.utils.safestring import mark_safe


class MapWidget(widgets.HiddenInput):
    def render(self, name, value, attrs=None):
        #import ipdb; ipdb.set_trace()
        widget = super(MapWidget, self).render(name, value, attrs)
        return mark_safe("""<input name="geom" readonly="readonly" value="%s" type="text" id="id_geom" size="60">
                         <br>
                         <input type="button" value="Geocode Address" onclick=ecepAdmin.geocodeAddress()>
                         (<a onclick=ecepAdmin.mapHelp() href="#">?</a>)
                         <div id='map-help'></div><div id="map">%s</div>""" % (value, widget))
