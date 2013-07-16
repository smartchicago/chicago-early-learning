class TermDistance:

    def __init__(self, a, b):

        """Initialize TermDistance class

        Computes a type of hamming distance to determine how similar the strings are
        Useful for sorting

        a -- first string in comparison 
        b -- second string in comparison 

        TODO: Update termDistance when a or b are changed

        """
        if not a:
            a = ""
        if not b:
            b = ""

        self.a = a
        self.b = b
        self.getTermDistance()

    def getTermDistance(self):
        """Compute pseudo-hamming distance for the strs

        Result stored in self.termDistance

        """
        a = self.a.lower()
        b = self.b.lower()
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

        return "[" + self.a + "|" + self.b + "|" + str(self.termDistance) + "]"
