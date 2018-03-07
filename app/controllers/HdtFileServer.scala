package controllers

import models._
import play.api._
import play.api.mvc._
import play.api.data._
import play.api.libs.json._
import storage.SmartResource
import storage.LocalStore
import play.api.libs.iteratee.Enumerator
import play.api.libs.concurrent.Execution.Implicits._
import org.rdfhdt.hdt.enums.RDFNotation
import org.rdfhdt.hdt.hdt.HDT
import org.rdfhdt.hdt.hdt.HDTManager
import org.rdfhdt.hdt.options.HDTSpecification 
case class SimpleFile(name: String, size: Int)

/**
 * Basic class for serving files locally, in larger solutions this
 * would be replaced by a full file server
 *
 * This service is used in the smarter data call sequence to serve actual data
 *
 * @author naodun
 *
 */
object HdtFileServer extends Controller {
    
	implicit val fileFormat = Json.format[SimpleFile]
    implicit val fooWrites = Json.writes[Response]
	val simpleFilePattern = """([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)""".r
	
    /**
     * @param analyticsRuleId
     * @return
     */
    def getFileById(analyticsRuleId: String) = {
        def rule = AnalyticsRule.findById(analyticsRuleId)
        getFileByName(Datasource.findById(rule.get.graph).get.location)
    }
	
	
    /**
     * Used as simple local file server, this can be replaced by other repository
     *
     * @param location location of the file you want served
     * @return the file if it exists
     */
    def getFileByName(location: String) = Action { 
        Logger.info("getFileByName: request for file ["+location+"]")
        Ok.sendFile(content = SmartResource(location).pull()) 
    }
    

    /**
     * Getting latest resource with given simple name and extension
     * 
     * @param simpleName
     * @param extension
     * @return
     */
    def getLatest(simpleName: String, extension: String) = Action {
        Ok(new LocalStore{}.getLatest(simpleName,extension).clientUrl)
    }

    
    /**
     * Lists files in the current default store.
     * @return a json encoded list of files in the default store.
     */
    def listFiles = Action {
        val files = new LocalStore{}.listFiles.filter(SmartResource.valid(_)).map(SimpleFile(_, 100))
        Ok(Json.toJson(files))
    }

    /**
     * This method handles all file uploads to the server
     * can handle many multi-part file
     */
    def upload = Action(parse.multipartFormData) { request =>
        request.body.file("file").map { file =>
        	val tempLocation = SmartResource(file.filename)
        	val tempFileLocation = tempLocation.pull()
        	Logger.info("Checking if temp location exists")
        	if (!tempFileLocation.exists()) tempFileLocation.createNewFile()
            file.ref.moveTo(tempFileLocation, true)
            
            // Add new cases for special file-types here 
           val filesAsSmartResource:SmartResource =  file.filename match {
        		case simpleFilePattern(simpleName, "nt" | "rdf" | "json") => {
        			val asHdtSmartResource = SmartResource(SmartResource(file.filename).simpleName,"hdt")
        			// FIXME: generateHDT is falling over and swallowing exceptions!
		        	HDTManager.generateHDT(tempLocation.innerUrl(), "http://insight-centre.org/smarterdata", RDFNotation.NTRIPLES, new HDTSpecification(), null).saveToHDT(asHdtSmartResource.innerUrl, null)
		        	asHdtSmartResource
        		}
    			case _ => tempLocation
        	}
            Ok(Json.obj(
            		"status" -> "SUCCESS",
            		"originalFile" -> file.filename,
            		"simpleName" -> filesAsSmartResource.simpleName,
            		"clientUrl" -> filesAsSmartResource.clientUrl,
            		"innerUrl" -> filesAsSmartResource.innerUrl))
        }.getOrElse {
            BadRequest("Failed to upload")
        }
    }
    //for downloding the file
    def downloadFile(file: String) = Action {
        val iofile = new java.io.File((play.Play.application().configuration().getString("data.path")) + file)
        val fileContent: Enumerator[Array[Byte]] = Enumerator.fromFile(iofile)
        SimpleResult(
            header = ResponseHeader(200),
            body = fileContent)
    }

    //for deleting files
    def deleteFile(file: String) = Action {
        try {
            if (SmartResource(file).remove()) {
                Ok(Json.toJson(Response("done")))
            } else {
                throw new Exception()
            }
        } catch {
            case e: Exception => BadRequest;
        }
    }
}