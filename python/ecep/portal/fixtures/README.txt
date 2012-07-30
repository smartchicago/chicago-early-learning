You can put a db dump in here, and then load it with "python manage.py loaddata"
example:

wget -O initialdata.json <url>
cd ../..
python manage.py loaddata initialdata

