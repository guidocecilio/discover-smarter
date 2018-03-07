Feature:    G-Execute_server-table Execute Gremlin Queries with graph resuts
   So I can Execute Gremlin Queries with graph results
   As a Query Writer
   I would like Run Gremlin queries on the server from a saved query 
   and return results as a JSON graph

  Scenario: I can load a tinkergraph and run a query and return a graph
    Given I have a file located at "tinkergraph"
    When I run a rule "TinkerGraphFactory.createTinkerGraph()"
    Then the number of edges should be 6
 
   Scenario: I can load hdt file and run a query and return a graph
    Given I have a file located at "public/hdt/swdf-2012-11-28.hdt"
    When I convert to a simple graph
    Then the number of edges should be 32443
    
   Scenario: I can load a tinkergraph and return a subgraph
    Given I have a file located at "tinkergraph"
    When  I run a long rule
    """
		g.E.has('label','knows')
		sg = new TinkerGraph()
		count = 0
		def goc(v,g){
		 	nv=g.getVertex(v.id);
		 	if(nv==null){
		 		nv=g.addVertex(++count,ElementHelper.getProperties(v))
		 	};
		 	nv
		}
		g.E.has('label','knows').sideEffect{
			sg.addEdge(it.id,
						goc(it.outV.next(),sg),
						goc(it.inV.next(),sg),
						it.label,
						ElementHelper.getProperties(it))
			}.iterate()
		sg
    """
    Then the number of edges should be 3
    
   Scenario: I can load hdt file and run a query and return a graph
    Given I have a file located at "public/hdt/swdf-2012-11-28.hdt"
    When I run a json rule 
    """
    	g
    """
    Then I get the following map
    | key 	| value 	|
    | bob  	| billy		|
