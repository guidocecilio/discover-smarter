Feature: Web service Entity Extraction on Document 

   So I can Extract Entity on Document better than Kanopy using web service
   As a Builder
   I would like to use open Calais for entity extraction on a documents text
  
  
  Scenario: Can I extract entities from a text file
  	Given there is a text file called "../discover-smarter/public/testdata/WhoIsPeterFitzgerald.txt"
  	And there is an open Calais webservice is located at "http://opencalais.com/xxxx"
  	When I call the disambiguation service
  	Then I am returned a json list of entities that include the following
  	| Entity 						|
  	| Anglo Irish Bank				|
  	| Central Bank of Ireland		|
  	| Enda Kenny 					|
  	| Peter Fitzgerald				|
  	| John Bowe						|
  	| Yeoman International Leasing 	|
  	
  	Scenario: Call from Groovy
    Given there is a text file called "../discover-smarter/public/testdata/WhoIsPeterFitzgerald.txt"
    And I bind it as a parameter
  	When I call the disambiguation service from the following Groovy Script
  	"""
  	extractor.extractAsJson("../discover-smarter/public/testdata/WhoIsPeterFitzgerald.txt")
  	"""
  	Then I am returned a json list of entities that include the following
  	| Entity 						|
  	| Anglo Irish Bank				|
  	| Central Bank of Ireland		|
  	| Enda Kenny 					|
  	| Peter Fitzgerald				|
  	| John Bowe						|
  	| Yeoman International Leasing 	|
  	
  