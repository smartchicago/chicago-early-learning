class TermDistance:
    """ TermDistance utility class for portal autocomplete
    
    Use a pseudo-hamming distance to compare a string field of the
        django ValueQuerySet against an arbitrary term

    """
    def __init__(self, obj, field, term):
        """Initialize TermDistance class

        obj -- obj of type ValuesQuerySet
        field -- field in ValuesQuerySet to do the comparison with
        term -- second string in comparison

        """
        if not obj:
            raise ValueError("object required for sorting")
        if not field:
            raise ValueError("database field required for sorting")
        if not term:
            term = ""
        if not obj[field]:
            raise ValueError("field " + field + " not in obj " + str(obj))

        self.obj = obj
        self.field = field
        self.field_value = self.obj[field]
        self.term = term
        self.getTermDistance()

    def getTermDistance(self):
        """Compute pseudo-hamming distance for the two strs

        Result stored in self.termDistance

        """
        a = self.field_value.lower()
        b = self.term.lower()
        alen = len(a)
        blen = len(b)
        minlen = min(alen, blen)
        result = 0

        for i in range(minlen):
            result += (i + 1) * abs(ord(a[i]) - ord(b[i]))

        self.termDistance = result

    def __repr__(self):
        return self.__str__()

    def __str__(self):
        """ String representation of TermDistance """
        return "[" + self.field_value + "|" + self.term + "|" + str(self.termDistance) + "]"
