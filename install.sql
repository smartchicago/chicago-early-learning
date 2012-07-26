--
-- This script will install and configure the spatial database for
-- use with the ecep web application.
--

create database template_postgis with encoding='UTF8';

\c template_postgis;
\i /usr/share/postgresql/9.1/contrib/postgis-1.5/postgis.sql;
\i /usr/share/postgresql/9.1/contrib/postgis-1.5/spatial_ref_sys.sql;

\c postgres;
update pg_database set datistemplate='t', datallowconn='f' where datname='template_postgis';
create role ecep with login password 'ecep';
create database ecep with encoding='UTF8' owner=ecep template=template_postgis;

\c ecep
alter table spatial_ref_sys owner to ecep;
alter table geometry_columns owner to ecep;
alter view geography_columns owner to ecep;
create schema ecep authorization ecep;
