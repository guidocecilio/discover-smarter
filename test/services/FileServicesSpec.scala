package services

import org.junit.runner.RunWith
import org.specs2.mutable.SpecificationWithJUnit
import processing.merge.FileServices
import org.specs2.runner.JUnitRunner
import org.specs2.execute.Pending

@RunWith(classOf[JUnitRunner])
class FileFileServicesSpecSpec extends SpecificationWithJUnit  {
  "File processing services" should {
     "given a CSV and mapping file create HDT file" in {
    	 Pending("requires csv file added by waqar")
//       val filename = FileServices.convertCsvToHDT("test").getLatest.innerUrl;
//       filename must contain("test-")
    }
     "given an RDF file, converts it into HDT" in {
    	 Pending("requires csv file added by waqar")
//       val filename = FileServices.convetRdfToHDT("test").getLatest.innerUrl;
//       filename must contain("test-")
    }
  }
}