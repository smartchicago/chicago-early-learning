# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Contact',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('email', models.EmailField(max_length=75)),
                ('first_name', models.CharField(max_length=50, verbose_name='First Name')),
                ('last_name', models.CharField(max_length=50, verbose_name='Last Name')),
                ('phone', models.CharField(max_length=20, verbose_name='Phone Number', blank=True)),
                ('address_1', models.CharField(max_length=75, verbose_name='Address 1')),
                ('address_2', models.CharField(max_length=75, verbose_name='Address 2', blank=True)),
                ('city', models.CharField(max_length=75, verbose_name='City')),
                ('state', models.CharField(max_length=2, verbose_name='State')),
                ('zip', models.CharField(max_length=10, verbose_name='Zip Code')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('child_1', models.CharField(blank=True, max_length=6, verbose_name="Child 1's Age", choices=[(b'0-2', b'0-2'), (b'3-5', b'3-5'), (b'5-up', b'5 & Up')])),
                ('child_2', models.CharField(blank=True, max_length=6, verbose_name="Child 2's Age", choices=[(b'0-2', b'0-2'), (b'3-5', b'3-5'), (b'5-up', b'5 & Up')])),
                ('child_3', models.CharField(blank=True, max_length=6, verbose_name="Child 3's Age", choices=[(b'0-2', b'0-2'), (b'3-5', b'3-5'), (b'5-up', b'5 & Up')])),
                ('child_4', models.CharField(blank=True, max_length=6, verbose_name="Child 4's Age", choices=[(b'0-2', b'0-2'), (b'3-5', b'3-5'), (b'5-up', b'5 & Up')])),
                ('child_5', models.CharField(blank=True, max_length=6, verbose_name="Child 5's Age", choices=[(b'0-2', b'0-2'), (b'3-5', b'3-5'), (b'5-up', b'5 & Up')])),
                ('message', models.TextField(blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Location',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('site_name', models.CharField(max_length=100, verbose_name=b'Site Name')),
                ('address', models.CharField(max_length=75, verbose_name=b'Address')),
                ('city', models.CharField(max_length=75, verbose_name=b'City')),
                ('state', models.CharField(max_length=2, verbose_name=b'State')),
                ('zip', models.CharField(max_length=10, verbose_name=b'Zip Code')),
                ('phone', models.CharField(max_length=20, verbose_name='Phone Number', blank=True)),
                ('q_rating', models.CharField(max_length=10, verbose_name='Quality Rating', blank=True)),
                ('url', models.CharField(max_length=256, verbose_name='Website', blank=True)),
                ('q_stmt', models.TextField(verbose_name='Description', blank=True)),
                ('q_stmt_en', models.TextField(null=True, verbose_name='Description', blank=True)),
                ('q_stmt_es', models.TextField(null=True, verbose_name='Description', blank=True)),
                ('accred', models.CharField(max_length=100, verbose_name='Accreditation', blank=True)),
                ('prg_hours', models.CharField(max_length=50, verbose_name='Program Hours', blank=True)),
                ('is_full_day', models.NullBooleanField(verbose_name='Full Day')),
                ('is_part_day', models.NullBooleanField(verbose_name='Part Day')),
                ('is_full_week', models.NullBooleanField(verbose_name='Full Week')),
                ('is_part_week', models.NullBooleanField(verbose_name='Part Week')),
                ('is_school_year', models.NullBooleanField(verbose_name='School Year')),
                ('is_full_year', models.NullBooleanField(verbose_name='Full Year')),
                ('ages', models.CharField(max_length=50, verbose_name='Ages Served', blank=True)),
                ('is_age_lt_3', models.NullBooleanField(verbose_name='Ages 0-3')),
                ('is_age_gt_3', models.NullBooleanField(verbose_name='Ages 3-5')),
                ('language_1', models.CharField(max_length=50, verbose_name=b'Language 1 (other than English)', blank=True)),
                ('language_2', models.CharField(max_length=50, verbose_name=b'Language 2 (other than English)', blank=True)),
                ('language_3', models.CharField(max_length=50, verbose_name=b'Language 3 (other than English)', blank=True)),
                ('is_community_based', models.NullBooleanField(verbose_name='Community Based')),
                ('is_cps_based', models.NullBooleanField(verbose_name='CPS Based')),
                ('is_home_visiting', models.NullBooleanField(verbose_name='Home Visiting')),
                ('accept_ccap', models.NullBooleanField(verbose_name='Accepts CCAP')),
                ('is_hs', models.NullBooleanField(verbose_name='Head Start')),
                ('is_ehs', models.NullBooleanField(verbose_name='Early Head Start')),
                ('open_house', models.TextField(verbose_name='Open House', blank=True)),
                ('open_house_en', models.TextField(null=True, verbose_name='Open House', blank=True)),
                ('open_house_es', models.TextField(null=True, verbose_name='Open House', blank=True)),
                ('curriculum', models.TextField(verbose_name='Curriculum', blank=True)),
                ('curriculum_en', models.TextField(null=True, verbose_name='Curriculum', blank=True)),
                ('curriculum_es', models.TextField(null=True, verbose_name='Curriculum', blank=True)),
                ('email', models.EmailField(max_length=75)),
                ('accepted', models.BooleanField(default=False, verbose_name='Approved')),
                ('placeholder_1', models.TextField(verbose_name=b'Placeholder 1', blank=True)),
                ('placeholder_2', models.TextField(verbose_name=b'Placeholder 2', blank=True)),
                ('geom', django.contrib.gis.db.models.fields.PointField(srid=4326, null=True, verbose_name=b'Geometry')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='LocationEdit',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('fieldname', models.TextField()),
                ('new_value', models.TextField()),
                ('date_edited', models.DateTimeField(auto_now_add=True)),
                ('pending', models.BooleanField(default=True)),
                ('edit_type', models.CharField(max_length=6, choices=[(b'create', b'Create'), (b'update', b'Update'), (b'delete', b'Delete')])),
                ('accepted', models.BooleanField(default=False)),
                ('location', models.ForeignKey(to='portal.Location')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Neighborhood',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('boundary', django.contrib.gis.db.models.fields.MultiPolygonField(srid=4326)),
                ('primary_name', models.CharField(max_length=100)),
                ('secondary_name', models.CharField(max_length=100)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='location',
            name='neighborhood',
            field=models.ForeignKey(to='portal.Neighborhood', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='contact',
            name='location',
            field=models.ForeignKey(to='portal.Location'),
            preserve_default=True,
        ),
        migrations.AlterUniqueTogether(
            name='contact',
            unique_together=set([('location', 'email')]),
        ),
    ]
