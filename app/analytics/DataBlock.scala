package analytics

import org.rdfhdt._
import org.rdfhdt.hdt.blueprint.HDTBlueprintGraph
import com.tinkerpop.blueprints.Direction
import com.tinkerpop.blueprints.Graph
import com.tinkerpop.blueprints.Edge
import com.tinkerpop.blueprints.impls.tg.TinkerGraph
import com.tinkerpop.blueprints.impls.tg.TinkerGraphFactory
import com.tinkerpop.gremlin.java.GremlinPipeline
import com.tinkerpop.gremlin.scala.GremlinScalaPipeline
import com.tinkerpop.gremlin.scala.ScalaEdge
import com.tinkerpop.gremlin.scala.ScalaGraph
import org.rdfhdt.hdt.gremlinwriter.GremlinWriter
import com.tinkerpop.pipes.util.structures.Table
import com.tinkerpop.gremlin.java.GremlinPipeline
import javax.script.ScriptEngineManager

import play.api.Logger
//import processing.ner.NamedEntityExtractor
//import processing.ner.OpenCalaisExtractor
//import processing.ner.NamedEntity
//import processing.ner.ExtractorService
import java.util.ArrayList
import java.util.Collection
import java.util.LinkedHashMap
import storage.SmartResource

import play.api.libs.json.JsValue

/**
 * Class for processing data, allows for execution, chaining and conversion of return type to nice json
 * Collects utility methods from related classes
 * allows for a fluid programming style, which supports loading, transformation and simple composition of chains
 *
 * @author naodun
 *
 */
trait ScriptEngine {
    def run(query: String, input: SmartResource): Any
}

trait GremlinEngine extends ScriptEngine{
    
    def run(query: String, sr: SmartResource): Any ={
    	Logger.info("running a gremlin query")
    	val input = sr.load()
        val engine = new ScriptEngineManager().getEngineByName("gremlin-groovy");
        val bindings = engine.createBindings();
        // FIXME: cannot use var in this code...
//        var ner = new NamedEntityExtractor(new OpenCalaisExtractor())
//        bindings.put("extractor", ner)
        bindings.put("g", input)
        bindings.put("PATH", play.Play.application().configuration().getString("data.path"))
        engine.eval(query, bindings)
    }
}


class DataBlock(input: SmartResource, query: String, output: SmartResource){
    
    this: ScriptEngine =>
    
    def execute(): SmartResource  = {
    	Logger.info("Executing datablock...")
        val data = run(query, input)
        Logger.info("Datablock Executed. \nNow pushing result to [" + output.innerUrl + "]")
        output.push(data)
        output
    }
}

object DataBlock{

    def apply(query: String, input: SmartResource, queryType: String):DataBlock = (input, queryType) match {
        case (SmartResource(protocol, domain, port, simpleName, _, "hdt", _), "gremlin") => new DataBlock(input, query, SmartResource(simpleName, input.extension)) with GremlinEngine 
    	case (SmartResource(protocol, domain, port, simpleName, _, "hdt", _), "sparql") => new DataBlock(input, query, SmartResource(simpleName, input.extension)) with SparqlEngine 
        case _  => new DataBlock(input, query, SmartResource("unknown", input.extension))  with GremlinEngine
    }
}
