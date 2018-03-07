# Discover Smarter - Discovery tool for Smarter Data Project

## Getting Started

Discover Smarter uses the Play 2 framework and is written in Java, Javascript and Scala.  The application is currently built using sbt.

## Prerequisites 

You will need:
* Java 6 or Higher
* Scala 2.10.x
* SBT 0.13.0
* Git

Nice to haves:
* scala-ide (eclipse with scala bits)
* scala-ide play framework plugin

Add instructions on Scal-ide and normal eclipse
Adding demo info for SCM managers
### OS X

We advise using [Homebrew] (http://brew.sh/) to install scala and sbt
You will need the latest version of Homebrew to include SBT 13, To install SBT 0.13.0 (required for maven dependencies) please do the following

```bash
brew update
brew install scala
brew install sbt
```

### Ubuntu
[installing ubuntu] (https://gitlab.deri.ie/smarterdata/discover-smarter/wikis/UbuntuInstall)


## Steps to create project

If you do not have a workspace configured

```bash
mkdir <your-workspace-name>
cd <your-workspace-name>
```

See the research ops using gitlab page for more
	
```bash
git clone git@gitlab.deri.ie:smarterdata/discover-smarter.git
```

## Running application from sbt

To build Discover Smarter Application from SBT:

```bash
cd discover-smarter
sbt clean compile stage
```

To run the web application:

```bash
sbt run
```

To reload it:

```bash
sbt reload
```

To create a zip distribution:

```activator dist
```
For Play 2.0.x and 2.1.x use the start script (Unix Only) in the extracted zip:

```start -Dhttp.port=8080
```

### What's happening in the background

The sbt build will pull down dependencies and place them in `$HOME/.ivy2`

## Running application from typesafe activator

Setting up the project:

```bash
cd discover-smarter
./activator
```

This is a CLI to help you run your application, it reloads the application as you make changes, which should help you during your web development.  You can also use the very nice activator ui, which is a bit processor intensive, but fun to use.

To set up you eclipse configuration 

	[smarter-data] $ eclipse

from the command-line call

	[smarter-data] $ run

the first time this will build the dependencies and run your application locally, your application should be running from port 9000

http:localhost:9000

The application is now running, any saved changes to the code will be reflected the application in near real time, much like a ruby application.

You will be shown a SQL statement for all the tables that need to be created - please select "apply this script now", the tables are created and 
the application is ready to go.

### login

You will need to login, please use the login name guido.cecilio@deri.org and password secret.

Your first commit might be to add yourself to the `Global.scala` file.

## Structure of the application

the application follows a standard play application format.  Key folders are 

### /app

all application code is here.  THis includes CSS and Javascript, which are processed as part of the play framework.

### /conf

All configuration is here

### /public

All public resources are kept here, such as images.
