package processing.merge

import org.deri.tarql.TarqlParser
import org.deri.tarql.TarqlQuery
import org.deri.tarql.CSVQueryExecutionFactory
import org.deri.tarql.CSVToValues
import storage.SmartResource
import java.io.FileWriter
import java.io.IOException
import java.io.Reader
import org.rdfhdt.hdt.enums.RDFNotation
import org.rdfhdt.hdt.exceptions.ParserException
import org.rdfhdt.hdt.hdt.HDTManager
import org.rdfhdt.hdt.options.HDTSpecification 
import com.hp.hpl.jena.query.Query
import com.hp.hpl.jena.rdf.model.Model
import com.hp.hpl.jena.rdf.model.ModelFactory
import com.hp.hpl.jena.sparql.algebra.table.TableData
import com.hp.hpl.jena.util.FileManager
import scala.collection.JavaConversions._
import scala.collection.JavaConverters._

object FileServices {
  def convertCsvToHDT(file: String): SmartResource = {
    val csvfile = SmartResource(file, "csv").getLatest.innerUrl()
    val mappingfile = SmartResource(file, "tarql").getLatest.innerUrl()
    val outRDF = SmartResource(file, "nt").innerUrl()
    val resultModel = ModelFactory.createDefaultModel()
    val query = new TarqlParser(mappingfile).getResult
    val reader = CSVQueryExecutionFactory.createReader(csvfile, FileManager.get)
    val table = new CSVToValues(reader, true).read()
    for (q <- query.getQueries()) {
      val previousResults = ModelFactory.createDefaultModel()
      previousResults.add(resultModel)
      CSVQueryExecutionFactory.setPreviousResults(previousResults)
      (CSVQueryExecutionFactory.create(table, q)).execConstruct(resultModel)
      CSVQueryExecutionFactory.resetPreviousResults()
    }
    val out = new FileWriter(outRDF)
    resultModel.write(out, "N-TRIPLE")
    HDTManager.generateHDT(outRDF, "http://example.com/mydataset", RDFNotation.guess(outRDF), new HDTSpecification(), 
      null)
      .saveToHDT(SmartResource(file, "hdt").innerUrl(), null)
    SmartResource(file, "hdt")
  }
  def convetRdfToHDT(file: String): SmartResource = {
    val outRDF = SmartResource(file,"nt").getLatest.innerUrl
    HDTManager.generateHDT(outRDF, "http://example.com/mydataset", RDFNotation.guess(outRDF), new HDTSpecification(), 
      null)
      .saveToHDT(SmartResource(file, "hdt").innerUrl(), null)
    SmartResource(file, "hdt").getLatest
  }
}