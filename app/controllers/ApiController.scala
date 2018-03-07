package controllers
import play.api.mvc.{Action, Controller}
import play.api.libs.json.Json
import play.api.Routes
import play.api.mvc._
import play.api.mvc.Results
import play.modules.statsd.Statsd
import play.api.libs.ws.WS
import play.api.libs.concurrent.Execution.Implicits._
import play.api.Play
import play.api.data.Forms._
import play.api._
import play.api.mvc._
import play.api.data._
import play.data.DynamicForm
import play.mvc.Result
import org.joda.time.DateTime
import play.api.libs.json.Format
import play.api.libs.json.JsArray
import play.api.libs.json.JsNumber
import play.api.libs.json.JsResult
import play.api.libs.json.JsString
import play.api.libs.json.JsSuccess
import play.api.libs.json.JsValue
import play.api.libs.json.Json
import play.api.libs.json.Json.JsValueWrapper
import play.Play
import play.api.libs.iteratee.Enumerator
import processing.index.TypeIndex
import processing.ner.NamedEntityExtractor
import processing.ner.OpenCalaisExtractor
import storage.SmartResource
import play.api._
import play.api.mvc._
import play.api.libs.json._
import play.api.libs.functional.syntax._
import processing.merge.HdtSave
import processing.merge.FileServices
import processing.merge.HdtSave

case class Response(status: String)

object ApiController extends Controller {
  
  implicit val fooWrites = Json.writes[Response]
    
    implicit val rds = (
    (__ \ 'triples).read[String] and
    (__ \ 'hdtfile).read[String]
  ) tupled

  //save triples and merge them to hdt 
  def save = Action { request =>
    request.body.asJson.map { json =>
      json.validate[(String, String)].map{ 
        case (triples, hdtfile) =>{
          HdtSave.saveTriples(triples, hdtfile)
          Ok(Json.obj("status" ->"OK", "message" -> ("Successfully saved!") ))
        }
      }.recoverTotal{
        e => BadRequest("Detected error:"+ JsError.toFlatJson(e))
      }
    }.getOrElse {
      BadRequest("Expecting Json data")
    }
  }
    
  //proxy for cron service 
  def addCronJob () = Action.async  {
       request => {
         WS.url(play.api.Play.current.configuration.getString("cron_service").get + "add").withHeaders("Content-Type" -> "application/json").post(request.body.asJson.get).map(resp => Ok(resp.body).as("text/json"))
       }     
  }
  
  //call the service for converting csv to RDF and HDT
  def convertCSV2RDF(file : String) = Action {
    try{
         val resource: SmartResource = FileServices.convertCsvToHDT(file);
         Ok(Json.obj("status" ->"OK", "file"->resource.simpleName, "lastest"->resource.getLatest().clientUrl,"message" -> ("Scala::Successfully converted to RDF and HDT") ))
    }catch{
    	case e: Exception => BadRequest
    }
  }
  
  //proxy for graphite service
  def renderGraph () = Action.async  {
	  	request => {
	  	    System.out.println(play.api.Play.current.configuration.getString("graphite_service").get +"render?" + request.rawQueryString)
	  		WS.url(play.api.Play.current.configuration.getString("graphite_service").get +"render?" + request.rawQueryString).get().map { r =>
	  			Ok(r.getAHCResponse.getResponseBodyAsBytes).as("image/png")
	  	    }
    	}
   }
 
  //extract entities from file 
  def extractEntities (file : String) = Action {
	  val ner = new NamedEntityExtractor(new OpenCalaisExtractor());
	  Ok(ner.extractAsJson(SmartResource(file).getLatest().innerUrl));
  }
  

  def build(file : String) = Action {
    try{
    	Logger.info("starting jena index of file" + file + "...")
        TypeIndex.build(file)
    	Statsd.increment("index.builds")
    	Logger.info("completed building jena index of file" + file)
    	Ok(Json.toJson(Response("done")))
    }catch{
    	case e: Exception => {
    		Logger.error("could not build index, reason ", e)
    	    BadRequest;
    	    }
    }
  }
  
   def getIndex(file : String) = Action {
    try{
        Statsd.increment("index.accesses")
    	Ok(TypeIndex.getIndexAsJson(file))
    }catch{
    	case e: Exception => BadRequest
    }
  }
  
  def getMinIndex(file : String) = Action {
    try{
       Statsd.increment("index.accesses")
    	Ok(TypeIndex.getMinIndexAsJson(file))
    }catch{
    	case e: Exception => BadRequest
    }
  }
 implicit val objectMapFormat = new Format[Map[String, Any]] {

    def cleanString(str: String) = JsString(str.replace('\"', ' ').trim)

   
    def getJsValue(any: Any): JsValueWrapper = any match {
      case str: String => cleanString(str)
      case int: java.lang.Integer => JsNumber(int.asInstanceOf[Int])
      case flt: java.lang.Float => JsNumber(flt.asInstanceOf[Float])
         case None => JsString("Empty node: smarter data warning, this indicated bad data.")
    }

    def writes(myMap: Map[String, Any]): JsValue = {
      if (myMap.size == 0) {
        Json.obj("blank" -> "node")
      } else {
        Json.obj(myMap map { case (s, o) => (s -> getJsValue(o)) } toSeq: _*)
        //if there are edges in the pipeline - send the edges to the indexer and then serialsise the graph
      }
    }

    def reads(jv: JsValue): JsResult[Map[String, Any]] =
      JsSuccess(jv.as[Map[String, JsValue]].map {
        case (k, v) =>
          k -> (v match {
            case s: JsString => s.as[String]
            case n: JsNumber => n.as[BigDecimal]
            case l => l.as[List[String]]
          })
      })
  }
 
}