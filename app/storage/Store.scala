package storage

import play.api.Logger
import org.rdfhdt.hdt.blueprint.HDTBlueprintGraph
import org.rdfhdt.hdt.gremlinwriter.GremlinWriter
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import org.joda.time.DateTime
import java.io.FileNotFoundException
import org.rdfhdt.hdt.hdt.impl.HDTImpl
import org.rdfhdt.hdt.options.HDTSpecification
import com.hp.hpl.jena.query.ResultSetFormatter
import analytics.PrintProgress
import com.hp.hpl.jena.query.ResultSet
import scala.collection.JavaConverters._ // DO NOT USE JAVACONVERSIONS they are bad.
import org.rdfhdt.hdt.hdt.writer.TripleWriterHDTPro
import org.rdfhdt.hdt.options.HDTOptions
import org.rdfhdt.hdt.triples.TripleString
import com.hp.hpl.jena.query.QuerySolution

 /**
  * Store is an abstraction for any storage it is used for:
  * 1). Storing results of smarter data rule execution
  * 2). Storing files stored in smarter data
  * Used by the SmartResource Class to store resources/assets used in the smarter data system
  * 
  * you are using File IO, please consider using this abstraction
  * 
  * Currently only Local file store is implemented, allowing us to store locally on the server any 
  * data that is require, but if we move to a more "cloud" story, then s3 or google drive storage 
  * stories may be required.
  * 
 * @author naodun
 *
 */
trait Store{
	
	/**
	 * Puts a resource into store
	 * 
	 * @param resource smart resource
	 * @param data
	 */
	def put(resource: SmartResource, data: Any)
	
	/**
	 * Pulls a resource from the store
	 * currently returns a file object, stream may be a better option
	 * as data may not come from filestore
	 * @param resource
	 * @return resource as a file
	 */
	def pull(resource: SmartResource): File
	
	/**
	 * remove resource from store
	 * @param resource resource to remove
	 * @return success
	 */
	def remove(resource: SmartResource): Boolean 
	
    /**
     * list all files in the store
     * @return a list of all files
     */
    def listFiles: Seq[String] 

    /**
     * Does resource exist in store?
     * @param resource resource we want to find
     * @return true if exists, false if not exist
     */
    def resourceExists (resource: SmartResource): Boolean
    
    /**
     * Set up store 
     * @return success
     */
    def initStore(): Boolean
    
    /**
     * Get latest "matching" file
     * will get the latest version of file matching prefix and suffix
     * so if you have file fred.txt will get fred-latestNonce.txt
     * @param simpleName prefix of file
     * @param extension suffix of file
     * @return latest file
     */
    def getLatest(simpleName: String, extension: String): SmartResource
    
    def fullUri(resource: SmartResource): String
}


/**
 * Store that uses local file system
 * Currently hard coded to use relative path to target/store
 * will update a better way to define default store
 *
 */
trait LocalStore extends Store{
	// TODO: needs to be moved out of here.
    def homeFolder: String = "target/store"
    
    val storeLogger = Logger("localstore")
    
    lazy val home = {
		createFolder(homeFolder)
    	createFolder(homeFolder + "/file")
    	createFolder(homeFolder + "/result")
    }
    
    def put(resoure: SmartResource, data: Any) = data match {
	    case s:String => writeStringToLocal(resoure, s)
	    case g:HDTBlueprintGraph => writeHdtToLocal(resoure, g)
	    case j:ResultSet => writeJenaResultToLocal(resoure, j)
	}

    def pull(resource: SmartResource): File = asLocalFile(resource)
    
	def remove(resource: SmartResource): Boolean = asLocalFile(resource).delete()
	
    def listFiles:Seq[String] = {
        val listOfFiles = tree(new File(homeFolder)).map(_.getName()).toSeq
    	storeLogger.debug("Listing Files...")
    	listOfFiles
   }
    
   def resourceExists (resource: SmartResource): Boolean = {
       new File(homeFolder, resource.asFileName()).exists()
   }
	    
    def initStore(): Boolean ={
    	home
    	true
    }

    def getLatest(simpleName: String, extension: String): SmartResource = {
        val files = listFiles.filter(SmartResource.valid(_)).filter(matchingResource(_, simpleName, extension))
        if (files.isEmpty) throw new FileNotFoundException("cannot find latest file matching prefix [" +simpleName+ "] suffix[" +extension+ "], no file exist with this prefix & suffix")
        files.map(SmartResource(_)).reduceLeft (isAfter )
    }
    
    def fullUri(resource: SmartResource): String = {
    	asLocalFile(resource).getAbsolutePath()
    }
   
   def getHomeFolder(): String = {
     new File(homeFolder).getAbsolutePath()
   }
   
    // inner methods, not intended to be called directly
    
  private def asLocalFile(resource: SmartResource): File = {
	    home
        storeLogger.info("In Store: writing file ["+ resource.asFileName + "] to folder [" + resource.where + "], home is [" + homeFolder + "]" )
        val dir = new File(getHomeFolder() +"/"+ resource.where)
	    storeLogger.debug("In Store: writing file ["+ resource.asFileName + "] to folder [" + dir.getCanonicalPath() + "], dir exists? " +  dir.exists())
        if (!dir.exists()){
        	dir.mkdirs()
        }
	    storeLogger.debug("Tried to create [" + dir.getCanonicalPath() + "], dir exists now? " +  dir.exists())
        new File(getHomeFolder() +"/"+ resource.where, resource.asFileName)
    }
   
   private def createFolder(folderName: String): File = {
        val folder =  new File(folderName)
        storeLogger.debug("checking for local storage folder:" + folder.getCanonicalPath())
        if (!folder.exists) folder.mkdirs()
        folder
    }

    private def isAfter(x: SmartResource, y: SmartResource):SmartResource = (x.dateCreated, y.dateCreated) match { 
	    case (_, None) => x
	    case (None, _) => y
	    case (xcreated: Some[DateTime], ycreated:Some[DateTime]) if xcreated.get.isAfter(ycreated.get) => x
	    case _ => y
	}
    
    private def writeStringToLocal(resource: SmartResource, data: String) = {
        val pw = new java.io.PrintWriter(asLocalFile(resource))
        try pw.write(data) finally pw.close()
    }
    
    private def writeHdtToLocal(resource: SmartResource, data: HDTBlueprintGraph) = {
        val out = new BufferedOutputStream(new FileOutputStream(asLocalFile(resource)))
        val pw = new GremlinWriter(out)
        // Create iterator of edges that we want, using a Gremlin Pipeline
        val it = data.getEdges().iterator()
        
        try pw.write(it) finally {
            pw.close()
            out.close()
        }
    }
    
    
    private def writeJenaResultToLocal(resource: SmartResource, results: ResultSet) = {
    	val out = new java.io.FileOutputStream(asLocalFile(resource))
    	//TODO: ND: fix this class so it can be instantiated in a immutable way.
    	var wr = new TripleWriterHDTPro("http://smarterdata/insight-centre.org", new HDTSpecification(), out)
    	//Logger.info("size of jena result set to serialize is: " + results.size)
    	val resultsAsScala: Iterator[QuerySolution] = results.asScala
    	resultsAsScala.foreach(q => {
    		val subj = q.get("s").toString()
    		val pred = q.get("p").toString()
    		val objt = q.get("o").toString()
    		wr.addTriple(new TripleString(subj, pred, objt))   		
    	} )
    	wr.close()
    	//TODO: need to work out how to create dictonary at this point.
    }

   private def matchingResource(res: String, name: String, ext: String) = SmartResource.getExtension(res).equals(ext) && SmartResource.getName(res).equals(name)
   
   private def tree(root: File, skipHidden: Boolean = false): Stream[File] = 
		if (!root.exists || (skipHidden && root.isHidden)) Stream.empty 
		else root #:: (
		root.listFiles match {
			case null => Stream.empty
			case files => files.toStream.flatMap(tree(_, skipHidden))
		})
}
