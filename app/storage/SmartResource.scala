package storage

import analytics.Encoding._
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.Logger
import java.io.File
import org.rdfhdt.hdt.blueprint.HDTBlueprintGraph
import play.api.libs.json.JsValue
import play.api.libs.json.Json

/**
 * Helper class to act as single reference 
 * 
 * Performs 3 functions:
 * 1. Binds URLs to an internal storage location and vice versa.
 * 2. provides organization for Smart resources
 * 3. provides file versioning and fuzzy comparison of Smart Resources
 * 
 * For now uses local file system - but should expand as files become
 * more central to application.
 * 
 * As we are unsure of where any file is saved, we cannot rely on filesystem to handle time aspects of files
 * we instead to manage temporal aspects of file management by using a Time-Nonce embedded in the file name.
 * 
 * @author naodun
 *
 */
class SmartResource(	val protocol: String, 
							val domain: String, 
							val port: Int, 
							val simpleName: String, 
							val dateCreated: Option[DateTime], 
							val extension: String, 
							val where: String) extends TimeNonce{
	
	this: Store =>
	
	def toUrl: String =  protocol + "://" + domain + ":" + port + "/file/"
    def asFileName(): 	String = simpleName + makeTimeNonce(dateCreated) + "." + extension
    def clientUrl(): 	String = toUrl  + asFileName()
    def innerUrl(): 	String = fullUri(this)
    def push(data:Any): SmartResource = {
		if (resourceExists(this)){
			val smartResource = new SmartResource(protocol, domain, port, simpleName, Option(new DateTime()), extension, where) with LocalStore
			Logger.info("pushed new version of" + simpleName + "was [" +dateCreated+"], now is [" + smartResource.dateCreated + "]")
			smartResource
		}
		else{
			put(this, data)
			this
		}
    }
	
    def pull():			File = pull(this)
    def remove():		Boolean = remove(this)
    def load():			Any = extension match{
        case "hdt" => new HDTBlueprintGraph(pull.getAbsolutePath())
        case _ => "" //TODO: 
    } 
    def json():		JsValue = Json.obj(
            "location" -> clientUrl,
            "typeOf" -> "graph",
            "encoding" -> extension)
            
    def getLatest(): SmartResource = dateCreated match {
    		case None => SmartResource(simpleName + "." + extension)
    		case _ => getLatest(simpleName, extension)
    	}
 }



/**
 * Object for Smart Resource, includes TimeNonce to control id's
 * also has nice refactoring of Smarter Resources.
 *
 */
object SmartResource extends TimeNonce {

	val simpleUrlPattern = """(http|ftp):\/\/(.*):([0-9]+)\/(file|result)\/([a-zA-Z0-9_]+).([^.]*).([a-zA-Z.0-9_]+)""".r
    val simpleFilePatternWithNonce = """([a-zA-Z0-9_]+)-([^.]*)\.([a-zA-Z.0-9_]+)""".r
    val simpleFilePattern = """([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)""".r
    val hostname = play.api.Play.current.configuration.getString("hostname").get
    val port = java.lang.Integer.parseInt(play.api.Play.current.configuration.getString("port").get)
    /**
     * factory constructor, takes string and depending on format of string will create the correct smart resource
     * can accept:
     * URL : http://bob.com/file/smarter-2014-06-26T154646864.hdt or http://bob.com/result/smarter-2014-06-26T154646864.hdt
     * filename with nonce 'smarter-2014-06-26T154646864.hdt'
     * Simple file name 'smarterfile.txt'
     * 
     * In the case of Simple file name, the time-nonce is set to the time the request was made.
     * 
     * Other file strings can be added but will be saved with suffix '.error' and a warning will be logged.
     */
    def apply(url: String):SmartResource = url match {
    	case simpleUrlPattern(protocol, domain, port, where, simpleName, tNonce, ext) => new SmartResource(protocol, domain, port.toInt, simpleName, parseTimeNonce(tNonce), ext, where) with LocalStore
    	case simpleFilePatternWithNonce(simpleName, tNonce, ext) => new SmartResource("http", "localhost", 9000, simpleName, parseTimeNonce(tNonce), ext, "file") with LocalStore
    	case simpleFilePattern(simpleName, ext) => new SmartResource("http", "localhost", 9000, simpleName, None, ext, "file") with LocalStore // Need to rename existing file.... for now
    	case s:String => {
    	    Logger.warn("could not create resource from string[" + s + "]")
    	    new SmartResource("http", hostname, port, s, None, "error", "file") with LocalStore
    	}
    }
	
	// TODO: ND: remove dependency on localhost, should know what the DNS name the request came in on maybe 3 params one being a function to find that.
	def apply(simpleName: String, extension: String):SmartResource = extension match{
	    case "hdt" => new SmartResource("http", hostname, port, simpleName, Option(new DateTime()), extension, "file") with LocalStore
	    case _ =>     new SmartResource("http", hostname, port, simpleName, Option(new DateTime()), extension, "file") with LocalStore
	}
	
	def get(fileName: String):SmartResource = apply(fileName)
	
	def valid(url: String):Boolean = url match {
    	case simpleUrlPattern(protocol, domain, port, where, simpleName, tNonce, ext) => false
    	case simpleFilePatternWithNonce(simpleName, tNonce, ext) => true
    	case simpleFilePattern(simpleName, ext) => true
    	case s:String => false
	}
	
	def getExtension(url: String ): String = url match{
	    case simpleUrlPattern(protocol, domain, port, where, simpleName, tNonce, ext) => ext
    	case simpleFilePatternWithNonce(simpleName, tNonce, ext) => ext
    	case simpleFilePattern(simpleName, ext) => ext
	}
	
	def getName(url: String ): String = url match{
	    case simpleUrlPattern(protocol, domain, port, where, simpleName, tNonce, ext) => simpleName
    	case simpleFilePatternWithNonce(simpleName, tNonce, ext) => simpleName
    	case simpleFilePattern(simpleName, ext) => simpleName
	}
	
    def unapply(resource: SmartResource) = Some(resource.protocol, resource.domain, resource.port, resource.simpleName, resource.dateCreated, resource.extension, resource.where)
}

/**
 * As we are unsure of where any file is saved, we need to manage temporal aspects of file management by
 * using a Time-Nonce.  the time nonce is a timestamp encoded as follows yyyy-MM-dd'T'HHmmssSSS 
 * this looks like 2014-06-26T154646864.
 * 
 * This is intended to help with sequencing versions of a file for merge, get latest and compare functions.
 */
 trait TimeNonce {
    def makeTimeNonce(dt: Option[DateTime]):String = dt match{
    	case None => ""
        case Some(time: DateTime) => "-" + DateTimeFormat.forPattern("yyyy-MM-dd'T'HHmmss").print(time)     
    } 
    
    def parseTimeNonce(time: String): Option[DateTime] = time match{
        case "" => None
        case x if time.length() > 10 && time.length() < 21 => Option(format(x))
        case _ => Option(new DateTime())
    }
    
    def format(dateTimeString: String):DateTime = DateTimeFormat.forPattern("yyyy-MM-dd'T'HHmmss").parseDateTime(dateTimeString)   
}
