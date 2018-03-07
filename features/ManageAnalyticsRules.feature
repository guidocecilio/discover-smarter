Feature: Viewer creates Analytics Rule
  
  Scenario: I can create a new project
  	Given there is a group called "demo"
  	And there is no existing project in "demo" called "demo test" using "tinkergraph"
  	When I add a project called "test demo test" to the "demo" group
  	Then there is a project called "demo test" using "tinkergraph"