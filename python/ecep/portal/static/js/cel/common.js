/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 * See http://requirejs.org/docs/api.html for details
 */

define(['jquery', 'Leaflet', '../lib/response', 'Handlebars', 'bootstrap',
        'jquery-ui', 'jquery-cookie', CEL.serverVars.gmapRequire],
function($, L, Response, Handlebars) {
    'use strict';

    var breakpoints = {
        mobile: 420,
        tablet: 767,
        desktop: 1024,
		desktopalt: 1140
    };

    var isTouchscreen = ('ontouchstart' in document.documentElement);

    // Hide the address bar on mobile browsers
    // Solution from: http://mobile.tutsplus.com/tutorials/mobile-web-apps/remove-address-bar/
    function hideAddressBar() {
        if(!window.location.hash) {
            if(document.height < window.outerHeight) {
                document.body.style.height = (window.outerHeight + 50) + 'px';
            }
            setTimeout(function() {
                window.scrollTo(0, 1);
            }, 50);
        }
    }
    if (isTouchscreen) {
        $(window).on('load', function() {
            if(!window.pageYOffset) {
                hideAddressBar();
            }
        }).on('orientationchange', hideAddressBar);
    }

    var gaTrackEvent = function($elt) {
        var category = CEL.serverVars.language + '/' + $elt.data('ga-category'),
            action = $elt.data('ga-action'),
            opt_label = $elt.data('ga-label'),
            opt_value = $elt.data('ga-value'),
            opt_noninteraction = $elt.data('ga-noninteraction'),
            data = ['_trackEvent', category, action];
        // optional parameters
        data.push(opt_label || undefined);
        data.push(opt_value || undefined);
        data.push(!!(opt_noninteraction));
        _gaq.push(data);
    };

    $(document).ready(function() {

        // Remove css tooltips when on a touchscreen device
        if (isTouchscreen) {
            $('[data-hint]').removeAttr('data-hint');
        }

        // set up ga tracking
        $('body').on('click', '*.ga-track', function(e) {
            gaTrackEvent($(this));
        });

        // Testing
        var $test = $('.test');

        var testArray = ["South-East Asia Center - International Bridge School",
                        "Kellman",
                        "Young Scholars Developmental Institute",
                        "South-East Asia Center - International Bridge School",
                        "Ward L",
                        "SGA Youth and Family Services - Home Based Program",
                        "Lawndale",
                        "City Colleges of Chicago - Malcolm X",
                        "Addams",
                        "Penn",
                        "North River",
                        "Hefferan",
                        "Volta",
                        "Sumner",
                        "Dirksen",
                        "Dunne",
                        "Stevenson",
                        "Smyth",
                        "Hale",
                        "Walsh",
                        "Azuela",
                        "Corkery",
                        "Mary Crane Lake & Pulaski",
                        "Lee",
                        "Burroughs",
                        "Cook",
                        "Columbia Explorers",
                        "Jackson M",
                        "Drake",
                        "Joplin",
                        "Bond",
                        "King",
                        "Inter-American",
                        "Rainbow Daycare",
                        "Barry",
                        "Drummond",
                        "City Colleges of Chicago - Truman",
                        "Tilton",
                        "Nicholson",
                        "Holmes",
                        "Armstrong G",
                        "Suder",
                        "Mays",
                        "Agassiz",
                        "McDowell",
                        "Ruggles",
                        "Greene",
                        "Madison",
                        "Parkside",
                        "Hendricks",
                        "Dubois",
                        "White",
                        "SALVATION ARMY - ALL THINGS ARE POSIBLE",
                        "Sandoval",
                        "Higgins",
                        "North Avenue Day Nursery",
                        "Parenting Teen Moms",
                        "Family Focus Lawndale",
                        "Wacker",
                        "Ravenswood",
                        "Haymarket McDermott Center",
                        "Park Manor",
                        "Wells, I ",
                        "Gale",
                        "Concordia Place Whipple Site",
                        "Burr",
                        "Nash",
                        "Courtenay",
                        "Maternity BVM School",
                        "Falconer",
                        "Reinberg",
                        "Henry Booth House - Lakeview Development Center",
                        "Evers",
                        "Henry Booth House - Prodigy Child Learning Center",
                        "Haugan",
                        "Salvation Army - New Hope Head Start",
                        "Bateman",
                        "Blair",
                        "Ada S. McKinley Community Services - Little Genius",
                        "Bridge",
                        "Brighton Park",
                        "Calmeca",
                        "El Valor Mari's Bumble Bee Academy",
                        "OHU-Wings",
                        "Johnson",
                        "Carter",
                        "Channing's Child Care",
                        "Disney II",
                        "Dore",
                        "Dodge",
                        "Everett",
                        "Pasteur",
                        "Lloyd",
                        "Dvorak",
                        "Portage Park",
                        "Prieto",
                        "Metropolitan Family Services North Children's Center",
                        "Building Blocks Learning Academy",
                        "Rogers Park Children's Center",
                        "Stock",
                        "Edwards",
                        "Washington G",
                        "Henderson",
                        "Carole Robertson Center for Learning",
                        "Henry",
                        "Beacon Therapeutic",
                        "Whitney",
                        "Hurley",
                        "Jungman",
                        "Chicago Academy",
                        "Rauner YMCA",
                        "Stepping Stones Early Childhood Learning Center",
                        "Kilmer",
                        "Concordia Place - Seeley Site",
                        "Imani Children's Academy",
                        "Mosaic Early Childhood Academy",
                        "Home based-Children's Place Association",
                        "Cather",
                        "Albany Child Care",
                        "Winthrop Children's Center",
                        "Happy Kids Learning",
                        "Clay",
                        "Smart From The Start - Armitage",
                        "Robinson",
                        "Northwestern Settlement Head Start Center",
                        "Talcott",
                        "City Colleges of Chicago - Olive Harvey",
                        "Gregory",
                        "Zapata",
                        "Deneen",
                        "Ada S. McKinley-J & L Family Learning Day Care",
                        "Farragut",
                        "Metropolitan Family Services Midway Head Start",
                        "McCormick Tribune YMCA",
                        "It Takes A Village CCS",
                        "Ada S. McKinley- Montessori Academy",
                        "Eberhart",
                        "Washington H",
                        "Salvation Army - New Moms",
                        "Brown W",
                        "Kiddie Garden Little Angels",
                        "Chicago Commons-JPE Daycare Center",
                        "Chicago Commons-Learn Together/Grow Together",
                        "Gillespie",
                        "Henry Booth House - Jelly Bean Learning Center",
                        "Fiske",
                        "Harvard",
                        "Chicago Commons-Smart From The Start Armitage",
                        "Ada S. McKinley-Precious Little Ones 63rd St",
                        "Pirie",
                        "Neil",
                        "Allison's Infant & Toddler Center",
                        "Easter Seals-Gilchrist Marchmen-Fosco",
                        "Chicago Child Care Society",
                        "Chicago Youth Center-Lake Shore Learning Academy",
                        "Mollison",
                        "Cleveland",
                        "Sullivan",
                        "Easter Seals A-Karrasel Galewood",
                        "Easter Seals A-Karrasel",
                        "Twain",
                        "Ada S. McKinley - Roseland Head Start",
                        "Foster Park",
                        "Ariel",
                        "Easter Seals-All Star Kids Academy",
                        "First Start Academy South",
                        "McCormick",
                        "Joyful Noise Daycare",
                        "Telpochcalli",
                        "Clark G",
                        "Chicago Youth Center-Pathways to Learning CC 1",
                        "Easter Seals-Busy Bees II",
                        "Gray",
                        "West Ridge",
                        "Goethe",
                        "Easter Seals-Wise Owl",
                        "Chicago Youth Center-Tiny Scholars Academy",
                        "Edison Park",
                        "Garvey",
                        "Marsh",
                        "Gads Hill Center - Archer Children's Program",
                        "Henry Booth House-4 Ever Young",
                        "Gads Hill Center - M & E Daycare",
                        "Durkin Park",
                        "Tuesday's Child",
                        "Peterson",
                        "Mother's Touch Child Care",
                        "Fuller",
                        "Ounce of Prevention Educare",
                        "Korean American Community Services",
                        "El Valor-Children's World",
                        "El Valor Kiddy Kare Preschool",
                        "Gunsaulus",
                        "Pullman",
                        "Henry Booth House - Gina's Unbelievable",
                        "Bradwell",
                        "Shining Star",
                        "Wee Care Nursery School",
                        "Haines",
                        "Bass",
                        "Children's International Academy",
                        "Fairfield",
                        "Temple Head Start",
                        "Onward Neighborhood House Belmont Cragin Site",
                        "Murphy",
                        "Henry Booth House - Kids R First",
                        "Little Learners Daycare",
                        "El Valor-Lots of Love Pre-School",
                        "V & J",
                        "Prussing",
                        "Smyser",
                        "Christopher House-Belmont Cragin",
                        "El Valor-Power Daycare",
                        "El Valor-Small World Daycare Center",
                        "El Valor-Smart Learning Center",
                        "Gad's Hill-Diana's Playpen of Little Geniuses",
                        "Dever",
                        "Trinity United Church of Christ Child Centers, Inc",
                        "Reavis",
                        "Irving",
                        "Little Giants",
                        "Hayt",
                        "Cameron",
                        "Henry Booth House - Project Or. Design Studio",
                        "Henry Booth House Hope for Youth",
                        "Gad's Hill-Peachtree Educational Daycare Inc.",
                        "Armour",
                        "Ashburn",
                        "The Love Learning Center",
                        "Parker",
                        "Henry Booth House-Jelly Bean 61st Street",
                        "Gad's Hill-Smart from the Start",
                        "Hibbard",
                        "United Cultural Center",
                        "Dunbar Vocational Career Academy",
                        "West Austin Development",
                        "Gads Hill Center - Kove Learning Academy",
                        "Hedges",
                        "Harte",
                        "Locke",
                        "Gad's Hill-VOCEL",
                        "Cullen",
                        "ONWARD NEIGHBORHOOD HOUSE - NEW BEGINNINGS",
                        "Beard",
                        "Fernwood",
                        "Jahn",
                        "Gary",
                        "Salvation Army Incarnation Head Start",
                        "Beaubien",
                        "Young",
                        "Henry Booth House-Little Leaders of Tomorrow",
                        "Trinity United-Rev. Dr. Jeremiah A. Wright Jr. Early Care and Learning Center",
                        "Jensen",
                        "Healy",
                        "Shoop",
                        "Pritzker",
                        "Ray",
                        "Centers for New Horizons-Ida B. Wells Early Learning Center",
                        "Henry Booth House - North Kenwood Day Care Center",
                        "Ada S. McKinley-Children's Center (Halsted)",
                        "Henry Booth House- Star Kids Math & Science",
                        "Belding",
                        "McAuliffe",
                        "O'Toole",
                        "Mary Crane League-Archdiocese St. Nicolas of Tolentine",
                        "St. Sylvester School",
                        "Farnsworth",
                        "Blaine",
                        "Bouchet",
                        "Mary Crane League Morse Site",
                        "Metropolitan Family Services-Learning & Wellness Center Libby",
                        "National Teachers Academy",
                        "South Side YMCA",
                        "Pilsen",
                        "Beasley",
                        "All About Kids Learning Academy, Inc.",
                        "Lozano",
                        "Kozminski",
                        "West Park",
                        "Lorca",
                        "It Takes A Village, ELC",
                        "Chipper Preschool and Kindergarten",
                        "Mozart",
                        "Smith",
                        "Eyes on the Future",
                        "New Pisgah Day Care",
                        "Archer Avenue Learning Station - A Montessori School",
                        "Brown R",
                        "Lee's Cuddles N Care",
                        "Wadsworth",
                        "Saint Ann School",
                        "St. Ethelreda",
                        "Mary Crane-North",
                        "Carole Robertson Center for Learning",
                        "Henry Booth House - Kids R First",
                        "Whiz Kids Nursery Center Inc. I",
                        "Yates",
                        "Columbus",
                        "El Valor-Kidz Creative Concepts",
                        "CYC George E. Taylor",
                        "Academy of St. Benedict the African - Laflin",
                        "Webster",
                        "Aldridge",
                        "Centers for New Horizons-Altgeld Early Learning Center",
                        "Burke",
                        "Seward",
                        "Schubert",
                        "Sayre",
                        "Chicago Youth Center-Little Kiddies",
                        "Burnham",
                        "William H Wells Community Academy High School",
                        "Nightingale",
                        "Mt Vernon",
                        "Ericson",
                        "Saucedo",
                        "Taylor",
                        "Orozco",
                        "Kid'z Colony Day Care, Inc.",
                        "Bridgeport Child Development Center",
                        "Dorothy Sutton Branch Head Start",
                        "Kanoon",
                        "Nixon",
                        "Howe",
                        "Betty's Daycare",
                        "The Children's Place Early Learning Center",
                        "Westcott",
                        "Thorp J",
                        "Lake Shore Schools",
                        "Boone",
                        "Hughes C",
                        "Jordan",
                        "Easter Seals-Living Witness",
                        "Bright",
                        "Austin Polytechnical Academy",
                        "Warren",
                        "Kinzie",
                        "Chinese American Service League",
                        "Coonley",
                        "Lowell",
                        "Our Lady of Grace",
                        "ChildServ PEP Program",
                        "Shields",
                        "Holden",
                        "Chalmers",
                        "Our Lady of Tepeyac",
                        "Mason",
                        "Hammond",
                        "Morton",
                        "St. Joseph Child Development Center",
                        "University of Chicago - Donoghue",
                        "Ruiz",
                        "Camras",
                        "Carnegie",
                        "Home of Life Community Development Corporation",
                        "McNair",
                        "De Diego",
                        "Burnside",
                        "Carroll",
                        "Avalon Park",
                        "SGA Little Village (Telpochalli Community Arts Fine Arts School)",
                        "City Colleges of Chicago - Kenndy King",
                        "Dixon",
                        "Heroes",
                        "Carson",
                        "Healthy Parents & Babies Doula and Home Visiting Program",
                        "Little Tykes II",
                        "ABC Preschool",
                        "Shining Star",
                        "Herzl",
                        "Hughes L",
                        "Grimes",
                        "Lovett",
                        "Fairyland Nursery School",
                        "Schmid",
                        "Manierre",
                        "Ada S. McKinley Trumbull Park Head Start",
                        "Alcott",
                        "El Valor Guadalupe Reyes Center",
                        "LordanChild Daycare",
                        "Plamondon",
                        "Mann",
                        "Thomas",
                        "North Star Child Development",
                        "Chavez",
                        "Doolittle",
                        "Los Pequenos Angelitos",
                        "Bridgeport Child Development Center II",
                        "Pershing",
                        "O'Keeffe",
                        "True To Life Foundation",
                        "Marquette",
                        "Kershaw",
                        "Kimball Head Start",
                        "Henry Booth House - Jelly Bean Learning Center",
                        "Family Child Care Home",
                        "Chopin",
                        "Piccolo",
                        "Nobel",
                        "Woodlawn",
                        "McCann's Day Care Center",
                        "Oglesby",
                        "Bennett",
                        "Brennemann",
                        "Scammon",
                        "Shining Star",
                        "Rachel's Learning Center",
                        "Cuddle Care",
                        "ABC Early Childhood Program",
                        "Peirce",
                        "Onahan",
                        "Fresh Start Academy",
                        "Rogers",
                        "Christopher House-Logan Square",
                        "Swift",
                        "North Ave-Family Childcare Network",
                        "Salazar",
                        "South Loop",
                        "El Hogar Del Nino",
                        "Coles",
                        "South Shore",
                        "Solomon",
                        "Darwin",
                        "Otis",
                        "Henry Booth House - Jelly Bean Learning Center",
                        "Spry",
                        "St. Bruno School",
                        "Spencer",
                        "Henry Booth House - Englewood Community Connection",
                        "Trinity United Church of Christ Child Centers, Inc - Denton Brooks",
                        "Whistler",
                        "Allison's Infant & Toddler Center",
                        "Budlong",
                        "Graham",
                        "Burbank",
                        "First Lutheran YMCA",
                        "St. Gall School",
                        "McCutcheon",
                        "Jamieson",
                        "Our Lady of Tepeyac Child Development Center",
                        "Cooper",
                        "Clinton",
                        "Burley",
                        "Happy Holiday Nursery & Kindergarten",
                        "Trinidad Head Start",
                        "Faraday",
                        "McPherson",
                        "Red Shield Head Start",
                        "ST. COLUMBANUS SCHOOL",
                        "Langford",
                        "Leland",
                        "Edgewater Early Learning Center",
                        "Little Kids Village Learning",
                        "Pope John Paul II Catholic School",
                        "St. Vincent de Paul Center",
                        "Palmer",
                        "Vick",
                        "The Women's Treatment Center",
                        "Onward Neighborhood House - La Escuelita",
                        "Crown",
                        "Metcalfe",
                        "Fifth City",
                        "Cordi Marian Child Development Center",
                        "Pulaski",
                        "Brentano",
                        "Mireles",
                        "Mother's Touch Day Care",
                        "Brownell",
                        "Home of Life Community Dev. Corp. - Home of Life Just for You",
                        "LEARN Charter School Pre-Kindergarten",
                        "Chase",
                        "St. Catherines-St. Lucy's",
                        "LaSalle II",
                        "Mayer",
                        "Dawes",
                        "Disney",
                        "Lewis",
                        "DePriest",
                        "First Start Academy",
                        "St Margaret of Scotland",
                        "De Dominguez",
                        "Benito Juarez Community Academy",
                        "Dr. Effie O. Ellis YMCA",
                        "Easter Seals Near South Side Child Development Center",
                        "Chicago Commons Taylor Center for New Experiences",
                        "CCYC Centro Nuestro",
                        "McKay",
                        "Stowe",
                        "El Valor - Carlos H Cantu Cihldren & Family Center",
                        "Casa Central's Early Learning Programs",
                        "Cardenas",
                        "Ebinger",
                        "North Austin Head Start",
                        "Metropolitan Family Services - Southeast Family Service Center",
                        "Moos",
                        "Lee's Cuddles N Care Daycare Center",
                        "Tarkington",
                        "Audubon",
                        "Norwood Park",
                        "Marillac Social Center",
                        "Marshall YMCA",
                        "University of Chicago - North Kenwood Oakland",
                        "Carole Robertson Center for Learning",
                        "Rudolph",
                        "University of Illinois at Chicago Children's Hospital: Healthy Steps",
                        "St. Philip Neri School",
                        "Holy Family Ministries - Little Learners Academy",
                        "Hamilton",
                        "Lenart",
                        "Jeanne Kenney YMCA",
                        "Green",
                        "Funston",
                        "Lizney Land Learning Center",
                        "Wee Wee Center For Creative Learning, Inc.",
                        "South Chicago YMCA",
                        "Chappell",
                        "South Shore United Methodist - South Shore United Head Start",
                        "St. John de la Salle",
                        "Christopher House-Rogers Park",
                        "Casals",
                        "Dewey",
                        "Colemon",
                        "Lavizzo",
                        "El Valor Chicago Pre-School Academy",
                        "El Valor - Guadalupe A Reyes Children & Family Center",
                        "Chicago Commons Nia Family Center",
                        "Chicago Commons Guadalupano Family Center",
                        "Wholly Innocence Day Care Center",
                        "Whittier",
                        "Thomas Kelly High School",
                        "CYC Rebecca K. Crown",
                        "Melody",
                        "Davis N",
                        "El Valor - Rey B Gonzalez Children & Family Center",
                        "Metropolitan Family Services - Calumet Family Service Center",
                        "Metropolitan Family Services - Midway Family Service Center",
                        "Haley",
                        "Cuffe",
                        "Onward Neighborhood House",
                        "Henry Booth House - Brite New Minds",
                        "Ada S. McKinley Ersula Howard Child Care Cernter",
                        "Carver G",
                        "The Children's Center",
                        "Gallistel",
                        "CYC Dorothy Gautreux",
                        "Teddy Bear #3",
                        "YMCA- North Lawndale",
                        "Woodson South",
                        "Eastside Child Development Center",
                        "SGA Youth and Family Services - Home Based Program",
                        "Lake View High School",
                        "Little Apple Seeds Academy",
                        "Haymarket Center Early Head Start Home Based Program",
                        "Canty",
                        "Nettelhorst",
                        "CYC Fellowship House",
                        "Revere",
                        "Hamline",
                        "Teddy Bear V",
                        "Gage Park High School",
                        "Teddy Bear I",
                        "Sherman",
                        "Richard T Crane Tech Prep High School",
                        "Claremont",
                        "St. Nicholas of Tolentine",
                        "Passages Charter School",
                        "High Ridge YMCA",
                        "St. Mary Star of the Sea Pre-School",
                        "Hanson Park",
                        "Our Lady of the Snows",
                        "Family Focus Englewood",
                        "Grissom",
                        "St. Sabina Academy",
                        "Kids R Us",
                        "Henry Booth House - Love N Learn Academy",
                        "Logandale",
                        "Prescott",
                        "Monroe",
                        "Greeley",
                        "Our Lady of Lourdes Child Development Center",
                        "Gads Hill Child Development Center",
                        "Skinner",
                        "Little Village",
                        "Goudy",
                        "Epiphany",
                        "St. Agnes of Bohemia Catholic School",
                        "St. Mary of the Lake",
                        "Pickard",
                        "Busy Bees Child Development Center",
                        "Oriole Park",
                        "Owens/Gompers",
                        "Hearst",
                        "McClellan",
                        "Randolph",
                        "Garfield YMCA",
                        "Whiz Kids Nursery Center",
                        "Lara",
                        "Reilly",
                        "Peck",
                        "Morrill",
                        "Little Hands Child Creative Center",
                        "Tonti",
                        "Vick Village",
                        "Wentworth",
                        "Academy of St Benedict the African - Stewart",
                        "Queen of the Universe",
                        "Little Angels Family Daycare",
                        "Lake Shore Schools",
                        "Ryder",
                        "Rachel's Learning Center",
                        "Community Learning Center",
                        "The Learning Tree Preschool  II",
                        "Fussy Baby Network",
                        "Mary Crane Molade",
                        "The Learning Tree Preschool  I",
                        "Ada S. McKinley-Trumbull",
                        "Chicago Youth Center-Pathways to Learning Child Care Center",
                        "El Valor Little Learners",
                        "Henry Booth House-Creative Little Ones",
                        "Henry Booth House-Crystal Palace",
                        "Henry Booth House-High Mountain",
                        "Gad's Hill-Literacy Zone",
                        "Gads Hill Center",
                        "YMCA - Oakley Squares",
                        "Young Achievers Academy",
                        "Wabash YMCA",
                        "Ada S. McKinley -Montessori Academy 2",
                        "Henry Booth House-Near South",
                        "Allison's Infant & Toddler Center",
                        "Little Achievers Learning Center",
                        "Montessori School of Englewood",
                        "Kiddy Kare Preschool Site 1",
                        "Little People Daycare",
                        "Henry Booth House-Jones Academy",
                        "Shining Star",
                        "Salvation Army - Family Outreach Initiative",
                        "A Child's World",
                        "State of Illinois Child Development Center",
                        "Albany Park Community Center - Uptown",
                        "Howard Area Family Center",
                        "El Valor Centro Infantil Puerto Rican Community Center",
                        "Kimball Daycare",
                        "The Montessori School of Englewood",
                        "Judah International Outreach - Judah Foundational Community School",
                        "El Valor-Lots of Love NFP",
                        "Henry Booth House-Hegewisch",
                        "Salvation Army-Family Childcare Network",
                        "Henry Booth House-Laugh & Giggles",
                        "Henry Booth House - Little Folks Day Care Center",
                        "CYC Roseland Head Start Collaboration",
                        "Little Brown Bear",
                        "Mary Crane League-Archdiocese St. Dorothy",
                        "Allison's Infant and Toddler Center",
                        "LaEscuelita",
                        "SALVATION ARMY - CREATIVE LITTLE ONES",
                        "Gads Hill Center - Children's Services Center",
                        "City Colleges of Chicago - Richard J. Daley",
                        "Dorsey's Developmental Institute",
                        "Waters",
                        "Barnard",
                        "Albany Park Community Center - Ainslie",
                        "Ada S McKinley Maggie Drummond Child Development Center",
                        "Henry Booth House-Mae's Daycare Center",
                        "Curtis",
                        "Beethoven",
                        "St. Angela School",
                        "Loop Learning Center, Inc.",
                        "Sherwood",
                        "Children Learn & Play Day Care",
                        "Ward J",
                        "Ellington",
                        "Ada S. McKinley-Precious Little Ones-51St",
                        "Jenner",
                        "Onward Neighborhood House West Town",
                        "New Field",
                        "Chance after Chance",
                        "Stagg",
                        "Grace Mission Child Development Center",
                        "Raise Up a Child",
                        "Mitchell",
                        "Newberry",
                        "Till",
                        "Esmond",
                        "Daley",
                        "Talman",
                        "Barton",
                        "Dulles",
                        "Centers for New Horizons-Effie O. Ellis Early Learning Center",
                        "Ogden",
                        "Asian Human Services LEAF Program",
                        "Alain Locke Charter School",
                        "Dett",
                        "Belmont-Cragin",
                        "Diversey Daycare",
                        "Henry Booth House - Itsy Bitsy People Palace",
                        "Henry Booth House-Beginners Depot",
                        "El Valor-Children's Place DCC",
                        "Christopher House-Uptown",
                        "Erie Neighorbood House",
                        "Beidler",
                        "Linne",
                        "Brunson",
                        "Onward Neighborhood House Logan Square",
                        "Tilden Career Community Academy High School",
                        "Gresham",
                        "Hay",
                        "Finkl",
                        "Teddy Bear II",
                        "Gads Hill Center - Hunt's Early Childhood Academy",
                        "Fulton",
                        "Chicago Lawn Child Development Center",
                        "Metropolitan Family Services Midway Children's Center",
                        "Earle",
                        "The Children's Center",
                        "YMCA - Orr Family Development Center",
                        "Bernard Horwich Jewish Community Center",
                        "Simpson Early Head Start",
                        "Tanner",
                        "St. Richard",
                        "Higher Learning Daycare & Education Center, Inc",
                        "Smart from the Start",
                        "Wendell Phillips Academy High School",
                        "Caldwell",
                        "Harlan Community Academy High School",
                        "St. Turibius",
                        "Englewood Freidheim Child and Family Center",
                        "Family Focus Nuestra Familia",
                        "Perez",
                        "Hitch",
                        "Little Tykes Preschool and Kindergarten",
                        "Chicago Commons Paulo Freire Center",
                        "Little Bear Day Care",
                        "Church of God Day Care",
                        "Pathways To Learning Child Care Centers",
                        "Fort Dearborn"];

        var autotest = $test.autocomplete({
            source: testArray
        });

        // AUTOCOMPLETE

        // New Autocomplete Testing:

        var $autocomplete = $('.autocomplete-searchbox');

        // JQuery $().autocomplete() function handles all interaction with
        // the input and composing the dropdown
        var autocomplete = $autocomplete.autocomplete({
            minLength: 1,
            source: function(request, response) {
                getAutocompletePlaces(request, response);
            },
            select: function(event, ui) {
                var place_id = ui.item.place_id;
                selectPlace(place_id);
            },
            focus: function(event, ui) {
                var selection = ui.item
                $autocomplete.data({
                    label: selection.label,
                    place_id: selection.place_id
                });
                console.log($autocomplete.data());
            }
        });

        // Calls the Places API to populate the dropdown
        // Returns array of possible matches

        function getAutocompletePlaces(request, response) {

            var input_term = 'Chicago IL ' + request.term;
            var service = new google.maps.places.AutocompleteService();
            service.getPlacePredictions({
                input: input_term,
                types: ['geocode'],
                componentRestrictions: {
                    country: 'us'
                }
            }, function(predictions, status) {
                var cleanedResults = [];
                if (predictions === null) {
                    cleanedResults = [];
                } else {
                    cleanedResults = predictions.map(function(obj) {
                        var rObj = {};
                        rObj['label'] = obj.description;
                        rObj['place_id'] = obj.place_id;
                        return rObj;
                    });
                    var likelyResult = cleanedResults[0];
                    $autocomplete.data({
                        label: likelyResult.label,
                        place_id: likelyResult.place_id
                    });
                    console.log($autocomplete.data());
                }
                response(cleanedResults);
            });
        }

        function selectPlace(place_id) {
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({'placeId': place_id}, function(results, status) {
                var result = results[0];
                var lat = result.geometry.location.lat()
                var lng = result.geometry.location.lng();
                redirectToMap(lat, lng)
            });
        }

        function redirectToMap(lat, lng) {
            window.location.href = getUrl(
                'browse',
                {
                    type: 'geo-latlng',
                    lat: lat,
                    lng: lng,
                    zoom: 14
                }
            );
            return;
        }

        // Button Press
        $('.autocomplete-submit').on('click', function(e) {
            e.preventDefault();
            var place_id = $autocomplete.data().place_id;
            selectPlace(place_id);
        });

        // Enter Press
        $autocomplete.keypress(function (e) {
            if (e.keyCode == 13) {
                var place_id = $autocomplete.data().place_id;
                selectPlace(place_id);
            }
        });

        // 
        // END AUTOCOMPLETE
        //
    });

    // Setup Response stuff
    var breakpointsArray = [
        0,
        breakpoints.mobile,
        breakpoints.tablet,
        breakpoints.desktop,
				breakpoints.desktopalt
    ];
    Response.create({ mode: 'markup', prefix: 'r', breakpoints: breakpointsArray });
    Response.create({ mode: 'src',  prefix: 'src', breakpoints: breakpointsArray });

    // Handlebars helpers

    /**
     * Helper for resolving static urls in handlebars templates
     * @param { URL to convert to static, same as argument for django static template function } url
     * @return { full static url }
     */
    Handlebars.registerHelper('static', function(url) {
        return CEL.serverVars.staticRoot + url;
    });

    /**
     * Helper for doing string equality
     * @param { first var to compare } a
     * @param { second var to compare } b
     * @return { boolean }
     */
    Handlebars.registerHelper('if_eq', function(a, b, opts) {
        if(a == b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
    });


    /**
     * Helper for doing string inequality
     * @param { first var to compare } a
     * @param { second var to compare } b
     * @return { boolean }
     */
    Handlebars.registerHelper('if_not_eq', function(a, b, opts) {
        if(a != b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
    });

    /**
     * Central api for getting urls for the app
     * @param { logical name of the endpoint } name
     * @param { Options for creating the url, depends on name } opts
     * @return { URL string for request }
     */
    var getUrl = function (name, opts) {
        var url = '';
        switch (name) {
            case 'origin':
                // IE < 9 doesn't define location.origin
                return window.location.origin ||
                    (window.location.protocol + "//" + window.location.host);
            case 'location-api':
                // requires opts.locations to be comma separated string or
                //      array of integers
                url = '/' + ($.cookie('django_language') || CEL.serverVars.default_language) +
                    '/api/location/';
                if (opts && opts.locations) {
                    url += opts.locations.toString() + '/';
                }
                return url;
            case 'neighborhood-api':
                return '/' + ($.cookie('django_language') || CEL.serverVars.default_language) +
                    '/api/neighborhood/';
            case 'neighborhoods-topo':
                return '/static/js/neighborhoods-topo.json';
            case 'neighborhoods-geojson':
                return '/static/js/neighborhoods.json';
            case 'browse':
                if (!opts) {
                    return '/search/';
                }
                switch (opts.type) {
                    case 'latlng':
                        url = '/search/?lat=' + opts.lat + '&lng=' + opts.lng;
                        if (opts.zoom) {
                            url += '&zoom=' + opts.zoom;
                        }
                        return url;
                    case 'geo-latlng':
                        url = '/search/?geolat=' + opts.lat + '&geolng=' + opts.lng;
                        if (opts.label) {
                            url += '&label=' + opts.label;
                        }
                        return url;
                    case 'neighborhood':
                        return '/search/?neighborhood=' + opts.neighborhood;
                    case 'location':
                        return '/search/?location=' + opts.location;
                    default:
                        break;
                }
                break;
            case 'single-location':
                url = '/location/' + opts.location + '/';
                if (opts.slug) {
                    url += opts.slug + '/';
                }
                return url;
            case 'favorites':
                url = '/favorites/';
                if (opts && opts.locations) {
                    url += opts.locations.toString() + '/';
                }
                return url;
            case 'icon-school':
                return '/static/img/leaflet-icons/school.png';
            case 'icon-school-accredited':
                return '/static/img/leaflet-icons/school-accredited.png';
            case 'icon-school-starred':
                return '/static/img/leaflet-icons/school-starred.png';
            case 'icon-school-accredited-starred':
                return '/static/img/leaflet-icons/school-accredited-starred.png';
            case 'icon-center':
                return '/static/img/leaflet-icons/center.png';
            case 'icon-center-accredited':
                return '/static/img/leaflet-icons/center-accredited.png';
            case 'icon-center-starred':
                return '/static/img/leaflet-icons/center-starred.png';
            case 'icon-center-accredited-starred':
                return '/static/img/leaflet-icons/center-accredited-starred.png';
            case 'icon-geolocation':
                return '/static/img/leaflet-icons/geocode.png';
            case 'icon-enrollment':
                return '/static/img/leaflet-icons/appsite.png';
            case 'icon-quality':
                if (opts && opts.quality) {
                    return '/static/img/icons/' + opts.quality + '.png';
                } else {
                    throw 'getUrl::Invalid Parameter: icon-quality requires opts.quality';
                }
            default:
                break;
        }
        throw 'Unknown URL endpoint';
    };

    var slugify = function(text) {
      return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
    };

    // geolocation
    //
    // Navbar Geolocation
    if ('geolocation' in navigator) {
        $(document).ready(function() {
            $('.geolocation-button').bind('click', function(e) {
                e.preventDefault();
                navigator.geolocation.getCurrentPosition(function(position) {
                    window.location.href = getUrl(
                        'browse',
                        {
                            type: 'geo-latlng',
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        }
                    );
                }, function(e) {
                    e.preventDefault();
                    alert(gettext('Please enable geolocation services.'));
                });
            });
        });
    } else {
        $('.geolocation-button').hide();
    }

    // Homepage Geolocation
    $(document).ready(function() {
        $('#locate-main').bind('click', function(e) {
            e.preventDefault();
            navigator.geolocation.getCurrentPosition(function(position) {
                window.location.href = getUrl(
                    'browse',
                    {
                        type: 'geo-latlng',
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                );
            }, function(e) {
                e.preventDefault();
                alert(gettext('Please enable geolocation services.'));
            });
        });
    });

    // Set up social sharing behavior
    // The options argument must be an object that contains both a url and a title,
    // which are used to construct the appropriate sharing links.
    $('#share-modal').on('init-modal', function(e, options) {
        // a lot of these urls won't work when passing 'localhost' urls, but once we
        // move to a publically accessible url, they will work just fine
        var templates = {
                mail: 'mailto:?body={{ url }}&subject={{ title }}',
                facebook: 'http://facebook.com/sharer.php?s=100&p[url]={{ url }}&p[title]={{ title }}',
                twitter: 'https://twitter.com/share?text={{ title }}%20{{ url }}',

                // looks like google recently broke their permalink that allows adding text:
                // 'https://m.google.com/app/plus/x/?v=compose&content={{ title }}%20{{ url }}'
                // until they fix it, the following will work, but will just share the url
                gplus: 'https://plus.google.com/share?url={{ url }}'
            },
            $modal = $(this),
            $text = $('#social-text');

        // fill the input box in with the url
        $text.attr('href', options.url).text(options.url);

        // a url is generated for each template defined in 'templates'.
        // to add a new service, create a link with the id 'social-[service]',
        // and add a template to the 'templates' object.
        $.each(templates, function (service, template) {
            $('#social-' + service).attr('href', Handlebars.compile(template)(options));
        });

        // display the modal
        $modal.modal('show');
    });

    return {
        getUrl: getUrl,

        slugify: slugify,

        breakpoints: breakpoints,

        isTouchscreen: isTouchscreen,

        gaTrackEvent: gaTrackEvent,

        // Stolen from _.js v1.5.1
        // https://github.com/jashkenas/underscore/blob/dc5a3fa0133b7000c36ba76a413139c63f646789/underscore.js
        // See project root for license
        //
        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        debounce: function(func, wait, immediate) {
            var result,
                timeout = null;
            return function() {
                var context = this,
                    args = arguments,
                    later = function() {
                        timeout = null;
                        if (!immediate) result = func.apply(context, args);
                    },
                    callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) {
                        result = func.apply(context, args);
                    }

                return result;
            };
        }
    };
});
