# --- First database schema

# --- !Ups

create table user (
  email                     varchar(255) not null primary key,
  name                      varchar(255) not null,
  password                  varchar(255) not null
);


create table project (
  id                        bigint not null primary key,
  name                      varchar(255) not null,
  folder                    varchar(255) not null
);


create table data_type(
  data_type                 varchar(255) not null primary key,
  description               varchar(255)
);

create sequence project_seq start with 1000;


create table datasource (
  id                        bigint not null primary key,
  name                      varchar(255) not null,
  location                  varchar(255),
  project                   bigint not null,
  description               varchar(255) not null,
  data_type                 varchar(255),
  foreign key(data_type)    references data_type(data_type) on delete set null
);


create sequence datasource_seq start with 1000;

create table graph (
  id                        bigint not null primary key,
  name                      varchar(255) not null
);

create table analytics_rule (
  id                        varchar(40) not null primary key,
  name                      varchar(255) not null,
  query_string              clob not null,
  query_lang                varchar(255) not null,
  graph			            bigint,
  last_executed             timestamp,
  last_executed_result      clob,
  success                   boolean,
  project                   bigint,
  foreign key(project)      references project(id) on delete cascade
);

create table project_member (
  project_id                bigint not null,
  user_email                varchar(255) not null,
  foreign key(project_id)   references project(id) on delete cascade,
  foreign key(user_email)   references user(email) on delete cascade
);


create table project_datasource (
  project_id                bigint not null,
  datasource_id             bigint not null,
  -- foreign key(project_id)   references project(id) on delete cascade,
  -- foreign key(datasource_id)   references datasource(id) on delete cascade
);


create table task (
  id                        bigint not null primary key,
  title                     varchar(255) not null,
  done                      boolean,
  due_date                  timestamp,
  assigned_to               varchar(255),
  project                   bigint not null,
  folder                    varchar(255),
  event_type				varchar(255),
  foreign key(assigned_to)  references user(email) on delete set null,
  foreign key(project)      references project(id) on delete cascade
);

create sequence task_seq start with 1000;

# --- !Downs
drop table if exists graph;
drop table if exists data_type;

drop table if exists analytics_rule;
drop sequence if exists analytics_rule_seq;

drop table if exists datasource;
drop sequence if exists datasource_seq;

drop table if exists project_datasource;
drop table if exists project_member;
drop table if exists project;
drop sequence if exists project_seq;

drop table if exists user;

drop table if exists task;
drop sequence if exists task_seq;
