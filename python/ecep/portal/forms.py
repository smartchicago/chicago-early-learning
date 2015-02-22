from django import forms
from models import Contact

# Model fields need to be translated lazily
from django.utils.translation import ugettext as _, ugettext_lazy

class ContactForm(forms.Form):
    CHILD_AGE_CHOICES_WITH_EMPTY = [('', ugettext_lazy('Select an age range'))] + Contact.CHILD_AGE_CHOICES

    email = forms.EmailField(label=ugettext_lazy('Email'))
    first_name = forms.CharField(label=ugettext_lazy('First Name'), max_length=50)
    last_name = forms.CharField(label=ugettext_lazy('Last Name'), max_length=50)
    phone = forms.CharField(label=ugettext_lazy('Phone Number'), max_length=20, required=False)
    address_1 = forms.CharField(label=ugettext_lazy('Address 1'), max_length=75)
    address_2 = forms.CharField(label=ugettext_lazy('Address 2'), max_length=75, required=False)
    city = forms.CharField(label=ugettext_lazy('City'), max_length=75)
    state = forms.CharField(label=ugettext_lazy('State'), max_length=2)
    zip = forms.CharField(label=ugettext_lazy('Zip Code'), max_length=10)

    child_1 = forms.ChoiceField(label=ugettext_lazy('Child 1\'s Age'), choices=CHILD_AGE_CHOICES_WITH_EMPTY)
    child_2 = forms.ChoiceField(label=ugettext_lazy('Child 2\'s Age'), choices=CHILD_AGE_CHOICES_WITH_EMPTY, required=False)
    child_3 = forms.ChoiceField(label=ugettext_lazy('Child 3\'s Age'), choices=CHILD_AGE_CHOICES_WITH_EMPTY, required=False)
    child_4 = forms.ChoiceField(label=ugettext_lazy('Child 4\'s Age'), choices=CHILD_AGE_CHOICES_WITH_EMPTY, required=False)
    child_5 = forms.ChoiceField(label=ugettext_lazy('Child 5\'s Age'), choices=CHILD_AGE_CHOICES_WITH_EMPTY, required=False)

    message = forms.CharField(label=ugettext_lazy('Anything else you\'d like us to know?'), max_length=50, widget=forms.Textarea(), required=False)