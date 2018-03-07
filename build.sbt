name := """discover-smarter"""

version := "1.0-SNAPSHOT"

libraryDependencies ++= Seq(
  // Select Play modules
  jdbc,      // The JDBC connection pool and the play.api.db API
  anorm,     // Scala RDBMS Library
  javaCore,  // The core Java API
  //
  // Open calais for entity extraction
  "mx.bigdata.jcalais" % "j-calais" % "1.0",
  //
  // WebJars pull in client-side web libraries
  "org.webjars" %% "webjars-play" % "2.2.0",
  "org.webjars" % "bootstrap" % "3.0.2",
  "org.webjars" % "jquery-file-upload" % "8.4.2",
  "org.webjars" % "d3js" % "3.3.5",
  "org.webjars" % "backbonejs" % "1.1.2-2",
  "org.webjars" % "backbone-localstorage" % "1.1.0",
  "org.webjars" % "dropzone" % "3.7.1",
  "org.webjars" % "bootstrap-datepicker" % "1.2.0",
  "org.webjars" % "underscorejs" % "1.6.0-3",
  "org.webjars" % "jquery-ui" % "1.10.3",
  "org.webjars" % "ace" % "07.31.2013",
  "org.webjars" % "datatables" % "1.10.2",
  //
  // gremlin and HDT
  "com.michaelpollmeier" % "gremlin-scala" % "2.4.1",
  "org.rdfhdt" % "hdt-blueprint" % "0.0.1-SNAPSHOT",
  "org.rdfhdt.hdt" % "hdt-gremlin-writer" % "0.0.1-SNAPSHOT",
  "org.rdfhdt" % "hdt-jena" % "1.1",
  "org.rdfhdt" % "hdt-merge" % "0.9-SNAPSHOT",
  "com.tinkerpop.gremlin" % "gremlin-groovy" % "2.4.0",
  "com.tinkerpop.blueprints" % "blueprints" % "2.4.0",
  //
  //tarql
  "ie.deri.tarql" % "tarql" % "1.1-SNAPSHOT",
  //
  // MySQL Support
  "mysql" % "mysql-connector-java" % "5.1.34",
  //testing
  "junit" % "junit" % "4.8.2",
  "org.hamcrest" % "hamcrest-library" % "1.3",
  "com.typesafe.play.plugins" %% "play-statsd" % "2.2.0",
  "com.google.inject" % "guice" % "3.0" % "test",
  "info.cukes" % "cucumber-java" % "1.1.5" % "test",
  "info.cukes" % "cucumber-junit" % "1.1.5" % "test",
  "com.novocode" % "junit-interface" % "0.9" % "test",
  "org.jacoco" % "org.jacoco.core" % "0.6.4.201312101107" artifacts(Artifact("org.jacoco.core", "jar", "jar")),
  "org.jacoco" % "org.jacoco.report" % "0.6.4.201312101107" artifacts(Artifact("org.jacoco.report", "jar", "jar")),
  "org.mockito" % "mockito-all" % "1.9.5"
)

play.Project.playScalaSettings

closureCompilerOptions := Seq("rjs")

resolvers += Classpaths.typesafeResolver

resolvers  ++= Seq( "Insight Galway" at "http://hcls02.sindice.net:8081/nexus/content/groups/public/" )

unmanagedResourceDirectories in Test <+= baseDirectory( _ / "features" )

EclipseKeys.withSource := true

net.virtualvoid.sbt.graph.Plugin.graphSettings
