Feature:    G-Execute_server-graph Execute Gremlin Queries with graph resuts
   So I can Execute Gremlin Queries with tabular results
   As a Query Writer
   I would like Run Gremlin queries on the server from a saved query 
   and return table of results as JSON
   http://purl.org/dc/elements/1.1/title
   GRDDLing with Xcerpt
   http://vimeo.com/29458354

  Scenario: I can load a tinkergraph and run a query and return a table
    Given I have a file located at "tinkergraph"
    When I run a json rule 
    """
    	def map = [name:"Gromit", likes:"cheese", id:1234]
		map 
    """
    Then I get the following map
    | key 	| value 	|
    | name  | Gromit	|
    | likes | cheese    |
    | 1d 	| 1234    	|
