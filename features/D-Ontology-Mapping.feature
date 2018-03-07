Feature: Type infrencing and mapping index 

   So I can map types to every node in the graph
  
  Scenario: index the file and get node type
  	Given there is a RDF file  "foaf.rdf"
  	When I call the indexing service and lookup for subject uri "http://www.w3.org/People/Berners-Lee/card#i"
  	Then I am returned a json list of types that include the following
  	| http://www.w3.org/2002/07/owl#Thing |
  	| http://xmlns.com/foaf/0.1/Person |
  	| http://www.w3.org/2003/01/geo/wgs84_pos#SpatialThing |
  	| http://www.w3.org/2000/01/rdf-schema#Resource |
  	| http://xmlns.com/foaf/0.1/Agent |
  
   Scenario: index the file and get node simple type such Person, Location, Document etc.
  	Given there is a RDF file  "foaf.rdf"
  	When I call the indexing service and lookup for subject uri "http://www.w3.org/People/Berners-Lee/card#i" in min index
  	Then returned value for the type should be "Person"  