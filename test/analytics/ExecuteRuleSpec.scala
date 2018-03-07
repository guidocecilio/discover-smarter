package analytics

import org.junit.runner.RunWith
import org.specs2.Specification
import org.specs2.mock.Mockito
import org.specs2.mutable.SpecificationWithJUnit
import org.specs2.runner.JUnitRunner
import play.api.libs.json.JsValue
import play.api.mvc.AnyContent
import play.api.mvc.Controller
import play.api.test.DefaultAwaitTimeout
import play.api.test.Helpers._
import play.api.test.PlaySpecification
import play.api.test.ResultExtractors
import play.api.test.WithApplication
import scala.concurrent.Future
import models.AnalyticsRule
import play.api.libs._
import anorm.Id
import storage.SmartResource
import storage.LocalStore
import java.io.File

/**
 * Tests for executing analytics rules, tests most of the services features
 *
 * Execution of Analytics rules allows us to create new graphs from existing graph data.
 * Should help us with
 *
 */
@RunWith(classOf[JUnitRunner])
class ExecuteRuleSpec extends SpecificationWithJUnit with Mockito{

    trait MockAfterExecution extends AfterExecution{
		val mockedFuture  = mock[Future[ws.Response]]
		def callMe(callback: String, json: JsValue): Future[ws.Response] = {
		    mockedFuture
		}
	}
    
    lazy val moveHdtFile = { 
    	
	    val src = new File("public/hdt/swdf-2012-11-28.hdt")
	    val dest = SmartResource("swdf.hdt")
	    if (!dest.pull.exists) {
	    	new LocalStore{}.initStore()
	    	Files.copyFile(src, dest.pull, true, true)
	    	
	    }
	}

    def date(str: String) = new java.text.SimpleDateFormat("yyyy-MM-dd").parse(str)
    
    "ExecuteDBRule when called from Analytics Operation" should {
//        
//        "Not Execute datablock if no change to query and previous result file exists" in new WithApplication {
//        	moveHdtFile
//            val fixture = new AnalyticsOperation() with ExecuteDBRule with MockAfterExecution
//            
//            AnalyticsRule.create(new AnalyticsRule(Id("notexecutetest"),  "Test", 
//              "//this should not execute", "Gremlin", 2L, Some(date("2013-11-12")), Option("//this should not execute"), false, 1L))
//
//              val latestFileBeforeWeExecute = SmartResource("swdf.hdt").getLatest.innerUrl
//              val resultSmartResource = fixture.executeRule("notexecutetest")
//              
//              resultSmartResource.get.innerUrl must beEqualTo(latestFileBeforeWeExecute)
//        }
//        
//        "Execute rule in datablock if query has changed creating a new result file" in new WithApplication {
//        	moveHdtFile
//            val fixture = new AnalyticsOperation() with ExecuteDBRule with MockAfterExecution
//            AnalyticsRule.create(new AnalyticsRule(Id("executetest"),  "Test", 
//              "g", "Gremlin", 2L, Some(date("2013-11-12")), Option("//oh yes it should execute"), false, 1L))
//              
//              val latestFileBeforeWeExecute = SmartResource("swdf.hdt").getLatest.innerUrl
//              //Thread.sleep(1000L)
//              val resultSmartResource = fixture.executeRule("executetest")
//              
//              resultSmartResource.get.innerUrl must not be equalTo(latestFileBeforeWeExecute)
//        }
        
        "Execute sparql rule in datablock if query has changed creating a new result file" in new WithApplication {
        	moveHdtFile
            val fixture = new AnalyticsOperation() with ExecuteDBRule with MockAfterExecution
            AnalyticsRule.create(new AnalyticsRule(Id("executetest"),  "Test", 
               """SELECT DISTINCT ?s ?p ?o
						WHERE {
						    ?s a <http://xmlns.com/foaf/0.1/Person> .
						    ?s <http://xmlns.com/foaf/0.1/name> ?name .
						    ?s <http://swrc.ontoware.org/ontology#affiliation> <http://data.semanticweb.org/organization/deri-nui-galway> .
            		        ?s ?p ?o.
						}""", "sparql",
				2L, Some(date("2013-11-12")), 
				Option("""SELECT DISTINCT ?s ?name
						WHERE {
						    ?s a <http://xmlns.com/foaf/0.1/Person> .
						    ?s <http://xmlns.com/foaf/0.1/name> ?name .
						    ?s <http://swrc.ontoware.org/ontology#affiliation> <http://data.semanticweb.org/organization/deri-nui-galwa> .
						}"""), false, 1L))
              
              val latestFileBeforeWeExecute = SmartResource("swdf.hdt").getLatest.innerUrl
              Thread.sleep(1000L)
              val resultSmartResource = fixture.executeRule("executetest")
              
              resultSmartResource.get.innerUrl must not be equalTo(latestFileBeforeWeExecute)
        }
        
    }
}
