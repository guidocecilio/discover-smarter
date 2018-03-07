Feature: Facets
  
#  Scenario: renders a graph
#    Given I have the following nodes in a graph
#    | type     | flavour    | country     | popular |
#    | Icecream | Strawberry | England     | Sorta   |
#    | Icecream | Chocolate  | Ivory Coast | Yes     |
#    | Icecream | Neopolitan | Italy       | No      |
#    | Sorbet   | Lemon      | France      | Yes     |
#    When I transform this graph
#    Then I get a SimpleGraph containing the node "Icecream" 
    
    
#  Scenario: displays correct facets for graph 
#    Given I have the following nodes in a graph
#    | type     | flavour    | country     | popular |
#    | Icecream | Strawberry | England     | Sorta   |
#    | Icecream | Chocolate  | Ivory Coast | Yes     |
#    | Icecream | Neopolitan | Italy       | No      |
#    | Sorbet   | Lemon      | France      | Yes     |
#    When I facet this data
#    Then for the facet group "Type" I am shown the following facets
#    | Facet    | count |
#    | Icecream | 3     |
#    | Sorbet   | 1     |
#    And for the facet group "Flavour" I am shown the following facets
#    | Facet      | count |
#    | Strawberry | 1     |
#    | Chocolate  | 1     |
#    | Neopolitan | 1     |
#    | Lemon      | 1     |