package analytics

import storage.SmartResource
import play.api.Logger
import javax.script.ScriptEngineManager
import org.rdfhdt.hdt.hdt.impl.HDTImpl
import org.rdfhdt.hdt.options.HDTSpecification
import org.rdfhdt.hdt.listener.ProgressListener
import org.rdfhdt.hdtjena.HDTGraph
import com.hp.hpl.jena.rdf.model.Model
import com.hp.hpl.jena.query.QueryExecution
import com.hp.hpl.jena.rdf.model.ModelFactory
import com.hp.hpl.jena.query.QueryFactory
import com.hp.hpl.jena.query.QueryExecutionFactory
import com.hp.hpl.jena.query.ResultSetFormatter


/**
 * How am I doing? let me log the ways
 *
 */
class PrintProgress extends ProgressListener{
	def notifyProgress(level: Float, message: String ){
		Logger.info("HDT: progress level is [" + level + "], message is now [" + message +"]" )
	}
}

/**
 * Executes a sparql query on HDT using Jena.
 * 
 * @author naodun
 *
 */
trait SparqlEngine extends ScriptEngine{
    
    def run(query: String, input: SmartResource): Any ={
    	Logger.info("running a sparql query")
    	// going around HDTManager singleton 
    	val hdt = new HDTImpl(new HDTSpecification());
    	hdt.loadFromHDT(input.innerUrl, new PrintProgress())

		val graph = new HDTGraph(hdt)
		val model = ModelFactory.createModelForGraph(graph)
		val sparql = QueryFactory.create(query)
		val qe = QueryExecutionFactory.create(sparql, model)
		val results = qe.execSelect()
		results
    }
}