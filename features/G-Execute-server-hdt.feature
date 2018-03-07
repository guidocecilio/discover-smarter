Feature:    G-Execute_server-table Execute Gremlin Queries with graph resuts
   So I can Execute Gremlin Query, and asynchronosly access the result
   As a Query Writer
   I would like Run Gremlin queries on the server from a saved query, store the result as a file, and be returned the resulting location
   and return results as a JSON graph

   Scenario: I can load hdt file and run a query and return a reference to a graph
    Given I have a file located at "public/hdt/swdf-2012-11-28.hdt"
    And I want a result stored in "local"
    # should have async rule here
    When I run a long rule
    """
		g
    """
    Then the result should contain a url of "someurl"
