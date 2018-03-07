package analytics

import models.Datasource
import play.api.Logger
import models.AnalyticsRule
import storage.SmartResource

/**
 * Command which executes Datablock rules given an id of the rule
 * 
 * @author naoise
 *
 */
trait ExecuteRule {
    /**
     * Command which executes Datablock rules given an id of the rule returns 
     * the Smart resource of the result of execution.
     * 
     * @param id could be internal identifier or url depends on the iplementation
     * @return result of execution
     */
    def executeRule(id: String): Option[SmartResource]
    
    
}


/**
 * Executes rule only when we need it, otherwise returns the last rule executed
 * 
 * Abstract trait, provides convenience methods to check for latest, could be improved
 * 
 *
 */
trait ExecuteRuleOnlyWhenNeeded extends ExecuteRule{
	
    def exeuteIf(rule: AnalyticsRule, source: SmartResource): SmartResource = rule.lastExecutedResult match{
       case None => executeDatablock(rule, source)
       case Some(last: String) if rule.queryString.equals(last) =>  source.getLatest() //SmartResource("bogus.hdt")
       case _ => executeDatablock(rule, source)
    }
    
    def executeDatablock(rule: AnalyticsRule, source: SmartResource): SmartResource= {
        Logger.debug("Got location for graphId [" + rule.graph + "] now loading [" + source.clientUrl + "]")
        AnalyticsRule.updateLastExecutedResult(rule.id.get, rule.queryString)
        DataBlock(rule.queryString, source, rule.queryLang.toLowerCase()).execute()
    }
}


/**
 * Executes a rule based on records in the standard smarter data SQL database
 * Useful for local executions and demos from personal machines
 * 
 */
trait ExecuteDBRule extends ExecuteRuleOnlyWhenNeeded {

    def executeRule(id: String): Option[SmartResource] = {
        AnalyticsRule.findById(id).map(executeAnalyticsRule(_))
    }

    def executeAnalyticsRule(rule: AnalyticsRule): SmartResource = {  
       val location = Datasource.findById(rule.graph).get.location 
       val datablockOutput = exeuteIf(rule, SmartResource(location))
       datablockOutput
    }
    
}