package controllers

import org.junit.runner.RunWith
import org.specs2.Specification
import org.specs2.mock.Mockito
import org.specs2.mutable.SpecificationWithJUnit
import org.specs2.runner.JUnitRunner
import storage.SmartResource
import storage.LocalStore
import java.io.File


@RunWith(classOf[JUnitRunner])
class SmartResourceSpec  extends SpecificationWithJUnit{
    val testUri = "http://localhost:9000/file/smarter-2014-05-20T100941.hdt"
    val testFileName = "insight.hdt"
    
    "Smarter Resource" should {
        "given a url of ["+testUri+"] can reconstitute file name from internal representation" in {
            val resourceUnderTest = SmartResource(testUri)
            resourceUnderTest.simpleName must equalTo("smarter")
            resourceUnderTest.asFileName must equalTo("smarter-2014-05-20T100941.hdt")
        }
        
        
        "given a file of ["+testFileName+"] can reconstitute file name from internal representation" in {
            val resourceUnderTest = SmartResource(testFileName)
            resourceUnderTest.simpleName must equalTo("insight")
            resourceUnderTest.asFileName must equalTo("insight.hdt")
        }
        
        "given a file of [insight] and extension of [hdt] reconstitute file name from internal representation" in {
            val resourceUnderTest = SmartResource("insight", "hdt")
            resourceUnderTest.simpleName must equalTo("insight")
            resourceUnderTest.asFileName must equalTo("insight.hdt")
        }
             
        
       "given an 'outer' url I can create the inner filelocation" in {
            val resourceUnderTest = SmartResource(testUri)
            resourceUnderTest.asFileName must equalTo("smarter-2014-05-20T100941.hdt")
        }
       
        "to create test file and save it to default store" in {
           for {
				files <- Option(new File("target/store").listFiles)
				file <- files if file.getName.endsWith(".bobo")
			} file.delete()
            
            val resourceUnderTest = SmartResource("zippy","bobo")
            resourceUnderTest.push("someText")
            val fileNames = new java.io.File("target/store/file").listFiles.filter(_.getName.endsWith(".bobo"))
            fileNames.length must greaterThanOrEqualTo(1)
        }
       
       "be able to determine the most recent file with same name and extension" in {
 
            val resource = SmartResource("testresource","json")
            resource.push("teststuff")
            
            val actualLatestFile = new LocalStore{}.getLatest("testresource", "json")
            // joda time is acting very weird around SSS keep changing for same files.
            actualLatestFile.dateCreated.get.toDate.toGMTString() must equalTo(resource.dateCreated.get.toDate.toGMTString())
        }
    }

}