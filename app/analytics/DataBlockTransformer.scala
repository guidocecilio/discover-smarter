package analytics
import scala.collection.JavaConversions._
import scala.collection.JavaConverters._

import java.util.ArrayList
import java.util.Collection
import java.util.LinkedHashMap

import play.api.libs.json.Format
import play.api.libs.json.JsArray
import play.api.libs.json.JsNumber
import play.api.libs.json.JsResult
import play.api.libs.json.JsString
import play.api.libs.json.JsSuccess
import play.api.libs.json.JsValue
import play.api.libs.json.Json
import play.api.libs.json.Json.JsValueWrapper
import play.api.Logger

import reflect.ClassTag

import com.tinkerpop.blueprints.Direction
import com.tinkerpop.blueprints.Graph
import com.tinkerpop.gremlin.scala.ScalaGraph
import com.tinkerpop.gremlin.scala.ScalaEdge
import com.tinkerpop.pipes.util.structures.Table
import org.rdfhdt.hdt.blueprint.HDTBlueprintGraph


import storage.SmartResource


/**
 * Enumeration of the formats data can be returned as.
 */
object Encoding extends Enumeration {
	type Encoding = Value
	val HDT = Value("hdt")
	val JSON = Value("json")
	
	def fromPath(graphLocation: String):Encoding = graphLocation match {
        case hdt if hdt.endsWith("hdt") => HDT
        case _ => HDT // Should be json but there you go
    }
}
import Encoding._

case class SimpleEdge(source: Long, target: Long, weight: Long)
case class SimpleGraph(nodes: Seq[Map[String, Any]], links: List[SimpleEdge])


/**
 *  Allows data to be transformed from java or scala classes to
 *  supported serialisation types
 *  currently these are JSON or simple scala collections
 *  Should soon include HDT, passed as a URL reference to the file.
 */
object DataBlockTransformer {

//    val writeFolder = "target/"
//
//    /**
//     *
//     * @param g graph to process, it should be anything from HDT to Neo4J
//     * @return a simple graph
//     */
//    def toSimpleGraph(g: Graph): SimpleGraph = g match {
//        case sg: ScalaGraph => simpleFromScala(sg)
//        case tg: Graph => simpleFromScala(ScalaGraph(tg))
//    }
//
//  /**
//   * Converts entity list to simple graph 
//   * @param list list of entities 
//   * @return a simple graph
//   */
//  def entityListToGraph(list : java.util.List[NamedEntity]) : SimpleGraph = {
//    val nodes = for(item <- list) yield Map("name" -> item.getName(),  "type" -> item.getType())
//    //links the the entity with the document entity 
//    val links = for (i <- 0 to nodes.size) yield SimpleEdge(0,i,3)
//    new SimpleGraph(nodes, links.toList)
//  }
//
//    def whatTypeIsData(data: Object): String = data match {
//        case graph: Graph => "graph"
//        case table: Table => "table"
//        case col: Collection[Any] => "table"
//        case map: java.util.Map[String, Object] => "map" //toList works well for tinkergraoh
//        case map: java.util.List[Object] => "list"
//        case unknown => "unknown" + unknown.getClass
//    }
//   
//  /**
//   * Converts supported collections to JSON
//   * Currently supports gremlin graphs, maps and lists of strings
//   * @param result result of datablock execution
//   * @return json object that can be serialised to a json string
//   * 
//   *
//   * 
//   */
//    //FIXME: ND: 03/06/14 http://stackoverflow.com/questions/1094173/how-do-i-get-around-type-erasure-on-scala-or-why-cant-i-get-the-type-paramete
//  def toJson(result: Object): JsValue = result match {
//    case graph: Graph => Json.toJson(toSimpleGraph(graph))
//    case map: java.util.Map[String, Object] => Json.toJson(map.asScala.toMap)
//    case map: Map[String, Any] => Json.toJson(map)
//    case string: String => Json.parse(string);
//    case list: java.util.List[Any] => jsonToList(list)
//    case list: List[String] => Json.toJson(list)
//    case str: String => Json.toJson(str)
//  }
//  
//  def jsonToList[A:ClassTag](list: java.util.List[A]) = list match {
//    case list: java.util.List[NamedEntity] => Json.toJson(entityListToGraph(list))
//    case list: java.util.List[String] => Json.toJson(list.asScala.toList)
//
//  }
//
//
//    private def getSimpleEdge(se: ScalaEdge): SimpleEdge = SimpleEdge(getV(se)(Direction.IN), getV(se)(Direction.OUT), 3)
//
//    private def getV(se: ScalaEdge)(dir: Direction): Long = toLong(se.getVertex(dir).getId)
//
//    /**
//     * converts various java objects to strings, useful when enumerating edges of graph
//     * @param obj
//     * @return
//     */
//    private def toLong(obj: Object): Long = obj match {
//        case str: String => str.toLong
//        case lng: java.lang.Long => lng.longValue
//        case lng: java.lang.Integer => lng.longValue
//    }
//
//    /**
//     *
//     *
//     * @param se
//     * @param dir
//     * @return
//     */
//    private def getEdgeWeight(se: ScalaEdge, dir: Direction): Long = toLong(se.getVertex(dir).getId)
//    /**
//     * creates a list ready for JSON based on a scala graph passed to it.
//     * @param g
//     * @return
//     */
//    private def simpleFromScala(g: ScalaGraph) = {
//        val nodes = g.V.propertyMap.toList
//        val listOfEdges = g.E.toList
//        val edges = listOfEdges.map(getSimpleEdge _).toList
//        new SimpleGraph(nodes, edges)
//    }
//
//    // Implicit functions used for conversion to json of some complex types
//
//    implicit val objectMapFormat = new Format[Map[String, Any]] {
//
//        def cleanString(str: String) = JsString(str.replace('\"', ' ').trim)
//
//        def cleanHdt(i: java.util.Iterator[Object]): JsValue = {
//            val values = i.asScala.toList.map(x => cleanString(x.toString()))
//            if (values.length == 1) {
//                values.get(0)
//            } else {
//                JsArray(values)
//            }
//        }
//
//        def getJsValue(any: Any): JsValueWrapper = any match {
//            case str: String => cleanString(str)
//            case int: java.lang.Integer => JsNumber(int.asInstanceOf[Int])
//            case flt: java.lang.Float => JsNumber(flt.asInstanceOf[Float])
//            case itr: java.util.Iterator[Object] => cleanHdt(itr)
//            case None => JsString("Empty node: smarter data warning, this indicated bad data.")
//        }
//
//        def writes(myMap: Map[String, Any]): JsValue = {
//            if (myMap.size == 0) {
//                Json.obj("blank" -> "node")
//            } else {
//                Json.obj(myMap map { case (s, o) => (s -> getJsValue(o)) } toSeq: _*)
//                //if there are edges in the pipeline - send the edges to the indexer and then serialsise the graph
//            }
//        }
//
//        def reads(jv: JsValue): JsResult[Map[String, Any]] =
//            JsSuccess(jv.as[Map[String, JsValue]].map {
//                case (k, v) =>
//                    k -> (v match {
//                        case s: JsString => s.as[String]
//                        case n: JsNumber => n.as[BigDecimal]
//                        case l => l.as[List[String]]
//                    })
//            })
//    }
//
//    implicit val edgeFormat = Json.format[analytics.SimpleEdge]
//    implicit val graphFormat = Json.format[SimpleGraph]

}